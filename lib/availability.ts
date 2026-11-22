/**
 * Локальное расписание мастера и доступные слоты для онлайн-записи.
 *
 * Источник истины для /book: таблицы master_schedule_default и master_schedule_overrides.
 * DIKIDI остаётся дополнительной проверкой при отправке, но доступность слотов
 * определяется именно этими таблицами и уже существующими записями в appointments.
 */
import { query } from '@/lib/db';
import { getAppSettings } from '@/lib/settings';
import {
  addDays,
  belarusDateKey,
  belarusTime,
  toBelarusDate,
  todayBelarus,
} from '@/lib/dikidi/time';

export type WorkingWindow = {
  workStart: number; // минуты от полуночи
  workEnd: number;
  breakStart: number | null;
  breakEnd: number | null;
};

export type MasterScheduleDefault = {
  is_working: boolean;
  working_days: number[]; // ISO weekday: 1=Пн ... 7=Вс
  work_start: string; // HH:MM or HH:MM:SS
  work_end: string;
  break_start: string | null;
  break_end: string | null;
};

export type MasterScheduleOverride = {
  date: string; // YYYY-MM-DD
  is_working: boolean;
  work_start: string | null;
  work_end: string | null;
  break_start: string | null;
  break_end: string | null;
  note: string | null;
};

function parseMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function belarusMinutesOfDay(value: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Minsk',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(value);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

export async function getDefaultSchedule(): Promise<MasterScheduleDefault> {
  const { rows } = await query<MasterScheduleDefault>(
    `select is_working, working_days, work_start::text, work_end::text,
            break_start::text, break_end::text
       from master_schedule_default where id = 1`,
  );

  if (rows[0]) return rows[0];

  return {
    is_working: true,
    working_days: [1, 2, 3, 4, 5],
    work_start: '10:00:00',
    work_end: '19:00:00',
    break_start: null,
    break_end: null,
  };
}

export async function getOverride(dateKey: string): Promise<MasterScheduleOverride | null> {
  const { rows } = await query<MasterScheduleOverride>(
    `select date::text, is_working, work_start::text, work_end::text,
            break_start::text, break_end::text, note
       from master_schedule_overrides where date = $1`,
    [dateKey],
  );
  return rows[0] ?? null;
}

export function computeWorkingWindow(
  def: MasterScheduleDefault,
  override: MasterScheduleOverride | null,
  dateKey: string,
): WorkingWindow | null {
  if (override) {
    if (!override.is_working) return null;
    const workStart = parseMinutes(override.work_start);
    const workEnd = parseMinutes(override.work_end);
    if (workStart === null || workEnd === null || workStart >= workEnd) return null;
    return {
      workStart,
      workEnd,
      breakStart: parseMinutes(override.break_start),
      breakEnd: parseMinutes(override.break_end),
    };
  }

  if (!def.is_working) return null;

  const isoDay = (() => {
    const jsDay = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return jsDay === 0 ? 7 : jsDay;
  })();

  if (!Array.isArray(def.working_days) || !def.working_days.includes(isoDay)) {
    return null;
  }

  const workStart = parseMinutes(def.work_start);
  const workEnd = parseMinutes(def.work_end);
  if (workStart === null || workEnd === null || workStart >= workEnd) return null;

  return {
    workStart,
    workEnd,
    breakStart: parseMinutes(def.break_start),
    breakEnd: parseMinutes(def.break_end),
  };
}

export async function getWorkingWindow(dateKey: string): Promise<WorkingWindow | null> {
  const [def, override] = await Promise.all([
    getDefaultSchedule(),
    getOverride(dateKey),
  ]);
  return computeWorkingWindow(def, override, dateKey);
}

export async function getOverridesInRange(
  fromKey: string,
  toKey: string,
): Promise<Map<string, MasterScheduleOverride>> {
  const { rows } = await query<MasterScheduleOverride>(
    `select date::text, is_working, work_start::text, work_end::text,
            break_start::text, break_end::text, note
       from master_schedule_overrides
      where date >= $1 and date <= $2`,
    [fromKey, toKey],
  );
  return new Map(rows.map((r) => [r.date, r]));
}

type AppointmentRow = {
  starts_at: Date;
  duration_min: number;
};

async function getAppointmentsForDate(dateKey: string): Promise<AppointmentRow[]> {
  const dayStart = toBelarusDate(dateKey, '00:00');
  const dayEnd = toBelarusDate(addDays(dateKey, 1), '00:00');
  if (!dayStart || !dayEnd) return [];

  const { rows } = await query<AppointmentRow>(
    `select starts_at, duration_min
       from appointments
      where cancelled_at is null
        and starts_at >= $1 and starts_at < $2`,
    [dayStart, dayEnd],
  );
  return rows;
}

export function generateSlots(
  window: WorkingWindow,
  durationMin: number,
  appointments: AppointmentRow[],
  bufferMin: number = 0,
): string[] {
  const slots: string[] = [];
  // Буфер добавляется к концу каждой записи: мастеру нужно время на уборку
  // и подготовку, иначе клиенты ставятся вплотную друг к другу.
  const busy = appointments.map((a) => ({
    start: belarusMinutesOfDay(a.starts_at),
    end: belarusMinutesOfDay(a.starts_at) + a.duration_min + bufferMin,
  }));

  for (let start = window.workStart; start + durationMin <= window.workEnd; start += 15) {
    const end = start + durationMin;

    // обед/перерыв
    if (
      window.breakStart !== null &&
      window.breakEnd !== null &&
      start < window.breakEnd &&
      end > window.breakStart
    ) {
      continue;
    }

    let conflict = false;
    for (const b of busy) {
      if (start < b.end && end > b.start) {
        conflict = true;
        break;
      }
    }
    if (conflict) continue;

    slots.push(minutesToHhmm(start));
  }

  return slots;
}

/** Минуты от полуночи по Минску для «сейчас» — для ограничения «не раньше чем через N часов». */
function nowMinsk(): { dateKey: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Minsk',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/**
 * Отбрасывает слоты, до которых осталось меньше лимита (настройка «минимум часов
 * до записи»). Касается только сегодняшнего дня — остальные дни открыты целиком.
 */
export function filterByLeadTime(
  slots: string[],
  dateKey: string,
  leadMinutes: number,
): string[] {
  if (leadMinutes <= 0) return slots;

  const current = nowMinsk();
  if (dateKey !== current.dateKey) return slots;

  const threshold = current.minutes + leadMinutes;
  return slots.filter((slot) => {
    const minutes = parseMinutes(slot);
    return minutes !== null && minutes >= threshold;
  });
}

export async function getAvailableSlots(
  dateKey: string,
  durationMin: number,
): Promise<string[]> {
  const window = await getWorkingWindow(dateKey);
  if (!window) return [];

  const settings = await getAppSettings();
  const appointments = await getAppointmentsForDate(dateKey);
  const slots = generateSlots(window, durationMin, appointments, settings.buffer_min);

  return filterByLeadTime(slots, dateKey, settings.min_lead_hours * 60);
}

export type DateAvailability = {
  date: string;
  /** Свободное время дня — отдаётся сразу вместе с датой, чтобы переключение дня было мгновенным. */
  slots: string[];
  slotCount: number;
};

export async function getAvailableDates(
  durationMin: number,
  days: number = 45,
): Promise<DateAvailability[]> {
  const today = todayBelarus();
  const dates: DateAvailability[] = [];

  const rangeStart = toBelarusDate(today, '00:00');
  const rangeEnd = toBelarusDate(addDays(today, days), '00:00');
  let allAppointments: AppointmentRow[] = [];
  if (rangeStart && rangeEnd) {
    const { rows } = await query<AppointmentRow>(
      `select starts_at, duration_min
         from appointments
        where cancelled_at is null
          and starts_at >= $1 and starts_at < $2`,
      [rangeStart, rangeEnd],
    );
    allAppointments = rows;
  }

  const def = await getDefaultSchedule();
  const overrides = await getOverridesInRange(today, addDays(today, days - 1));
  const settings = await getAppSettings();
  const leadMinutes = settings.min_lead_hours * 60;

  for (let i = 0; i < days; i++) {
    const dateKey = addDays(today, i);
    const window = computeWorkingWindow(def, overrides.get(dateKey) ?? null, dateKey);
    if (!window) continue;

    const dayAppointments = allAppointments.filter(
      (a) => belarusDateKey(a.starts_at) === dateKey,
    );
    const slots = filterByLeadTime(
      generateSlots(window, durationMin, dayAppointments, settings.buffer_min),
      dateKey,
      leadMinutes,
    );
    dates.push({ date: dateKey, slots, slotCount: slots.length });
  }

  return dates;
}

export async function isSlotAvailable(
  dateKey: string,
  time: string,
  durationMin: number,
): Promise<boolean> {
  const slots = await getAvailableSlots(dateKey, durationMin);
  return slots.includes(time);
}

/**
 * Пересечение с уже существующими записями без привязки к сетке слотов.
 * Нужно ручной записи в админке: мастер может поставить время не кратно 15 минутам,
 * и проверка «слот есть в списке» отвергала бы валидное время.
 */
export async function hasTimeConflict(
  dateKey: string,
  time: string,
  durationMin: number,
): Promise<boolean> {
  const start = parseMinutes(time);
  if (start === null) return true;

  const end = start + durationMin;
  const appointments = await getAppointmentsForDate(dateKey);

  return appointments.some((appointment) => {
    const busyStart = belarusMinutesOfDay(appointment.starts_at);
    const busyEnd = busyStart + appointment.duration_min;
    return start < busyEnd && end > busyStart;
  });
}
