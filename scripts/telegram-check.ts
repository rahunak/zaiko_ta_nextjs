/**
 * Диагностика Telegram-уведомлений: мастеру (новая запись, «скоро приём»)
 * и клиенту (напоминание за час).
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

/** Пороги напоминаний: должны совпадать с кодом приложения. */
const MASTER_REMINDER_HOURS = 1;
const CLIENT_REMINDER_HOURS = 1;
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

/** Токен админского бота: уведомления мастеру. */
function masterToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? '';
}

/**
 * Токен бота напоминаний клиентам. Без отдельного токена клиентские
 * напоминания уходят от админского бота, которого клиент не запускал.
 */
function clientToken(): string {
  return process.env.TELEGRAM_CLIENT_BOT_TOKEN || masterToken();
}

async function telegram(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<TelegramResponse> {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return (await response.json()) as TelegramResponse;
}

async function checkEnv(): Promise<void> {
  console.log('\n— Окружение —');

  const token = masterToken();
  if (!token) {
    report(
      'fail',
      'TELEGRAM_BOT_TOKEN не задан (админский бот)',
      'Без него не уходят уведомления мастеру.',
    );
  } else {
    report('ok', `TELEGRAM_BOT_TOKEN задан, админский бот (${mask(token)})`);
  }

  if (!process.env.TELEGRAM_CLIENT_BOT_TOKEN) {
    report(
      'warn',
      'TELEGRAM_CLIENT_BOT_TOKEN не задан — напоминания клиентам пойдут от админского бота',
      'Клиент его не запускал, Telegram ответит «chat not found». Укажите токен zaiko_ta_bot.',
    );
  } else {
    report('ok', `TELEGRAM_CLIENT_BOT_TOKEN задан, бот клиентов (${mask(process.env.TELEGRAM_CLIENT_BOT_TOKEN)})`);
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

  const usernameEnv = (
    process.env.TELEGRAM_CLIENT_BOT_USERNAME ??
    process.env.TELEGRAM_BOT_USERNAME ??
    ''
  )
    .trim()
    .replace(/^@/, '');
  if (!usernameEnv) {
    report(
      'warn',
      'Имя клиентского бота не задано — сайт подставит `zaiko_ta_bot`',
      'Задайте TELEGRAM_CLIENT_BOT_USERNAME. Если имя не совпадёт с реальным ботом, кнопка на /book ведёт в пустоту.',
    );
  } else {
    report('ok', `Имя бота для кнопки на /book: ${usernameEnv}`);
  }

  const webhookSecret =
    process.env.TELEGRAM_CLIENT_WEBHOOK_SECRET ?? process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    report('warn', 'TELEGRAM_CLIENT_WEBHOOK_SECRET не задан', 'Вебхук принимает запросы от кого угодно.');
  } else {
    report('ok', 'Секрет вебхука клиентского бота задан');
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

async function checkBots(): Promise<void> {
  const admin = masterToken();
  if (!admin) {
    return;
  }

  console.log('\n— Админский бот (уведомления мастеру) —');

  const me = await telegram(admin, 'getMe');
  if (me.ok) {
    const bot = me.result as { username?: string; first_name?: string };
    report('ok', `Токен админского бота рабочий: @${bot.username ?? '?'}`);
  } else {
    report('fail', 'getMe админского бота не прошёл — токен неверный или отозван', me.description);
  }

  const client = clientToken();
  if (!client) {
    return;
  }

  console.log('\n— Бот напоминаний клиентам —');

  const clientMe = await telegram(client, 'getMe');
  if (!clientMe.ok) {
    report('fail', 'getMe клиентского бота не прошёл — токен неверный или отозван', clientMe.description);
    return;
  }

  const clientBot = clientMe.result as { username?: string };
  report('ok', `Токен клиентского бота рабочий: @${clientBot.username ?? '?'}`);

  const expected = (process.env.TELEGRAM_CLIENT_BOT_USERNAME ?? '').trim().replace(/^@/, '');
  if (expected && clientBot.username && clientBot.username !== expected) {
    report(
      'fail',
      `Имя в TELEGRAM_CLIENT_BOT_USERNAME (${expected}) не совпадает с ботом токена (@${clientBot.username})`,
      'Кнопка на /book ведёт на другого бота — исправьте переменную.',
    );
  } else if (expected) {
    report('ok', 'Имя бота и токен относятся к одному боту');
  }

  const info = await telegram(client, 'getWebhookInfo');
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
        'Вебхук клиентского бота НЕ зарегистрирован — /start ничего не сделает',
        'Нажмите /start в боте, клик не дойдёт до сайта, client_chat_id не запишется.',
      );
    } else {
      report('ok', `Вебхук клиентского бота: ${hook.url}`);
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
  const admin = masterToken();
  if (!admin || chatIds().length === 0) {
    return;
  }

  console.log('\n— Доставка мастеру (админский бот) —');

  for (const chatId of chatIds()) {
    if (!WANT_SEND) {
      // getChat не отправляет сообщение, но показывает, доступен ли чат боту.
      const chat = await telegram(admin, 'getChat', { chat_id: chatId });
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

    const sent = await telegram(admin, 'sendMessage', {
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
      const masterDue = hoursLeft <= MASTER_REMINDER_HOURS && !row.reminder_sent_at;
      const clientDue =
        hoursLeft <= CLIENT_REMINDER_HOURS && row.client_chat_id && !row.client_reminder_sent_at;
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
        (new Date(row.starts_at).getTime() - now) / 3_600_000 <= CLIENT_REMINDER_HOURS &&
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
    await checkBots();
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
