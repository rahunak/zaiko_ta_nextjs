import { query } from '@/lib/db';
import { belarusLongDate, belarusTime } from '@/lib/dikidi/time';
import {
  sendTelegramMessage,
  sendTelegramMessageDetailed,
  sendTelegramToChatDetailed,
  type TelegramSendResult,
} from '@/lib/telegram';
import { CLIENT_REMINDER_HOURS, clientReminderText } from './client-reminders';

/**
 * Очередь напоминаний в Postgres.
 *
 * Источник правды — таблица `reminders`: одна строка = одно будущее сообщение.
 * Планировщик (cron-job.org / QStash / кнопка в админке) не хранит состояния, его
 * задача — раз в несколько минут дёрнуть эндпоинт. Всё остальное делает `runDispatch`:
 *
 *   1. журнал запуска в `cron_runs` и предупреждение мастеру о разрыве;
 *   2. reaper — возвращает в работу строки, зависшие в `claimed`;
 *   3. ensure — создаёт/сдвигает строки по текущему состоянию `appointments`
 *      (поэтому отдельные хуки при создании, переносе и отмене записи не нужны);
 *   4. отменяет строки отменённых и прошедших записей;
 *   5. атомарно захватывает пачку (`for update skip locked`) и отправляет.
 *
 * Двойная отправка закрыта тремя уровнями: `unique (appointment_id, kind)`,
 * захват строки и проверка состояния записи перед отправкой.
 */

/** Напоминание мастеру: «через час приём». */
export const MASTER_REMINDER_MINUTES = 60;

/** Одно напоминание каждого вида на запись. */
export type ReminderKind = 'master_t60' | 'client_t60';

type ReminderKindConfig = {
  kind: ReminderKind;
  /** За сколько минут до визита отправлять. */
  leadMinutes: number;
  audience: 'master' | 'client';
};

/**
 * Виды напоминаний. Новый вид (например, `client_t24h`) добавляется одной строкой:
 * ensure создаст строки сам, диспетчер отправит их тем же кодом.
 */
export const REMINDER_KINDS: readonly ReminderKindConfig[] = [
  { kind: 'master_t60', leadMinutes: MASTER_REMINDER_MINUTES, audience: 'master' },
  {
    kind: 'client_t60',
    leadMinutes: CLIENT_REMINDER_HOURS * 60,
    audience: 'client',
  },
];

/** Сколько раз пробуем отправить транзиентно падающее напоминание. */
const MAX_ATTEMPTS = 5;

/** Пачка за один тик: последовательные отправки должны уложиться в 30 секунд cron-job.org. */
const BATCH_LIMIT = 20;

/** Пауза между отправками: Telegram просит не больше ~30 сообщений в секунду суммарно. */
const SEND_PAUSE_MS = 50;

/** Backoff по номеру попытки (1 → 1 мин, 2 → 5 мин, …). */
const BACKOFF_MINUTES = [1, 5, 15, 60];

/** Зависшую строку возвращаем в работу через 10 минут. */
const REAPER_AFTER_MINUTES = 10;

/** Если прошлый успешный тик был раньше, мастер получает предупреждение. */
const GAP_ALERT_MINUTES = 120;

const SOURCE_PATTERN = /^[a-z0-9_-]{1,20}$/i;

type ReminderRow = {
  id: string;
  appointment_id: string;
  kind: string;
  due_at: Date;
  attempts: number;
};

type AppointmentRow = {
  id: string;
  client_name: string;
  service_name: string;
  starts_at: Date;
  cancelled_at: Date | null;
  client_chat_id: string | null;
};

export type ReminderOutcome = 'sent' | 'retry' | 'rate_limited' | 'failed' | 'skipped' | 'cancelled';

export type DispatchSummary = {
  run: number;
  source: string;
  picked: number;
  sent: number;
  failed: number;
  skipped: number;
  cancelled: number;
  retried: number;
  /** Сколько минут прошло с прошлого успешного тика (null — успешных ещё не было). */
  gapMinutes: number | null;
};

export function normalizeSource(source: string | undefined): string {
  const value = (source ?? '').trim();
  return SOURCE_PATTERN.test(value) ? value.toLowerCase() : 'external';
}

async function startRun(source: string): Promise<number> {
  const { rows } = await query<{ id: string }>(
    'insert into cron_runs (source) values ($1) returning id',
    [source],
  );
  return Number(rows[0].id);
}

type FinishInput = {
  picked: number;
  sent: number;
  failed: number;
  error?: string | null;
};

async function finishRun(runId: number, input: FinishInput): Promise<void> {
  await query(
    `update cron_runs
        set finished_at = now(), picked = $2, sent = $3, failed = $4, error = $5
      where id = $1`,
    [runId, input.picked, input.sent, input.failed, input.error ?? null],
  );
}

/** Минуты с последнего успешного тика. `null` — успешных запусков ещё не было. */
async function minutesSinceLastSuccess(): Promise<number | null> {
  const { rows } = await query<{ minutes: number | null }>(
    `select extract(epoch from (now() - max(finished_at)))::float8 / 60 as minutes
       from cron_runs
      where finished_at is not null and error is null`,
  );
  const value = rows[0]?.minutes;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Возвращает в работу строки, которые остались `claimed`: процесс убит между
 * захватом и отправкой. Без этого они не отправятся никогда.
 */
async function reapStuckReminders(): Promise<number> {
  const { rowCount } = await query(
    `update reminders
        set status = case when attempts >= $1 then 'failed' else 'pending' end,
            claimed_at = null,
            next_attempt_at = now(),
            last_error = coalesce(last_error, 'reaper: строка зависла в claimed'),
            updated_at = now()
      where status = 'claimed'
        and claimed_at < now() - make_interval(mins => $2::int)`,
    [MAX_ATTEMPTS, REAPER_AFTER_MINUTES],
  );
  return rowCount ?? 0;
}

/**
 * Создаёт недостающие строки и сдвигает `due_at` у ещё не отправленных.
 *
 * Именно поэтому в брони, правке и отмене нет хуков: тик сам видит актуальное
 * состояние `appointments`. Строки `sent`/`failed`/`cancelled` не трогаем —
 * иначе перенос времени заставлял бы отправлять напоминание повторно.
 */
async function materializeReminders(): Promise<number> {
  let touched = 0;

  for (const config of REMINDER_KINDS) {
    const { rowCount } = await query(
      `insert into reminders (appointment_id, kind, due_at)
       select a.id, $1, a.starts_at - make_interval(mins => $2::int)
         from appointments a
        where a.cancelled_at is null
          and a.starts_at > now()
          and a.starts_at <= now() + interval '60 days'
       on conflict (appointment_id, kind) do update
          set due_at = excluded.due_at,
              updated_at = now()
        where reminders.status = 'pending'`,
      [config.kind, config.leadMinutes],
    );
    touched += rowCount ?? 0;
  }

  return touched;
}

/**
 * Снимает с очереди строки отменённых записей (`cancelled`) и прошедших визитов
 * (`skipped`). `claimed` не трогаем: строка уже в работе, её разберёт отправитель.
 */
async function cancelStaleReminders(): Promise<number> {
  const { rowCount } = await query(
    `update reminders r
        set status = case when a.cancelled_at is not null then 'cancelled' else 'skipped' end,
            last_error = case
              when a.cancelled_at is not null then 'appointment_cancelled'
              else 'visit_passed'
            end,
            updated_at = now()
       from appointments a
      where a.id = r.appointment_id
        and r.status = 'pending'
        and (a.cancelled_at is not null or a.starts_at <= now())`,
  );
  return rowCount ?? 0;
}

/**
 * Атомарный захват пачки. `for update skip locked` — два параллельных тика берут
 * разные строки, а не одну и ту же; `status = 'pending'` не даёт захватить
 * строку повторно.
 */
async function claimReminders(runId: number, limit: number): Promise<ReminderRow[]> {
  const { rows } = await query<ReminderRow>(
    `with due as (
       select id
         from reminders
        where status = 'pending'
          and due_at <= now()
          and next_attempt_at <= now()
          and attempts < $2
        order by due_at
        limit $3
        for update skip locked
     )
     update reminders r
        set status = 'claimed',
            claimed_at = now(),
            claimed_by = $1,
            attempts = r.attempts + 1,
            updated_at = now()
       from due
      where r.id = due.id
      returning r.id, r.appointment_id, r.kind, r.due_at, r.attempts`,
    [String(runId), MAX_ATTEMPTS, limit],
  );
  return rows;
}

/**
 * Снимает захват с необработанных строк запуска. Нужно при остановке пачки на 429
 * и при исключении: иначе они ждут reaper-а 10 минут.
 */
async function releaseClaimed(claimedBy: string): Promise<number> {
  const { rowCount } = await query(
    `update reminders
        set status = 'pending',
            claimed_at = null,
            claimed_by = null,
            attempts = greatest(attempts - 1, 0),
            updated_at = now()
      where claimed_by = $1 and status = 'claimed'`,
    [claimedBy],
  );
  return rowCount ?? 0;
}

async function loadAppointment(id: string): Promise<AppointmentRow | null> {
  const { rows } = await query<AppointmentRow>(
    `select id, client_name, service_name, starts_at, cancelled_at, client_chat_id
       from appointments
      where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

function reminderText(kind: string, appointment: AppointmentRow): string {
  if (kind === 'client_t60') {
    return clientReminderText(appointment);
  }

  const startsAt = new Date(appointment.starts_at);
  return `У вас запись: ${appointment.client_name} — ${appointment.service_name}, ${belarusLongDate(startsAt)} в ${belarusTime(startsAt)}.`;
}

/**
 * Постоянная ошибка именно чата: бот заблокирован, чат удалён, пользователь
 * деактивирован. Только в этом случае отвязываем `client_chat_id` — при ошибке
 * текста подписку клиента терять незачем.
 */
function isChatGone(result: TelegramSendResult): boolean {
  if (result.status === 403) {
    return true;
  }
  const description = (result.description ?? '').toLowerCase();
  return ['chat not found', 'blocked', 'deactivated', 'peer_id_invalid', 'kicked'].some(
    (marker) => description.includes(marker),
  );
}

async function markFinal(
  id: string,
  status: 'failed' | 'skipped' | 'cancelled',
  note: string,
): Promise<ReminderOutcome> {
  await query(
    `update reminders
        set status = $2, last_error = $3, claimed_at = null, updated_at = now()
      where id = $1`,
    [id, status, note.slice(0, 500)],
  );
  return status;
}

/**
 * Отправляет одну захваченную строку и записывает результат.
 * Перед отправкой перечитывает запись: за время между ensure и тиком её могли
 * отменить или перенести.
 */
async function processReminder(row: ReminderRow): Promise<ReminderOutcome> {
  const appointment = await loadAppointment(row.appointment_id);

  if (!appointment) {
    return markFinal(row.id, 'failed', 'appointment_not_found');
  }
  if (appointment.cancelled_at) {
    return markFinal(row.id, 'cancelled', 'appointment_cancelled');
  }
  if (new Date(appointment.starts_at).getTime() <= Date.now()) {
    return markFinal(row.id, 'skipped', 'visit_passed');
  }
  if (row.kind === 'client_t60' && !appointment.client_chat_id) {
    // Клиент не нажал /start — напоминать некуда. Если нажмёт позже, вебхук
    // вернёт строку в pending и отправит её сразу.
    return markFinal(row.id, 'skipped', 'no_subscription');
  }

  const text = reminderText(row.kind, appointment);

  const result =
    row.kind === 'client_t60'
      ? await sendTelegramToChatDetailed(appointment.client_chat_id as string, text)
      : await sendTelegramMessageDetailed(text);

  if (result.ok) {
    await query(
      `update reminders
          set status = 'sent', sent_at = now(), telegram_message_id = $2,
              last_error = $3, claimed_at = null, updated_at = now()
        where id = $1`,
      [row.id, result.messageId, result.description ?? null],
    );
    return 'sent';
  }

  // 429: ждём столько, сколько просит Telegram, и останавливаем пачку.
  if (result.retryAfterSec) {
    await query(
      `update reminders
          set status = 'pending', claimed_at = null, claimed_by = null,
              next_attempt_at = now() + make_interval(secs => $2::int),
              last_error = $3, updated_at = now()
        where id = $1`,
      [row.id, result.retryAfterSec + 5, `429: ${result.description ?? 'too many requests'}`],
    );
    return 'rate_limited';
  }

  if (result.retryable && row.attempts < MAX_ATTEMPTS) {
    const delay = BACKOFF_MINUTES[Math.min(row.attempts - 1, BACKOFF_MINUTES.length - 1)];
    await query(
      `update reminders
          set status = 'pending', claimed_at = null, claimed_by = null,
              next_attempt_at = now() + make_interval(mins => $2::int),
              last_error = $3, updated_at = now()
        where id = $1`,
      [row.id, delay, result.description ?? 'retry'],
    );
    return 'retry';
  }

  if (row.kind === 'client_t60' && isChatGone(result)) {
    await query('update appointments set client_chat_id = null where id = $1', [appointment.id]);
  }

  return markFinal(row.id, 'failed', result.description ?? 'send_failed');
}

/** Захватить конкретную строку и отправить: используется вебхуком при /start. */
export async function sendReminderNow(
  id: string,
  claimedBy: string,
): Promise<ReminderOutcome | 'not_claimable'> {
  const { rows } = await query<ReminderRow>(
    `update reminders
        set status = 'claimed', claimed_at = now(), claimed_by = $2,
            attempts = attempts + 1, updated_at = now()
      where id = $1 and status = 'pending' and attempts < $3
      returning id, appointment_id, kind, due_at, attempts`,
    [id, claimedBy, MAX_ATTEMPTS],
  );

  const row = rows[0];
  if (!row) {
    return 'not_claimable';
  }
  return processReminder(row);
}

/**
 * Создаёт строку напоминания для конкретной записи (вебхук после /start).
 * Существующую строку не сбрасывает: за это отвечает `resetReminder`.
 */
export async function ensureReminder(
  appointmentId: number,
  kind: ReminderKind,
): Promise<{ id: string; status: string; due_at: Date } | null> {
  const config = REMINDER_KINDS.find((item) => item.kind === kind);
  if (!config) {
    return null;
  }

  const { rows } = await query<{ id: string; status: string; due_at: Date }>(
    `insert into reminders (appointment_id, kind, due_at)
     select a.id, $2, a.starts_at - make_interval(mins => $3::int)
       from appointments a
      where a.id = $1 and a.cancelled_at is null
     on conflict (appointment_id, kind) do nothing
     returning id, status, due_at`,
    [appointmentId, kind, config.leadMinutes],
  );

  if (rows[0]) {
    return rows[0];
  }

  const { rows: existing } = await query<{ id: string; status: string; due_at: Date }>(
    'select id, status, due_at from reminders where appointment_id = $1 and kind = $2',
    [appointmentId, kind],
  );
  return existing[0] ?? null;
}

/** Вернуть строку в работу (кнопка «Переотправить» и повторный /start). */
export async function resetReminder(
  id: string,
  statuses: Array<'pending' | 'failed' | 'skipped'> = ['failed', 'skipped'],
): Promise<boolean> {
  const { rowCount } = await query(
    `update reminders
        set status = 'pending', attempts = 0, next_attempt_at = now(),
            claimed_at = null, claimed_by = null, sent_at = null,
            telegram_message_id = null, last_error = null, updated_at = now()
      where id = $1 and status = any($2::text[])`,
    [id, statuses],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Один тик: то, что дёргает внешний планировщик, админка и вебхук.
 * Возвращает счётчики, чтобы вызывающий мог их показать или записать в лог.
 */
export async function runDispatch(input: { source?: string } = {}): Promise<DispatchSummary> {
  const source = normalizeSource(input.source);
  const gapMinutes = await minutesSinceLastSuccess();
  const runId = await startRun(source);

  let picked = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let cancelled = 0;
  let retried = 0;

  try {
    await reapStuckReminders();
    await materializeReminders();
    await cancelStaleReminders();

    const batch = await claimReminders(runId, BATCH_LIMIT);
    picked = batch.length;

    for (let index = 0; index < batch.length; index += 1) {
      const row = batch[index];
      const outcome = await processReminder(row);

      if (outcome === 'sent') sent += 1;
      else if (outcome === 'failed') failed += 1;
      else if (outcome === 'skipped') skipped += 1;
      else if (outcome === 'cancelled') cancelled += 1;
      else retried += 1;

      if (outcome === 'rate_limited') {
        // Telegram попросил подождать — остаток пачки не трогаем до следующего тика.
        await releaseClaimed(String(runId));
        break;
      }

      if (index < batch.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, SEND_PAUSE_MS));
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await releaseClaimed(String(runId));
    } catch {
      // Освобождение не должно скрывать исходную ошибку: строки подберёт reaper.
    }
    try {
      await finishRun(runId, { picked, sent, failed, error: message.slice(0, 500) });
    } catch {
      // Журнал недоступен по той же причине, что и основной сбой.
    }
    throw error;
  }

  await finishRun(runId, { picked, sent, failed });

  // Разрыв > 2 часов: система молчала. Пишем мастеру один раз — следующий тик
  // закроет разрыв своим `finished_at`.
  if (gapMinutes !== null && gapMinutes >= GAP_ALERT_MINUTES) {
    const hours = Math.max(1, Math.round(gapMinutes / 60));
    try {
      await sendTelegramMessage(
        `Напоминания не работали ${hours} ч.\nДогнал очередь: отправлено ${sent}, ошибок ${failed}. Проверьте /admin/reminders.`,
      );
    } catch {
      // Предупреждение не должно ломать тик.
    }
  }

  return { run: runId, source, picked, sent, failed, skipped, cancelled, retried, gapMinutes };
}

// --- Данные для страницы /admin/reminders ---

export type ReminderTicketRow = {
  id: string;
  kind: string;
  status: string;
  due_at: Date;
  attempts: number;
  last_error: string | null;
  appointment_id: string;
  client_name: string;
  service_name: string;
  starts_at: Date;
};

export type CronRunRow = {
  id: string;
  source: string;
  started_at: Date;
  finished_at: Date | null;
  picked: number;
  sent: number;
  failed: number;
  error: string | null;
};

export type RemindersOverview = {
  counters: Array<{ status: string; count: number }>;
  upcoming: ReminderTicketRow[];
  problems: ReminderTicketRow[];
  runs: CronRunRow[];
  lastSuccessMinutes: number | null;
};

export async function remindersOverview(): Promise<RemindersOverview> {
  const ticketColumns = `r.id, r.kind, r.status, r.due_at, r.attempts, r.last_error,
                         a.id as appointment_id, a.client_name, a.service_name, a.starts_at`;

  const [counters, upcoming, problems, runs, lastSuccess] = await Promise.all([
    query<{ status: string; count: number }>(
      `select status, count(*)::int as count
         from reminders
        where due_at > now() - interval '30 days'
        group by status
        order by status`,
    ),
    query<ReminderTicketRow>(
      `select ${ticketColumns}
         from reminders r
         join appointments a on a.id = r.appointment_id
        where r.status in ('pending', 'claimed')
          and a.starts_at > now()
        order by r.due_at
        limit 20`,
    ),
    query<ReminderTicketRow>(
      `select ${ticketColumns}
         from reminders r
         join appointments a on a.id = r.appointment_id
        where r.status in ('failed', 'skipped')
          and a.starts_at > now()
        order by r.due_at
        limit 50`,
    ),
    query<CronRunRow>(
      `select id, source, started_at, finished_at, picked, sent, failed, error
         from cron_runs
        order by id desc
        limit 20`,
    ),
    query<{ minutes: number | null }>(
      `select extract(epoch from (now() - max(finished_at)))::float8 / 60 as minutes
         from cron_runs
        where finished_at is not null and error is null`,
    ),
  ]);

  const minutes = lastSuccess.rows[0]?.minutes;

  return {
    counters: counters.rows,
    upcoming: upcoming.rows,
    problems: problems.rows,
    runs: runs.rows,
    lastSuccessMinutes: typeof minutes === 'number' && Number.isFinite(minutes) ? minutes : null,
  };
}
