'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { checkDikidiSlot } from '@/lib/dikidi/availability';
import { sendAppointmentToDikidi } from '@/lib/dikidi/send';
import { belarusDateKey, toBelarusDate } from '@/lib/dikidi/time';
import { withQuery } from '@/lib/url';

const PHONE_PATTERN = /^\+?\d[\d\s()-]{6,19}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function redirectWith(params: Record<string, string | undefined>): never {
  redirect(withQuery('/book', params));
}

export async function bookAppointment(formData: FormData): Promise<void> {
  const clientName = String(formData.get('clientName') ?? '').trim();
  const clientPhone = String(formData.get('clientPhone') ?? '').trim();
  const serviceId = String(formData.get('serviceId') ?? '').trim();
  const date = String(formData.get('date') ?? '').trim();
  const time = String(formData.get('time') ?? '').trim();
  const comment = String(formData.get('comment') ?? '').trim();

  if (clientName.length < 2 || clientName.length > 80) {
    redirectWith({ error: 'invalid_name' });
  }
  if (!PHONE_PATTERN.test(clientPhone)) {
    redirectWith({ error: 'invalid_phone' });
  }
  if (comment.length > 500) {
    redirectWith({ error: 'comment_too_long' });
  }
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) {
    redirectWith({ error: 'invalid_datetime' });
  }

  const startsAt = toBelarusDate(date, time);
  if (!startsAt) {
    redirectWith({ error: 'invalid_datetime' });
  }
  if (startsAt.getTime() <= Date.now()) {
    redirectWith({ error: 'past_time' });
  }

  const { rows: serviceRows } = await query<{
    id: string;
    name: string;
    price: string;
    duration_min: number;
    dikidi_service_id: string | null;
  }>(
    `select id, name, price, duration_min, dikidi_service_id
       from services
      where id = $1 and is_active = true`,
    [Number(serviceId) || 0],
  );

  const service = serviceRows[0];
  if (!service) {
    redirectWith({ error: 'invalid_service' });
  }

  const { rows: inserted } = await query<{ id: string }>(
    `insert into appointments
       (client_name, client_phone, service_id, service_name, starts_at,
        duration_min, price, comment, source, sync_status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'admin', 'local')
     returning id`,
    [
      clientName,
      clientPhone,
      Number(service.id),
      service.name,
      startsAt,
      service.duration_min,
      Number(service.price),
      comment || 'Онлайн-запись',
    ],
  );

  const appointmentId = Number(inserted[0].id);

  // Пытаемся сразу отправить запись в DIKIDI, чтобы мастер видел её в кабинете.
  // Ошибка отправки не отменяет саму запись — она остаётся в БД.
  const availability = await checkDikidiSlot({
    dateKey: belarusDateKey(startsAt),
    startsAt,
    durationMin: service.duration_min,
  });

  if (availability.verdict === 'blocked') {
    await query(
      `update appointments set sync_status = 'local', sync_error = $2 where id = $1`,
      [appointmentId, availability.reason.slice(0, 500)],
    );
  } else {
    const sendResult = await sendAppointmentToDikidi({
      clientName,
      clientPhone,
      serviceName: service.name,
      dikidiServiceId: service.dikidi_service_id,
      startsAt,
      durationMin: service.duration_min,
      price: Number(service.price),
      comment: comment || 'Онлайн-запись',
    });

    if (sendResult.status === 'synced') {
      await query(
        `update appointments
            set sync_status = 'synced', sync_error = null, dikidi_id = $2
          where id = $1`,
        [appointmentId, sendResult.dikidiId],
      );
    } else if (sendResult.status === 'failed') {
      await query(
        `update appointments set sync_status = 'failed', sync_error = $2 where id = $1`,
        [appointmentId, sendResult.error.slice(0, 500)],
      );
    }
  }

  revalidatePath('/admin');
  revalidatePath('/admin/schedule');

  redirectWith({ booked: String(appointmentId) });
}