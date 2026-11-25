'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Поля даты и времени для админки.
 *
 * Нативные `input type="date"` и `type="time"` рисуются по локали браузера:
 * в en-US это MM/DD/YYYY и 6:30 PM. Здесь формат задаём сами — ДД.ММ.ГГГГ и ЧЧ:ММ,
 * — а в форму по-прежнему уходит `YYYY-MM-DD` / `HH:MM`, который ждут server actions.
 */

const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isoToDisplay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '';
}

/** `ДД.ММ.ГГГГ` → `YYYY-MM-DD`; пустая строка, если даты не существует. */
function displayToIso(text: string): string {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (!match) return '';
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;

  // «930» — это 9:30, а не 93:0: если первые две цифры не могут быть часом,
  // считаем первую цифру часом и добавляем ведущий ноль.
  if (digits.length === 3 && Number(digits.slice(0, 2)) > 23) {
    return `0${digits[0]}:${digits.slice(1)}`;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Minsk' }).format(new Date());
}

type DateFieldProps = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
};

export function DateField({
  name,
  defaultValue = '',
  required = false,
  min,
  max,
  className = 'w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose',
}: DateFieldProps) {
  const [text, setText] = useState(() => isoToDisplay(defaultValue));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const source = isoToDisplay(defaultValue) ? defaultValue : todayIso();
    const [year, month] = source.split('-').map(Number);
    return { year, month: month - 1 };
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const iso = displayToIso(text);

  // Нативная валидация формы: пустая или несуществующая дата не отправится.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    let message = '';
    if (!text) {
      message = required ? 'Укажите дату' : '';
    } else if (text.length < 10) {
      message = 'Дата в формате ДД.ММ.ГГГГ';
    } else if (!iso) {
      message = 'Такой даты нет';
    } else if (min && iso < min) {
      message = `Дата не раньше ${isoToDisplay(min)}`;
    } else if (max && iso > max) {
      message = `Дата не позже ${isoToDisplay(max)}`;
    }
    input.setCustomValidity(message);
  }, [text, iso, required, min, max]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggleCalendar() {
    if (!open) {
      const source = iso || todayIso();
      const [year, month] = source.split('-').map(Number);
      setView({ year, month: month - 1 });
    }
    setOpen((value) => !value);
  }

  function selectDay(year: number, month: number, day: number) {
    setText(`${pad(day)}.${pad(month + 1)}.${year}`);
    setOpen(false);
  }

  const firstWeekday = (new Date(Date.UTC(view.year, view.month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const today = todayIso();

  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={iso} />
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="ДД.ММ.ГГГГ"
        value={text}
        required={required}
        maxLength={10}
        aria-label={`Дата в формате ДД.ММ.ГГГГ`}
        onChange={(event) => setText(maskDate(event.target.value))}
        className={`${className} pr-9`}
      />
      <button
        type="button"
        onClick={toggleCalendar}
        aria-label="Открыть календарь"
        aria-expanded={open}
        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted transition hover:bg-cream hover:text-rose-dark"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-border bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setView(({ year, month }) =>
                  month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
                )
              }
              aria-label="Предыдущий месяц"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-cream hover:text-rose-dark"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-sm font-medium capitalize">
              {MONTHS[view.month]} {view.year}
            </span>
            <button
              type="button"
              onClick={() =>
                setView(({ year, month }) =>
                  month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
                )
              }
              aria-label="Следующий месяц"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-cream hover:text-rose-dark"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day === null) return <span key={`empty-${index}`} />;
              const value = `${view.year}-${pad(view.month + 1)}-${pad(day)}`;
              const disabled = Boolean((min && value < min) || (max && value > max));
              const selected = value === iso;
              const isToday = value === today;

              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(view.year, view.month, day)}
                  className={`flex h-8 items-center justify-center rounded-md text-sm transition ${
                    selected
                      ? 'bg-rose-dark text-white'
                      : disabled
                        ? 'cursor-not-allowed text-muted/40'
                        : 'hover:bg-cream'
                  } ${!selected && isToday ? 'font-semibold text-rose-dark' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type TimeFieldProps = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
};

export function TimeField({
  name,
  defaultValue = '',
  required = false,
  className = 'w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose',
}: TimeFieldProps) {
  const [text, setText] = useState(() => maskTime(defaultValue));
  const inputRef = useRef<HTMLInputElement>(null);

  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
  const value = valid ? text : '';

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    let message = '';
    if (!text) {
      message = required ? 'Укажите время' : '';
    } else if (text.length < 5) {
      message = 'Время в формате ЧЧ:ММ';
    } else if (!valid) {
      message = 'Такого времени нет';
    }
    input.setCustomValidity(message);
  }, [text, valid, required]);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="ЧЧ:ММ"
        value={text}
        required={required}
        maxLength={5}
        aria-label="Время в 24-часовом формате ЧЧ:ММ"
        onChange={(event) => setText(maskTime(event.target.value))}
        className={className}
      />
    </div>
  );
}
