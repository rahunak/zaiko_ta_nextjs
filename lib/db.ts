import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

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

type QueryValue = string | number | boolean | null | Date | string[] | number[];

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: QueryValue[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, values);
}

/**
 * Выполняет несколько запросов в одной транзакции на выделенном соединении.
 * Нужна для записи на приём: проверка слота и вставка должны быть атомарными,
 * иначе два одновременных клиента занимают одно время.
 */
export async function withTransaction<T>(
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('begin');
    const result = await run(client);
    await client.query('commit');
    return result;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Ролбэк не должен скрывать исходную ошибку.
    }
    throw error;
  } finally {
    client.release();
  }
}
