'use client';

import { useEffect } from 'react';

/**
 * Экран ошибки вместо стандартной страницы Next: посетитель видит понятный текст
 * и кнопку «Попробовать снова», а не белый экран с «Application error».
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ошибку видно в консоли/логах хостинга — отдельного мониторинга пока нет.
    console.error('Ошибка страницы:', error);
  }, [error]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center"
      style={{ backgroundColor: '#FAF6F2', color: '#1A1618' }}
    >
      <h1 className="font-display text-3xl sm:text-4xl" style={{ fontFamily: 'var(--font-playfair)' }}>
        Что-то пошло не так
      </h1>
      <p className="mt-3 max-w-md text-sm" style={{ color: '#8B7E7A' }}>
        Страница не загрузилась. Попробуйте обновить — если не поможет, напишите или позвоните
        мастеру, запись сохранится.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-xl px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
        style={{ backgroundColor: '#B8627A' }}
      >
        Попробовать снова
      </button>
      <a
        href="tel:+375256827229"
        className="mt-4 text-sm underline"
        style={{ color: '#8B4A63' }}
      >
        +375 (25) 68-27-229
      </a>
    </main>
  );
}
