import crypto from 'node:crypto';
import { query } from '@/lib/db';
import { fetchDikidiSchedule } from '@/lib/dikidi/source';
import { addDays, belarusDateKey, belarusTime, todayBelarus, toBelarusDate } from '@/lib/dikidi/time';
import { sendTelegramMessage } from '@/lib/telegram';
import type { ScheduleEntry } from '@/lib/dikidi/types';

const SYNC_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Зеркалит записи, пришедшие из журнала DIKIDI, в таблицу `appointments`.
 *
 * Зачем: расписание админки и DIKIDI показывались раздельно, а в БД оставались только
 * локальные записи. После отказа от DIKIDI (или при использовании старых ссылок)
 * мастер терял записи, которые клиенты завели через DIKIDI. Теперь каждая запись из
 * журнала сохраняется в БД со статусом `synced` и привязкой по `dikidi_id`.
 *
 * Идемпотентно: повторный прогон обновляет поля существующей строки, не создаёт дубль
 * (уникальный индекс `appointments.dikidi_id`). Отменённые строки не воскрешаются.
 */
function computeSyncHash(entries: ScheduleEntry[]): string {
  const payload = entries
    .map((entry) => ({
      id: entry.dikidiId,
      name: entry.clientName,
      phone: entry.clientPhone,
      services: entry.services,
      startsAt: entry.startsAtIso,
      duration: entry.durationMin,
      price: entry.price,
      comment: entry.comment,
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function getSyncState(): Promise<{
  lastSyncAt: string | null;
  lastSyncHash: string | null;
} | null> {
  try {
    const { rows } = await query<{ last_sync_at: string | null; last_sync_hash: string | null }>(
      'select last_sync_at, last_sync_hash from dikidi_auth where id = 1',
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return { lastSyncAt: row.last_sync_at, lastSyncHash: row.last_sync_hash };
  } catch {
    return null;
  }
}

async function setSyncState(hash: string): Promise<void> {
  try {
    await query(
      'update dikidi_auth set last_sync_at = now(), last_sync_hash = $1 where id = 1',
      [hash],
    );
  } catch {
    // Без таблицы/колонок состояние не сохранится — синхронизация всё равно выполнится.
  }
}

/**
 * Сохраняет записи DIKIDI в БД только если изменились данные или истёк таймаут
 * (5 минут). Возвращает, была ли выполнена синхронизация.
 */
export async function syncDikidiEntriesIfNeeded(
  entries: ScheduleEntry[],
): Promise<boolean> {
  const state = await getSyncState();
  const hash = computeSyncHash(entries);
  const now = Date.now();
  const lastSyncAt = state?.lastSyncAt ? new Date(state.lastSyncAt).getTime() : 0;
  const timeoutExpired = !lastSyncAt || now - lastSyncAt > SYNC_TIMEOUT_MS;
  const hashChanged = state?.lastSyncHash !== hash;

  if (!timeoutExpired && !hashChanged) {
    return false;
  }

  await syncDikidiEntriesToDb(entries);
  await setSyncState(hash);
  return true;
}

/**
 * Синхронизация на этапе входа в админку: подтягиваем ближайшую неделю из DIKIDI.
 */
export async function syncDikidiOnLogin(): Promise<void> {
  try {
    const today = todayBelarus();
    const result = await fetchDikidiSchedule(today, addDays(today, 6));
    if (result.ok) {
      await syncDikidiEntriesIfNeeded(result.entries);
    }
  } catch {
    // Вход не должен падать из-за синхронизации.
  }
}

export async function syncDikidiEntriesToDb(entries: ScheduleEntry[]): Promise<void> {
  const withId = entries.filter((entry) => Boolean(entry.dikidiId));
  if (withId.length === 0) {
    return;
  }

  const dateKeys = withId.map((entry) => entry.dateKey).filter(Boolean);
  const from = dateKeys.reduce((min, key) => (key < min ? key : min), dateKeys[0]);
  const to = dateKeys.reduce((max, key) => (key > max ? key : max), dateKeys[0]);
  const rangeStart = toBelarusDate(from, '00:00');
  const rangeEnd = toBelarusDate(addDays(to, 1), '00:00');

  // Существующие записи в этом окне — для детекции изменений и отмен клиентом.
  const { rows: existingRows } = await query<{
    id: string;
    dikidi_id: string;
    client_name: string;
    client_phone: string;
    service_name: string;
    starts_at: Date;
    duration_min: number;
  }>(
    `select id, dikidi_id, client_name, client_phone, service_name, starts_at, duration_min
       from appointments
      where dikidi_id is not null
        and cancelled_at is null
        and starts_at >= $1 and starts_at < $2`,
    [rangeStart, rangeEnd],
  );
  const existingByDikidi = new Map(existingRows.map((row) => [row.dikidi_id, row]));
  const incomingIds = new Set(withId.map((entry) => entry.dikidiId as string));

  // 1. Уведомляем о записях, которые клиент изменил в DIKIDI.
  for (const entry of withId) {
    const existing = existingByDikidi.get(entry.dikidiId as string);
    if (!existing) {
      continue;
    }

    const newStartsAt = new Date(entry.startsAtIso);
    if (Number.isNaN(newStartsAt.getTime())) {
      continue;
    }

    const oldStartsAt = new Date(existing.starts_at);
    const durationMin =
      Number.isFinite(entry.durationMin) && entry.durationMin > 0
        ? Math.round(entry.durationMin)
        : 30;
    const serviceName =
      entry.services.filter(Boolean).join(', ') || 'Услуга не указана';
    const clientName = entry.clientName?.trim() || 'Без имени';
    const clientPhone = entry.clientPhone?.trim() || '';

    const changed =
      existing.client_name !== clientName ||
      existing.client_phone !== clientPhone ||
      existing.service_name !== serviceName ||
      oldStartsAt.getTime() !== newStartsAt.getTime() ||
      existing.duration_min !== durationMin;

    if (changed) {
      const oldTime = `${belarusDateKey(oldStartsAt)} ${belarusTime(oldStartsAt)}`;
      const newTime = `${entry.dateKey} ${entry.timeFrom}`;
      await sendTelegramMessage(
        `Клиент изменил запись:\nБыло: ${existing.client_name}, ${existing.service_name}, ${oldTime}\nСтало: ${clientName}, ${serviceName}, ${newTime}`,
      );
    }
  }

  // 2. Зеркалим записи в БД (upsert по dikidi_id).
  for (const entry of withId) {
    const startsAt = new Date(entry.startsAtIso);
    if (Number.isNaN(startsAt.getTime())) {
      continue;
    }

    const durationMin =
      Number.isFinite(entry.durationMin) && entry.durationMin > 0
        ? Math.round(entry.durationMin)
        : 30;
    const price = Number.isFinite(entry.price) ? entry.price : 0;
    const serviceName =
      entry.services.filter(Boolean).join(', ') || 'Услуга не указана';
    const clientName = entry.clientName?.trim() || 'Без имени';
    const clientPhone = entry.clientPhone?.trim() || '';

    const { rows: serviceRows } = await query<{ id: string }>(
      `select id from services
        where is_active = true and lower(name) = lower($1)
        limit 1`,
      [entry.services[0] ?? ''],
    );
    const serviceId = serviceRows[0]?.id ?? null;

    await query(
      `insert into appointments
         (client_name, client_phone, service_id, service_name, starts_at,
          duration_min, price, comment, source, dikidi_id, sync_status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'admin', $9, 'synced')
       on conflict (dikidi_id) do update set
         client_name = excluded.client_name,
         client_phone = excluded.client_phone,
         service_id = coalesce(excluded.service_id, appointments.service_id),
         service_name = excluded.service_name,
         starts_at = excluded.starts_at,
         duration_min = excluded.duration_min,
         price = excluded.price,
         comment = excluded.comment,
         sync_status = 'synced',
         sync_error = null,
         updated_at = now()
       where appointments.cancelled_at is null`,
      [
        clientName,
        clientPhone,
        serviceId,
        serviceName,
        startsAt,
        durationMin,
        price,
        entry.comment ?? '',
        entry.dikidiId,
      ],
    );
  }

  // 3. Записи, которые исчезли из журнала DIKIDI — клиент отменил.
  for (const existing of existingRows) {
    if (incomingIds.has(existing.dikidi_id)) {
      continue;
    }

    await query(
      `update appointments
          set cancelled_at = now(),
              cancelled_source = 'dikidi',
              updated_at = now()
        where id = $1 and cancelled_at is null`,
      [existing.id],
    );

    const startsAt = new Date(existing.starts_at);
    await sendTelegramMessage(
      `Клиент отменил запись: ${existing.client_name}, ${existing.service_name}, ${belarusDateKey(startsAt)} ${belarusTime(startsAt)}.`,
    );
  }
}