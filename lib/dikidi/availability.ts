/**
 * Проверка слота по графику мастера в DIKIDI.
 *
 * DIKIDI не принимает запись вне рабочего окна мастера и поверх другой записи:
 * `record_save` отвечает `{"error":1}` без внятного текста. Чтобы владелец видел причину
 * сразу (а не «не отправлено»), перед отправкой читаем тот же журнал, что и расписание:
 * `schedules` даёт окно работы на день, `records` — занятые интервалы.
 *
 * Только серверный код.
 */
import { callDikidi } from '@/lib/dikidi/api';
import { belarusTime } from '@/lib/dikidi/time';

export type AvailabilityCheck =
  | { verdict: 'ok' }
  | { verdict: 'blocked'; reason: string }
  /** Журнал прочитать не удалось: не блокируем отправку, пусть DIKIDI ответит сам. */
  | { verdict: 'unknown'; reason: string };

type DaySchedule = {
  work_from?: string;
  work_to?: string;
  begin?: string;
  end?: string;
};

type DayRecord = {
  begin?: string;
  end?: string;
};

type JournalDay = {
  schedules?: Record<string, Record<string, DaySchedule>>;
  records?: Record<string, Record<string, Record<string, DayRecord>>>;
};

const masterId = () => process.env.DIKIDI_MASTER_ID || '3834316';
const companyId = () => process.env.DIKIDI_COMPANY_ID || '1784388';

/** Достаёт из ответа операции срез журнала (или вложенный `data`). */
function pickJournal(payload: unknown): JournalDay | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (record.schedules || record.records) {
    return record as JournalDay;
  }

  if (record.master && typeof record.master === 'object') {
    return record.master as JournalDay;
  }

  if (record.data && typeof record.data === 'object') {
    return pickJournal(record.data);
  }

  return null;
}

/** «HH:MM:SS» → минуты от полуночи. */
function toMinutes(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

/** Время из «YYYY-MM-DD HH:MM:SS» → минуты (без часового пояса: DIKIDI отдаёт локальное время салона). */
function recordMinutes(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parts = value.trim().split(' ');
  return toMinutes(parts[1] ?? value);
}

function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * Проверяет, попадёт ли запись в график мастера.
 *
 * `ignoreDikidiId` — собственная запись при правке: её не считаем занятой.
 */
export async function checkDikidiSlot(input: {
  dateKey: string;
  startsAt: Date;
  durationMin: number;
  ignoreDikidiId?: string | null;
}): Promise<AvailabilityCheck> {
  const result = await callDikidi<unknown>('journal', {
    company: companyId(),
    master: masterId(),
    from: input.dateKey,
    to: input.dateKey,
  });

  if (!result.ok) {
    return { verdict: 'unknown', reason: result.message };
  }

  const journal = pickJournal(result.data);

  if (!journal) {
    return { verdict: 'unknown', reason: 'Ответ журнала DIKIDI не распознан' };
  }

  const schedule = journal.schedules?.[masterId()]?.[input.dateKey];

  if (!schedule) {
    return {
      verdict: 'blocked',
      reason: 'В DIKIDI у мастера нет графика на этот день.',
    };
  }

  const workFrom = toMinutes(schedule.work_from ?? schedule.begin);
  const workTo = toMinutes(schedule.work_to ?? schedule.end);
  const start = toMinutes(`${belarusTime(input.startsAt)}:00`);
  const end = start === null ? null : start + input.durationMin;

  if (workFrom === null || workTo === null || start === null || end === null) {
    return { verdict: 'unknown', reason: 'Не удалось разобрать график мастера в DIKIDI' };
  }

  if (start < workFrom || end > workTo) {
    return {
      verdict: 'blocked',
      reason: `Время вне графика мастера в DIKIDI (${hhmm(workFrom)}–${hhmm(workTo)}).`,
    };
  }

  const dayRecords = journal.records?.[masterId()]?.[input.dateKey] ?? {};

  for (const [recordId, record] of Object.entries(dayRecords)) {
    if (input.ignoreDikidiId && String(recordId) === String(input.ignoreDikidiId)) {
      continue;
    }

    const busyFrom = recordMinutes(record.begin);
    const busyTo = recordMinutes(record.end);

    if (busyFrom === null || busyTo === null) {
      continue;
    }

    if (start < busyTo && end > busyFrom) {
      return {
        verdict: 'blocked',
        reason: `Время пересекается с записью в DIKIDI ${hhmm(busyFrom)}–${hhmm(busyTo)}.`,
      };
    }
  }

  return { verdict: 'ok' };
}
