/**
 * Токен кабинета DIKIDI для прямых HTTP-запросов (транспорт `http`).
 *
 * Порядок получения: таблица `dikidi_auth` (её обновляет автологин) → `DIKIDI_TOKEN` из env.
 * Кэш на минуту, чтобы не читать БД на каждый из четырёх запросов отправки записи.
 *
 * Только серверный код. Значение токена не логируется и в интерфейс не попадает.
 */
import { query } from '@/lib/db';
import { loginToDikidi } from '@/lib/dikidi/login';

const CACHE_MS = 60_000;
const ENV_TOKEN = () => (process.env.DIKIDI_TOKEN || '').trim();

let cached: { token: string; source: 'db' | 'env'; expiresAt: number } | null = null;

function cache(token: string, source: 'db' | 'env'): void {
  cached = { token, source, expiresAt: Date.now() + CACHE_MS };
}

/** cookie `token` кабинета DIKIDI или null, если доступа нет. */
export async function getDikidiToken(): Promise<string | null> {
  const fromEnv = ENV_TOKEN();

  if (cached && cached.expiresAt > Date.now()) {
    if (cached.source === 'db') {
      return cached.token;
    }

    // Токен из env: если переменную поменяли или убрали, кэш не должен её переживать.
    if (fromEnv && fromEnv === cached.token) {
      return cached.token;
    }
  }

  try {
    const { rows } = await query<{ token: string }>(
      'select token from dikidi_auth where id = 1',
    );
    const stored = rows[0]?.token?.trim();
    if (stored) {
      cache(stored, 'db');
      return stored;
    }
  } catch {
    // Таблицы может не быть (БД ещё не инициализирована) — работаем на env-токене.
  }

  if (fromEnv) {
    cache(fromEnv, 'env');
    return fromEnv;
  }

  return null;
}

/** Сохраняет полученный токен в БД (serverless: единственное место, переживающее инстанс). */
export async function saveDikidiToken(token: string, source: string): Promise<void> {
  cache(token, 'db');

  try {
    await query(
      `insert into dikidi_auth (id, token, source, updated_at)
       values (1, $1, $2, now())
       on conflict (id) do update
          set token = excluded.token, source = excluded.source, updated_at = now()`,
      [token, source],
    );
  } catch {
    // Без таблицы токен останется только в памяти процесса: приложение продолжит работать.
  }
}

export type DikidiRefreshResult =
  | { ok: true; token: string }
  | { ok: false; message: string };

/**
 * Обновляет токен после того, как DIKIDI перестал принимать старый.
 *
 * Сначала пробуем войти по `DIKIDI_LOGIN`/`DIKIDI_PASSWORD`, затем — env-токен,
 * если он отличается от того, что только что отвергли.
 */
export async function refreshDikidiToken(
  previous: string | null,
): Promise<DikidiRefreshResult> {
  const login = await loginToDikidi();

  if (login.ok) {
    await saveDikidiToken(login.token, 'login');
    return { ok: true, token: login.token };
  }

  const fromEnv = ENV_TOKEN();
  if (fromEnv && fromEnv !== previous) {
    await saveDikidiToken(fromEnv, 'manual');
    return { ok: true, token: fromEnv };
  }

  return { ok: false, message: login.message };
}
