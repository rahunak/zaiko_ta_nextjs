import { belarusLongDate, belarusTime } from '@/lib/dikidi/time';
import { remindersOverview } from '@/lib/notifications/reminders';
import { resendReminder, runRemindersNow } from '../../actions';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  pending: 'ожидает',
  claimed: 'в работе',
  sent: 'отправлено',
  failed: 'ошибка',
  skipped: 'пропущено',
  cancelled: 'отменено',
};

const STATUS_ORDER = ['pending', 'claimed', 'sent', 'failed', 'skipped', 'cancelled'];

const KIND_LABELS: Record<string, string> = {
  master_t60: 'мастеру за час',
  client_t60: 'клиенту за час',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

function formatMoment(value: Date | string): string {
  const date = new Date(value);
  return `${belarusLongDate(date)}, ${belarusTime(date)}`;
}

function minutesAgo(minutes: number): string {
  if (minutes < 1) return 'меньше минуты назад';
  if (minutes < 60) return `${Math.round(minutes)} мин назад`;
  return `${Math.round(minutes / 60)} ч назад`;
}

/**
 * Экран «Напоминания»: единственный ответ на вопрос «а оно вообще работает?».
 * Счётчики берутся из очереди, «последний тик» — из журнала cron_runs.
 */
export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ resent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const overview = await remindersOverview();
  const lastRun = overview.runs[0] ?? null;
  const lastSuccess = overview.lastSuccessMinutes;
  const stale = lastSuccess === null || lastSuccess > 30;

  const counters = new Map(overview.counters.map((row) => [row.status, row.count]));
  const maxCount = Math.max(1, ...overview.counters.map((row) => row.count));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Напоминания</h1>
          <p className="mt-1 text-sm text-muted">
            Очередь в базе: тик создаёт и отправляет напоминания, планировщик только будит тик.
          </p>
        </div>
        <form action={runRemindersNow} className="w-full sm:w-auto">
          <button
            type="submit"
            className="min-h-10 w-full rounded-lg border border-border px-4 py-2 text-sm transition hover:border-rose hover:text-rose-dark sm:w-auto"
          >
            Прогнать сейчас
          </button>
        </form>
      </div>

      {params.resent ? (
        <p className="rounded-lg border border-border bg-white px-4 py-3 text-sm">
          Напоминание возвращено в очередь и отправлено, если время подошло.
        </p>
      ) : null}
      {params.error ? (
        <p role="alert" className="rounded-lg border border-gold-light bg-gold-light px-4 py-3 text-sm text-gold">
          {params.error === 'not_reset'
            ? 'Эту строку нельзя переотправить: она уже отправлена или отменена.'
            : 'Не удалось выполнить действие.'}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg">Состояние</h2>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs"
            style={
              stale
                ? { backgroundColor: '#f7e2e2', color: '#9c2f2f' }
                : { backgroundColor: '#e6f2e9', color: '#2f6b41' }
            }
          >
            {lastSuccess === null
              ? 'успешного тика ещё не было'
              : `последний успешный тик ${minutesAgo(lastSuccess)}`}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {STATUS_ORDER.map((status) => {
            const value = counters.get(status) ?? 0;
            return (
              <div key={status} className="rounded-xl border border-border bg-cream/40 px-3 py-2">
                <div className="text-lg font-semibold tabular-nums text-charcoal">{value}</div>
                <div className="text-[11px] text-muted">{statusLabel(status)}</div>
                <div className="mt-1 h-1 rounded-full bg-border/60">
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width: `${Math.round((value / maxCount) * 100)}%`,
                      backgroundColor: '#B8627A',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted">
          {lastRun
            ? `Последний запуск: ${lastRun.source} · ${formatMoment(lastRun.started_at)} · забрано ${lastRun.picked}, отправлено ${lastRun.sent}, ошибок ${lastRun.failed}${lastRun.error ? ` · сбой: ${lastRun.error}` : ''}`
            : 'Запусков ещё не было — проверьте, настроен ли внешний планировщик.'}
        </p>
        <p className="mt-1 text-xs text-muted">
          Если «последний успешный тик» старше 10 минут, напоминания не уходят: проверьте задание
          на cron-job.org (или QStash) и нажмите «Прогнать сейчас».
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-display text-lg">Требуют внимания</h2>
        <p className="mt-1 text-xs text-muted">
          Ошибки отправки и пропуски по будущим визитам. «Переотправить» вернёт строку в очередь и
          сразу запустит тик.
        </p>

        {overview.problems.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Проблем нет.</p>
        ) : (
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-medium">Когда</th>
                  <th className="py-2 pr-3 font-medium">Запись</th>
                  <th className="py-2 pr-3 font-medium">Кому</th>
                  <th className="py-2 pr-3 font-medium">Статус</th>
                  <th className="py-2 pr-3 font-medium">Причина</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {overview.problems.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 tabular-nums">{formatMoment(row.starts_at)}</td>
                    <td className="py-2 pr-3">
                      <div className="text-charcoal">{row.client_name}</div>
                      <div className="text-xs text-muted">{row.service_name}</div>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted">{kindLabel(row.kind)}</td>
                    <td className="py-2 pr-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={
                          row.status === 'failed'
                            ? { backgroundColor: '#f7e2e2', color: '#9c2f2f' }
                            : { backgroundColor: '#f4efe2', color: '#7a5a16' }
                        }
                      >
                        {statusLabel(row.status)}
                      </span>
                      <div className="mt-1 text-[11px] text-muted">попыток: {row.attempts}</div>
                    </td>
                    <td className="max-w-[280px] py-2 pr-3 text-xs text-muted">
                      {row.last_error ?? '—'}
                    </td>
                    <td className="py-2 text-right">
                      <form action={resendReminder}>
                        <input type="hidden" name="reminderId" value={row.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-border bg-cream/40 px-3 py-1.5 text-xs transition hover:border-rose hover:bg-cream hover:text-rose-dark"
                        >
                          Переотправить
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {overview.problems.length === 0 ? null : (
          <ul className="mt-4 space-y-2 md:hidden">
            {overview.problems.map((row) => (
              <li key={`mobile-${row.id}`} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.client_name}</p>
                    <p className="text-xs text-muted">{row.service_name}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs"
                    style={
                      row.status === 'failed'
                        ? { backgroundColor: '#f7e2e2', color: '#9c2f2f' }
                        : { backgroundColor: '#f4efe2', color: '#7a5a16' }
                    }
                  >
                    {statusLabel(row.status)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {formatMoment(row.starts_at)} · {kindLabel(row.kind)} · попыток: {row.attempts}
                </p>
                {row.last_error ? (
                  <p className="mt-1 break-words text-xs text-muted">{row.last_error}</p>
                ) : null}
                <form action={resendReminder} className="mt-2">
                  <input type="hidden" name="reminderId" value={row.id} />
                  <button
                    type="submit"
                    className="min-h-10 w-full rounded-lg border border-border px-3 py-1.5 text-xs transition hover:border-rose hover:text-rose-dark"
                  >
                    Переотправить
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-display text-lg">Ближайшие напоминания</h2>
        {overview.upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Пока нечего отправлять.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60 text-sm">
            {overview.upcoming.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 py-2">
                <span className="min-w-0 break-words text-charcoal">
                  {formatMoment(row.due_at)}
                  <span className="ml-2 text-xs text-muted">
                    {kindLabel(row.kind)} · визит {formatMoment(row.starts_at)}
                  </span>
                </span>
                <span className="text-xs text-muted">
                  {row.client_name} · {row.service_name} · {statusLabel(row.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-display text-lg">Журнал тиков</h2>
        {overview.runs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Тиков не было.</p>
        ) : (
          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-medium">Источник</th>
                  <th className="py-2 pr-3 font-medium">Начат</th>
                  <th className="py-2 pr-3 font-medium">Забрано</th>
                  <th className="py-2 pr-3 font-medium">Отправлено</th>
                  <th className="py-2 pr-3 font-medium">Ошибок</th>
                  <th className="py-2 font-medium">Сбой</th>
                </tr>
              </thead>
              <tbody>
                {overview.runs.map((run) => (
                  <tr key={run.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">{run.source}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatMoment(run.started_at)}</td>
                    <td className="py-2 pr-3 tabular-nums">{run.picked}</td>
                    <td className="py-2 pr-3 tabular-nums">{run.sent}</td>
                    <td className="py-2 pr-3 tabular-nums">{run.failed}</td>
                    <td className="max-w-[240px] py-2 text-xs text-muted">{run.error ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {overview.runs.length === 0 ? null : (
          <ul className="mt-3 space-y-2 md:hidden">
            {overview.runs.map((run) => (
              <li key={`mobile-run-${run.id}`} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{run.source}</span>
                  <span className="text-xs text-muted">{formatMoment(run.started_at)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  забрано {run.picked} · отправлено {run.sent} · ошибок {run.failed}
                </p>
                {run.error ? (
                  <p className="mt-1 break-words text-xs text-gold">{run.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
