'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { withQuery } from '@/lib/url';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function fail(path: string, code: string): never {
  redirect(withQuery(path, { error: code }));
}

export async function saveDefaultSchedule(formData: FormData): Promise<void> {
  await requireUser();

  const isWorking = formData.get('isWorking') === 'on';
  const workingDays = formData
    .getAll('workingDays')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);

  const workStart = String(formData.get('workStart') ?? '').trim();
  const workEnd = String(formData.get('workEnd') ?? '').trim();
  const breakStart = String(formData.get('breakStart') ?? '').trim();
  const breakEnd = String(formData.get('breakEnd') ?? '').trim();

  if (isWorking) {
    if (!TIME_PATTERN.test(workStart) || !TIME_PATTERN.test(workEnd)) {
      fail('/admin/availability', 'invalid_time');
    }
    if (toMinutes(workStart) >= toMinutes(workEnd)) {
      fail('/admin/availability', 'invalid_range');
    }
    if (workingDays.length === 0) {
      fail('/admin/availability', 'no_working_days');
    }
  }

  let bs: string | null = null;
  let be: string | null = null;
  if (breakStart || breakEnd) {
    if (!TIME_PATTERN.test(breakStart) || !TIME_PATTERN.test(breakEnd)) {
      fail('/admin/availability', 'invalid_break');
    }
    if (toMinutes(breakStart) >= toMinutes(breakEnd)) {
      fail('/admin/availability', 'invalid_break');
    }
    if (isWorking) {
      if (toMinutes(breakStart) < toMinutes(workStart) || toMinutes(breakEnd) > toMinutes(workEnd)) {
        fail('/admin/availability', 'break_outside');
      }
    }
    bs = breakStart;
    be = breakEnd;
  }

  await query(
    `insert into master_schedule_default
       (id, is_working, working_days, work_start, work_end, break_start, break_end, updated_at)
     values (1, $1, $2, $3, $4, $5, $6, now())
     on conflict (id) do update set
       is_working = excluded.is_working,
       working_days = excluded.working_days,
       work_start = excluded.work_start,
       work_end = excluded.work_end,
       break_start = excluded.break_start,
       break_end = excluded.break_end,
       updated_at = now()`,
    [
      isWorking,
      workingDays,
      isWorking ? workStart : '10:00',
      isWorking ? workEnd : '19:00',
      bs,
      be,
    ],
  );

  revalidatePath('/admin/availability');
  revalidatePath('/book');
  redirect('/admin/availability?saved=default');
}

export async function saveOverrideSchedule(formData: FormData): Promise<void> {
  await requireUser();

  const date = String(formData.get('date') ?? '').trim();
  if (!DATE_PATTERN.test(date)) {
    fail('/admin/availability', 'invalid_date');
  }

  const isWorking = formData.get('isWorking') === 'on';
  const workStart = String(formData.get('workStart') ?? '').trim();
  const workEnd = String(formData.get('workEnd') ?? '').trim();
  const breakStart = String(formData.get('breakStart') ?? '').trim();
  const breakEnd = String(formData.get('breakEnd') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim().slice(0, 200);

  if (isWorking) {
    if (!TIME_PATTERN.test(workStart) || !TIME_PATTERN.test(workEnd)) {
      fail('/admin/availability', 'invalid_time');
    }
    if (toMinutes(workStart) >= toMinutes(workEnd)) {
      fail('/admin/availability', 'invalid_range');
    }
  }

  let bs: string | null = null;
  let be: string | null = null;
  if (breakStart || breakEnd) {
    if (!TIME_PATTERN.test(breakStart) || !TIME_PATTERN.test(breakEnd)) {
      fail('/admin/availability', 'invalid_break');
    }
    if (toMinutes(breakStart) >= toMinutes(breakEnd)) {
      fail('/admin/availability', 'invalid_break');
    }
    if (isWorking) {
      if (toMinutes(breakStart) < toMinutes(workStart) || toMinutes(breakEnd) > toMinutes(workEnd)) {
        fail('/admin/availability', 'break_outside');
      }
    }
    bs = breakStart;
    be = breakEnd;
  }

  await query(
    `insert into master_schedule_overrides
       (date, is_working, work_start, work_end, break_start, break_end, note, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (date) do update set
       is_working = excluded.is_working,
       work_start = excluded.work_start,
       work_end = excluded.work_end,
       break_start = excluded.break_start,
       break_end = excluded.break_end,
       note = excluded.note,
       updated_at = now()`,
    [
      date,
      isWorking,
      isWorking ? workStart : null,
      isWorking ? workEnd : null,
      bs,
      be,
      note || null,
    ],
  );

  revalidatePath('/admin/availability');
  revalidatePath('/book');
  redirect('/admin/availability?saved=override');
}

export async function deleteOverrideSchedule(formData: FormData): Promise<void> {
  await requireUser();
  const date = String(formData.get('date') ?? '').trim();
  if (!DATE_PATTERN.test(date)) {
    fail('/admin/availability', 'invalid_date');
  }
  await query('delete from master_schedule_overrides where date = $1', [date]);
  revalidatePath('/admin/availability');
  revalidatePath('/book');
  redirect('/admin/availability?deleted=1');
}
