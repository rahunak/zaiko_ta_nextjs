/**
 * Диагностика Telegram-уведомлений: мастеру (новая запись, «скоро приём»)
 * и клиенту (напоминание за 2 часа).
 *
 * Скрипт только читает состояние и, по флагу --send, отправляет одно тестовое
 * сообщение. Ничего в БД не меняет, напоминания не рассылает.
 *
 * Запуск (нужны прод-переменные окружения):
 *   bun run scripts/telegram-check.ts            # только проверки
 *   bun run scripts/telegram-check.ts --send     # + тестовое сообщение мастеру
 *
 * Переменные берутся из окружения (bun сам подхватывает .env / .env.local),
 * либо передайте их явно:
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... DATABASE_URL=... bun run scripts/telegram-check.ts
 */

import { Pool } from 'pg';

const TELEGRAM_API = 'https://api.telegram.org';
const WANT_SEND = process.argv.includes('--send');

type Status = 'ok' | 'warn' | 'fail';

let failures = 0;

function report(status: Status, title: string, detail?: string): void {
  if (status === 'fail') failures += 1;
  const mark = status === 'ok' ? '✓' : status === 'warn' ? '!' : '✗';
  console.log(`${mark} ${title}${detail ? `\n    ${detail.replace(/\n/g, '\n    ')}` : ''}`);
}

function mask(value: string): string {
  if (value.length <= 10) return '***';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function chatIds(): string[] {
  const raw = process.env.TELEGRAM_CHAT_ID ?? process.env.TELEGRAM_MASTER_CHAT_ID ?? '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

type TelegramResponse = {
  ok: boolean;
  description?: string;
  result?: Record<string, unknown>;
};

async function telegram(method: string, body?: Record<string, unknown>): Promise<TelegramResponse> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return (await response.json()) as TelegramResponse;
}

async function checkEnv(): Promise<void> {
  console.log('\n— Окружение —');

  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  if (!token) {
    report('fail', 'TELEGRAM_BOT_TOKEN не задан', 'Без токена не работают ни уведомления мастеру, ни бот.');
  } else {
    report('ok', `TELEGRAM_BOT_TOKEN задан (${mask(token)})`);
  }

  const ids = chatIds();
  if (ids.length === 0) {
    report(
      'fail',
      'TELEGRAM_CHAT_ID не задан',
      'Нужен числовой chat_id личного чата мастера с ботом (не @username канала).',
    );
  } else {
    const bad = ids.filter((id) => !/^-?\d+$/.test(id));
    report(
      bad.length === 0 ? 'ok' : 'fail',
      `TELEGRAM_CHAT_ID: ${ids.length} получател(ь/я): ${ids.join(', ')}`,
      bad.length ? `Не похоже на chat_id: ${bad.join(', ')}. Узнать: @userinfobot.` : undefined,
    );
  }

  const usernameEnv = (process.env.TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '');
  if (!usernameEnv) {
    report(
      'warn',
      'TELEGRAM_BOT_USERNAME не задан — сайт подставит в кнопку имя по умолчанию `zaiko_ta_bot`',
      'Если бот называется иначе, кнопка «Получить напоминание в Telegram» на /book ведёт в пустоту.',
    );
  } else {
    report('ok', `TELEGRAM_BOT_USERNAME=${usernameEnv}`);
  }

  if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
    report('warn', 'TELEGRAM_WEBHOOK_SECRET не задан', 'Вебхук принимает запросы от кого угодно.');
  } else {
    report('ok', 'TELEGRAM_WEBHOOK_SECRET задан');
  }

  if (!process.env.CRON_SECRET) {
    report(
      'warn',
      'CRON_SECRET не задан — /api/cron/reminders отвечает 503',
      'На serverless (Vercel) встроенный планировщик не работает, поэтому без cron напоминаний не будет.',
    );
  } else {
    report('ok', 'CRON_SECRET задан');
  }
}

async function checkBot(): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  console.log('\n— Bot API —');

  const me = await telegram('getMe');
  if (me.ok) {
    const bot = me.result as { username?: string; first_name?: string };
    report('ok', `Бот доступен: @${bot.username ?? '?'} (${bot.first_name ?? ''})`);
  } else {
    report('fail', 'getMe не прошёл — токен неверный или отозван', me.description);
    return;
  }

  const info = await telegram('getWebhookInfo');
  if (!info.ok) {
    report('fail', 'getWebhookInfo не прошёл', info.description);
  } else {
    const hook = info.result as {
      url?: string;
      pending_update_count?: number;
      last_error_message?: string;
      last_error_date?: number;
    };
    if (!hook.url) {
      report(
        'fail',
        'Вебхук НЕ зарегистрирован — /start в боте ничего не сделает',
        'Нажмите /start в боте, клик не дойдёт до сайта, client_chat_id не запишется.',
      );
    } else {
      report('ok', `Вебхук: ${hook.url}`);
    }

    if (hook.pending_update_count && hook.pending_update_count > 0) {
      report(
        'warn',
        `В очереди ${hook.pending_update_count} необработанных апдейтов`,
        'Обычно значит, что вебхук отвечает ошибкой — проверьте last_error ниже.',
      );
    }
    if (hook.last_error_message) {
      const when = hook.last_error_date ? new Date(hook.last_error_date * 1000).toISOString() : '';
      report('fail', `Последняя ошибка доставки вебхука ${when}`, hook.last_error_message);
    }
  }
}

async function checkMasterDelivery(): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN || chatIds().length === 0) {
    return;
  }

  console.log('\n— Доставка мастеру —');

  for (const chatId of chatIds()) {
    if (!WANT_SEND) {
      // getChat не отправляет сообщение, но показывает, доступен ли чат боту.
      const chat = await telegram('getChat', { chat_id: chatId });
      if (chat.ok) {
        const result = chat.result as { type?: string; username?: string; first_name?: string };
        report('ok', `chat_id ${chatId} доступен (${result.type ?? '?'})`);
      } else {
        report(
          'fail',
          `chat_id ${chatId} недоступен: ${chat.description ?? 'ошибка'}`,
          'Частая причина: мастер ни разу не нажал /start у этого бота (бот не может писать первым).',
        );
      }
      continue;
    }

    const sent = await telegram('sendMessage', {
      chat_id: chatId,
      text: 'Проверка уведомлений: канал «мастер» работает.',
    });
    report(
      sent.ok ? 'ok' : 'fail',
      `Тестовое сообщение мастеру (chat_id ${chatId})`,
      sent.ok ? undefined : sent.description,
    );
  }

  if (!WANT_SEND) {
    console.log('    (тестовое сообщение не отправлялось — добавьте --send)');
  }
}

type AppointmentRow = {
  id: string;
  client_name: string;
  service_name: string;
  starts_at: Date;
  client_chat_id: string | null;
  reminder_sent_at: Date | null;
  client_reminder_sent_at: Date | null;
};

const REQUIRED_COLUMNS = [
  'reminder_sent_at',
  'client_token',
  'client_chat_id',
  'client_reminder_sent_at',
];

async function checkDatabase(): Promise<void> {
  console.log('\n— База данных —');

  if (!process.env.DATABASE_URL) {
    report(
      'warn',
      'DATABASE_URL не задан — проверка БД пропущена',
      'Скрипт подключится по локальному значению по умолчанию; для прода передайте строку подключения.',
    );
  }

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgres://zaiko:zaiko_dev_password@127.0.0.1:5434/zaiko_admin',
    max: 2,
    connectionTimeoutMillis: 10_000,
  });

  try {
    const columns = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'appointments'`,
    );
    const present = new Set(columns.rows.map((row) => row.column_name));
    const missing = REQUIRED_COLUMNS.filter((column) => !present.has(column));

    if (missing.length > 0) {
      report(
        'fail',
        `В таблице appointments нет колонок: ${missing.join(', ')}`,
        'Примените схему: bun run db:init (идемпотентно).',
      );
      return;
    }
    report('ok', 'Колонки напоминаний в appointments на месте');

    const upcoming = await pool.query<AppointmentRow>(
      `select id, client_name, service_name, starts_at,
              client_chat_id, reminder_sent_at, client_reminder_sent_at
         from appointments
        where cancelled_at is null
          and starts_at > now()
        order by starts_at
        limit 20`,
    );

    if (upcoming.rows.length === 0) {
      report('warn', 'Будущих записей нет — проверять нечего', 'Создайте запись на /book.');
      return;
    }

    const now = Date.now();
    const connected = upcoming.rows.filter((row) => row.client_chat_id);
    report(
      connected.length > 0 ? 'ok' : 'warn',
      `Записей с привязанным Telegram-клиентом: ${connected.length} из ${upcoming.rows.length}`,
      connected.length === 0
        ? 'Ни один клиент не нажал /start — напоминания клиентам отправлять некому.'
        : undefined,
    );

    for (const row of upcoming.rows) {
      const hoursLeft = (new Date(row.starts_at).getTime() - now) / 3_600_000;
      const masterDue = hoursLeft <= 1 && !row.reminder_sent_at;
      const clientDue = hoursLeft <= 2 && row.client_chat_id && !row.client_reminder_sent_at;
      const flags = [
        masterDue ? 'мастеру пора' : row.reminder_sent_at ? 'мастеру отправлено' : '',
        !row.client_chat_id
          ? 'клиент без Telegram'
          : clientDue
            ? 'клиенту пора'
            : row.client_reminder_sent_at
              ? 'клиенту отправлено'
              : '',
      ]
        .filter(Boolean)
        .join(' · ');

      console.log(
        `    #${row.id} ${row.client_name} · ${row.service_name} · ${new Date(row.starts_at).toISOString()} (через ${hoursLeft.toFixed(1)} ч) — ${flags}`,
      );
    }

    const dueNow = upcoming.rows.filter(
      (row) =>
        (new Date(row.starts_at).getTime() - now) / 3_600_000 <= 2 &&
        !row.client_reminder_sent_at &&
        row.client_chat_id,
    );
    if (dueNow.length > 0) {
      report(
        'warn',
        `${dueNow.length} клиентск(их/ие) напоминаний(я) должны были уйти прямо сейчас`,
        'Если сообщение не пришло — планировщик не работает (на Vercel нужен cron).',
      );
    }
  } catch (error) {
    report(
      'fail',
      'Не удалось прочитать БД',
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  console.log(`Проверка Telegram-уведомлений zaiko.by${WANT_SEND ? ' (с тестовой отправкой)' : ''}`);

  try {
    await checkEnv();
    await checkBot();
    await checkMasterDelivery();
    await checkDatabase();
  } catch (error) {
    report('fail', 'Проверка прервана', error instanceof Error ? error.message : String(error));
  }

  console.log(
    failures === 0
      ? '\nИтог: критичных проблем не найдено.'
      : `\nИтог: проблем — ${failures}. Подробности выше.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
