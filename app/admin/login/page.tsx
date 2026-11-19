import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { loginAction } from '../actions';

const ERROR_MESSAGES: Record<string, string> = {
  empty: 'Введите логин и пароль.',
  invalid: 'Неверный логин или пароль.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect('/admin');
  }

  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? 'Не удалось войти.' : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Зайко Татьяна</p>
        <h1 className="mt-2 font-display text-2xl">Служебный вход</h1>
        <p className="mt-2 text-sm text-muted">
          Доступ только для администратора салона.
        </p>

        <form action={loginAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Логин</span>
            <input
              name="login"
              type="text"
              required
              autoComplete="username"
              autoFocus
              className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">Пароль</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-rose"
            />
          </label>

          {errorMessage ? (
            <p role="alert" className="text-sm text-rose-dark">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-dark"
          >
            Войти
          </button>
        </form>
      </div>
    </main>
  );
}
