const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Потолок одного запроса к Bot API. Без него зависший Telegram держит всю пачку тика
 * до таймаута функции (у cron-job.org на ответ 30 секунд).
 */
const SEND_TIMEOUT_MS = 8_000;

/**
 * Читает env и снимает кавычки и пробелы по краям.
 *
 * Значения копируют из `.env`-файла в дашборд Vercel, где кавычки становятся частью
 * значения: `"123:AAH..."` уже не токен, а вход в Bot API с таким значением падает.
 * Из-за этого бот молчал: отправка возвращала false, а вебхук отвечал 200.
 */
export function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) {
    return undefined;
  }
  const value = raw
    .trim()
    .replace(/^["']+/, '')
    .replace(/["']+$/, '')
    .trim();
  return value || undefined;
}

function chatIds(): string[] {
  return (readEnv('TELEGRAM_MASTER_CHAT_ID') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isTelegramConfigured(): boolean {
  return Boolean(masterBotToken() && chatIds().length > 0);
}

/** Токен админского бота: уведомления мастеру о новых записях и скором приёме. */
function masterBotToken(): string | undefined {
  return readEnv('TELEGRAM_MASTER_BOT_TOKEN');
}

/**
 * Токен бота напоминаний клиентам (отдельный, публичный бот, на который
 * подписываются клиенты). Отдельный бот нужен потому, что Telegram не даёт
 * писать пользователю, который не начинал диалог именно с этим ботом.
 * Если отдельный токен не задан — работает старый вариант с одним ботом.
 */
export function clientBotToken(): string | undefined {
  return readEnv('TELEGRAM_CLIENT_BOT_TOKEN') ?? masterBotToken();
}

/** Настроен ли бот клиентов: без токена клиентское напоминание отправлять нечем. */
export function hasClientBot(): boolean {
  return Boolean(clientBotToken());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Результат одной отправки.
 *
 * `retryable` отличает «Telegram/network временно не в настроении» от «этот chat_id
 * больше не примет сообщение»: повторять 403 `bot was blocked` бессмысленно, а 5xx и
 * таймаут — нужно. Очередь напоминаний решает по этому флагу, класть строку обратно
 * в pending или в failed.
 */
export type TelegramSendResult = {
  ok: boolean;
  messageId: number | null;
  /** Осмысленно только при ok=false. */
  retryable: boolean;
  /** Для 429: сколько секунд просит подождать сам Telegram. */
  retryAfterSec?: number;
  /** Текст ошибки или список недоставленных chat_id при частичном успехе. */
  description?: string;
  status?: number;
};

type TelegramPayload = {
  ok?: boolean;
  result?: { message_id?: number };
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
};

/**
 * Ошибки, которые не исчезнут при повторе. Сравнение по подстроке: Telegram
 * дописывает к описанию детали, а иногда меняет регистр.
 */
const PERMANENT_MARKERS = [
  'bot was blocked by the user',
  'chat not found',
  'user is deactivated',
  'peer_id_invalid',
  'bot was kicked',
  'chat_write_forbidden',
  'not enough rights',
  "bot can't initiate conversation",
  'message text is empty',
  'message is too long',
  'unauthorized',
];

async function readJson(response: Response): Promise<TelegramPayload | null> {
  try {
    return (await response.json()) as TelegramPayload;
  } catch {
    return null;
  }
}

/** Одна отправка в один chat_id. Никогда не бросает: вызывающему нужен результат, а не исключение. */
async function sendOne(token: string, chatId: string, text: string): Promise<TelegramSendResult> {
  let response: Response;

  try {
    response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: escapeHtml(text),
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // Сеть, DNS, таймаут — временные причины, повтор разрешён.
    return { ok: false, messageId: null, retryable: true, description: reason };
  }

  const payload = await readJson(response);

  if (response.ok && payload?.ok !== false) {
    return { ok: true, messageId: payload?.result?.message_id ?? null, retryable: false };
  }

  const description = payload?.description ?? `HTTP ${response.status}`;
  const retryAfter = payload?.parameters?.retry_after;

  if (response.status === 429) {
    return {
      ok: false,
      messageId: null,
      retryable: true,
      retryAfterSec: typeof retryAfter === 'number' ? retryAfter : 30,
      description,
      status: response.status,
    };
  }

  if (response.status >= 500) {
    return { ok: false, messageId: null, retryable: true, description, status: response.status };
  }

  const lower = description.toLowerCase();
  const permanent = PERMANENT_MARKERS.some((marker) => lower.includes(marker));

  // 403 и 400 без известного маркера тоже постоянные: повтор их не исправит.
  // retryable остаётся только у 429, 5xx и сетевых ошибок (ветки выше).
  return {
    ok: false,
    messageId: null,
    retryable: false,
    description: permanent ? description : `${description} (HTTP ${response.status})`,
    status: response.status,
  };
}

/**
 * Отправка мастеру с деталями: доставляем всем chat_id, успехом считаем хотя бы
 * одну доставку. Иначе заблокировавший бота второй получатель заставлял бы очередь
 * повторять напоминание, и первый получал бы его по разу на каждую попытку.
 */
export async function sendTelegramMessageDetailed(text: string): Promise<TelegramSendResult> {
  const token = masterBotToken();
  const recipients = chatIds();

  if (!token || recipients.length === 0) {
    return {
      ok: false,
      messageId: null,
      retryable: false,
      description: 'master telegram is not configured',
    };
  }

  const results = await Promise.all(recipients.map((chatId) => sendOne(token, chatId, text)));
  const delivered = results.filter((result) => result.ok);
  const failures = results.filter((result) => !result.ok);

  if (delivered.length > 0) {
    return {
      ok: true,
      messageId: delivered[0].messageId,
      retryable: false,
      description:
        failures.length > 0
          ? failures.map((failure) => failure.description ?? 'unknown').join('; ')
          : undefined,
    };
  }

  return {
    ok: false,
    messageId: null,
    retryable: failures.some((failure) => failure.retryable),
    retryAfterSec: failures.find((failure) => failure.retryAfterSec)?.retryAfterSec,
    description: failures.map((failure) => failure.description ?? 'unknown').join('; '),
    status: failures[0]?.status,
  };
}

/** Отправка клиенту в конкретный chat_id с деталями. */
export async function sendTelegramToChatDetailed(
  chatId: string,
  text: string,
): Promise<TelegramSendResult> {
  const token = clientBotToken();

  if (!token) {
    return {
      ok: false,
      messageId: null,
      retryable: false,
      description: 'client telegram bot is not configured',
    };
  }
  if (!chatId) {
    return { ok: false, messageId: null, retryable: false, description: 'chat_id is empty' };
  }

  return sendOne(token, chatId, text);
}

/**
 * Возвращает true только если сообщение ушло всем получателям.
 * Нужно вызывающему коду: напоминание нельзя помечать отправленным,
 * если Telegram ответил ошибкой — иначе оно потеряется навсегда.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = masterBotToken();
  const recipients = chatIds();

  if (!token || recipients.length === 0) {
    return false;
  }

  const results = await Promise.all(recipients.map((chatId) => sendOne(token, chatId, text)));
  return results.length > 0 && results.every((result) => result.ok);
}

/**
 * Имя бота для deep-link «напоминание в Telegram».
 * Переменная окружения важнее константы: имя бота публично, но при смене бота
 * достаточно поправить env, не пересобирая код.
 */
const DEFAULT_BOT_USERNAME = 'zaiko_ta_bot';

/** Telegram usernames: 5-32 chars, letters, digits and underscore. */
const BOT_USERNAME_RE = /^[a-z0-9_]{5,32}$/i;

/**
 * Имя бота напоминаний клиентам: именно он открывается по кнопке на /book.
 *
 * Значения из env часто вставляют с кавычками (`"zaiko_ta_bot"`), а такой текст в URL
 * ломает deep-link, поэтому снимаем кавычки и `@` и проверяем формат. Некорректное
 * значение возвращает null: лучше спрятать кнопку, чем показать битую ссылку.
 */
export function botUsername(): string | null {
  const value = (readEnv('TELEGRAM_CLIENT_BOT_USERNAME') ?? '').replace(/^@/, '').trim();

  if (!value) {
    return DEFAULT_BOT_USERNAME;
  }
  if (!BOT_USERNAME_RE.test(value)) {
    console.warn(`[telegram] TELEGRAM_CLIENT_BOT_USERNAME is not a valid bot username: ${value}`);
    return null;
  }
  return value;
}

/** Отправка сообщения конкретному клиенту (по chat_id, полученному в /start). */
export async function sendTelegramToChat(chatId: string, text: string): Promise<boolean> {
  const result = await sendTelegramToChatDetailed(chatId, text);
  return result.ok;
}
