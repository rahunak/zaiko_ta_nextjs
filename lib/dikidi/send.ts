import { callDikidi } from '@/lib/dikidi/api';
import { belarusDateKey, belarusTime } from '@/lib/dikidi/time';

export type SendAppointmentInput = {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  /** ID услуги в DIKIDI (`services.dikidi_service_id`); без него запись не отправить. */
  dikidiServiceId: string | null;
  startsAt: Date;
  durationMin: number;
  price: number;
  comment: string;
  /** ID уже существующей записи DIKIDI: передан — обновляем её, нет — создаём новую. */
  dikidiId?: string | null;
};

export type SendAppointmentResult =
  | { status: 'synced'; dikidiId: string | null }
  | { status: 'failed'; error: string };

export type RemoveRecordResult = { status: 'removed' } | { status: 'failed'; error: string };

type DikidiClient = {
  id?: string;
  name?: string;
  phone?: string;
};

const COMPANY = () => process.env.DIKIDI_COMPANY_ID || '1784388';
const MASTER = () => process.env.DIKIDI_MASTER_ID || '3834316';

/**
 * Телефон цифрами для поиска клиента: DIKIDI хранит номера с кодом страны,
 * а в админку их вводят как придётся (+375…, 80…, 375…).
 */
function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('80')) {
    return `375${digits.slice(2)}`;
  }
  if (digits.length === 9) {
    return `375${digits}`;
  }
  return digits;
}

/** Номер вида «+375 (29) 601-75-84» — так DIKIDI показывает телефоны в карточке записи. */
function formatPhone(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length === 12 && digits.startsWith('375')) {
    return `+375 (${digits.slice(3, 5)}) ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
  }
  return value;
}

/** Ищет id записи в ответе DIKIDI: он лежит в event[].data.new.record_id. */
function extractDikidiId(payload: unknown): string | null {
  let found: string | null = null;

  const walk = (value: unknown, depth: number): void => {
    if (found || depth > 6 || !value || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item, depth + 1);
      }
      return;
    }

    const record = value as Record<string, unknown>;
    for (const key of ['record_id', 'appointment_id', 'id']) {
      const candidate = record[key];
      if (
        (typeof candidate === 'string' || typeof candidate === 'number') &&
        String(candidate).trim()
      ) {
        found = String(candidate);
        return;
      }
    }

    for (const nested of Object.values(record)) {
      walk(nested, depth + 1);
    }
  };

  walk(payload, 0);
  return found;
}

/**
 * Создаёт или обновляет запись в DIKIDI через write-операции api-anything.
 *
 * DIKIDI не принимает запись без клиента из своей базы, поэтому порядок такой:
 * 1. `find-client` — ищем клиента по телефону;
 * 2. `save-client` — если такого нет, создаём карточку клиента;
 * 3. `create-record` — создаём запись (`appointment_id` пуст) или обновляем существующую
 *    (`appointment_id` = `dikidiId`, ответ `master-records-update` — без дубля).
 *
 * Write-операции включены только у serve, запущенного с `--allow-writes`.
 */
export async function sendAppointmentToDikidi(
  input: SendAppointmentInput,
): Promise<SendAppointmentResult> {
  if (!input.dikidiServiceId) {
    return {
      status: 'failed',
      error: `У услуги «${input.serviceName}» не задан ID в DIKIDI (services.dikidi_service_id) — запись не отправлена.`,
    };
  }

  const digits = phoneDigits(input.clientPhone);
  const company = COMPANY();

  const found = await callDikidi<DikidiClient[]>('find-client', {
    company,
    query: digits,
  });

  if (!found.ok) {
    return { status: 'failed', error: `Поиск клиента в DIKIDI: ${found.message}` };
  }

  const clients = Array.isArray(found.data) ? found.data : [];
  const match =
    clients.find((client) => phoneDigits(client.phone ?? '') === digits) ?? clients[0];

  let clientId = match?.id ? String(match.id) : '';
  let clientPhone = match?.phone || formatPhone(input.clientPhone);

  if (!clientId) {
    const created = await callDikidi<{ client_info?: DikidiClient }>(
      'save-client',
      {
        company,
        name: input.clientName,
        phone: digits,
        comment: 'Создан из админки zaiko',
      },
      { write: true },
    );

    if (!created.ok) {
      return { status: 'failed', error: `Создание клиента в DIKIDI: ${created.message}` };
    }

    clientId = String(created.data?.client_info?.id ?? '');
    clientPhone = created.data?.client_info?.phone || formatPhone(input.clientPhone);

    if (!clientId) {
      return { status: 'failed', error: 'DIKIDI не вернул ID созданного клиента' };
    }
  }

  const created = await callDikidi<unknown>(
    'create-record',
    {
      appointment_id: input.dikidiId ?? '',
      company,
      master: MASTER(),
      date: belarusDateKey(input.startsAt),
      time: `${belarusTime(input.startsAt)}:00`,
      service_id: input.dikidiServiceId,
      duration: String(input.durationMin),
      price: input.price.toFixed(2),
      client_id: clientId,
      name: match?.name || input.clientName,
      phone: clientPhone,
      comment: input.comment,
      unique_key: '0',
    },
    { write: true },
  );

  if (!created.ok) {
    // api-anything не отправляет одну и ту же запись дважды: если такая отправка уже прошла
    // и мы обновляли существующую запись, значит в DIKIDI уже лежат ровно эти данные.
    if (input.dikidiId && created.message.includes('same write')) {
      return { status: 'synced', dikidiId: input.dikidiId };
    }

    const raw = created.message.toLowerCase();
    const friendly =
      raw.includes('refused the write') || raw.includes('error is 1')
        ? 'DIKIDI отклонил запись: время вне графика мастера или слот занят. Проверьте расписание в кабинете DIKIDI.'
        : created.message;

    return {
      status: 'failed',
      error: `Создание записи в DIKIDI: ${friendly}`,
    };
  }

  return { status: 'synced', dikidiId: extractDikidiId(created.data) ?? input.dikidiId ?? null };
}

/** Удаляет запись в DIKIDI (отмена): `POST /ru/owner/ajax/journal/remove/<id>/`. */
export async function removeDikidiRecord(dikidiId: string): Promise<RemoveRecordResult> {
  const result = await callDikidi<unknown>(
    'remove-record',
    { record_id: String(dikidiId), company: COMPANY(), unique_key: '0' },
    { write: true },
  );

  if (!result.ok) {
    return { status: 'failed', error: `Удаление в DIKIDI: ${result.message}` };
  }

  return { status: 'removed' };
}
