import { sendDueReminders } from './reminders';
import { sendClientReminders } from './client-reminders';

let started = false;

export function startReminderScheduler(): void {
  if (started) {
    return;
  }
  started = true;

  const tick = async () => {
    try {
      await sendDueReminders();
    } catch (error) {
      console.error('Напоминания мастеру: ошибка отправки', error);
    }

    try {
      await sendClientReminders();
    } catch (error) {
      console.error('Напоминания клиентам: ошибка отправки', error);
    }
  };

  tick().catch(() => {});
  setInterval(() => {
    tick().catch(() => {});
  }, 60_000);
}