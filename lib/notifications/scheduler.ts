import { sendDueReminders } from './reminders';

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
      console.error('Напоминания DIKIDI: ошибка отправки', error);
    }
  };

  tick().catch(() => {});
  setInterval(() => {
    tick().catch(() => {});
  }, 60_000);
}