/**
 * Простой счётчик попыток в памяти процесса.
 *
 * Достаточно для одного VPS/контейнера: защищает вход в админку от перебора.
 * Для нескольких инстансов (serverless) нужен внешний стор — Redis/БД.
 */
type Entry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Entry>();

function now(): number {
  return Date.now();
}

/** Сколько попыток осталось до блокировки. */
export function attemptsLeft(key: string, limit: number): number {
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now()) {
    return limit;
  }
  return Math.max(0, limit - entry.count);
}

/** Фиксирует неудачную попытку и возвращает число оставшихся. */
export function recordFailure(key: string, windowMs: number): number {
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now()) {
    store.set(key, { count: 1, resetAt: now() + windowMs });
    return 0;
  }

  entry.count += 1;
  return entry.count;
}

/** Сбрасывает счётчик после успешного входа. */
export function resetAttempts(key: string): void {
  store.delete(key);
}

/** IP клиента из заголовков прокси (за nginx — x-forwarded-for). */
export function clientKey(headers: Headers, prefix: string): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = headers.get('x-real-ip')?.trim();
  const ip = forwarded || realIp || 'unknown';
  return `${prefix}:${ip}`;
}
