/**
 * Клиент локального HTTP-интерфейса api-anything.
 *
 * api-anything поднимается отдельно (`bun run api-anything:serve`) и отдаёт операции
 * сайтов по адресам /v1/call/<site>/<op> (чтение) и /v1/write/<site>/<op> (запись).
 * Токен берётся из env API_ANYTHING_TOKEN или, если он не задан, из файла
 * ~/.api-anything/serve-token — чтобы локальная админка работала без ручного
 * копирования токена в .env.local. Токен остаётся на сервере и не попадает в браузер.
 *
 * Только серверный код.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type ApiAnythingFailureKind =
  | 'not_configured'
  | 'unreachable'
  | 'unauthorized'
  | 'op_missing'
  | 'failed';

export type ApiAnythingResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: ApiAnythingFailureKind; message: string };

const DEFAULT_BASE_URL = 'http://127.0.0.1:8787';

let cachedToken: string | undefined;

/** Разрешает токен api-anything: сначала из env, иначе — из serve-token файла. */
function resolveApiAnythingToken(): string | undefined {
  if (process.env.API_ANYTHING_TOKEN) {
    return process.env.API_ANYTHING_TOKEN;
  }

  if (cachedToken !== undefined) {
    return cachedToken || undefined;
  }

  try {
    const token = readFileSync(
      join(homedir(), '.api-anything', 'serve-token'),
      'utf8',
    ).trim();
    cachedToken = token;
    return token || undefined;
  } catch {
    cachedToken = '';
    return undefined;
  }
}

export function apiAnythingBaseUrl(): string {
  return (process.env.API_ANYTHING_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export function isApiAnythingConfigured(): boolean {
  return Boolean(resolveApiAnythingToken());
}

function failure(
  kind: ApiAnythingFailureKind,
  message: string,
): ApiAnythingResult<never> {
  return { ok: false, kind, message };
}

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['reason', 'message', 'error']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }
  return fallback;
}

export async function checkApiAnythingHealth(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const response = await fetch(`${apiAnythingBaseUrl()}/v1/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok
      ? { ok: true, message: 'api-anything отвечает' }
      : { ok: false, message: `api-anything вернул ${response.status}` };
  } catch {
    return {
      ok: false,
      message: 'api-anything не отвечает на ' + apiAnythingBaseUrl(),
    };
  }
}

/** Вызов операции сайта. `write: true` — только для операций, меняющих данные. */
export async function callOperation<T>(
  site: string,
  op: string,
  args: Record<string, string>,
  options: { write?: boolean; timeoutMs?: number } = {},
): Promise<ApiAnythingResult<T>> {
  const token = resolveApiAnythingToken();

  if (!token) {
    return failure(
      'not_configured',
      'Не задан API_ANYTHING_TOKEN и не найден ~/.api-anything/serve-token. Запустите api-anything:serve или задайте токен в .env.local.',
    );
  }

  const action = options.write ? 'write' : 'call';
  const url = `${apiAnythingBaseUrl()}/v1/${action}/${encodeURIComponent(site)}/${encodeURIComponent(op)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ args }),
      cache: 'no-store',
      signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
    });
  } catch {
    return failure(
      'unreachable',
      `api-anything не отвечает на ${apiAnythingBaseUrl()}. Запустите: bun run api-anything:serve`,
    );
  }

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const kind: ApiAnythingFailureKind =
      response.status === 401 || response.status === 403
        ? 'unauthorized'
        : response.status === 404
          ? 'op_missing'
          : 'failed';

    return failure(
      kind,
      errorMessage(payload, `api-anything ответил ${response.status} ${response.statusText}`),
    );
  }

  if (payload && typeof payload === 'object' && 'ok' in payload) {
    const envelope = payload as {
      ok?: boolean;
      class?: string;
      data?: unknown;
      reason?: string;
    };

    if (envelope.ok === false) {
      const reason = envelope.reason || 'api-anything вернул ошибку операции';
      const missingOperation =
        /no site|no operation|unknown (site|operation)|not found/i.test(reason);

      const kind: ApiAnythingFailureKind = missingOperation
        ? 'op_missing'
        : envelope.class === 'auth'
          ? 'unauthorized'
          : 'failed';

      return failure(kind, reason);
    }

    return { ok: true, data: (envelope.data ?? null) as T };
  }

  return { ok: true, data: payload as T };
}
