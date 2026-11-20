/**
 * Сессия кабинета DIKIDI для прямых HTTP-запросов (транспорт `http`).
 *
 * Хранит не только cookie `token`, но и остальные cookies кабинета (cookie_name, uac,
 * cid, lang и др.): DIKIDI возвращает error 1, если их не передать вместе с token.
 *
 * Порядок получения: таблица `dikidi_auth` (ее обновляет автологин) → `DIKIDI_TOKEN` из env.
 * Если в БД/env есть только token, выполняется «прогрев» сессии: GET главной страницы
 * кабинета с token, сбор Set-Cookie и формирование полного cookie-заголовка.
 *
 * Кэш на минуту. Значения токена и cookies не логируются и в интерфейс не попадают.
 *
 * Только серверный код.
 */
import { query } from '@/lib/db';
import { loginToDikidi } from '@/lib/dikidi/login';

const CACHE_MS = 60_000;
const ENV_TOKEN = () => (process.env.DIKIDI_TOKEN || '').trim();
const ENV_COOKIES = () => (process.env.DIKIDI_COOKIES || '').trim();
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

interface CachedSession {
  token: string | null;
  cookieHeader: string | null;
  source: 'db' | 'env';
  expiresAt: number;
}

let cached: CachedSession | null = null;

function baseUrl(): string {
  return (process.env.DIKIDI_BASE_URL || 'https://dikidi.net').replace(/\/+$/, '');
}

function cache(token: string | null, cookieHeader: string | null, source: 'db' | 'env'): void {
  cached = { token, cookieHeader, source, expiresAt: Date.now() + CACHE_MS };
}

/** Сбрасывает кэш сессии (вызывать после неудачного запроса/обновления токена). */
export function invalidateDikidiSessionCache(): void {
  cached = null;
}

function storeCookiesFromResponse(jar: Map<string, string>, response: Response): void {
  const withGetter = response.headers as unknown as { getSetCookie?: () => string[] };
  const list = withGetter.getSetCookie?.();
  const rawList =
    Array.isArray(list) && list.length > 0
      ? list
      : response.headers.get('set-cookie')
        ? [response.headers.get('set-cookie') as string]
        : [];

  for (const raw of rawList) {
    const [pair] = raw.split(';');
    const separator = pair.indexOf('=');

    if (separator <= 0) {
      continue;
    }

    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();

    if (!name) {
      continue;
    }

    if (!value || /max-age=0\b/i.test(raw)) {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }
}

function cookieHeaderFromJar(jar: Map<string, string>): string {
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

/**
 * Прогревает сессию: GET главной страницы кабинета с token, чтобы DIKIDI выдал
 * остальные cookies (cookie_name, uac, cid, lang). Возвращает полный cookie-заголовок.
 */
async function warmupCookies(token: string): Promise<string> {
  const jar = new Map<string, string>();
  jar.set('token', token);
  const base = baseUrl();

  try {
    const response = await fetch(`${base}/`, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': USER_AGENT,
        cookie: `token=${token}`,
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    storeCookiesFromResponse(jar, response);
  } catch {
    // Игнорируем: ниже вернём хотя бы token.
  }

  try {
    const response = await fetch(`${base}/ru/owner/`, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': USER_AGENT,
        cookie: cookieHeaderFromJar(jar),
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    storeCookiesFromResponse(jar, response);
  } catch {
    // Игнорируем.
  }

  return cookieHeaderFromJar(jar);
}

/** cookie `token` кабинета DIKIDI или null, если доступа нет. */
export async function getDikidiToken(): Promise<string | null> {
  const session = await getDikidiSession();
  return session.token;
}

/** Полный cookie-заголовок кабинета DIKIDI или null, если доступа нет. */
export async function getDikidiCookieHeader(): Promise<string | null> {
  const session = await getDikidiSession();
  return session.cookieHeader;
}

/** Внутренняя функция: читает/строит сессию (токен + cookies). */
async function getDikidiSession(): Promise<{ token: string | null; cookieHeader: string | null }> {
  const fromEnv = ENV_TOKEN();

  if (cached && cached.expiresAt > Date.now()) {
    if (cached.source === 'env' && fromEnv && fromEnv !== cached.token) {
      // Переменная поменялась — сбрасываем кэш.
      cached = null;
    } else {
      return { token: cached.token, cookieHeader: cached.cookieHeader };
    }
  }

  // 1. База данных.
  try {
    const { rows } = await query<{ token: string; cookies: string | null }>(
      'select token, cookies from dikidi_auth where id = 1',
    );
    const storedToken = rows[0]?.token?.trim();
    const storedCookies = rows[0]?.cookies?.trim();

    if (storedToken) {
      const cookieHeader = storedCookies || (await warmupCookies(storedToken));
      if (!storedCookies) {
        // Сохраняем прогретые cookies, чтобы не греть каждый раз.
        await saveDikidiSession(storedToken, cookieHeader, 'db');
      }
      cache(storedToken, cookieHeader, 'db');
      return { token: storedToken, cookieHeader };
    }
  } catch {
    // Таблицы/колонки может не быть — пробуем старый вариант.
    try {
      const { rows } = await query<{ token: string }>(
        'select token from dikidi_auth where id = 1',
      );
      const storedToken = rows[0]?.token?.trim();
      if (storedToken) {
        const cookieHeader = await warmupCookies(storedToken);
        cache(storedToken, cookieHeader, 'db');
        return { token: storedToken, cookieHeader };
      }
    } catch {
      // Игнорируем.
    }
  }

  // 2. Переменные окружения.
  if (fromEnv) {
    const envCookies = ENV_COOKIES();
    const cookieHeader = envCookies || (await warmupCookies(fromEnv));
    cache(fromEnv, cookieHeader, 'env');
    return { token: fromEnv, cookieHeader };
  }

  return { token: null, cookieHeader: null };
}

/** Сохраняет полученный токен в БД (serverless: единственное место, переживающее инстанс). */
export async function saveDikidiToken(token: string, source: string): Promise<void> {
  await saveDikidiSession(token, null, source);
}

/** Сохраняет токен и cookie-заголовок в БД. */
export async function saveDikidiSession(
  token: string,
  cookies: string | null,
  source: string,
): Promise<void> {
  cache(token, cookies, 'db');

  try {
    await query(
      `insert into dikidi_auth (id, token, cookies, source, updated_at)
       values (1, $1, $2, $3, now())
       on conflict (id) do update
          set token = excluded.token, cookies = excluded.cookies, source = excluded.source, updated_at = now()`,
      [token, cookies, source],
    );
  } catch {
    // Колонки cookies может не быть (старая схема) — сохраняем только token.
    try {
      await query(
        `insert into dikidi_auth (id, token, source, updated_at)
         values (1, $1, $2, now())
         on conflict (id) do update
            set token = excluded.token, source = excluded.source, updated_at = now()`,
        [token, source],
      );
    } catch {
      // Без таблицы токен останется только в памяти процесса.
    }
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
    await saveDikidiSession(login.token, login.cookies, 'login');
    invalidateDikidiSessionCache();
    return { ok: true, token: login.token };
  }

  const fromEnv = ENV_TOKEN();
  if (fromEnv && fromEnv !== previous) {
    const envCookies = ENV_COOKIES();
    const cookies = envCookies || (await warmupCookies(fromEnv));
    await saveDikidiSession(fromEnv, cookies, 'manual');
    invalidateDikidiSessionCache();
    return { ok: true, token: fromEnv };
  }

  return { ok: false, message: login.message };
}