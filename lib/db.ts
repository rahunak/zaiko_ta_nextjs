import { Pool, type QueryResult, type QueryResultRow } from 'pg';

/**
 * Подключение к Postgres служебного раздела /admin.
 * Пул кэшируется в globalThis, чтобы hot reload в dev не открывал новые соединения.
 */
export const DEFAULT_DATABASE_URL =
  'postgres://zaiko:zaiko_dev_password@127.0.0.1:5434/zaiko_admin';

const globalForDb = globalThis as unknown as { __zaikoAdminPool?: Pool };

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
    max: 5,
  });
}

const pool = globalForDb.__zaikoAdminPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__zaikoAdminPool = pool;
}

type QueryValue = string | number | boolean | null | Date;

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: QueryValue[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, values);
}
