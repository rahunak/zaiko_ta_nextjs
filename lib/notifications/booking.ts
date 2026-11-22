import { isTelegramConfigured, sendTelegramMessage } from '@/lib/telegram';
import { belarusLongDate, belarusTime } from '@/lib/dikidi/time';

/**
 * Уведомление мастеру о новой записи. Раньше Telegram использовался только для
 * событий DIKIDI и напоминаний: запись из /book появлялась лишь в админке,
 * и мастер мог узнать о клиенте с опозданием.
 */
export async function notifyMasterAboutBooking(input: {
  id: number;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  startsAt: Date;
  durationMin: number;
  price: number;
  channel: 'online' | 'admin';
}): Promise<void> {
  if (!isTelegramConfigured()) {
    return;
  }

  const text = [
    input.channel === 'online' ? 'Новая онлайн-запись' : 'Новая запись из админки',
    `${input.clientName}, ${input.clientPhone}`,
    `${input.serviceName} · ${input.durationMin} мин · ${input.price} BYN`,
    `${belarusLongDate(input.startsAt)}, ${belarusTime(input.startsAt)}`,
    `Запись №${input.id}`,
  ].join('\n');

  try {
    await sendTelegramMessage(text);
  } catch {
    // Уведомление не должно отменять уже созданную запись.
  }
}
