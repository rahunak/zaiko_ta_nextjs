const TELEGRAM_API = 'https://api.telegram.org';

function chatIds(): string[] {
  const raw = process.env.TELEGRAM_CHAT_ID ?? process.env.TELEGRAM_MASTER_CHAT_ID ?? '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && chatIds().length > 0);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Возвращает true только если сообщение ушло всем получателям.
 * Нужно вызывающему коду: напоминание нельзя помечать отправленным,
 * если Telegram ответил ошибкой — иначе оно потеряется навсегда.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const recipients = chatIds();

  if (!token || recipients.length === 0) {
    return false;
  }

  const results = await Promise.all(
    recipients.map(async (chatId) => {
      try {
        const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: escapeHtml(text),
            parse_mode: 'HTML',
          }),
        });
        return response.ok;
      } catch {
        // Уведомления не должны ломать основной поток.
        return false;
      }
    }),
  );

  return results.length > 0 && results.every(Boolean);
}
/**
 * Имя бота для deep-link «напоминание в Telegram».
 * Переменная окружения важнее константы: имя бота публично, но при смене бота
 * достаточно поправить env, не пересобирая код.
 */
const DEFAULT_BOT_USERNAME = 'zaiko_ta_bot';

export function botUsername(): string | null {
  const value = (process.env.TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '');
  return value || DEFAULT_BOT_USERNAME;
}

/** Отправка сообщения конкретному клиенту (по chat_id, полученному в /start). */
export async function sendTelegramToChat(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) {
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: escapeHtml(text),
        parse_mode: 'HTML',
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
