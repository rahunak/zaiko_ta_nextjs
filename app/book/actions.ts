'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { createBooking } from '@/lib/booking';
import { notifyMasterAboutBooking } from '@/lib/notifications/booking';
import { checkDikidiSlot } from '@/lib/dikidi/availability';
import { sendAppointmentToDikidi } from '@/lib/dikidi/send';
import { belarusDateKey, toBelarusDate } from '@/lib/dikidi/time';
import { getAppSettings } from '@/lib/settings';
import { withQuery } from '@/lib/url';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function redirectWith(params: Record<string, string | undefined>): never {
  redirect(withQuery('/book', params));
}

/**
 * Телефон принимаем в любом привычном виде: «+375 (29) 123-45-67», «80291234567»,
 * «29.123.45.67». Важно только число цифр — без него нельзя связаться с клиентом.
 */
function isValidPhone(value: string): boolean {
  if (!/^[\d\s()+\-.]{7,25}$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

export async function bookAppointment(formData: FormData): Promise<void> {
  const clientName = String(formData.get('clientName') ?? '').trim();
  const clientPhone = String(formData.get('clientPhone') ?? '').trim();
  const serviceIdsRaw = String(formData.get('serviceIds') ?? '').trim();
  const serviceIds = serviceIdsRaw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => /^\d+$/.test(v));
  const date = String(formData.get('date') ?? '').trim();
  const time = String(formData.get('time') ?? '').trim();
  const comment = String(formData.get('comment') ?? '').trim();

  // Значения возвращаем в URL: после ошибки клиент попадает обратно на сцену 2
  // с выбранными услугами, датой, временем и заполненными полями.
  // Тип объявлен явно: так TypeScript понимает, что после `fail(...)` код недостижим,
  // и сужает `startsAt` до Date.
  const fail: (error: string) => never = (error) =>
    redirectWith({
      error,
      name: clientName || undefined,
      phone: clientPhone || undefined,
      comment: comment || undefined,
      services: serviceIds.join(',') || undefined,
      date: date || undefined,
      time: time || undefined,
    });

  if (clientName.length < 2 || clientName.length > 80) {
    fail('invalid_name');
  }
  if (!isValidPhone(clientPhone)) {
    fail('invalid_phone');
  }
  if (comment.length > 500) {
    fail('comment_too_long');
  }
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) {
    fail('invalid_datetime');
  }

  const startsAt = toBelarusDate(date, time);
  if (!startsAt) {
    fail('invalid_datetime');
  }
  if (startsAt.getTime() <= Date.now()) {
    fail('past_time');
  }

  // Проверка слота и вставка — одна транзакция под локом на дату:
  // два параллельных клиента не займут одно время (см. lib/booking.ts).
  const booking = await createBooking({
    clientName,
    clientPhone,
    comment: comment || 'Онлайн-запись',
    serviceIds: serviceIds.map(Number),
    date,
    time,
    startsAt,
    source: 'online',
  });

  if (!booking.ok) {
    fail(booking.reason);
  }

  const { id: appointmentId, services: serviceRows } = booking;
  const { totalDuration, totalPrice } = booking;
  const serviceName = serviceRows.map((s) => s.name).join(' + ');

  // Мастер должен узнать о записи сразу, а не при следующем открытии админки.
  await notifyMasterAboutBooking({
    id: appointmentId,
    clientName,
    clientPhone,
    serviceName,
    startsAt,
    durationMin: totalDuration,
    price: totalPrice,
    channel: 'online',
  });

  // Дублирование в DIKIDI — только если мастер включил флаг в админке
  // (/admin/availability). По умолчанию запись остаётся локальной.
  const { book_sync_dikidi: syncToDikidi } = await getAppSettings();

  if (syncToDikidi) {
    try {
      // Предпроверка графика: вне окна мастера DIKIDI отказывает без внятной причины,
      // поэтому такая запись остаётся локальной с причиной в sync_error.
      const availability = await checkDikidiSlot({
        dateKey: belarusDateKey(startsAt),
        startsAt,
        durationMin: totalDuration,
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
          serviceName,
          dikidiServiceId: serviceRows[0].dikidi_service_id,
          startsAt,
          durationMin: totalDuration,
          price: totalPrice,
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
    } catch (error) {
      // Ошибка DIKIDI не отменяет запись — она уже создана локально.
      const reason = error instanceof Error ? error.message : String(error);
      try {
        await query(
          `update appointments set sync_status = 'failed', sync_error = $2 where id = $1`,
          [appointmentId, reason.slice(0, 500)],
        );
      } catch {
        // Не роняем ответ формы из-за неудачной записи статуса.
      }
    }
  }

  revalidatePath('/admin');
  revalidatePath('/admin/schedule');

  redirectWith({ booked: String(appointmentId) });
}