import { NextResponse } from 'next/server';
import { sendDueReminders } from '@/lib/notifications/reminders';

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const sent = await sendDueReminders();
  return NextResponse.json({ sent });
}