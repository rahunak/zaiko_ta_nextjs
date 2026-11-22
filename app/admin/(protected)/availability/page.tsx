import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { todayBelarus } from '@/lib/dikidi/time';
import {
  saveDefaultSchedule,
  saveOverrideSchedule,
  deleteOverrideSchedule,
} from './actions';

type DefaultRow = {
  is_working: boolean;
  working_days: number[];
  work_start: string;
  work_end: string;
  break_start: string | null;
  break_end: string | null;
};

type OverrideRow = {
  date: string;
  is_working: boolean;
  work_start: string | null;
  work_end: string | null;
  break_start: string | null;
  break_end: string | null;
  note: string | null;
};

const ERRORS: Record<string, string> = {
  invalid_date: 'Некорректная дата.',
  invalid_time: 'Укажите время в формате ЧЧ:ММ.',
  invalid_range: 'Начало должно быть раньше окончания.',
  invalid_break: 'Некорректный перерыв.',
  break_outside: 'Перерыв должен помещаться в рабочее время.',
  no_working_days: 'Выберите хотя бы один рабочий день недели.',
};

const WEEKDAYS = [
  { v: 1, label: 'Пн' },
  { v: 2, label: 'Вт' },
  { v: 3, label: 'Ср' },
  { v: 4, label: 'Чт' },
  { v: 5, label: 'Пт' },
  { v: 6, label: 'Сб' },
  { v: 7, label: 'Вс' },
];

function timeValue(v: string | null): string {
  if (!v) return '';
  return v.slice(0, 5);
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; deleted?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  const { rows: defaultRows } = await query<DefaultRow>(
    `select is_working, working_days, work_start::text, work_end::text,
            break_start::text, break_end::text
       from master_schedule_default where id = 1`,
  );
  const def = defaultRows[0] ?? {
    is_working: true,
    working_days: [1, 2, 3, 4, 5],
    work_start: '10:00:00',
    work_end: '19:00:00',
    break_start: null,
    break_end: null,
  };

  const { rows: overrides } = await query<OverrideRow>(
    `select date::text, is_working, work_start::text, work_end::text,
            break_start::text, break_end::text, note
       from master_schedule_overrides
      order by date`,
  );

  const errorMessage = params.error ? (ERRORS[params.error] ?? params.error) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Расписание мастера</h1>
        <p className="mt-1 text-sm text-muted">
          Настройки влияют на доступные даты и время в форме онлайн-записи (/book).
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-gold-light bg-gold-light px-4 py-3 text-sm text-gold">
          {errorMessage}
        </div>
      ) : null}
      {params.saved === 'default' ? (
        <div className="rounded-lg border border-border bg-cream px-4 py-3 text-sm">
          Расписание по умолчанию сохранено.
        </div>
      ) : null}
      {params.saved === 'override' ? (
        <div className="rounded-lg border border-border bg-cream px-4 py-3 text-sm">
          Настройки дня сохранены.
        </div>
      ) : null}
      {params.deleted ? (
        <div className="rounded-lg border border-border bg-cream px-4 py-3 text-sm">
          Переопределение дня удалено — применяется расписание по умолчанию.
        </div>
      ) : null}

      {/* Расписание по умолчанию */}
      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="font-display text-lg">Расписание по умолчанию</h2>
        <p className="mt-1 text-sm text-muted">
          Применяется ко всем дням, для которых не задано отдельное переопределение.
        </p>

        <form action={saveDefaultSchedule} className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isWorking" defaultChecked={def.is_working} />
            <span>Мастер работает в этот день</span>
          </label>

          <div>
            <span className="mb-1 block text-sm font-medium">Рабочие дни недели</span>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map((wd) => (
                <label key={wd.v} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    name="workingDays"
                    value={wd.v}
                    defaultChecked={def.working_days?.includes(wd.v)}
                  />
                  {wd.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Начало</span>
              <input
                type="time"
                name="workStart"
                defaultValue={timeValue(def.work_start)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Окончание</span>
              <input
                type="time"
                name="workEnd"
                defaultValue={timeValue(def.work_end)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Перерыв с</span>
              <input
                type="time"
                name="breakStart"
                defaultValue={timeValue(def.break_start)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Перерыв до</span>
              <input
                type="time"
                name="breakEnd"
                defaultValue={timeValue(def.break_end)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
              />
            </label>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-rose-dark px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: '#B8627A' }}
          >
            Сохранить по умолчанию
          </button>
        </form>
      </section>

      {/* Переопределение конкретного дня */}
      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="font-display text-lg">День-исключение</h2>
        <p className="mt-1 text-sm text-muted">
          Выходной, сокращённый день или индивидуальное время работы на конкретную дату.
          Пустой перерыв — без перерыва.
        </p>

        <form action={saveOverrideSchedule} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Дата</span>
              <input
                type="date"
                name="date"
                required
                min={todayBelarus()}
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
              />
            </label>
            <label className="flex items-end gap-2 text-sm pb-2">
              <input type="checkbox" name="isWorking" defaultChecked />
              <span>Рабочий день</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Начало</span>
              <input
                type="time"
                name="workStart"
                defaultValue="10:00"
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Окончание</span>
              <input
                type="time"
                name="workEnd"
                defaultValue="19:00"
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Перерыв с</span>
              <input
                type="time"
                name="breakStart"
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Перерыв до</span>
              <input
                type="time"
                name="breakEnd"
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Комментарий</span>
            <input
              type="text"
              name="note"
              maxLength={200}
              placeholder="Например: выходной / короткий день"
              className="w-full rounded-lg border border-border bg-white px-3 py-2"
            />
          </label>

          <button
            type="submit"
            className="rounded-lg bg-rose-dark px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: '#B8627A' }}
          >
            Сохранить день
          </button>
        </form>
      </section>

      {/* Список переопределений */}
      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="font-display text-lg">Переопределённые дни</h2>
        {overrides.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Пока нет ни одного дня-исключения.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {overrides.map((o) => (
              <li key={o.date} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{o.date}</p>
                  <p className="text-xs text-muted">
                    {o.is_working
                      ? `${timeValue(o.work_start)}–${timeValue(o.work_end)}${
                          o.break_start && o.break_end
                            ? ` (перерыв ${timeValue(o.break_start)}–${timeValue(o.break_end)})`
                            : ''
                        }`
                      : 'Выходной'}
                    {o.note ? ` · ${o.note}` : ''}
                  </p>
                </div>
                <form action={deleteOverrideSchedule}>
                  <input type="hidden" name="date" value={o.date} />
                  <button
                    type="submit"
                    className="rounded-lg border border-border px-3 py-1 text-xs text-muted transition hover:border-rose hover:text-rose-dark"
                  >
                    Удалить
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/admin/schedule" className="text-sm text-muted hover:text-charcoal">
        ← К расписанию
      </Link>
    </div>
  );
}
