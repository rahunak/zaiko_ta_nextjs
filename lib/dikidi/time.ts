/**
 * Время салона: Беларусь, UTC+3 без перехода на летнее время.
 * Все даты в БД — timestamptz, отображение и ввод — в Europe/Minsk.
 */
export const BELARUS_TIME_ZONE = 'Europe/Minsk';
const BELARUS_OFFSET = '+03:00';
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** Собирает Date из локальных даты и времени Беларуси. */
export function toBelarusDate(date: string, time: string): Date | null {
  if (!DATE_KEY.test(date) || !TIME.test(time)) {
    return null;
  }

  const value = new Date(`${date}T${time}:00${BELARUS_OFFSET}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

/** Ключ дня (YYYY-MM-DD) в часовом поясе салона. */
export function belarusDateKey(value: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: BELARUS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

/** Время ЧЧ:ММ в часовом поясе салона. */
export function belarusTime(value: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: BELARUS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}

/** «пн, 17 ноября» — заголовок дня в расписании. */
export function belarusLongDate(value: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: BELARUS_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(value);
}

export function todayBelarus(): string {
  return belarusDateKey(new Date());
}

/** Сдвиг ключа дня на N дней (без влияния часового пояса сервера). */
export function addDays(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Понедельник недели, в которую попадает дата. */
export function startOfWeek(dateKey: string): string {
  const base = new Date(`${dateKey}T12:00:00Z`);
  const weekday = (base.getUTCDay() + 6) % 7;
  return addDays(dateKey, -weekday);
}

/** Date на полдень указанного дня — для форматирования заголовков. */
export function dateKeyToDate(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00Z`);
}
