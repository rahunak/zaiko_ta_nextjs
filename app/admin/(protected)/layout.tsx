import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-1 pt-3">
          <Link href="/admin/schedule" className="font-display text-base sm:text-lg">
            Зайко · Админка
          </Link>

          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="hidden sm:inline">{user.login}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="min-h-9 rounded-lg border border-border bg-cream/60 px-3 py-1.5 transition hover:border-rose hover:bg-cream hover:text-rose-dark"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>

        {/* На телефоне ссылки переносятся на вторую строку: горизонтальный скролл
            прятал бы половину разделов. */}
        <AdminNav />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </>
  );
}
