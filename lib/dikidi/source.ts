import { callDikidi } from '@/lib/dikidi/api';
import { mapJournalToEntries } from '@/lib/dikidi/map';
import type { DikidiFailureKind } from '@/lib/dikidi/api';
import type { DikidiJournalResponse, ScheduleEntry } from '@/lib/dikidi/types';

export type JournalFetchResult =
  | { ok: true; entries: ScheduleEntry[] }
  | { ok: false; kind: DikidiFailureKind | 'config'; message: string };

/** Ответ операции может быть как самим журналом, так и обёрткой { data: ... }. */
function pickJournal(payload: unknown): DikidiJournalResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (record.master && typeof record.master === 'object') {
    return record as DikidiJournalResponse;
  }

  // Операция отдаёт срез master: { info, access, records, schedules }.
  if (record.records && typeof record.records === 'object') {
    return {
      master: { records: record.records } as DikidiJournalResponse['master'],
    };
  }

  if (record.data && typeof record.data === 'object') {
    return pickJournal(record.data);
  }

  return null;
}

/**
 * Читает журнал DIKIDI через транспортный слой (http или api-anything).
 * Аргументы — сырые значения; шаблон DIKIDI_JOURNAL_ARGS применяется только
 * в ветке api-anything внутри callDikidi.
 */
export async function fetchDikidiSchedule(
  from: string,
  to: string,
): Promise<JournalFetchResult> {
  const company = process.env.DIKIDI_COMPANY_ID || '1784388';
  const master = process.env.DIKIDI_MASTER_ID || '3834316';

  const result = await callDikidi<unknown>('journal', {
    company,
    master,
    from,
    to,
  });

  if (!result.ok) {
    return result;
  }

  const journal = pickJournal(result.data);

  if (!journal) {
    return {
      ok: false,
      kind: 'failed',
      message:
        'Ответ операции не похож на журнал DIKIDI. Проверьте операцию: api-anything ops ' +
        (process.env.DIKIDI_API_SITE || 'dikidi'),
    };
  }

  return { ok: true, entries: mapJournalToEntries(journal) };
}