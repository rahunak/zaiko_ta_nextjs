import { query } from '@/lib/db';
import { sendTelegramToChat } from '@/lib/telegram';
import { belarusLongDate, belarusTime } from '@/lib/dikidi/time';

/** За сколько до визита отправляем напоминание клиенту. */
export const CLIENT_REMINDER_HOURS = 2;

type ClientRow = {
  id: string;
  client_name: string;
  service_name: string;
  starts_at: Date;
  client_chat_id: string;
};

export function clientReminderText(row: {
  client_name: string;
  service_name: string;
  starts_at: Date;
}): string {
  const startsAt = new Date(row.starts_at);
  return [
    `Напоминаю о записи: ${belarusLongDate(startsAt)}, ${belarusTime(startsAt)}.`,
    `${row.service_name}.`,
    'Если планы изменились — напишите или позвоните мастеру.',
  ].join('\n');
}

/**
 * Напоминания клиентам, которые включили их в боте.
 * Отметка ставится только при успешной отправке — при сбое Telegram повтор на следующем тике.
 */
export async function sendClientReminders(): Promise<number> {
  const { rows } = await query<ClientRow>(
    `select id, client_name, service_name, starts_at, client_chat_id
       from appointments
      where cancelled_at is null
        and client_chat_id is not null
        and client_reminder_sent_at is null
        and starts_at > now()
        and starts_at <= now() + interval '${CLIENT_REMINDER_HOURS} hours'`,
  );

  let sent = 0;

  for (const row of rows) {
    const delivered = await sendTelegramToChat(row.client_chat_id, clientReminderText(row));
    if (!delivered) {
      continue;
    }

    await query('update appointments set client_reminder_sent_at = now() where id = $1', [
      row.id,
    ]);
    sent += 1;
  }

  return sent;
}
