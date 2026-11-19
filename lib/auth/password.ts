import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SCHEME = 'scrypt';

/** Хэширование пароля администратора: scrypt с случайной солью. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${SCHEME}:${salt.toString('base64')}:${hash.toString('base64')}`;
}

/** Проверка пароля по сохранённому хэшу, сравнение в постоянном времени. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltBase64, hashBase64] = stored.split(':');

  if (scheme !== SCHEME || !saltBase64 || !hashBase64) {
    return false;
  }

  const expected = Buffer.from(hashBase64, 'base64');
  const actual = await scrypt(
    password,
    Buffer.from(saltBase64, 'base64'),
    expected.length,
  );

  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}
