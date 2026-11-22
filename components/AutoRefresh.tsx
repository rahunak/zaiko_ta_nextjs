'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Обновляет серверные данные открытой страницы: мастер держит расписание
 * открытым, а новые записи (в том числе онлайн) появлялись только после
 * ручной перезагрузки.
 *
 * Обновляем по таймеру и при возврате на вкладку — без лишних запросов,
 * когда вкладка в фоне.
 */
export default function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };

    const timer = window.setInterval(refreshIfVisible, intervalMs);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [router, intervalMs]);

  return null;
}
