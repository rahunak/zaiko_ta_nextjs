import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';

export const SESSION_COOKIE = 'zaiko_admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AdminUser = {
  id: number;
  login: string;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Создаёт серверную сессию в БД и ставит httpOnly-cookie. */
export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await query('delete from admin_sessions where expires_at < now()');
  await query(
    `insert into admin_sessions (user_id, token_hash, expires_at)
     values ($1, $2, $3)`,
    [userId, hashToken(token), expiresAt],
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

/** Возвращает администратора по cookie или null, если сессии нет/истекла. */
export async function getCurrentUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const { rows } = await query<{ id: string; login: string }>(
    `select u.id, u.login
       from admin_sessions s
       join admin_users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );

  const user = rows[0];
  return user ? { id: Number(user.id), login: user.login } : null;
}

/** Удаляет текущую сессию из БД и сбрасывает cookie. Вызывать только в Server Function. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await query('delete from admin_sessions where token_hash = $1', [
      hashToken(token),
    ]);
  }

  cookieStore.delete(SESSION_COOKIE);
}

/** Защита страниц /admin: без активной сессии — редирект на форму входа. */
export async function requireUser(): Promise<AdminUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/admin/login');
  }

  return user;
}
