import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { logoutAction } from '../actions';

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/admin" className="font-display text-lg">
              Зайко · Админка
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="text-charcoal hover:text-rose-dark">
                Новая запись
              </Link>
              <Link
                href="/admin/schedule"
                className="text-charcoal hover:text-rose-dark"
              >
                Расписание
              </Link>
              <Link
                href="/admin/availability"
                className="text-charcoal hover:text-rose-dark"
              >
                График
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{user.login}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 transition hover:border-rose hover:text-rose-dark"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
