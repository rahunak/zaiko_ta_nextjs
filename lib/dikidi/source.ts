import {
  callOperation,
  type ApiAnythingFailureKind,
} from '@/lib/api-anything/client';
import { renderArgsTemplate } from '@/lib/api-anything/template';
import { mapJournalToEntries } from '@/lib/dikidi/map';
import type { DikidiJournalResponse, ScheduleEntry } from '@/lib/dikidi/types';

export type JournalFetchResult =
  | { ok: true; entries: ScheduleEntry[] }
  | { ok: false; kind: ApiAnythingFailureKind | 'config'; message: string };

// Имена совпадают с параметрами операции `journal`, обученной в api-anything 2026-11-17.
const DEFAULT_JOURNAL_ARGS = '{"company":"{company}","from":"{from}","to":"{to}"}';

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
 * Читает журнал DIKIDI через операцию api-anything.
 * Аргументы операции задаются шаблоном DIKIDI_JOURNAL_ARGS: имена параметров
 * зависят от того, как операция была обучена.
 */
export async function fetchDikidiSchedule(
  from: string,
  to: string,
): Promise<JournalFetchResult> {
  const site = process.env.DIKIDI_API_SITE || 'dikidi';
  const op = process.env.DIKIDI_JOURNAL_OP || 'journal';

  const args = renderArgsTemplate(
    process.env.DIKIDI_JOURNAL_ARGS || DEFAULT_JOURNAL_ARGS,
    {
      // Дефолты — салон Зайко; переопределяются в .env.local.
      company: process.env.DIKIDI_COMPANY_ID || '1784388',
      master: process.env.DIKIDI_MASTER_ID || '3834316',
      from,
      to,
    },
  );

  if ('error' in args) {
    return { ok: false, kind: 'config', message: args.error };
  }

  const result = await callOperation<unknown>(site, op, args);

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
        site,
    };
  }

  return { ok: true, entries: mapJournalToEntries(journal) };
}
