import { BELARUS_TIME_ZONE } from '@/lib/dikidi/time';
import type {
  DikidiJournalRecord,
  DikidiJournalResponse,
  ScheduleEntry,
} from '@/lib/dikidi/types';

/** DIKIDI отдаёт локальное время салона строкой «YYYY-MM-DD HH:MM:SS» без зоны. */
function parseDikidiDateTime(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value.replace(' ', 'T')}+03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNumber(value: string | undefined): number {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function recordPrice(record: DikidiJournalRecord): number {
  const services = record.info?.services ?? [];
  const servicesSum = services.reduce((sum, service) => sum + toNumber(service.cost), 0);

  if (servicesSum > 0) {
    return Math.round(servicesSum * 100) / 100;
  }

  return toNumber(record.info?.masters?.[0]?.cost);
}

function recordDuration(record: DikidiJournalRecord): number {
  const fromInfo = Number.parseInt(String(record.info?.duration ?? ''), 10);
  if (Number.isFinite(fromInfo) && fromInfo > 0) {
    return fromInfo;
  }

  const fromRecord = Number.parseInt(String(record.duration ?? ''), 10);
  return Number.isFinite(fromRecord) && fromRecord > 0
    ? Math.round(fromRecord / 60)
    : 0;
}

function mapRecord(record: DikidiJournalRecord): ScheduleEntry | null {
  const begin = parseDikidiDateTime(record.begin);
  const end = parseDikidiDateTime(record.end);

  if (!begin) {
    return null;
  }

  const services =
    record.info?.services_title?.filter(Boolean) ??
    (record.info?.services ?? [])
      .map((service) => service.title)
      .filter((title): title is string => Boolean(title));

  const timeFrom = new Intl.DateTimeFormat('ru-RU', {
    timeZone: BELARUS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(begin);

  const timeTo = end
    ? new Intl.DateTimeFormat('ru-RU', {
        timeZone: BELARUS_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(end)
    : '';

  return {
    key: `dikidi:${record.id ?? `${record.begin}-${record.info?.client_name ?? ''}`}`,
    source: 'dikidi',
    dikidiId: record.id ?? null,
    dateKey: record.date ?? record.begin!.slice(0, 10),
    startsAtIso: begin.toISOString(),
    endsAtIso: end ? end.toISOString() : null,
    timeFrom,
    timeTo,
    clientName: record.info?.client_name?.trim() || 'Без имени',
    clientPhone: record.info?.client_phone?.trim() || '',
    services: services.length ? services : ['Услуга не указана'],
    price: recordPrice(record),
    durationMin: recordDuration(record),
    comment: record.info?.comment?.trim() || '',
  };
}

/**
 * Разворачивает вложенную структуру журнала (master → records[masterId][date][id])
 * в плоский список записей. Дубли по id отбрасываются.
 */
export function mapJournalToEntries(
  response: DikidiJournalResponse,
): ScheduleEntry[] {
  const byMaster = response.master?.records ?? {};
  const entries = new Map<string, ScheduleEntry>();

  for (const byDate of Object.values(byMaster)) {
    for (const byRecord of Object.values(byDate ?? {})) {
      for (const record of Object.values(byRecord ?? {})) {
        const entry = mapRecord(record);
        if (entry && !entries.has(entry.key)) {
          entries.set(entry.key, entry);
        }
      }
    }
  }

  return [...entries.values()];
}
