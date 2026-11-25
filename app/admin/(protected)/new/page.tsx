import Link from 'next/link';
import { cookies } from 'next/headers';
import { DateField, TimeField } from '@/components/AdminDateTime';
import { query } from '@/lib/db';
import { belarusTime, todayBelarus } from '@/lib/dikidi/time';
import { cancelAppointment, createAppointment } from '../../actions';

type ServiceRow = {
  id: string;
  name: string;
  price: string;
  duration_min: number;
};

type AppointmentRow = {
  id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  starts_at: Date;
  duration_min: number;
  price: string;
  sync_status: 'local' | 'synced' | 'failed';
  sync_error: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_name: 'Имя клиента — от 2 до 80 символов.',
  invalid_phone: 'Телефон в формате +375 XX XXX-XX-XX.',
  invalid_service: 'Выберите услугу из списка.',
  invalid_datetime: 'Укажите дату и время записи.',
  slot_conflict: 'На это время уже есть запись. Выберите другое время.',
  comment_too_long: 'Комментарий длиннее 500 символов.',
  invalid_id: 'Не понятно, какую запись менять.',
  not_found: 'Запись не найдена — возможно, её уже отменили.',
};

const UPDATE_SYNC_MESSAGES: Record<string, string> = {
  synced: 'Изменения отправлены в DIKIDI — обновлена та же запись, без дубля.',
  failed: 'Не удалось обновить запись в DIKIDI — причина в подсказке при статусе.',
  local: 'Изменения только в локальной БД, DIKIDI не трогали.',
  blocked:
    'Время вне графика мастера или слот занят в DIKIDI — изменения остались только в локальной БД.',
};

const CREATE_SYNC_MESSAGES: Record<string, string> = {
  synced: 'Запись создана в DIKIDI.',
  failed: 'В DIKIDI запись не ушла — причина в подсказке при статусе.',
  local:
    'Время вне графика мастера или слот занят в DIKIDI — запись сохранена только в локальной БД.',
};

function shortDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Minsk',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function syncBadge(appointment: AppointmentRow) {
  if (appointment.sync_status === 'synced') {
    return { label: 'в DIKIDI', className: 'bg-rose-light text-rose-dark' };
  }

  if (appointment.sync_status === 'failed') {
    return {
      label: 'не отправлено',
      className: 'bg-gold-light text-gold',
    };
  }

  return { label: 'только в БД', className: 'bg-cream text-muted' };
}

export default async function AdminBookingPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    cancelled?: string;
    sync?: string;
    error?: string;
  }>;
}) {
  const { created, updated, cancelled, sync, error } = await searchParams;

  const cookieStore = await cookies();
  const dikidiSyncDefault = cookieStore.get('zaiko_dikidi_sync')?.value === '1';

  const [{ rows: services }, { rows: upcoming }] = await Promise.all([
    query<ServiceRow>(
      `select id, name, price, duration_min
         from services
        where is_active = true
        order by sort_order, name`,
    ),
    query<AppointmentRow>(
      `select id, client_name, client_phone, service_name, starts_at,
              duration_min, price, sync_status, sync_error
         from appointments
        where source in ('admin', 'online')
          and cancelled_at is null
          and starts_at >= now() - interval '1 day'
        order by starts_at
        limit 20`,
    ),
  ]);

  const errorMessage = error ? ERROR_MESSAGES[error] ?? 'Не удалось сохранить запись.' : null;
  const createdSync = created && sync ? CREATE_SYNC_MESSAGES[sync] ?? null : null;
  const updatedSync = updated && sync ? UPDATE_SYNC_MESSAGES[sync] ?? null : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Новая запись</h1>
        </div>
        <Link
          href="/admin/schedule"
          className="rounded-lg border border-border px-4 py-2 text-sm transition hover:border-rose hover:text-rose-dark"
        >
          Открыть расписание
        </Link>
      </div>

      {created ? (
        <p className="rounded-lg border border-rose-light bg-rose-light px-4 py-3 text-sm text-rose-dark">
          Запись №{created} сохранена.{createdSync ? ` ${createdSync}` : ''}
        </p>
      ) : null}

      {updated ? (
        <p className="rounded-lg border border-rose-light bg-rose-light px-4 py-3 text-sm text-rose-dark">
          Запись №{updated} обновлена.{updatedSync ? ` ${updatedSync}` : ''}
        </p>
      ) : null}

      {cancelled ? (
        <p className="rounded-lg border border-border bg-cream px-4 py-3 text-sm">
          Запись №{cancelled} отменена{sync === 'failed'
            ? ' только в локальной БД: удалить её в DIKIDI не удалось, причина — в подсказке при статусе.'
            : ' — и в локальной БД, и в DIKIDI.'}
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="rounded-lg border border-gold-light bg-gold-light px-4 py-3 text-sm text-gold">
          {errorMessage}
        </p>
      ) : null}

      <form
        action={createAppointment}
        className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Клиент</span>
            <input
              name="clientName"
              required
              minLength={2}
              maxLength={80}
              placeholder="Имя клиента"
              className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">Телефон</span>
            <input
              name="clientPhone"
              required
              type="tel"
              placeholder="+375 29 000-00-00"
              className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
            />
          </label>

          <div className="block text-sm md:col-span-2">
            <span className="mb-1 block text-muted">Услуги (можно выбрать несколько)</span>
            <div className="space-y-2 rounded-lg border border-border bg-white p-3">
              {services.map((service) => (
                <label key={service.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="serviceIds"
                    value={service.id}
                    defaultChecked={service.id === services[0]?.id}
                    className="h-4 w-4 rounded border-border text-rose focus:ring-rose"
                  />
                  <span>
                    {service.name} — {Number(service.price)} BYN · {service.duration_min} мин
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Дата</span>
              <DateField
                name="date"
                required
                defaultValue={todayBelarus()}
                className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">Время</span>
              <TimeField
                name="time"
                required
                className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
              />
            </label>
          </div>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-muted">Комментарий (необязательно)</span>
            <textarea
              name="comment"
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="syncToDikidi"
            defaultChecked={dikidiSyncDefault}
            className="h-4 w-4 rounded border-border text-rose focus:ring-rose"
          />
          <span>Дублировать запись в DIKIDI</span>
        </label>

        <button
          type="submit"
          className="mt-5 min-h-11 w-full rounded-lg bg-rose px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-dark sm:w-auto"
        >
          Сохранить запись
        </button>
      </form>
      <p className="mt-1 text-sm text-muted">
        Запись сохраняется в БД. Галочка «Дублировать запись в DIKIDI» отправляет её в кабинет DIKIDI.
        Если время вне графика мастера в DIKIDI или слот уже занят,
        запись останется только в локальной БД — причина будет видна в статусе.
      </p>
      <section>
        <h2 className="font-display text-xl">Последние записи из админки</h2>
        <p className="mt-1 text-sm text-muted">
          Запись уходит в DIKIDI только при включённой галочке: клиент ищется по телефону, при необходимости создаётся, затем создаётся запись. Выбор галочки запоминается для следующих записей. Отменённые записи из этих списков убираются, но остаются в БД.
        </p>

        {upcoming.length === 0 ? (
          <p className="mt-4 rounded-xl border border-border bg-white px-4 py-6 text-sm text-muted">
            Пока нет записей, созданных через админку.
          </p>
        ) : (
          <>
            <div className="mt-4 space-y-2 md:hidden">
              {upcoming.map((appointment) => {
                const badge = syncBadge(appointment);
                const startsAt = new Date(appointment.starts_at);

                return (
                  <article
                    key={appointment.id}
                    className="rounded-xl border border-border bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{appointment.client_name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {shortDate(startsAt)} · {belarusTime(startsAt)} ·{' '}
                          {Number(appointment.price)} BYN
                        </p>
                      </div>
                      <span
                        title={appointment.sync_error ?? undefined}
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <p className="mt-2 break-words text-sm text-muted">
                      {appointment.service_name}
                    </p>
                    <a
                      href={`tel:${appointment.client_phone}`}
                      className="mt-1 block text-sm text-charcoal"
                    >
                      {appointment.client_phone}
                    </a>
                    {appointment.sync_error ? (
                      <p className="mt-1 break-words text-xs text-muted">
                        {appointment.sync_error}
                      </p>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/admin/appointments/${appointment.id}`}
                        className="flex min-h-10 flex-1 items-center justify-center rounded-lg border border-border bg-cream/40 px-3 text-xs transition hover:border-rose hover:bg-cream hover:text-rose-dark"
                      >
                        Изменить
                      </Link>
                      <form action={cancelAppointment} className="flex-1">
                        <input type="hidden" name="appointmentId" value={appointment.id} />
                        <input type="hidden" name="backTo" value="/admin/new" />
                        <button
                          type="submit"
                          className="min-h-10 w-full rounded-lg border border-border bg-cream/40 px-3 text-xs text-muted transition hover:border-rose hover:bg-cream hover:text-rose-dark"
                        >
                          Отменить
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border bg-white md:block">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Дата</th>
                    <th className="px-4 py-2 font-medium">Время</th>
                    <th className="px-4 py-2 font-medium">Клиент</th>
                    <th className="px-4 py-2 font-medium">Телефон</th>
                    <th className="px-4 py-2 font-medium">Услуга</th>
                    <th className="px-4 py-2 font-medium">Сумма</th>
                    <th className="px-4 py-2 font-medium">DIKIDI</th>
                    <th className="px-4 py-2 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {upcoming.map((appointment) => {
                    const badge = syncBadge(appointment);
                    const startsAt = new Date(appointment.starts_at);

                    return (
                      <tr key={appointment.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {shortDate(startsAt)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {belarusTime(startsAt)}
                        </td>
                        <td className="px-4 py-2">{appointment.client_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-muted">
                          {appointment.client_phone}
                        </td>
                        <td className="px-4 py-2">{appointment.service_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {Number(appointment.price)} BYN
                        </td>
                        <td className="px-4 py-2">
                          <span
                            title={appointment.sync_error ?? undefined}
                            className={`inline-block rounded-full px-2 py-0.5 text-xs ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          {appointment.sync_error ? (
                            <p className="mt-1 max-w-[260px] whitespace-normal text-xs text-muted">
                              {appointment.sync_error}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                            <Link
                              href={`/admin/appointments/${appointment.id}`}
                              className="rounded-lg border border-border px-2.5 py-1 text-xs transition hover:border-rose hover:text-rose-dark"
                            >
                              Изменить
                            </Link>
                            <form action={cancelAppointment}>
                              <input type="hidden" name="appointmentId" value={appointment.id} />
                              <input type="hidden" name="backTo" value="/admin/new" />
                              <button
                                type="submit"
                                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:border-rose hover:text-rose-dark"
                              >
                                Отменить
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
