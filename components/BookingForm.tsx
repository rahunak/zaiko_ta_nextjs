'use client';

import { useEffect, useRef, useState } from 'react';
import { bookAppointment } from '@/app/book/actions';

type Service = {
  id: string;
  name: string;
  price: string;
  duration_min: number;
};

type DateAvailability = {
  date: string;
  slotCount: number;
};

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Minsk',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Minsk',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function formatDateParts(value: string): { weekday: string; day: string } {
  const date = new Date(`${value}T12:00:00+03:00`);
  const parts = dateFormatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  return { weekday, day: `${day} ${month}` };
}

function formatFullDate(value: string): string {
  const date = new Date(`${value}T12:00:00+03:00`);
  return fullDateFormatter.format(date);
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCalendarDays(viewDate: Date, availableMap: Map<string, number>) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  // ISO weekday: Monday=1..Sunday=7
  const startWeekday = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ date: string | null; slotCount: number | null }> = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ date: null, slotCount: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const iso = toIsoDate(d);
    cells.push({ date: iso, slotCount: availableMap.has(iso) ? availableMap.get(iso)! : null });
  }
  return cells;
}

export default function BookingForm({ services }: { services: Service[] }) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [dates, setDates] = useState<DateAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [serviceOpen, setServiceOpen] = useState(false);
  const serviceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setServiceOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    setLoadingDates(true);
    setStep(1);
    setSelectedDate('');
    setSelectedTime('');
    setSlots([]);
    fetch(`/api/availability?serviceId=${serviceId}&days=45`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: DateAvailability[] = Array.isArray(data.dates) ? data.dates : [];
        setDates(list);
        if (list.length > 0) {
          const first = new Date(`${list[0].date}T12:00:00+03:00`);
          setViewDate(new Date(first.getFullYear(), first.getMonth(), 1));
        }
      })
      .catch(() => {
        if (!cancelled) setDates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId || !selectedDate) {
      setSlots([]);
      setSelectedTime('');
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedTime('');
    fetch(`/api/availability?serviceId=${serviceId}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: string[] = Array.isArray(data.slots) ? data.slots : [];
        setSlots(list);
        if (list.length > 0) setSelectedTime(list[0]);
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setSelectedTime('');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId, selectedDate]);

  const chooseDate = (d: string, slotCount: number) => {
    if (slotCount <= 0) return;
    setSelectedDate(d);
    setStep(2);
  };

  const selectedService = services.find((s) => s.id === serviceId) ?? services[0];
  const availableMap = new Map(dates.map((d) => [d.date, d.slotCount]));
  const cells = getCalendarDays(viewDate, availableMap);
  const monthLabel = viewDate.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
  const availableMonths = Array.from(new Set(dates.map((d) => d.date.slice(0, 7))));
  const currentMonthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
  const canPrev =
    availableMonths.length > 0 && availableMonths.indexOf(currentMonthKey) > 0;
  const canNext =
    availableMonths.length > 0 &&
    availableMonths.indexOf(currentMonthKey) < availableMonths.length - 1;

  const goPrevMonth = () => {
    const idx = availableMonths.indexOf(currentMonthKey);
    if (idx > 0) {
      const [y, m] = availableMonths[idx - 1].split('-');
      setViewDate(new Date(Number(y), Number(m) - 1, 1));
    }
  };
  const goNextMonth = () => {
    const idx = availableMonths.indexOf(currentMonthKey);
    if (idx >= 0 && idx < availableMonths.length - 1) {
      const [y, m] = availableMonths[idx + 1].split('-');
      setViewDate(new Date(Number(y), Number(m) - 1, 1));
    }
  };

  return (
    <form action={bookAppointment} className="mt-6 space-y-5">
      <input type="hidden" name="date" value={selectedDate} />
      <input type="hidden" name="time" value={selectedTime} />

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Имя</span>
        <input
          name="clientName"
          required
          minLength={2}
          maxLength={80}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-base"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Телефон</span>
        <input
          name="clientPhone"
          required
          inputMode="tel"
          placeholder="+375 (29) 123-45-67"
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-base"
        />
      </label>

      <div className="block text-sm" ref={serviceRef}>
        <span className="mb-1 block font-medium">Услуга</span>
        <input type="hidden" name="serviceId" value={serviceId} />
        <div className="relative">
          <button
            type="button"
            onClick={() => setServiceOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5 text-left text-base"
          >
            <span>
              <span className="block font-medium text-charcoal">{selectedService?.name}</span>
              <span className="block text-xs text-muted">
                {Number(selectedService?.price)} BYN · {selectedService?.duration_min} мин
              </span>
            </span>
            <span className="text-muted">{serviceOpen ? '▴' : '▾'}</span>
          </button>
          {serviceOpen && (
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-white shadow-lg">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setServiceId(s.id);
                    setServiceOpen(false);
                  }}
                  className={`w-full border-b border-border px-3 py-2.5 text-left last:border-b-0 ${
                    s.id === serviceId ? 'bg-cream' : 'hover:bg-cream'
                  }`}
                >
                  <span className="block font-medium text-charcoal">{s.name}</span>
                  <span className="block text-xs text-muted">
                    {Number(s.price)} BYN · {s.duration_min} мин
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Индикатор шагов */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <span
          className={`rounded-full px-3 py-1 ${
            step === 1 ? 'bg-rose-dark text-white' : 'bg-cream text-muted'
          }`}
          style={step === 1 ? { backgroundColor: '#B8627A' } : undefined}
        >
          1. Дата
        </span>
        <span className="text-muted">→</span>
        <span
          className={`rounded-full px-3 py-1 ${
            step === 2 ? 'bg-rose-dark text-white' : 'bg-cream text-muted'
          }`}
          style={step === 2 ? { backgroundColor: '#B8627A' } : undefined}
        >
          2. Время
        </span>
      </div>

      {/* Шаг 1: выбор даты */}
      {step === 1 && (
        <div>
          <span className="mb-2 block text-sm font-medium">Выберите дату</span>
          {loadingDates ? (
            <p className="text-sm text-muted">Загрузка дат…</p>
          ) : dates.length === 0 ? (
            <p className="text-sm text-muted">Нет доступных дат</p>
          ) : (
            <div className="rounded-xl border border-border bg-white p-3">
              {/* Навигация по месяцам */}
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  disabled={!canPrev}
                  className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-charcoal disabled:opacity-30"
                >
                  ←
                </button>
                <span className="text-sm font-medium capitalize">{monthLabel}</span>
                <button
                  type="button"
                  onClick={goNextMonth}
                  disabled={!canNext}
                  className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-charcoal disabled:opacity-30"
                >
                  →
                </button>
              </div>

              {/* Дни недели */}
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted">
                {WEEKDAY_LABELS.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>

              {/* Сетка дней */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, idx) => {
                  if (!cell.date) {
                    return <div key={`empty-${idx}`} className="aspect-square" />;
                  }
                  const slotCount = cell.slotCount ?? 0;
                  const available = cell.slotCount !== null && slotCount > 0;
                  const disabled = !available;
                  const dayNum = new Date(`${cell.date}T12:00:00+03:00`).getDate();
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      disabled={disabled}
                      onClick={() => chooseDate(cell.date!, slotCount)}
                      className={`aspect-square rounded-lg text-sm transition ${
                        disabled
                          ? 'cursor-not-allowed text-gray-300'
                          : 'text-charcoal hover:bg-rose-light'
                      }`}
                    >
                      <span className="block">{dayNum}</span>
                      {available && slotCount <= 3 ? (
                        <span className="block text-[8px] text-rose-dark">{slotCount}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-[10px] text-muted">
                Серым отмечены дни без свободных слотов.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Шаг 2: выбор времени */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{formatFullDate(selectedDate)}</p>
              <p className="text-xs text-muted">
                {loadingSlots
                  ? 'Загрузка времени…'
                  : `${slots.length} свободных слотов`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:border-rose hover:text-rose-dark"
            >
              Изменить дату
            </button>
          </div>

          {loadingSlots ? (
            <p className="text-sm text-muted">Загрузка времени…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">Нет свободного времени на эту дату</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => {
                const selected = s === selectedTime;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedTime(s)}
                    className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition ${
                      selected
                        ? 'border-rose-dark bg-rose-dark text-white'
                        : 'border-border bg-white text-charcoal hover:border-rose'
                    }`}
                    style={selected ? { backgroundColor: '#B8627A' } : undefined}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Комментарий</span>
        <textarea
          name="comment"
          rows={3}
          maxLength={500}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-base"
        />
      </label>

      <button
        type="submit"
        disabled={!selectedDate || !selectedTime || loadingDates || loadingSlots}
        className="w-full rounded-xl bg-rose-dark px-4 py-3 text-base font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#B8627A' }}
      >
        Записаться
      </button>
    </form>
  );
}
