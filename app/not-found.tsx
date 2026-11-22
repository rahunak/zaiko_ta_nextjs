import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center"
      style={{ backgroundColor: '#FAF6F2', color: '#1A1618' }}
    >
      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#B8748A' }}>
        404
      </p>
      <h1 className="mt-3 font-display text-3xl sm:text-4xl" style={{ fontFamily: 'var(--font-playfair)' }}>
        Такой страницы нет
      </h1>
      <p className="mt-3 max-w-md text-sm" style={{ color: '#8B7E7A' }}>
        Возможно, ссылка устарела или в адресе опечатка. Записаться можно с главной страницы
        или сразу на онлайн-запись.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-xl px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: '#B8627A' }}
        >
          На главную
        </Link>
        <Link
          href="/book"
          className="rounded-xl border px-5 py-3 text-sm font-medium transition hover:border-rose"
          style={{ borderColor: '#E8DCDA', color: '#8B4A63' }}
        >
          Записаться онлайн
        </Link>
      </div>
    </main>
  );
}
