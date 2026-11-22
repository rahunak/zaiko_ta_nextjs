import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

/**
 * Подключение к Postgres служебного раздела /admin.
 * Пул кэшируется в globalThis, чтобы hot reload в dev не открывал новые соединения.
 */
export const DEFAULT_DATABASE_URL =
  'postgres://zaiko:zaiko_dev_password@127.0.0.1:5434/zaiko_admin';

const globalForDb = globalThis as unknown as { __zaikoAdminPool?: Pool };

/**
 * Supabase pooler в session-режиме (порт 5432 у *.pooler.supabase.com) отдаёт
 * ~15 соединений на проект и держит каждое за клиентом — несколько процессов
 * (dev, build, preview) выбирают лимит и получают EMAXCONNSESSION.
 * Для рантайма нужен transaction pooler (порт 6543); 5432 — только для миграций.
 */
function resolveConnectionString(raw: string): string {
  const at = raw.lastIndexOf('@');
  if (at === -1) return raw;

  const tail = raw.slice(at + 1);
  if (!tail.includes('pooler.supabase.com:5432')) return raw;

  console.warn(
    '[db] session pooler Supabase (5432) заменён на transaction pooler (6543): ' +
      'в session-режиме на проект даётся ~15 соединений. Для миграций используйте отдельный direct URL.',
  );

  // Меняем только хост/порт: логин и пароль остаются как есть, без перекодирования.
  return raw.slice(0, at + 1) + tail.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
}

const connectionString = resolveConnectionString(
  process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
);

/** Размер пула: 3 по умолчанию — безопасно для pooler-а и для локальной БД. */
const poolMax = Number.parseInt(process.env.PG_POOL_MAX ?? '3', 10);

function createPool(): Pool {

  const created = new Pool({
    connectionString,
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    application_name: 'zaiko-admin',
  });

  // Без обработчика ошибка простаивающего соединения роняет процесс.
  created.on('error', (error) => {
    console.error('[db] ошибка соединения в пуле:', error.message);
  });

  return created;
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
