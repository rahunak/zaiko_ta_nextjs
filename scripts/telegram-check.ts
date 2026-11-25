/**
 * Диагностика Telegram-уведомлений: мастеру (новая запись, «скоро приём»)
 * и клиенту (напоминание за час).
 *
 * Скрипт только читает состояние и, по флагу --send, отправляет одно тестовое
 * сообщение. Ничего в БД не меняет, напоминания не рассылает.
 *
 * Про напоминания проверяет очередь `reminders`, журнал `cron_runs` и свежесть
 * последнего успешного тика — это главный признак, что система жива.
 *
 * Запуск (нужны прод-переменные окружения):
 *   bun run scripts/telegram-check.ts            # только проверки
 *   bun run scripts/telegram-check.ts --send     # + тестовое сообщение мастеру
 *
 * Переменные берутся из окружения (bun сам подхватывает .env / .env.local),
 * либо передайте их явно:
 *   TELEGRAM_MASTER_BOT_TOKEN=... TELEGRAM_MASTER_CHAT_ID=... DATABASE_URL=... bun run scripts/telegram-check.ts
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
  const raw = process.env.TELEGRAM_MASTER_CHAT_ID ?? '';
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
  return process.env.TELEGRAM_MASTER_BOT_TOKEN ?? '';
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
      'TELEGRAM_MASTER_BOT_TOKEN не задан (админский бот)',
      'Без него не уходят уведомления мастеру.',
    );
  } else {
    report('ok', `TELEGRAM_MASTER_BOT_TOKEN задан, админский бот (${mask(token)})`);
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
      'TELEGRAM_MASTER_CHAT_ID не задан',
      'Нужен числовой chat_id личного чата мастера с ботом (не @username канала).',
    );
  } else {
    const bad = ids.filter((id) => !/^-?\d+$/.test(id));
    report(
      bad.length === 0 ? 'ok' : 'fail',
      `TELEGRAM_MASTER_CHAT_ID: ${ids.length} получател(ь/я): ${ids.join(', ')}`,
      bad.length ? `Не похоже на chat_id: ${bad.join(', ')}. Узнать: @userinfobot.` : undefined,
    );
  }

  const usernameEnv = (process.env.TELEGRAM_CLIENT_BOT_USERNAME ?? '')
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

  const webhookSecret = process.env.TELEGRAM_CLIENT_WEBHOOK_SECRET;
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

  // Вебхук админскому боту не нужен: он только отправляет сообщения. Если он там
  // стоит, /start мастера уходит в обработчик клиентского бота — это частая ошибка
  // при настройке двух ботов, поэтому проверяем явно.
  const adminInfo = await telegram(admin, 'getWebhookInfo');
  if (!adminInfo.ok) {
    report('warn', 'getWebhookInfo админского бота не прошёл', adminInfo.description);
  } else {
    const hook = adminInfo.result as { url?: string; pending_update_count?: number };
    report(
      hook.url ? 'fail' : 'ok',
      hook.url
        ? `На админском боте стоит вебхук: ${hook.url}`
        : 'На админском боте вебхука нет (так и должно быть)',
      hook.url
        ? 'Снимите его: curl "https://api.telegram.org/bot<токен zaiko_ta_admin_bot>/deleteWebhook"'
        : undefined,
    );
    if (hook.pending_update_count && hook.pending_update_count > 0) {
      report('warn', `Админский бот: ${hook.pending_update_count} необработанных апдейтов`);
    }
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

type QueueState = {
  minutes: number | null;
  runs_today: number;
  errors_today: number;
};

type ProblemRow = {
  kind: string;
  status: string;
  last_error: string | null;
  starts_at: Date;
};

async function checkDatabase(): Promise<void> {
  console.log('\n— Очередь напоминаний —');

  if (!process.env.DATABASE_URL) {
    report(
      'warn',
      'DATABASE_URL не задан — проверка БД идёт по локальному значению по умолчанию',
      'Для прода передайте строку подключения.',
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
    const tables = await pool.query<{ table_name: string }>(
      `select table_name
         from information_schema.tables
        where table_schema = 'public' and table_name in ('reminders', 'cron_runs')`,
    );
    const present = new Set(tables.rows.map((row) => row.table_name));
    const missing = ['reminders', 'cron_runs'].filter((name) => !present.has(name));

    if (missing.length > 0) {
      report(
        'fail',
        `В БД нет таблиц: ${missing.join(', ')}`,
        'Примените схему: psql "$DATABASE_URL" -f db/schema.sql (идемпотентно).',
      );
      return;
    }
    report('ok', 'Таблицы очереди reminders и cron_runs на месте');

    const counters = await pool.query<{ status: string; count: number }>(
      `select status, count(*)::int as count
         from reminders
        where due_at > now() - interval '30 days'
        group by status
        order by status`,
    );

    if (counters.rows.length === 0) {
      report('warn', 'В очереди пока нет строк', 'Создайте запись на /book или запустите тик.');
    } else {
      report(
        'ok',
        `Очередь: ${counters.rows.map((row) => `${row.status} ${row.count}`).join(' · ')}`,
      );
    }

    const state = await pool.query<QueueState>(
      `select
         (select extract(epoch from (now() - max(finished_at)))::float8 / 60
            from cron_runs
           where finished_at is not null and error is null) as minutes,
         (select count(*)::int from cron_runs
           where started_at > now() - interval '1 day') as runs_today,
         (select count(*)::int from cron_runs
           where error is not null and started_at > now() - interval '1 day') as errors_today`,
    );

    const { minutes, runs_today: runsToday, errors_today: errorsToday } = state.rows[0];

    if (runsToday === 0) {
      report(
        'fail',
        'За сутки не было ни одного тика — напоминания не отправляются',
        'Проверьте задание на cron-job.org/QStash и CRON_SECRET. Вручную: ' +
          'curl -H "Authorization: Bearer $CRON_SECRET" https://zaiko.by/api/cron/dispatch',
      );
    } else if (minutes === null) {
      report(
        'fail',
        'Успешных тиков ещё не было',
        `За сутки запусков: ${runsToday}, со сбоем: ${errorsToday}. Смотрите cron_runs.error.`,
      );
    } else if (minutes > 30) {
      report(
        'fail',
        `Последний успешный тик ${Math.round(minutes)} мин назад`,
        'Планировщик молчит или падает. Откройте /admin/reminders и проверьте задание.',
      );
    } else {
      report('ok', `Последний успешный тик ${Math.max(1, Math.round(minutes))} мин назад`);
    }

    if (errorsToday > 0) {
      report(
        'warn',
        `За сутки тиков со сбоем: ${errorsToday}`,
        'Текст сбоя — в cron_runs.error и на /admin/reminders.',
      );
    }

    const due = await pool.query<{ count: number }>(
      `select count(*)::int as count
         from reminders
        where status = 'pending' and due_at <= now()`,
    );
    const dueCount = due.rows[0]?.count ?? 0;

    if (dueCount > 0) {
      report(
        'warn',
        `${dueCount} напоминаний просрочено и ждут тика`,
        'Если так дольше 10 минут — планировщик не работает.',
      );
    } else {
      report('ok', 'Просроченных напоминаний нет');
    }

    const problems = await pool.query<ProblemRow>(
      `select r.kind, r.status, r.last_error, a.starts_at
         from reminders r
         join appointments a on a.id = r.appointment_id
        where r.status in ('failed', 'skipped')
          and a.starts_at > now()
        order by r.due_at
        limit 10`,
    );

    if (problems.rows.length > 0) {
      report(
        'warn',
        `Проблемных строк по будущим визитам: ${problems.rows.length}`,
        problems.rows
          .map((row) => `${row.kind} · ${row.status} · ${row.last_error ?? '—'}`)
          .join('\n'),
      );
    }

    const upcoming = await pool.query<{ total: number; connected: number }>(
      `select count(*)::int as total,
              count(client_chat_id)::int as connected
         from appointments
        where cancelled_at is null and starts_at > now()`,
    );
    const { total, connected } = upcoming.rows[0] ?? { total: 0, connected: 0 };

    report(
      connected > 0 ? 'ok' : 'warn',
      `Записей с привязанным Telegram-клиентом: ${connected} из ${total}`,
      connected === 0
        ? 'Ни один клиент не нажал /start — клиентские напоминания отправлять пока некому.'
        : undefined,
    );
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
