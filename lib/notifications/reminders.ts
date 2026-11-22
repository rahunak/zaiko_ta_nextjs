import { query } from '@/lib/db';
import { isTelegramConfigured, sendTelegramMessage } from '@/lib/telegram';
import { belarusLongDate, belarusTime, dateKeyToDate } from '@/lib/dikidi/time';

type DueRow = {
  id: string;
  client_name: string;
  service_name: string;
  starts_at: Date;
};

export async function sendDueReminders(): Promise<number> {
  if (!isTelegramConfigured()) {
    return 0;
  }

  const { rows } = await query<DueRow>(
    `select id, client_name, service_name, starts_at
       from appointments
      where cancelled_at is null
        and reminder_sent_at is null
        and starts_at > now()
        and starts_at <= now() + interval '60 minutes'`,
  );

  let sent = 0;

  for (const row of rows) {
    const startsAt = new Date(row.starts_at);
    const text = `У вас запись: ${row.client_name} — ${row.service_name}, ${belarusLongDate(startsAt)} в ${belarusTime(startsAt)}.`;
    const delivered = await sendTelegramMessage(text);

    // Помечаем отправленным только при успехе: иначе сбой Telegram
    // „съедал“ напоминание навсегда — повтора не было.
    if (!delivered) {
      continue;
    }

    await query('update appointments set reminder_sent_at = now() where id = $1', [row.id]);
    sent += 1;
  }

  return sent;
}