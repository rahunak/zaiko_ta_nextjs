import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendTelegramToChat, readEnv } from '@/lib/telegram';
import {
  clientReminderLeadText,
  CLIENT_REMINDER_HOURS,
} from '@/lib/notifications/client-reminders';
import { ensureReminder, resetReminder, sendReminderNow } from '@/lib/notifications/reminders';
import { belarusLongDate, belarusTime } from '@/lib/dikidi/time';

/**
 * Вебхук Telegram-бота напоминаний.
 *
 * Клиент после записи нажимает «Получить напоминание в Telegram», открывает бота
 * с deep-link `?start=<token>` и жмёт /start. Здесь мы привязываем chat_id к записи
 * и отвечаем подтверждением; напоминание за CLIENT_REMINDER_HOURS до визита отправит планировщик.
 *
 * Вебхук ставится на бота напоминаний клиентам (zaiko_ta_bot), а не на админского:
 * админский бот только пишет мастеру по его chat_id, ему вебхук не нужен.
 *
 * Настройка (один раз, после деплоя):
 *   TELEGRAM_CLIENT_BOT_TOKEN, TELEGRAM_CLIENT_BOT_USERNAME,
 *   TELEGRAM_CLIENT_WEBHOOK_SECRET
 *   curl "https://api.telegram.org/bot<токен zaiko_ta_bot>/setWebhook?url=https://zaiko.by/api/telegram/webhook&secret_token=<secret>"
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
  const secret = readEnv('TELEGRAM_CLIENT_WEBHOOK_SECRET');
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
    const delivered = await sendTelegramToChat(chat, message);
    // Провал доставки нельзя прятать за 200: иначе бот молчит, а getWebhookInfo показывает
    // здоровый вебхук. С 5xx Telegram повторит апдейт и запишет причину в last_error_message.
    if (!delivered) {
      return NextResponse.json({ ok: false, error: 'delivery_failed' }, { status: 502 });
    }
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

  if (startsAt.getTime() <= Date.now()) {
    return answer('Эта запись уже прошла. Записаться на новое время можно на сайте.');
  }

  // Строку напоминания обычно создаёт тик, но клиент может нажать кнопку раньше
  // первого тика — тогда создаём её здесь и работаем с ней.
  const reminder = await ensureReminder(Number(appointment.id), 'client_t60');

  if (!reminder) {
    return answer('Не получилось включить напоминание. Запишитесь заново или позвоните мастеру.');
  }

  // Визит ближе срока напоминания: отправляем сразу той же функцией, что и тик,
  // чтобы не появилось второй точки отправки со своими правилами.
  if (startsAt.getTime() - CLIENT_REMINDER_HOURS * 3_600_000 <= Date.now()) {
    await resetReminder(reminder.id, ['pending', 'failed', 'skipped']);
    const outcome = await sendReminderNow(reminder.id, 'webhook');

    if (outcome === 'sent') {
      return NextResponse.json({ ok: true, text: 'reminder_sent' });
    }
    if (outcome === 'not_claimable') {
      // Строка уже отправлена (повторный /start) — второй раз не шлём.
      return NextResponse.json({ ok: true, text: 'already_sent' });
    }
    // 5xx/429: строку подхватит следующий тик.
    return NextResponse.json({ ok: true, text: 'reminder_pending' });
  }

  // Повторная подписка после блокировки бота: возвращаем строку в работу,
  // чтобы тик отправил напоминание в срок. Отправленные строки не трогаем.
  await resetReminder(reminder.id);

  return answer(
    [
      'Напоминание включено.',
      `Запись: ${belarusLongDate(startsAt)}, ${belarusTime(startsAt)} — ${appointment.service_name}.`,
      `Напомню ${clientReminderLeadText()} до визита.`,
    ].join('\n'),
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, endpoint: 'telegram-webhook' });
}
