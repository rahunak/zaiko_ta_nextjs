'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { verifyPassword } from '@/lib/auth/password';
import {
  createSession,
  destroySession,
  requireUser,
} from '@/lib/auth/session';
import { query } from '@/lib/db';
import { checkDikidiSlot } from '@/lib/dikidi/availability';
import { removeDikidiRecord, sendAppointmentToDikidi } from '@/lib/dikidi/send';
import { belarusDateKey, belarusTime, toBelarusDate } from '@/lib/dikidi/time';

const PHONE_PATTERN = /^\+?\d[\d\s()-]{6,19}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function fail(code: string): never {
  redirect(`/admin/login?error=${code}`);
}

export async function loginAction(formData: FormData): Promise<void> {
  const login = String(formData.get('login') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!login || !password) {
    fail('empty');
  }

  const { rows } = await query<{ id: string; password_hash: string }>(
    'select id, password_hash from admin_users where login = $1',
    [login],
  );

  const user = rows[0];
  const valid = user ? await verifyPassword(password, user.password_hash) : false;

  if (!user || !valid) {
    // Небольшая задержка выравнивает время ответа для несуществующего логина.
    await new Promise((resolve) => setTimeout(resolve, 300));
    fail('invalid');
  }

  await createSession(Number(user.id));
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/admin/login');
}

export async function createAppointment(formData: FormData): Promise<void> {
  const user = await requireUser();

  const clientName = String(formData.get('clientName') ?? '').trim();
  const clientPhone = String(formData.get('clientPhone') ?? '').trim();
  const serviceId = String(formData.get('serviceId') ?? '').trim();
  const date = String(formData.get('date') ?? '').trim();
  const time = String(formData.get('time') ?? '').trim();
  const comment = String(formData.get('comment') ?? '').trim();
  const syncToDikidi = formData.get('syncToDikidi') === 'on';

  if (clientName.length < 2 || clientName.length > 80) {
    redirect('/admin?error=invalid_name');
  }
  if (!PHONE_PATTERN.test(clientPhone)) {
    redirect('/admin?error=invalid_phone');
  }
  if (comment.length > 500) {
    redirect('/admin?error=comment_too_long');
  }
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) {
    redirect('/admin?error=invalid_datetime');
  }

  const startsAt = toBelarusDate(date, time);
  if (!startsAt) {
    redirect('/admin?error=invalid_datetime');
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
    redirect('/admin?error=invalid_service');
  }

  const { rows: inserted } = await query<{ id: string }>(
    `insert into appointments
       (client_name, client_phone, service_id, service_name, starts_at,
        duration_min, price, comment, source, sync_status, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'admin', 'local', $9)
     returning id`,
    [
      clientName,
      clientPhone,
      Number(service.id),
      service.name,
      startsAt,
      service.duration_min,
      Number(service.price),
      comment,
      user.id,
    ],
  );

  const appointmentId = Number(inserted[0].id);

  // Сохраняем выбор пользователя: дублировать ли запись в DIKIDI.
  const cookieStore = await cookies();
  cookieStore.set('zaiko_dikidi_sync', syncToDikidi ? '1' : '0', {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  // Отправка в DIKIDI через api-anything — только если пользователь поставил галочку.
  if (syncToDikidi) {
    // Предпроверка графика: вне окна мастера DIKIDI отказывает без внятной причины,
    // поэтому заранее оставляем запись локальной и пишем причину в sync_error.
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

      revalidatePath('/admin');
      revalidatePath('/admin/schedule');
      redirect(`/admin?created=${appointmentId}&sync=local`);
    }

    const sendResult = await sendAppointmentToDikidi({
      clientName,
      clientPhone,
      serviceName: service.name,
      dikidiServiceId: service.dikidi_service_id,
      startsAt,
      durationMin: service.duration_min,
      price: Number(service.price),
      comment,
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
  redirect(`/admin?created=${appointmentId}`);
}

type StoredAppointment = {
  id: string;
  client_name: string;
  client_phone: string;
  service_id: string | null;
  starts_at: Date;
  dikidi_id: string | null;
  sync_status: 'local' | 'synced' | 'failed';
};

/** Куда возвращать пользователя после действия — только свои страницы. */
function safeBackTo(value: string | null, fallback = '/admin'): string {
  return value && value.startsWith('/admin') ? value : fallback;
}

/**
 * Отмена записи.
 *
 * Локальная запись помечается `cancelled_at` и выпадает из расписания, но остаётся в БД.
 * Если запись была в DIKIDI, удаляем её и там; ошибка удаления не отменяет локальную отмену,
 * а сохраняется в `sync_error` и показывается пользователю.
 */
export async function cancelAppointment(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get('appointmentId') ?? 0);
  const backTo = safeBackTo(String(formData.get('backTo') ?? ''), '/admin/schedule');

  if (!Number.isFinite(id) || id <= 0) {
    redirect(`${backTo}?error=invalid_id`);
  }

  const { rows } = await query<StoredAppointment>(
    `select id, client_name, client_phone, service_id, starts_at, dikidi_id, sync_status
       from appointments
      where id = $1 and source = 'admin' and cancelled_at is null`,
    [id],
  );

  const appointment = rows[0];

  if (!appointment) {
    redirect(`${backTo}?error=not_found`);
  }

  let dikidiError: string | null = null;

  if (appointment.dikidi_id) {
    const removed = await removeDikidiRecord(appointment.dikidi_id);
    if (removed.status === 'failed') {
      dikidiError = removed.error.slice(0, 500);
    }
  }

  await query(
    `update appointments
        set cancelled_at = now(),
            cancelled_source = 'admin',
            updated_at = now(),
            sync_error = $2
      where id = $1`,
    [id, dikidiError],
  );

  revalidatePath('/admin');
  revalidatePath('/admin/schedule');

  redirect(`${backTo}?cancelled=${id}${dikidiError ? '&sync=failed' : ''}`);
}

/**
 * Правка записи из админки.
 *
 * Без галочки правка остаётся в БД. С галочкой:
 * - у записи уже есть `dikidi_id` — DIKIDI обновляется той же записью (`master-records-update`);
 * - `dikidi_id` нет — запись создаётся в DIKIDI, id сохраняется в БД (повторная отправка).
 * Перед отправкой проверяется график мастера: вне окна запись остаётся локальной с причиной.
 */
export async function updateAppointment(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get('appointmentId') ?? 0);
  const clientName = String(formData.get('clientName') ?? '').trim();
  const clientPhone = String(formData.get('clientPhone') ?? '').trim();
  const serviceId = String(formData.get('serviceId') ?? '').trim();
  const date = String(formData.get('date') ?? '').trim();
  const time = String(formData.get('time') ?? '').trim();
  const comment = String(formData.get('comment') ?? '').trim();
  const syncToDikidi = formData.get('syncToDikidi') === 'on';
  const editPath = `/admin/appointments/${id}`;

  if (!Number.isFinite(id) || id <= 0) {
    redirect('/admin?error=invalid_id');
  }
  if (clientName.length < 2 || clientName.length > 80) {
    redirect(`${editPath}?error=invalid_name`);
  }
  if (!PHONE_PATTERN.test(clientPhone)) {
    redirect(`${editPath}?error=invalid_phone`);
  }
  if (comment.length > 500) {
    redirect(`${editPath}?error=comment_too_long`);
  }
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) {
    redirect(`${editPath}?error=invalid_datetime`);
  }

  const startsAt = toBelarusDate(date, time);
  if (!startsAt) {
    redirect(`${editPath}?error=invalid_datetime`);
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
    redirect(`${editPath}?error=invalid_service`);
  }

  const { rows: currentRows } = await query<StoredAppointment>(
    `select id, client_name, client_phone, service_id, starts_at, dikidi_id, sync_status
       from appointments
      where id = $1 and source = 'admin' and cancelled_at is null`,
    [id],
  );

  const current = currentRows[0];
  if (!current) {
    redirect('/admin?error=not_found');
  }

  await query(
    `update appointments
        set client_name = $2,
            client_phone = $3,
            service_id = $4,
            service_name = $5,
            starts_at = $6,
            duration_min = $7,
            price = $8,
            comment = $9,
            updated_at = now()
      where id = $1`,
    [
      id,
      clientName,
      clientPhone,
      Number(service.id),
      service.name,
      startsAt,
      service.duration_min,
      Number(service.price),
      comment,
    ],
  );

  if (!syncToDikidi) {
    revalidatePath('/admin');
    revalidatePath('/admin/schedule');
    redirect(`/admin?updated=${id}&sync=local`);
  }

  const availability = await checkDikidiSlot({
    dateKey: belarusDateKey(startsAt),
    startsAt,
    durationMin: service.duration_min,
    ignoreDikidiId: current.dikidi_id,
  });

  if (availability.verdict === 'blocked') {
    // Если запись уже была в DIKIDI, там осталась старая версия — это честно показываем как
    // ошибку синхронизации, а не как «локальную запись».
    const blockedReason = current.dikidi_id
      ? `${availability.reason} В DIKIDI осталась прежняя версия записи — исправьте время и сохраните с галочкой ещё раз.`
      : availability.reason;

    await query(
      `update appointments set sync_status = $3, sync_error = $2 where id = $1`,
      [id, blockedReason.slice(0, 500), current.dikidi_id ? 'failed' : 'local'],
    );

    revalidatePath('/admin');
    revalidatePath('/admin/schedule');
    redirect(`/admin?updated=${id}&sync=${current.dikidi_id ? 'failed' : 'blocked'}`);
  }

  const sendResult = await sendAppointmentToDikidi({
    clientName,
    clientPhone,
    serviceName: service.name,
    dikidiServiceId: service.dikidi_service_id,
    startsAt,
    durationMin: service.duration_min,
    price: Number(service.price),
    comment,
    dikidiId: current.dikidi_id,
  });

  if (sendResult.status === 'synced') {
    await query(
      `update appointments
          set sync_status = 'synced', sync_error = null, dikidi_id = $2
        where id = $1`,
      [id, sendResult.dikidiId],
    );
  } else {
    await query(
      `update appointments set sync_status = 'failed', sync_error = $2 where id = $1`,
      [id, sendResult.error.slice(0, 500)],
    );
  }

  revalidatePath('/admin');
  revalidatePath('/admin/schedule');

  redirect(`/admin?updated=${id}&sync=${sendResult.status === 'synced' ? 'synced' : 'failed'}`);
}
