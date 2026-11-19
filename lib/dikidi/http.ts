/**
 * Прямые запросы в кабинет DIKIDI (транспорт `http`), без api-anything.
 *
 * Все операции — form-POST на `https://dikidi.net/ru/owner/ajax/...` с cookie `token`.
 * Тела запросов повторяют те, что записаны в `~/.api-anything/sites/dikidi.json`:
 * журнал (`journal/api`), поиск и создание клиента, `record_save` (создание и обновление
 * по `appointment_id`), удаление записи.
 *
 * Ответы отдаются в том же виде, что у api-anything (`journal` → объект `master`),
 * поэтому разбор в `availability.ts` и `send.ts` не меняется.
 *
 * Только серверный код.
 */
import { getDikidiToken, refreshDikidiToken } from '@/lib/dikidi/session';

export type DikidiHttpFailureKind =
  | 'not_configured'
  | 'unauthorized'
  | 'unreachable'
  | 'failed';

export type DikidiHttpResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: DikidiHttpFailureKind; message: string };

export type DikidiHttpOperation =
  | 'journal'
  | 'find-client'
  | 'save-client'
  | 'create-record'
  | 'remove-record';

export type DikidiHttpArgs = Record<string, string>;

/** Адрес DIKIDI; переопределяется DIKIDI_BASE_URL (тестовый стенд/зеркало). */
const baseUrl = () => (process.env.DIKIDI_BASE_URL || 'https://dikidi.net').replace(/\/+$/, '');
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const DEFAULT_TIMEOUT_MS = 20_000;

const NO_TOKEN =
  'Нет доступа к DIKIDI: не задан DIKIDI_TOKEN и вход по DIKIDI_LOGIN/DIKIDI_PASSWORD не выполнен.';

/** Форма запроса журнала из api-anything: те же поля, но ID мастера подставляется из настроек. */
const JOURNAL_BODY = [
  'request%5Bget%5D%5B%5D=company.accesses',
  '&request%5Boptions%5D%5Bcompany%5D%5Baccesses%5D%5B%5D=%7Bcompany%7D',
  '&request%5Bget%5D%5B%5D=master.info',
  '&request%5Bget%5D%5B%5D=master.access',
  '&request%5Bget%5D%5B%5D=master.records',
  '&request%5Bget%5D%5B%5D=master.schedules',
  '&request%5Bget%5D%5B%5D=masters.info',
  '&request%5Bget%5D%5B%5D=masters.access',
  '&request%5Bget%5D%5B%5D=masters.groups',
  '&request%5Boptions%5D%5Bmaster%5D%5Binfo%5D%5B%5D=3834316',
  '&request%5Boptions%5D%5Bmaster%5D%5Baccess%5D%5B%5D=3834316',
  '&request%5Boptions%5D%5Bmaster%5D%5Brecords%5D%5B3834316%5D%5B0%5D%5Bdate_from%5D=%7Bfrom%7D',
  '&request%5Boptions%5D%5Bmaster%5D%5Brecords%5D%5B3834316%5D%5B0%5D%5Bdate_to%5D=%7Bto%7D',
  '&request%5Boptions%5D%5Bmaster%5D%5Bschedules%5D%5B3834316%5D%5B0%5D%5Bdate_from%5D=%7Bfrom%7D',
  '&request%5Boptions%5D%5Bmaster%5D%5Bschedules%5D%5B3834316%5D%5B0%5D%5Bdate_to%5D=%7Bto%7D',
  '&request%5Boptions%5D%5Bmasters%5D%5Bgroups%5D%5Bget%5D=all',
  '&request%5Bget%5D%5B%5D=masters.services',
  '&request%5Bget%5D%5B%5D=resources.records',
  '&request%5Boptions%5D%5Bresources%5D%5Brecords%5D%5B0%5D%5Bdate_from%5D=%7Bfrom%7D',
  '&request%5Boptions%5D%5Bresources%5D%5Brecords%5D%5B0%5D%5Bdate_to%5D=%7Bto%7D',
].join('');

type AuthAttempt =
  | DikidiHttpResult<unknown>
  | { ok: false; kind: 'auth'; message: string };

function failure(kind: DikidiHttpFailureKind, message: string): DikidiHttpResult<never> {
  return { ok: false, kind, message };
}

function journalBody(args: DikidiHttpArgs): string | null {
  const { company, master, from, to } = args;

  if (!company || !master || !from || !to) {
    return null;
  }

  return JOURNAL_BODY.split('%7Bcompany%7D')
    .join(encodeURIComponent(company))
    .split('%7Bfrom%7D')
    .join(encodeURIComponent(from))
    .split('%7Bto%7D')
    .join(encodeURIComponent(to))
    .split('3834316')
    .join(encodeURIComponent(master));
}

function errorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const error = (payload as Record<string, unknown>).error;

  if (typeof error === 'string' || typeof error === 'number') {
    return String(error);
  }

  if (error && typeof error === 'object') {
    const code = (error as Record<string, unknown>).code;
    if (typeof code === 'string' || typeof code === 'number') {
      return String(code);
    }
  }

  return null;
}

function errorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const error = (payload as Record<string, unknown>).error;

  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return null;
}

async function perform(
  token: string,
  path: string,
  body: string,
  company: string,
  timeoutMs: number,
): Promise<AuthAttempt> {
  const base = baseUrl();
  let response: Response;

  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        origin: base,
        referer: `${base}/ru/owner/journal/?company=${company}`,
        'x-requested-with': 'XMLHttpRequest',
        'user-agent': USER_AGENT,
        cookie: `token=${token}`,
      },
      body,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return failure('unreachable', 'dikidi.net не отвечает (проверьте сеть или VPN)');
  }

  if (response.status >= 300 && response.status < 400) {
    return {
      ok: false,
      kind: 'auth',
      message: 'DIKIDI перенаправляет на страницу входа: сессия кабинета истекла',
    };
  }

  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

  if (contentType.includes('text/html')) {
    return {
      ok: false,
      kind: 'auth',
      message: 'DIKIDI вернул страницу входа вместо данных: сессия кабинета истекла',
    };
  }

  let payload: unknown = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return failure('failed', 'DIKIDI вернул не JSON — формат ответа изменился');
  }

  const code = errorCode(payload);

  if (code !== null) {
    const detail = errorMessage(payload);
    return failure(
      'failed',
      `DIKIDI отклонил запрос (error is ${code})${detail ? `: ${detail}` : ''}`,
    );
  }

  return { ok: true, data: payload };
}

/** Один POST с токеном; при истёкшей сессии — один вход и один повтор. */
async function post(
  path: string,
  body: string,
  company: string,
  options: { timeoutMs?: number } = {},
): Promise<DikidiHttpResult<unknown>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const token = await getDikidiToken();

  if (!token) {
    return failure('not_configured', NO_TOKEN);
  }

  let result = await perform(token, path, body, company, timeoutMs);

  if (result.ok || result.kind !== 'auth') {
    return result as DikidiHttpResult<unknown>;
  }

  const refreshed = await refreshDikidiToken(token);

  if (!refreshed.ok) {
    return failure(
      'unauthorized',
      `Сессия DIKIDI истекла, повторный вход не удался: ${refreshed.message}`,
    );
  }

  result = await perform(refreshed.token, path, body, company, timeoutMs);

  if (result.ok) {
    return result as DikidiHttpResult<unknown>;
  }

  return result.kind === 'auth'
    ? failure(
        'unauthorized',
        'Сессия DIKIDI истекла: DIKIDI снова перенаправил на вход. Обновите DIKIDI_TOKEN или DIKIDI_LOGIN/DIKIDI_PASSWORD.',
      )
    : (result as DikidiHttpResult<unknown>);
}

function required(
  args: DikidiHttpArgs,
  keys: string[],
): DikidiHttpResult<never> | null {
  const missing = keys.filter((key) => !args[key] && args[key] !== '');

  return missing.length > 0
    ? failure('failed', `Не хватает аргументов операции: ${missing.join(', ')}`)
    : null;
}

function form(fields: Record<string, string>): string {
  return new URLSearchParams(fields).toString();
}

/** Выполняет операцию прямым запросом к DIKIDI. */
export async function dikidiHttp<T>(
  op: DikidiHttpOperation,
  args: DikidiHttpArgs,
  options: { timeoutMs?: number } = {},
): Promise<DikidiHttpResult<T>> {
  const company = args.company || process.env.DIKIDI_COMPANY_ID || '1784388';

  if (op === 'journal') {
    const body = journalBody({ ...args, company });

    if (!body) {
      return failure('failed', 'Не хватает аргументов операции: company, master, from, to');
    }

    const result = await post(
      `/ru/owner/ajax/journal/api/?company=${encodeURIComponent(company)}`,
      body,
      company,
      options,
    );

    if (!result.ok) {
      return result;
    }

    // api-anything отдаёт объект `master` (extract: "master") — повторяем этот контракт.
    const payload = result.data;
    const master =
      payload && typeof payload === 'object'
        ? ((payload as Record<string, unknown>).master ?? payload)
        : payload;

    return { ok: true, data: master as T };
  }

  if (op === 'find-client') {
    const missing = required(args, ['query']);
    if (missing) return missing;

    return (await post(
      `/ru/owner/ajax/clients/find/?company=${encodeURIComponent(company)}`,
      form({ query: args.query }),
      company,
      options,
    )) as DikidiHttpResult<T>;
  }

  if (op === 'save-client') {
    const missing = required(args, ['name', 'phone']);
    if (missing) return missing;

    return (await post(
      `/ru/owner/ajax/clients/save/?company=${encodeURIComponent(company)}`,
      form({
        is_for_journal: '1',
        component_uid: '1',
        name: args.name,
        surname: '',
        number: args.phone,
        email: '',
        sex: '',
        birthday: '',
        discount: '0',
        card: '',
        source_id: '',
        comment: args.comment ?? '',
        is_blacklist: '0',
        blacklist_comment: '',
      }),
      company,
      options,
    )) as DikidiHttpResult<T>;
  }

  if (op === 'create-record') {
    const missing = required(args, ['master', 'date', 'time', 'service_id', 'client_id', 'name', 'phone']);
    if (missing) return missing;

    return (await post(
      `/ru/owner/ajax/journal/record_save/?company=${encodeURIComponent(company)}`,
      form({
        appointment_id: args.appointment_id ?? '',
        clear_break: '',
        unique_key: args.unique_key ?? '0',
        company,
        home_company: company,
        protocol_version: '2',
        master_id: args.master,
        date: args.date,
        time: args.time,
        'services[0][id]': args.service_id,
        'services[0][duration]': args.duration ?? '',
        'services[0][floating]': '0',
        'services[0][price]': args.price ?? '',
        'services[0][discount_percent]': '0',
        'services[0][discount_sum]': '0',
        'services[0][cost]': args.price ?? '',
        client_name: args.name,
        client_id: args.client_id,
        client_phone: args.phone,
        is_anonym: '0',
        is_accept: '0',
        comments: args.comment ?? '',
        color_label_id: '0',
      }),
      company,
      options,
    )) as DikidiHttpResult<T>;
  }

  const missing = required(args, ['record_id']);
  if (missing) return missing;

  return (await post(
    `/ru/owner/ajax/journal/remove/${encodeURIComponent(args.record_id ?? '')}/`,
    form({ unique_key: args.unique_key ?? '0', company }),
    company,
    options,
  )) as DikidiHttpResult<T>;
}
