import { belarusLongDate, belarusTime } from '@/lib/dikidi/time';

/**
 * За сколько до визита отправляем напоминание клиенту.
 * Отправкой управляет очередь `reminders`; константа задаёт `due_at` строки.
 */
export const CLIENT_REMINDER_HOURS = 1;

/** Человеческая форма срока для текстов бота: «за 1 час», «за 2 часа». */
export function clientReminderLeadText(): string {
  return CLIENT_REMINDER_HOURS === 1 ? 'за 1 час' : `за ${CLIENT_REMINDER_HOURS} часа`;
}

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
