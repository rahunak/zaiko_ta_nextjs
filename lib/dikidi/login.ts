/**
 * Прямой вход в кабинет DIKIDI по логину и паролю (транспорт `http`).
 *
 * DIKIDI пускает владельца через auth.dikidi.net тремя шагами:
 * 1. на `dikidi.net` в форме `#auth` лежит hidden `telegram_csrf`, а ввод — только номер;
 * 2. POST `/ajax/check/auth/` возвращает HTML следующего шага: форма пароля (с hidden
 *    `csrf` и `callback`) или форма регистрации, если номер не заведён;
 * 3. POST на `callback` (по умолчанию `/ajax/user/auth/`) с номером и паролем ставит
 *    cookie `token` — ту самую, которой пользуется кабинет и прямые запросы.
 *
 * Если DIKIDI требует SMS-код или капчу, вернём `captcha`: автоматический вход невозможен,
 * нужен ручной `DIKIDI_TOKEN`.
 *
 * Только серверный код: логин и пароль читаются из env и никогда не логируются.
 */

export type DikidiLoginResult =
  | { ok: true; token: string }
  | {
      ok: false;
      kind: 'no_credentials' | 'bad_credentials' | 'captcha' | 'unreachable' | 'unexpected';
      message: string;
    };

const SITE = 'https://dikidi.net';
const AUTH = 'https://auth.dikidi.net';
const TIMEOUT_MS = 15_000;
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

type Jar = Map<string, string>;
type JsonPayload = Record<string, unknown> | null;

/** Телефон для DIKIDI: только цифры с кодом страны (`80…` и 9 цифр приводятся к `375…`). */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('80')) {
    return `375${digits.slice(2)}`;
  }

  if (digits.length === 9) {
    return `375${digits}`;
  }

  return digits;
}

export function dikidiCredentials(): { login: string; password: string } | null {
  const login = (process.env.DIKIDI_LOGIN || '').trim();
  const password = process.env.DIKIDI_PASSWORD || '';

  return login && password ? { login, password } : null;
}

function setCookieHeaders(response: Response): string[] {
  const withGetter = response.headers as unknown as { getSetCookie?: () => string[] };
  const list = withGetter.getSetCookie?.();

  if (Array.isArray(list) && list.length > 0) {
    return list;
  }

  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

function storeCookies(jar: Jar, response: Response): void {
  for (const raw of setCookieHeaders(response)) {
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

function cookieHeader(jar: Jar): string {
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag);
  return match ? decodeEntities(match[1]) : null;
}

/** Все hidden-поля формы: csrf, callback, type и прочее, что DIKIDI кладёт в шаг. */
function hiddenInputs(html: string): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const tag of html.match(/<input\b[^>]*>/gi) ?? []) {
    if ((attribute(tag, 'type') ?? '').toLowerCase() !== 'hidden') {
      continue;
    }

    const name = attribute(tag, 'name');
    if (!name) {
      continue;
    }

    fields[name] = attribute(tag, 'value') ?? '';
  }

  return fields;
}

function errorCode(payload: JsonPayload): string | null {
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

function errorText(payload: JsonPayload, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const error = (payload as Record<string, unknown>).error;

  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}

function captchaFailure(message = 'DIKIDI требует SMS-подтверждение или капчу'): DikidiLoginResult {
  return {
    ok: false,
    kind: 'captcha',
    message: `${message}. Автоматический вход невозможен — задайте DIKIDI_TOKEN (cookie кабинета) вручную.`,
  };
}

type PostResult =
  | { ok: true; payload: JsonPayload; raw: string }
  | { ok: false; status: number | null; payload: JsonPayload; message: string };

async function postForm(url: string, body: string, jar: Jar): Promise<PostResult> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
        origin: SITE,
        referer: `${SITE}/`,
        'user-agent': USER_AGENT,
        ...(jar.size > 0 ? { cookie: cookieHeader(jar) } : {}),
      },
      body,
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, status: null, payload: null, message: 'auth.dikidi.net не отвечает' };
  }

  storeCookies(jar, response);

  const raw = await response.text();
  let payload: JsonPayload = null;

  try {
    payload = raw ? (JSON.parse(raw) as JsonPayload) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload,
      message: errorText(payload, `auth.dikidi.net ответил ${response.status}`),
    };
  }

  return { ok: true, payload, raw };
}

/** Шаг телефона: забирает `telegram_csrf` со страницы и получает HTML следующего шага. */
async function requestPasswordStep(number: string, jar: Jar): Promise<
  | { ok: true; html: string }
  | { ok: false; result: DikidiLoginResult }
> {
  let page: Response;

  try {
    page = await fetch(`${SITE}/`, {
      headers: { accept: 'text/html', 'user-agent': USER_AGENT },
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return {
      ok: false,
      result: { ok: false, kind: 'unreachable', message: 'dikidi.net не отвечает' },
    };
  }

  storeCookies(jar, page);
  const home = await page.text();
  const telegramCsrf = hiddenInputs(home).telegram_csrf;

  if (!telegramCsrf) {
    return {
      ok: false,
      result: {
        ok: false,
        kind: 'unexpected',
        message: 'На странице входа DIKIDI не найден параметр telegram_csrf',
      },
    };
  }

  const step = await postForm(
    `${AUTH}/ajax/check/auth/`,
    new URLSearchParams({ telegram_csrf: telegramCsrf, number }).toString(),
    jar,
  );

  if (!step.ok) {
    const code = errorCode(step.payload);

    if (code && /NUMBER/i.test(code)) {
      return {
        ok: false,
        result: {
          ok: false,
          kind: 'bad_credentials',
          message: `DIKIDI не принимает номер из DIKIDI_LOGIN: ${step.message}`,
        },
      };
    }

    if (code && /captcha|sms/i.test(code)) {
      return { ok: false, result: captchaFailure() };
    }

    return {
      ok: false,
      result: {
        ok: false,
        kind: 'unexpected',
        message: `Шаг телефона в DIKIDI: ${step.message}`,
      },
    };
  }

  const html =
    step.payload && typeof step.payload.html === 'string' ? step.payload.html : '';

  if (!html) {
    return {
      ok: false,
      result: { ok: false, kind: 'unexpected', message: 'DIKIDI не вернул шаг входа' },
    };
  }

  if (/sms-captcha|captcha/i.test(html)) {
    return { ok: false, result: captchaFailure() };
  }

  return { ok: true, html };
}

/**
 * Входит в кабинет DIKIDI и возвращает cookie `token`.
 * Пароль и токен наружу не отдаются ни в логах, ни в сообщениях об ошибке.
 */
export async function loginToDikidi(): Promise<DikidiLoginResult> {
  const credentials = dikidiCredentials();

  if (!credentials) {
    return {
      ok: false,
      kind: 'no_credentials',
      message:
        'DIKIDI_LOGIN/DIKIDI_PASSWORD не заданы — автоматический вход в DIKIDI не настроен',
    };
  }

  const number = normalizePhone(credentials.login);

  if (number.length < 10) {
    return {
      ok: false,
      kind: 'bad_credentials',
      message: 'DIKIDI_LOGIN не похож на номер телефона',
    };
  }

  const jar: Jar = new Map();
  const step = await requestPasswordStep(number, jar);

  if (!step.ok) {
    return step.result;
  }

  const fields = hiddenInputs(step.html);
  const callback = fields.callback ?? '';

  // Форма регистрации тоже содержит password — отличаем её по действию формы и обработчику.
  const isRegistration =
    /sw\.auth\.registration/i.test(step.html) ||
    /\/ajax\/user\/create\//i.test(callback) ||
    fields.type === 'registration';
  const isLogin =
    /sw\.auth\.login/i.test(step.html) || /\/ajax\/user\/auth\//i.test(callback);

  if (isRegistration || !isLogin) {
    return {
      ok: false,
      kind: 'bad_credentials',
      message:
        'DIKIDI не предлагает вход по паролю для этого номера: он не зарегистрирован или вход только по SMS-коду',
    };
  }

  // Постим только на шаг входа: на /ajax/user/create/ уходит регистрация, её делать нельзя.
  const target = `${AUTH}/ajax/user/auth/`;

  const body = new URLSearchParams({
    ...fields,
    number,
    password: credentials.password,
  }).toString();

  const auth = await postForm(target, body, jar);

  if (!auth.ok) {
    const code = errorCode(auth.payload);

    if (code && /captcha|sms/i.test(code)) {
      return captchaFailure();
    }

    return {
      ok: false,
      kind: 'bad_credentials',
      message: `DIKIDI отклонил вход: ${auth.message}`,
    };
  }

  const rejection = errorCode(auth.payload);
  if (rejection) {
    if (/captcha|sms/i.test(rejection)) {
      return captchaFailure();
    }

    return {
      ok: false,
      kind: 'bad_credentials',
      message: `DIKIDI отклонил вход: ${errorText(auth.payload, rejection)}`,
    };
  }

  let token = jar.get('token') ?? '';

  if (!token) {
    // Токен иногда ставится только при первом заходе в кабинет — добираем его тем же jar.
    try {
      const owner = await fetch(`${SITE}/ru/owner/`, {
        headers: {
          accept: 'text/html',
          'user-agent': USER_AGENT,
          ...(jar.size > 0 ? { cookie: cookieHeader(jar) } : {}),
        },
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      storeCookies(jar, owner);
      token = jar.get('token') ?? '';
    } catch {
      // Ниже вернём понятную ошибку.
    }
  }

  if (!token) {
    return {
      ok: false,
      kind: 'unexpected',
      message: 'Вход в DIKIDI прошёл, но cookie token не получена',
    };
  }

  return { ok: true, token };
}
