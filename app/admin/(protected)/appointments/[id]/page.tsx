import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DateField, TimeField } from '@/components/AdminDateTime';
import { query } from '@/lib/db';
import { belarusDateKey, belarusTime } from '@/lib/dikidi/time';
import { cancelAppointment, updateAppointment } from '../../../actions';

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
  service_id: string | null;
  service_name: string;
  starts_at: Date;
  duration_min: number;
  price: string;
  comment: string;
  sync_status: 'local' | 'synced' | 'failed';
  sync_error: string | null;
  dikidi_id: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_name: 'Имя клиента — от 2 до 80 символов.',
  invalid_phone: 'Телефон в формате +375 XX XXX-XX-XX.',
  invalid_service: 'Выберите услугу из списка.',
  invalid_datetime: 'Укажите дату и время записи.',
  comment_too_long: 'Комментарий длиннее 500 символов.',
};

const SYNC_LABELS: Record<AppointmentRow['sync_status'], string> = {
  local: 'только в БД',
  synced: 'в DIKIDI',
  failed: 'не отправлено',
};

export default async function EditAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const appointmentId = Number(id);

  if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
    notFound();
  }

  const [{ rows: services }, { rows: appointments }, { rows: apptServices }] = await Promise.all([
    query<ServiceRow>(
      `select id, name, price, duration_min
         from services
        where is_active = true
        order by sort_order, name`,
    ),
    query<AppointmentRow>(
      `select id, client_name, client_phone, service_id, service_name, starts_at,
              duration_min, price, comment, sync_status, sync_error, dikidi_id
         from appointments
        where id = $1 and source in ('admin', 'online') and cancelled_at is null`,
      [appointmentId],
    ),
    query<{ service_id: string | null }>(
      `select service_id from appointment_services where appointment_id = $1`,
      [appointmentId],
    ),
  ]);

  const selectedServiceIds = new Set(apptServices.map((r) => String(r.service_id)));

  const appointment = appointments[0];

  if (selectedServiceIds.size === 0 && appointment?.service_id) {
    selectedServiceIds.add(String(appointment.service_id));
  }

  if (!appointment) {
    notFound();
  }

  const startsAt = new Date(appointment.starts_at);
  const errorMessage = error ? ERROR_MESSAGES[error] ?? 'Не удалось сохранить изменения.' : null;
  const willUpdateDikidi = Boolean(appointment.dikidi_id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Запись №{appointment.id}</h1>
          <p className="mt-1 text-sm text-muted">
            {appointment.client_name} · {appointment.client_phone} · {appointment.service_name}
          </p>
        </div>
        <Link
          href="/admin/new"
          className="min-h-10 w-full rounded-lg border border-border px-4 py-2 text-center text-sm transition hover:border-rose hover:text-rose-dark sm:w-auto"
        >
          ← К записям
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span
          title={appointment.sync_error ?? undefined}
          className="inline-block rounded-full bg-cream px-2 py-0.5 text-xs text-muted"
        >
          {SYNC_LABELS[appointment.sync_status]}
        </span>
        {appointment.dikidi_id ? (
          <span className="text-muted">ID в DIKIDI: {appointment.dikidi_id}</span>
        ) : null}
        {appointment.sync_error ? (
          <span className="text-gold">{appointment.sync_error}</span>
        ) : null}
      </div>

      {errorMessage ? (
        <p role="alert" className="rounded-lg border border-gold-light bg-gold-light px-4 py-3 text-sm text-gold">
          {errorMessage}
        </p>
      ) : null}

      <form action={updateAppointment} className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
        <input type="hidden" name="appointmentId" value={appointment.id} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Клиент</span>
            <input
              name="clientName"
              required
              minLength={2}
              maxLength={80}
              defaultValue={appointment.client_name}
              className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">Телефон</span>
            <input
              name="clientPhone"
              required
              type="tel"
              defaultValue={appointment.client_phone}
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
                    defaultChecked={selectedServiceIds.has(service.id)}
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
                defaultValue={belarusDateKey(startsAt)}
                className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">Время</span>
              <TimeField
                name="time"
                required
                defaultValue={belarusTime(startsAt)}
                className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
              />
            </label>
          </div>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-muted">Комментарий</span>
            <textarea
              name="comment"
              rows={2}
              maxLength={500}
              defaultValue={appointment.comment}
              className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
            />
          </label>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="syncToDikidi"
            defaultChecked
            className="mt-0.5 h-4 w-4 rounded border-border text-rose focus:ring-rose"
          />
          <span>
            {willUpdateDikidi
              ? 'Обновить запись в DIKIDI (та же запись, без дубля)'
              : 'Отправить запись в DIKIDI (если ещё не отправлена)'}
            <span className="mt-1 block text-muted">
              Если время вне графика мастера в DIKIDI или слот занят, изменения останутся только в
              локальной БД — причина появится в статусе.
            </span>
          </span>
        </label>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="submit"
            className="min-h-11 w-full rounded-lg bg-rose px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-dark sm:w-auto"
          >
            Сохранить изменения
          </button>
          <Link
            href="/admin/new"
            className="flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-cream/40 px-5 py-2.5 text-sm transition hover:border-rose hover:bg-cream hover:text-rose-dark sm:w-auto"
          >
            Отмена
          </Link>
        </div>
      </form>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-display text-lg">Отмена записи</h2>
        <p className="mt-1 text-sm text-muted">
          Отменённая запись убирается из расписания и списков, но остаётся в БД.
          {appointment.dikidi_id
            ? ' В DIKIDI она тоже будет удалена.'
            : ' В DIKIDI удалять нечего — записи там нет.'}
        </p>
        <form action={cancelAppointment} className="mt-4">
          <input type="hidden" name="appointmentId" value={appointment.id} />
          <input type="hidden" name="backTo" value="/admin/new" />
          <button
            type="submit"
            className="min-h-11 w-full rounded-lg border border-border bg-cream/40 px-5 py-2.5 text-sm text-muted transition hover:border-rose hover:bg-cream hover:text-rose-dark sm:w-auto"
          >
            Отменить запись
          </button>
        </form>
      </section>
    </div>
  );
}
