import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { withTransaction } from '@/lib/db';
import { filterByLeadTime, generateSlots, getWorkingWindow } from '@/lib/availability';
import { getAppSettings } from '@/lib/settings';
import { addDays, toBelarusDate } from '@/lib/dikidi/time';

/**
 * Атомарное создание записи: проверка слота и вставка выполняются в одной
 * транзакции под advisory-локом на дату. Без этого два одновременных клиента
 * проходили проверку и оба попадали на одно время (check-then-insert).
 */

export type BookingServiceRow = {
  id: string;
  name: string;
  price: string;
  duration_min: number;
  dikidi_service_id: string | null;
};

export type CreateBookingInput = {
  clientName: string;
  clientPhone: string;
  comment: string;
  serviceIds: number[];
  date: string;
  time: string;
  startsAt: Date;
  /** admin: создано мастером; online: создано клиентом через /book. */
  source: 'admin' | 'online';
};

export type CreateBookingResult =
  | { ok: true; id: number; services: BookingServiceRow[]; totalDuration: number; totalPrice: number }
  | { ok: false; reason: 'slot_unavailable' | 'invalid_service' };

async function loadServices(client: PoolClient, ids: number[]): Promise<BookingServiceRow[]> {
  const { rows } = await client.query<BookingServiceRow>(
    `select id, name, price, duration_min, dikidi_service_id
       from services
      where id = any($1::bigint[]) and is_active = true`,
    [ids],
  );
  return rows;
}

async function dayAppointments(
  client: PoolClient,
  date: string,
): Promise<Array<{ starts_at: Date; duration_min: number }>> {
  const dayStart = toBelarusDate(date, '00:00');
  const dayEnd = toBelarusDate(addDays(date, 1), '00:00');
  if (!dayStart || !dayEnd) return [];

  const { rows } = await client.query<{ starts_at: Date; duration_min: number }>(
    `select starts_at, duration_min
       from appointments
      where cancelled_at is null
        and starts_at >= $1 and starts_at < $2`,
    [dayStart, dayEnd],
  );
  return rows;
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const window = await getWorkingWindow(input.date);
  const settings = await getAppSettings();

  return withTransaction(async (client) => {
    // Лок на календарный день: параллельные записи на одну дату выполняются по очереди,
    // поэтому вторая транзакция видит уже вставленную первую.
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [
      `zaiko-booking:${input.date}`,
    ]);

    const services = await loadServices(client, input.serviceIds);
    if (services.length === 0 || services.length !== input.serviceIds.length) {
      return { ok: false as const, reason: 'invalid_service' as const };
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration_min, 0);
    const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);

    if (!window) {
      return { ok: false as const, reason: 'slot_unavailable' as const };
    }

    const busy = await dayAppointments(client, input.date);
    // Тот же расчёт, что отдаёт /api/availability: буфер между процедурами
    // и «не раньше чем через N часов».
    const slots = filterByLeadTime(
      generateSlots(window, totalDuration, busy, settings.buffer_min),
      input.date,
      settings.min_lead_hours * 60,
    );
    if (!slots.includes(input.time)) {
      return { ok: false as const, reason: 'slot_unavailable' as const };
    }

    const serviceName = services.map((s) => s.name).join(' + ');

    // Неугадываемый токен для deep-link бота: по нему клиент включает напоминание.
    const clientToken = randomBytes(9).toString('hex');

    const { rows: inserted } = await client.query<{ id: string }>(
      `insert into appointments
         (client_name, client_phone, service_id, service_name, starts_at,
          duration_min, price, comment, source, sync_status, client_token)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'local', $10)
       returning id`,
      [
        input.clientName,
        input.clientPhone,
        Number(services[0].id),
        serviceName,
        input.startsAt,
        totalDuration,
        totalPrice,
        input.comment,
        input.source,
        clientToken,
      ],
    );

    const id = Number(inserted[0].id);

    for (const service of services) {
      await client.query(
        `insert into appointment_services (appointment_id, service_id, service_name, price, duration_min)
         values ($1, $2, $3, $4, $5)`,
        [id, Number(service.id), service.name, Number(service.price), service.duration_min],
      );
    }

    return { ok: true as const, id, services, totalDuration, totalPrice };
  });
}
