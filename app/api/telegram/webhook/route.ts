import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendTelegramToChat } from '@/lib/telegram';
import { clientReminderText, CLIENT_REMINDER_HOURS } from '@/lib/notifications/client-reminders';
import { belarusLongDate, belarusTime } from '@/lib/dikidi/time';

/**
 * Вебхук Telegram-бота напоминаний.
 *
 * Клиент после записи нажимает «Получить напоминание в Telegram», открывает бота
 * с deep-link `?start=<token>` и жмёт /start. Здесь мы привязываем chat_id к записи
 * и отвечаем подтверждением; за 2 часа до визита напоминание отправит планировщик.
 *
 * Настройка (один раз, после деплоя):
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET (опционально)
 *   curl "https://api.telegram.org/bot<token>/setWebhook?url=https://zaiko.by/api/telegram/webhook&secret_token=<secret>"
 */

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: { first_name?: string };
  };
};

type AppointmentRow = {
  id: string;
  client_name: string;
  service_name: string;
  starts_at: Date;
  duration_min: number;
  cancelled_at: Date | null;
};

const SITE = 'https://zaiko.by';

export async function POST(request: Request): Promise<NextResponse> {
  // Если секрет задан — проверяем заголовок, который Telegram присылает при setWebhook.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const text = update.message?.text?.trim() ?? '';
  const chatId = update.message?.chat?.id;

  if (!chatId || !text) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const chat = String(chatId);
  const [command, payload = ''] = text.split(/\s+/);

  const answer = async (message: string) => {
    await sendTelegramToChat(chat, message);
    return NextResponse.json({ ok: true, text: message });
  };

  if (!command.startsWith('/start')) {
    return answer(
      `Этот бот присылает напоминания о записи. Записаться можно на ${SITE}/book`,
    );
  }

  if (!payload) {
    return answer(
      `Чтобы включить напоминание, запишитесь на ${SITE}/book и нажмите кнопку «Получить напоминание в Telegram».`,
    );
  }

  const { rows } = await query<AppointmentRow>(
    `select id, client_name, service_name, starts_at, duration_min, cancelled_at
       from appointments
      where client_token = $1`,
    [payload],
  );

  const appointment = rows[0];

  if (!appointment) {
    return answer('Не нашёл такую запись. Возможно, ссылка устарела — запишитесь заново.');
  }

  if (appointment.cancelled_at) {
    return answer('Эта запись отменена, напоминание не нужно. Записаться можно на сайте.');
  }

  await query('update appointments set client_chat_id = $2 where id = $1', [
    appointment.id,
    chat,
  ]);

  const startsAt = new Date(appointment.starts_at);
  const hoursLeft = (startsAt.getTime() - Date.now()) / 3_600_000;

  // Если визит уже близко, отправляем напоминание сразу и отмечаем его,
  // чтобы планировщик не прислал второе через минуту.
  if (hoursLeft <= CLIENT_REMINDER_HOURS) {
    const delivered = await sendTelegramToChat(chat, clientReminderText(appointment));
    // Отмечаем только при успехе: если Telegram не ответил, напоминание
    // отправит планировщик на следующем тике.
    if (delivered) {
      await query('update appointments set client_reminder_sent_at = now() where id = $1', [
        appointment.id,
      ]);
    }
    return NextResponse.json({ ok: true, text: delivered ? 'reminder_sent' : 'reminder_pending' });
  }

  return answer(
    [
      'Напоминание включено.',
      `Запись: ${belarusLongDate(startsAt)}, ${belarusTime(startsAt)} — ${appointment.service_name}.`,
      `Напомню за ${CLIENT_REMINDER_HOURS} часа.`,
    ].join('\n'),
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, endpoint: 'telegram-webhook' });
}
