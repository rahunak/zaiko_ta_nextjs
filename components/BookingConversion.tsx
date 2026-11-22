'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * Конверсия «запись создана»: раньше аналитика видела только клики по ссылкам,
 * а сам факт записи — нет. Событие уходит один раз на показ страницы
 * (в dev StrictMode эффект вызывается дважды — защищает ref).
 */
export default function BookingConversion({ appointmentId }: { appointmentId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    trackEvent('booking_created', {
      appointment_id: appointmentId,
      page_path: '/book',
    });

    // Яндекс.Метрика: цель booking_created (если счётчик уже загрузился).
    const w = window as unknown as {
      ym?: (...args: unknown[]) => void;
      YANDEX_METRIKA_ID?: number;
    };
    if (typeof w.ym === 'function' && w.YANDEX_METRIKA_ID) {
      w.ym(w.YANDEX_METRIKA_ID, 'reachGoal', 'booking_created', {
        appointment_id: appointmentId,
      });
    }
  }, [appointmentId]);

  return null;
}
