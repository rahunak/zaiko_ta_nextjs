import { NextResponse } from 'next/server';
import { sendDueReminders } from '@/lib/notifications/reminders';
import { sendClientReminders } from '@/lib/notifications/client-reminders';

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;

  // Без секрета эндпоинт не должен быть открыт: раньше его мог дёрнуть кто угодно
  // и разослать напоминания раньше времени. Напоминания в процессе всё равно работают.
  if (!secret) {
    return NextResponse.json(
      { error: 'cron_secret_not_configured' },
      { status: 503 },
    );
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sent = await sendDueReminders();
  const sentToClients = await sendClientReminders();
  return NextResponse.json({ sent, sentToClients });
}