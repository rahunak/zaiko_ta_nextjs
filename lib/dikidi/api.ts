/**
 * Единая точка вызова операций DIKIDI с выбором транспорта.
 *
 * - `http` — прямые запросы к dikidi.net (`lib/dikidi/http.ts`): нужен только токен/креды,
 *   работает на serverless (Vercel).
 * - `api-anything` — локальный сервис из `lib/api-anything/client.ts`: прежнее поведение
 *   для разработки, когда serve запущен рядом.
 *
 * Транспорт задаётся `DIKIDI_TRANSPORT` (`http` | `api-anything`). Если переменная не задана,
 * выбираем `http` при наличии доступа (токен в БД/env или пара DIKIDI_LOGIN/DIKIDI_PASSWORD),
 * иначе — api-anything.
 *
 * Только серверный код.
 */
import { callOperation } from '@/lib/api-anything/client';
import { renderArgsTemplate } from '@/lib/api-anything/template';
import {
  dikidiHttp,
  type DikidiHttpFailureKind,
  type DikidiHttpOperation,
} from '@/lib/dikidi/http';
import { dikidiCredentials } from '@/lib/dikidi/login';
import { getDikidiToken } from '@/lib/dikidi/session';

export type DikidiFailureKind =
  | DikidiHttpFailureKind
  | 'op_missing'
  | 'unauthorized';

export type DikidiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: DikidiFailureKind; message: string };

export type DikidiOperation = DikidiHttpOperation;

export type DikidiTransport = 'http' | 'api-anything';

const DEFAULT_JOURNAL_ARGS = '{"company":"{company}","from":"{from}","to":"{to}"}';

/** Транспорт по настройкам: явный `DIKIDI_TRANSPORT` важнее автоматического выбора. */
export async function resolveDikidiTransport(): Promise<DikidiTransport> {
  const explicit = (process.env.DIKIDI_TRANSPORT || '').trim().toLowerCase();

  if (explicit === 'http' || explicit === 'api-anything') {
    return explicit;
  }

  if ((process.env.DIKIDI_TOKEN || '').trim() || dikidiCredentials()) {
    return 'http';
  }

  // Токен мог остаться в БД от прошлого автологина — тогда прямой транспорт тоже доступен.
  return (await getDikidiToken()) ? 'http' : 'api-anything';
}

/** Журнал для api-anything собирается шаблоном из env: его аргументы заданы списком полей DIKIDI. */
function apiAnythingJournalArgs(
  args: Record<string, string>,
): Record<string, string> | { error: string } {
  return renderArgsTemplate(
    process.env.DIKIDI_JOURNAL_ARGS || DEFAULT_JOURNAL_ARGS,
    args,
  );
}

export async function callDikidi<T>(
  op: DikidiOperation,
  args: Record<string, string>,
  options: { write?: boolean; timeoutMs?: number } = {},
): Promise<DikidiResult<T>> {
  if ((await resolveDikidiTransport()) === 'http') {
    return dikidiHttp<T>(op, args, { timeoutMs: options.timeoutMs });
  }

  const site = process.env.DIKIDI_API_SITE || 'dikidi';
  const operation =
    op === 'journal' ? process.env.DIKIDI_JOURNAL_OP || 'journal' : op;

  let payload = args;

  if (op === 'journal') {
    const rendered = apiAnythingJournalArgs(args);

    if ('error' in rendered) {
      return { ok: false, kind: 'failed', message: rendered.error };
    }

    payload = rendered;
  }

  return callOperation<T>(site, operation, payload, {
    write: options.write,
    timeoutMs: options.timeoutMs,
  });
}
