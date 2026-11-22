'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { bookAppointment } from '@/app/book/actions';

type Service = {
  id: string;
  name: string;
  price: string;
  duration_min: number;
};

type DateAvailability = {
  date: string;
  /** Свободное время дня приходит тем же ответом, что и даты. */
  slots: string[];
  slotCount: number;
};

const weekdayShortFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Minsk',
  weekday: 'short',
});

const monthShortFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Minsk',
  month: 'short',
});

const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Minsk',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function dayNumber(value: string): string {
  return new Date(`${value}T12:00:00+03:00`).getDate().toString();
}

function weekdayShort(value: string): string {
  return weekdayShortFormatter.format(new Date(`${value}T12:00:00+03:00`)).replace('.', '');
}

function monthShort(value: string): string {
  return monthShortFormatter.format(new Date(`${value}T12:00:00+03:00`)).replace('.', '');
}

function formatFullDate(value: string): string {
  return fullDateFormatter.format(new Date(`${value}T12:00:00+03:00`));
}

function todayMinsk(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Minsk' }).format(new Date());
}

function serviceInitial(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/**
 * Кнопка записи знает о состоянии отправки: до server action `pending` = true,
 * поэтому повторный тап по экрану не создаёт вторую запись.
 */
function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className="w-full rounded-xl border border-rose-dark bg-rose-dark px-4 py-3.5 text-base font-semibold text-white shadow-[0_-6px_24px_rgba(26,22,24,0.16)] transition hover:opacity-90 disabled:opacity-60"
      style={{ backgroundColor: '#B8627A' }}
    >
      {pending ? 'Отправляем…' : 'Записаться'}
    </button>
  );
}

type BookingInitial = {
  errorCode: string | null;
  errorMessage: string | null;
  name: string;
  phone: string;
  comment: string;
  serviceIds: string[];
  date: string;
  time: string;
};

export default function BookingForm({
  services,
  initial,
}: {
  services: Service[];
  initial?: BookingInitial;
}) {
  const restoredIds = (initial?.serviceIds ?? []).filter((id) =>
    services.some((s) => s.id === id),
  );
  // Ошибки формы приходят с сервера редиректом: возвращаем человека на ту сцену,
  // где он ошибся, а не на пустой выбор услуг. Только битые услуги — на сцену 1.
  const [scene, setScene] = useState<1 | 2>(
    initial?.errorCode && initial.errorCode !== 'invalid_service' ? 2 : 1,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    restoredIds.length ? restoredIds : services.length ? [services[0].id] : [],
  );
  const [availability, setAvailability] = useState<DateAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [expandedHour, setExpandedHour] = useState<string | null>(null);
  const [clientName, setClientName] = useState(initial?.name ?? '');
  const [clientPhone, setClientPhone] = useState(initial?.phone ?? '');
  const [comment, setComment] = useState(initial?.comment ?? '');

  // Восстановить выбранный слот после ошибки нужно один раз — при следующей
  // загрузке списка (смена услуг) выбор уже сбрасывается на ближайший день.
  const restoreSlotRef = useRef(
    initial?.date && initial?.time ? { date: initial.date, time: initial.time } : null,
  );

  const dateScrollRef = useRef<HTMLDivElement>(null);
  const calendarInputRef = useRef<HTMLInputElement>(null);

  // Один запрос загружает свободное время сразу на 45 дней: переключение дня
  // не ходит на сервер и не показывает спиннер.
  useEffect(() => {
    if (selectedIds.length === 0) {
      setAvailability([]);
      setSelectedDate('');
      setSelectedTime('');
      return;
    }

    let cancelled = false;
    setLoadingAvailability(true);
    setSelectedDate('');
    setSelectedTime('');
    setExpandedHour(null);

    fetch(`/api/availability?serviceIds=${selectedIds.join(',')}&days=45`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: DateAvailability[] = Array.isArray(data.dates) ? data.dates : [];
        setAvailability(list);

        const restore = restoreSlotRef.current;
        restoreSlotRef.current = null;
        const restored = restore
          ? list.find((d) => d.date === restore.date && d.slots.includes(restore.time))
          : undefined;

        if (restored) {
          setSelectedDate(restored.date);
          setSelectedTime(restore!.time);
          return;
        }

        // По умолчанию — первый день с местами, начиная со следующего за сегодня.
        const today = todayMinsk();
        const withSlots = list.filter((d) => (d.slots?.length ?? 0) > 0);
        const defaultDay = withSlots.find((d) => d.date > today) ?? withSlots[0] ?? null;
        setSelectedDate(defaultDay?.date ?? '');
        setSelectedTime(defaultDay?.slots[0] ?? '');
      })
      .catch(() => {
        if (!cancelled) setAvailability([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailability(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedIds.join(',')]);

  const toggleService = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedServices = services.filter((s) => selectedIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_min, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  const dateOptions = availability.filter((d) => d.slots.length > 0);
  const slots = availability.find((d) => d.date === selectedDate)?.slots ?? [];

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setExpandedHour(null);
    setSelectedTime(availability.find((d) => d.date === date)?.slots[0] ?? '');
  };

  // Группировка слотов по часам.
  const byHour = new Map<string, string[]>();
  for (const s of slots) {
    const h = s.slice(0, 2);
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h)!.push(s);
  }
  const hourList = Array.from(byHour.keys()).sort();

  const scrollDates = (dir: number) => {
    const el = dateScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  const openCalendar = () => {
    const input = calendarInputRef.current;
    if (!input) return;
    try {
      // @ts-ignore
      if (typeof input.showPicker === 'function') input.showPicker();
      else input.click();
    } catch {
      input.click();
    }
  };

  return (
    <form action={bookAppointment} className="mt-2">
      <input type="hidden" name="serviceIds" value={selectedIds.join(',')} />
      <input type="hidden" name="date" value={selectedDate} />
      <input type="hidden" name="time" value={selectedTime} />

      {initial?.errorMessage ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border px-3 py-2.5 text-sm"
          style={{ borderColor: '#d9b26a', backgroundColor: '#fbf3dc', color: '#7a5a16' }}
        >
          {initial.errorMessage}
        </div>
      ) : null}

      {/* Сцены переключаются через display: неактивная не держит высоту,
          иначе карточка растягивается по длинному списку услуг. */}
      <div className="overflow-x-clip">
        {/* Сцена 1: выбор услуг */}
        <section
          className={`flex min-h-[calc(100vh-140px)] w-full flex-col space-y-4 pb-2 ${scene === 1 ? 'animate-fade-up' : 'hidden'
            }`}
        >
          <div>
            <h2 className="text-base font-semibold text-charcoal">Выберите услуги</h2>
            <p className="text-xs text-muted">Можно выбрать несколько</p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
            {services.map((s) => {
              const checked = selectedIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  aria-pressed={checked}
                  title={s.name}
                  className={`group relative flex w-full min-w-0 items-stretch overflow-hidden rounded-xl border text-left transition ${checked
                    ? 'border-rose-dark bg-rose-light/40 shadow-sm'
                    : 'border-border bg-white hover:border-rose hover:shadow-sm'
                    }`}
                >
                  <div
                    className={`flex w-[60px] shrink-0 items-center justify-center transition ${checked
                      ? 'bg-gradient-to-br from-rose to-rose-dark'
                      : 'bg-gradient-to-br from-rose-light to-cream'
                      }`}
                  >
                    <span
                      className={`font-display text-2xl leading-none ${checked ? 'text-white/90' : 'text-rose-dark/60'
                        }`}
                      style={{ fontFamily: 'var(--font-playfair)' }}
                    >
                      {serviceInitial(s.name)}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2 py-3 pl-3 pr-10">
                    <span className="line-clamp-3 break-words text-sm font-semibold leading-snug text-charcoal">
                      {s.name}
                    </span>
                    <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="rounded-md bg-cream px-1.5 py-0.5 text-[11px] font-medium text-muted">
                        {s.duration_min} мин
                      </span>
                      <span className="whitespace-nowrap text-sm font-bold text-charcoal">
                        {Number(s.price)} BYN
                      </span>
                    </div>
                  </div>

                  <span
                    aria-hidden
                    className={`pointer-events-none absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border transition ${checked
                      ? 'border-rose-dark text-white'
                      : 'border-border bg-white text-transparent'
                      }`}
                    style={checked ? { backgroundColor: '#B8627A' } : undefined}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>

          {selectedServices.length > 0 && (
            <div className="sticky bottom-0 z-20 mt-auto -mx-1">
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-white/95 px-4 py-3 shadow-[0_-6px_24px_rgba(26,22,24,0.10)] backdrop-blur sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 text-xs text-muted sm:flex-1 sm:text-sm">
                  <span className="font-medium text-charcoal">
                    {selectedServices.length} {plural(selectedServices.length, 'услуга', 'услуги', 'услуг')}
                  </span>
                  <span> · {totalDuration} мин · {totalPrice} BYN</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScene(2);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full shrink-0 rounded-lg bg-rose-dark px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 sm:ml-auto sm:w-auto"
                  style={{ backgroundColor: '#B8627A' }}
                >
                  Продолжить →
                </button>
              </div>
            </div>
          )}
        </section>        {/* Сцена 2: дата и время */}
        <section className={`w-full space-y-3 ${scene === 2 ? 'animate-fade-up' : 'hidden'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-charcoal">Дата и время</h2>
              <p className="text-xs text-muted">Выберите удобный слот</p>
            </div>
            <button
              type="button"
              onClick={() => setScene(1)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-rose hover:text-rose-dark"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Услуги
            </button>
          </div>

          {/* Дата */}
          <div className="rounded-xl border border-border bg-white p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Дата
              </span>
              {selectedDate && (
                <span className="truncate text-xs font-medium text-charcoal first-letter:uppercase">
                  {formatFullDate(selectedDate)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={scrollDates.bind(null, -1)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:border-rose hover:text-rose-dark"
                aria-label="Назад"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div
                ref={dateScrollRef}
                className="flex flex-1 gap-1.5 overflow-x-auto py-0.5 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none' }}
              >
                {/* Календарь */}
                <button
                  type="button"
                  onClick={openCalendar}
                  className="flex h-[62px] w-[58px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-rose/40 bg-rose-light/30 text-rose-dark transition hover:border-rose hover:bg-rose-light/60"
                  aria-label="Открыть календарь"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="text-[9px] font-medium leading-none">Календарь</span>
                </button>
                <input
                  ref={calendarInputRef}
                  type="date"
                  // Прошлые дни недоступны: min отсекает их в самом пикере,
                  // а проверка ниже — на случай ручного ввода.
                  min={todayMinsk()}
                  max={dateOptions.at(-1)?.date}
                  className="sr-only"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && v >= todayMinsk()) selectDate(v);
                  }}
                />

                {loadingAvailability ? (
                  <span className="flex h-[62px] items-center px-1 text-xs text-muted">
                    Загрузка дат…
                  </span>
                ) : dateOptions.length === 0 ? (
                  <span className="flex h-[62px] items-center px-1 text-xs text-muted">
                    Нет доступных дат
                  </span>
                ) : (
                  dateOptions.map((d) => {
                    const selected = d.date === selectedDate;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => selectDate(d.date)}
                        className={`flex h-[62px] w-[58px] shrink-0 snap-start flex-col items-center justify-center rounded-lg border transition ${selected
                            ? 'border-rose-dark text-white shadow-sm'
                            : 'border-border bg-cream/60 text-charcoal hover:border-rose hover:bg-white'
                          }`}
                        style={selected ? { backgroundColor: '#B8627A' } : undefined}
                      >
                        <span className="text-lg font-bold leading-none tabular-nums">
                          {dayNumber(d.date)}
                        </span>
                        <span className={`mt-1 text-[10px] font-medium uppercase leading-none ${selected ? 'text-white/85' : 'text-muted'}`}>
                          {weekdayShort(d.date)}
                        </span>
                        <span className={`mt-0.5 text-[9px] leading-none ${selected ? 'text-white/70' : 'text-muted/80'}`}>
                          {monthShort(d.date)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                onClick={scrollDates.bind(null, 1)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:border-rose hover:text-rose-dark"
                aria-label="Вперёд"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>          {/* Время */}
          <div className="rounded-xl border border-border bg-white p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Время
              </span>
              {!loadingAvailability && slots.length > 0 && (
                <span className="text-xs text-muted">
                  {slots.length} {plural(slots.length, 'слот', 'слота', 'слотов')}
                </span>
              )}
            </div>

            {loadingAvailability ? (
              <p className="py-1 text-sm text-muted">Загрузка времени…</p>
            ) : slots.length === 0 ? (
              <p className="py-1 text-sm text-muted">Нет свободного времени на эту дату</p>
            ) : (
              <>
                <div
                  className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {hourList.map((h) => {
                    const hourSlots = byHour.get(h)!;
                    const hasExtra = hourSlots.length > 1;
                    const active = selectedTime.startsWith(`${h}:`);
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          setExpandedHour(h);
                          if (!selectedTime.startsWith(`${h}:`)) {
                            setSelectedTime(hourSlots[0]);
                          }
                        }}
                        className={`relative shrink-0 rounded-lg border px-3.5 py-2 text-sm font-medium tabular-nums transition ${active
                            ? 'border-rose-dark text-white shadow-sm'
                            : 'border-border bg-white text-charcoal hover:border-rose'
                          }`}
                        style={active ? { backgroundColor: '#B8627A' } : undefined}
                      >
                        {h}:00
                        {hasExtra && (
                          <span
                            className="absolute bottom-[3px] right-[3px] h-[5px] w-[5px] bg-current"
                            style={{
                              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                              opacity: active ? 0.85 : 0.45,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {expandedHour && byHour.has(expandedHour) && byHour.get(expandedHour)!.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                    {byHour.get(expandedHour)!.map((s) => {
                      const active = s === selectedTime;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedTime(s)}
                          className={`rounded-md border px-2.5 py-1.5 text-sm font-medium tabular-nums transition ${active
                              ? 'border-rose-dark text-white'
                              : 'border-border bg-white text-charcoal hover:border-rose'
                            }`}
                          style={active ? { backgroundColor: '#B8627A' } : undefined}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}

                <p className="mt-2 text-[10px] leading-snug text-muted">
                  Уголок внизу значка — есть другие минуты в этом часе.
                </p>
              </>
            )}
          </div>

          {/* Контакты */}
          <div className="space-y-3 rounded-xl border border-border bg-white p-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">Имя</span>
              <input
                name="clientName"
                required
                minLength={2}
                maxLength={80}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-lg border border-border bg-cream/40 px-3 py-2.5 text-sm text-charcoal outline-none transition placeholder:text-muted/60 focus:border-rose focus:bg-white focus:ring-2 focus:ring-rose/15"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">Телефон</span>
              <input
                name="clientPhone"
                required
                inputMode="tel"
                placeholder="+375 (29) 123-45-67"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                aria-invalid={initial?.errorCode === 'invalid_phone' || undefined}
                className={`w-full rounded-lg border bg-cream/40 px-3 py-2.5 text-sm text-charcoal outline-none transition placeholder:text-muted/60 focus:bg-white focus:ring-2 ${initial?.errorCode === 'invalid_phone'
                    ? 'border-[#c0392b] focus:border-[#c0392b] focus:ring-[#c0392b]/15'
                    : 'border-border focus:border-rose focus:ring-rose/15'
                  }`}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">Комментарий</span>
              <textarea
                name="comment"
                rows={3}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full resize-y rounded-lg border border-border bg-cream/40 px-3 py-2.5 text-sm text-charcoal outline-none transition placeholder:text-muted/60 focus:border-rose focus:bg-white focus:ring-2 focus:ring-rose/15"
              />
            </label>
          </div>

          <div className="sticky bottom-0 z-20 -mx-1">
            <SubmitButton
              disabled={selectedIds.length === 0 || !selectedDate || !selectedTime || loadingAvailability}
            />
          </div>
        </section>
      </div>
    </form>
  );
}
