import Link from 'next/link';
import { DateField } from '@/components/AdminDateTime';
import { query } from '@/lib/db';
import AutoRefresh from '@/components/AutoRefresh';
import { fetchDikidiSchedule } from '@/lib/dikidi/source';
import { syncDikidiEntriesIfNeeded } from '@/lib/dikidi/sync';
import {
  addDays,
  belarusDateKey,
  belarusLongDate,
  belarusTime,
  dateKeyToDate,
  toBelarusDate,
  todayBelarus,
} from '@/lib/dikidi/time';
import type { ScheduleEntry } from '@/lib/dikidi/types';
import {
  cancelAppointment,
  cancelDikidiAppointment,
  claimDikidiAppointment,
} from '../../actions';

/** Что сказать пользователю, если действие не удалось. */
const ACTION_ERRORS: Record<string, string> = {
  invalid_id: 'Некорректный номер записи.',
  invalid_dikidi: 'Некорректный номер записи DIKIDI — действие отменено.',
  invalid_datetime: 'Не удалось разобрать время записи из DIKIDI.',
  not_found: 'Запись не найдена или уже отменена.',
  dikidi_already_cancelled:
    'Эта запись уже отменена в админке — повторно открыть её нельзя. Отмените её в DIKIDI напрямую.',
};

type Range = 'day' | 'week';

type LocalRow = {
  id: string;
  source: 'admin' | 'online';
  client_name: string;
  client_phone: string;
  service_name: string;
  starts_at: Date;
  duration_min: number;
  price: string;
  comment: string;
  sync_status: 'local' | 'synced' | 'failed';
  sync_error: string | null;
  dikidi_id: string | null;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function localEntries(rows: LocalRow[]): ScheduleEntry[] {
  return rows.map((row) => {
    const startsAt = new Date(row.starts_at);
    const endsAt = new Date(startsAt.getTime() + row.duration_min * 60_000);

    return {
      key: `admin:${row.id}`,
      source: row.source,
      dikidiId: row.dikidi_id,
      dateKey: belarusDateKey(startsAt),
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      timeFrom: belarusTime(startsAt),
      timeTo: belarusTime(endsAt),
      clientName: row.client_name,
      clientPhone: row.client_phone,
      services: [row.service_name],
      price: Number(row.price),
      durationMin: row.duration_min,
      comment: row.comment,
      syncStatus: row.sync_status,
      syncError: row.sync_error,
    };
  });
}

function failureHint(kind: string, message: string): string {
  switch (kind) {
    case 'not_configured':
      return 'Не задан API_ANYTHING_TOKEN. Скопируйте токен из ~/.api-anything/serve-token в .env.local и перезапустите next dev.';
    case 'unreachable':
      return message.includes('dikidi.net')
        ? message
        : 'api-anything не запущен. Выполните: bun run api-anything:serve';
    case 'unauthorized':
      return 'api-anything отклонил токен. Сверьте API_ANYTHING_TOKEN с ~/.api-anything/serve-token.';
    case 'op_missing':
      return 'Операция DIKIDI не установлена на этой машине. Нужен логин и обучение операции — пошагово в docs/api-anything-runbook.md.';
    case 'config':
      return `Проверьте DIKIDI_JOURNAL_ARGS: ${message}`;
    default:
      if (message.includes('error is 1')) {
        return `${message}. DIKIDI отклонил запрос по правам: проверьте, что DIKIDI_TOKEN — cookie token кабинета, а DIKIDI_MASTER_ID/DIKIDI_COMPANY_ID совпадают с вашим кабинетом. Если автологин настроен, можно убрать DIKIDI_TOKEN и дать приложению войти по DIKIDI_LOGIN/DIKIDI_PASSWORD.`;
      }
      return message;
  }
}

function sourceBadge(entry: ScheduleEntry) {
  if (entry.source === 'dikidi') {
    return { label: 'DIKIDI', className: 'bg-gold-light text-gold' };
  }

  // Онлайн-запись (/book) и запись, созданная мастером, — разные каналы.
  const channel = entry.source === 'online' ? 'онлайн' : 'админка';

  if (entry.syncStatus === 'synced') {
    return { label: `${channel} · в DIKIDI`, className: 'bg-rose-light text-rose-dark' };
  }

  if (entry.syncStatus === 'failed') {
    return { label: `${channel} · не отправлено`, className: 'bg-gold-light text-gold' };
  }

  return { label: `${channel} · в БД`, className: 'bg-cream text-muted' };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    range?: string;
    cancelled?: string;
    sync?: string;
    removed?: string;
    removeError?: string;
    reason?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const cancelledId = params.cancelled;
  const cancelSync = params.sync;
  const removedId = params.removed;
  const removeErrorId = params.removeError;
  const removeReason = params.reason;
  const actionError = params.error ? ACTION_ERRORS[params.error] ?? params.error : null;
  const dateKey = params.date && DATE_KEY.test(params.date) ? params.date : todayBelarus();
  const range: Range = params.range === 'day' ? 'day' : 'week';

  const from = dateKey;
  const to = range === 'week' ? addDays(from, 6) : from;
  const step = range === 'week' ? 7 : 1;

  const rangeStart = toBelarusDate(from, '00:00');
  const rangeEnd = toBelarusDate(addDays(to, 1), '00:00');

  // Запрашиваем только видимый диапазон: при широком окне DIKIDI возвращает
  // усечённые записи (без имени клиента/услуг). Видимый диапазон обычно содержит
  // не более ~10-15 записей, для которых DIKIDI отдаёт полные данные.
  // Записи админки и журнал DIKIDI не зависят друг от друга — запрашиваем параллельно.
  // Напоминания отправляет тик (/api/cron/dispatch), а не рендер страницы:
  // скрытый побочный эффект при открытии расписания удивлял и дублировал cron.
  const [dikidiResult, { rows: localRows }] = await Promise.all([
    fetchDikidiSchedule(from, to),
    query<LocalRow>(
      `select id, source, client_name, client_phone, service_name, starts_at,
              duration_min, price, comment, sync_status, sync_error, dikidi_id
         from appointments
        where source in ('admin', 'online')
          and cancelled_at is null
          and starts_at >= $1 and starts_at < $2
        order by starts_at`,
      [rangeStart!, rangeEnd!],
    ),
  ]);

  // Зеркалим записи из DIKIDI в БД, чтобы они не терялись при отказе от DIKIDI
  // и были доступны как обычные записи админки (связь по dikidi_id).
  if (dikidiResult.ok) {
    try {
      await syncDikidiEntriesIfNeeded(dikidiResult.entries);
    } catch {
      // Синхронизация не должна ломать отображение расписания.
    }
  }

  const local = localEntries(localRows);
  const dikidiEntries = dikidiResult.ok
    ? dikidiResult.entries.filter(
        (entry) => entry.dateKey >= from && entry.dateKey <= to,
      )
    : [];
  const syncedDikidiIds = new Set(
    local.map((entry) => entry.dikidiId).filter((id): id is string => Boolean(id)),
  );

  const merged = [
    ...local,
    ...dikidiEntries.filter(
      (entry) => !entry.dikidiId || !syncedDikidiIds.has(entry.dikidiId),
    ),
  ].sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));

  const days = Array.from({ length: range === 'week' ? 7 : 1 }, (_, index) => {
    const day = addDays(from, index);
    return {
      dateKey: day,
      entries: merged.filter((entry) => entry.dateKey === day),
    };
  });

  const totalAmount = merged.reduce((sum, entry) => sum + entry.price, 0);
  const dikidiCount = merged.filter((entry) => entry.source === 'dikidi').length;
  const adminCount = merged.length - dikidiCount;

  const navQuery = (date: string) => `?date=${date}&range=${range}`;
  /** Адрес возврата для действий: сохраняет открытый день/неделю. */
  const backTo = `/admin/schedule?date=${dateKey}&range=${range}`;

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Расписание</h1>
          <p className="mt-1 text-sm text-muted">
            {belarusLongDate(dateKeyToDate(from))}
            {range === 'week' ? ` — ${belarusLongDate(dateKeyToDate(to))}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={navQuery(addDays(from, -step))}
            className="rounded-lg border border-border bg-white px-3 py-1.5 hover:border-rose"
          >
            ← Назад
          </Link>
          <Link
            href={navQuery(todayBelarus())}
            className="rounded-lg border border-border bg-white px-3 py-1.5 hover:border-rose"
          >
            Сегодня
          </Link>
          <Link
            href={navQuery(addDays(from, step))}
            className="rounded-lg border border-border bg-white px-3 py-1.5 hover:border-rose"
          >
            Вперёд →
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex rounded-lg border border-border bg-white p-0.5">
          <Link
            href={`?date=${dateKey}&range=day`}
            className={`rounded-md px-3 py-1.5 ${range === 'day' ? 'bg-rose text-white' : 'text-muted hover:text-charcoal'}`}
          >
            День
          </Link>
          <Link
            href={`?date=${dateKey}&range=week`}
            className={`rounded-md px-3 py-1.5 ${range === 'week' ? 'bg-rose text-white' : 'text-muted hover:text-charcoal'}`}
          >
            Неделя
          </Link>
        </div>

        <form method="get" className="flex w-full items-center gap-2 sm:w-auto">
          <input type="hidden" name="range" value={range} />
          <DateField
            name="date"
            defaultValue={dateKey}
            className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-1.5 sm:flex-none"
          />
          <button
            type="submit"
            className="min-h-10 shrink-0 rounded-lg border border-border bg-white px-3 py-1.5 hover:border-rose"
          >
            Показать
          </button>
        </form>

        <span className="text-xs text-muted sm:text-sm">
          Всего: {merged.length} · DIKIDI: {dikidiCount} · админка: {adminCount} ·{' '}
          {Math.round(totalAmount)} BYN
        </span>
      </div>

      {cancelledId ? (
        <div className="rounded-lg border border-border bg-cream px-4 py-3 text-sm">
          Запись №{cancelledId} отменена{cancelSync === 'failed' ? ' только в админке' : ''}.
          {cancelSync === 'failed'
            ? ' Удалить её в DIKIDI не удалось — причина в подсказке при статусе записи в DIKIDI.'
            : ' Из расписания она убрана.'}
        </div>
      ) : null}

      {removedId ? (
        <div className="rounded-lg border border-border bg-cream px-4 py-3 text-sm">
          Запись №{removedId} удалена из DIKIDI.
        </div>
      ) : null}

      {removeErrorId ? (
        <div className="rounded-lg border border-gold-light bg-gold-light px-4 py-3 text-sm text-gold">
          <p className="font-medium">
            Не удалось удалить запись №{removeErrorId} в DIKIDI — она осталась в расписании.
          </p>
          <p className="mt-1">
            {removeReason ||
              'Причина не получена. Проверьте сессию DIKIDI (DIKIDI_TOKEN или DIKIDI_LOGIN/DIKIDI_PASSWORD).'}
          </p>
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-lg border border-gold-light bg-gold-light px-4 py-3 text-sm text-gold">
          {actionError}
        </div>
      ) : null}

      {!dikidiResult.ok ? (
        <div className="rounded-lg border border-gold-light bg-gold-light px-4 py-3 text-sm text-gold">
          <p className="font-medium">Записи DIKIDI не загружены — показаны только записи админки.</p>
          <p className="mt-1">{failureHint(dikidiResult.kind, dikidiResult.message)}</p>
        </div>
      ) : null}

      {days.map((day) => (
        <section
          key={day.dateKey}
          className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
        >
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-cream px-4 py-2.5">
            <h2 className="font-display text-base">
              {belarusLongDate(dateKeyToDate(day.dateKey))}
            </h2>
            <span className="text-xs text-muted">
              {day.entries.length
                ? `${day.entries.length} запис. · ${Math.round(
                    day.entries.reduce((sum, entry) => sum + entry.price, 0),
                  )} BYN`
                : 'нет записей'}
            </span>
          </header>

          {day.entries.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted">Свободно.</p>
          ) : (
            <ul className="divide-y divide-border">
              {day.entries.map((entry) => {
                const badge = sourceBadge(entry);

                return (
                  <li key={entry.key} className="px-4 py-3">
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                    <div className="w-20 shrink-0 text-sm font-medium whitespace-nowrap sm:w-24">
                      {entry.timeFrom}
                      {entry.timeTo ? `–${entry.timeTo}` : ''}
                    </div>

                    <div className="min-w-0 flex-1 break-words">
                      <p className="text-sm font-medium">
                        {entry.clientName}
                        {entry.clientPhone ? (
                          <span className="block font-normal text-muted sm:ml-2 sm:inline">
                            {entry.clientPhone}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {entry.services.join(', ')}
                        {entry.comment ? ` · ${entry.comment}` : ''}
                      </p>
                      {entry.syncError ? (
                        <p className="mt-1 text-xs text-gold">{entry.syncError}</p>
                      ) : null}
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 text-sm sm:w-auto sm:justify-end">
                      {entry.price > 0 ? (
                        <span className="whitespace-nowrap font-medium">{entry.price} BYN</span>
                      ) : null}
                      <span
                        title={entry.syncError ?? undefined}
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${badge.className}`}
                      >
                        {badge.label}
                      </span>

                      {entry.source !== 'dikidi' ? (
                        <>
                          <Link
                            href={`/admin/appointments/${entry.key.replace('admin:', '')}`}
                            className="flex min-h-9 flex-1 basis-[calc(50%-0.25rem)] items-center justify-center rounded-lg border border-border bg-cream/40 px-3 py-1.5 text-xs transition hover:border-rose hover:bg-cream hover:text-rose-dark sm:flex-none sm:basis-auto"
                          >
                            Изменить
                          </Link>
                          <form
                            action={cancelAppointment}
                            className="flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto"
                          >
                            <input
                              type="hidden"
                              name="appointmentId"
                              value={entry.key.replace('admin:', '')}
                            />
                            <input type="hidden" name="backTo" value={backTo} />
                            <button
                              type="submit"
                              className="min-h-9 w-full rounded-lg border border-border bg-cream/40 px-3 py-1.5 text-xs text-muted transition hover:border-rose hover:bg-cream hover:text-rose-dark"
                            >
                              Отменить
                            </button>
                          </form>
                        </>
                      ) : entry.dikidiId ? (
                        <>
                          <form
                            action={claimDikidiAppointment}
                            className="flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto"
                          >
                            <input type="hidden" name="dikidiId" value={entry.dikidiId} />
                            <input type="hidden" name="clientName" value={entry.clientName} />
                            <input type="hidden" name="clientPhone" value={entry.clientPhone} />
                            <input
                              type="hidden"
                              name="serviceName"
                              value={entry.services[0] ?? ''}
                            />
                            <input type="hidden" name="startsAtIso" value={entry.startsAtIso} />
                            <input
                              type="hidden"
                              name="durationMin"
                              value={String(entry.durationMin)}
                            />
                            <input type="hidden" name="price" value={String(entry.price)} />
                            <input type="hidden" name="comment" value={entry.comment} />
                            <input type="hidden" name="backTo" value={backTo} />
                            <button
                              type="submit"
                              title="Открыть форму правки. Запись свяжется с DIKIDI, и сохранение обновит её там же, без дубля."
                              className="min-h-9 w-full rounded-lg border border-border bg-cream/40 px-3 py-1.5 text-xs transition hover:border-rose hover:bg-cream hover:text-rose-dark"
                            >
                              Изменить
                            </button>
                          </form>
                          <form
                            action={cancelDikidiAppointment}
                            className="flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto"
                          >
                            <input type="hidden" name="dikidiId" value={entry.dikidiId} />
                            <input type="hidden" name="backTo" value={backTo} />
                            <button
                              type="submit"
                              title="Удалить запись в DIKIDI — отменить её как это делает мастер в кабинете."
                              className="min-h-9 w-full rounded-lg border border-border bg-cream/40 px-3 py-1.5 text-xs text-muted transition hover:border-rose hover:bg-cream hover:text-rose-dark"
                            >
                              Отменить
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
