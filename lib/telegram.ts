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

export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const recipients = chatIds();

  if (!token || recipients.length === 0) {
    return;
  }

  await Promise.all(
    recipients.map(async (chatId) => {
      try {
        await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: escapeHtml(text),
            parse_mode: 'HTML',
          }),
        });
      } catch {
        // Уведомления не должны ломать основной поток.
      }
    }),
  );
}