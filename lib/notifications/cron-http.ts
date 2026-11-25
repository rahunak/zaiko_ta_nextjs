import { NextResponse } from 'next/server';
import { runDispatch, normalizeSource } from '@/lib/notifications/reminders';
import { readEnv } from '@/lib/telegram';

/**
 * Обработчик тика для любого внешнего планировщика.
 *
 * Контракт: GET или POST с заголовком `Authorization: Bearer <CRON_SECRET>`.
 * Без секрета эндпоинт закрыт: иначе его мог бы дёрнуть кто угодно и разослать
 * напоминания раньше времени.
 *
 * 200 с частичными отказами — норма: ретраи живут в таблице `reminders`, а не в
 * HTTP-коде. 500 — только если упал сам тик; тогда cron-job.org пришлёт письмо.
 */
export async function handleCronDispatch(request: Request): Promise<NextResponse> {
  const secret = readEnv('CRON_SECRET');

  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 503 });
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const source = normalizeSource(new URL(request.url).searchParams.get('source') ?? 'external');

  try {
    const summary = await runDispatch({ source });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cron] тик напоминаний упал:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
