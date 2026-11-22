/**
 * Инициализация БД служебного раздела /admin.
 *
 * Запуск: bun run db:init
 * Требует: поднятый docker compose (Postgres на 127.0.0.1:5434) и DATABASE_URL в окружении.
 * Скрипт идемпотентен: схема — create table if not exists, услуги — on conflict do nothing,
 * администратор — upsert с перехэшированием пароля из ADMIN_PASSWORD.
 */
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { hashPassword } from '../lib/auth/password';
import { DEFAULT_DATABASE_URL } from '../lib/db';

// dikidiServiceId — ID услуги в DIKIDI (master 3834316): без него запись не отправить.
const SEED_SERVICES = [
  { name: 'Ламинирование ресниц', price: 50, durationMin: 60, dikidiServiceId: '18901252' },
  {
    name: 'Долговременная укладка бровей (+окрашивание)',
    price: 40,
    durationMin: 60,
    dikidiServiceId: '18901574',
  },
  {
    name: 'Окрашивание и коррекция бровей',
    price: 30,
    durationMin: 30,
    dikidiServiceId: '18901268',
  },
  { name: 'Коррекция бровей', price: 20, durationMin: 20, dikidiServiceId: '18901273' },
  { name: 'Окрашивание ресниц', price: 10, durationMin: 20, dikidiServiceId: '18901290' },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  const adminLogin = (process.env.ADMIN_LOGIN || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';

  const client = new Client({ connectionString });

  try {
    await client.connect();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(
      `Не удалось подключиться к Postgres (${connectionString.replace(/:[^:@/]+@/, ':***@')}): ${reason}`,
    );
    console.error('Проверьте, что выполнен `docker compose up -d` и DATABASE_URL верный.');
    process.exitCode = 1;
    return;
  }

  try {
    await client.query(schema);
    console.log('✓ Схема применена (admin_users, admin_sessions, services, appointments)');

    for (const [index, service] of SEED_SERVICES.entries()) {
      await client.query(
        `insert into services (name, price, duration_min, dikidi_service_id, sort_order)
         values ($1, $2, $3, $4, $5)
         on conflict (name) do update
            set dikidi_service_id = coalesce(services.dikidi_service_id, excluded.dikidi_service_id)`,
        // sort_order задаётся только при вставке: выбор порядка в админке не перезаписываем.
        [service.name, service.price, service.durationMin, service.dikidiServiceId, index + 1],
      );
    }
    const services = await client.query<{ count: string }>(
      'select count(*)::text as count from services',
    );
    console.log(`✓ Услуг в справочнике: ${services.rows[0]?.count ?? '0'}`);

    if (!adminLogin || !adminPassword) {
      console.log(
        '! ADMIN_LOGIN/ADMIN_PASSWORD не заданы — администратор не создан (задайте их и повторите db:init)',
      );
      return;
    }

    if (adminPassword.length < 8) {
      console.error('! ADMIN_PASSWORD короче 8 символов — администратор не создан');
      process.exitCode = 1;
      return;
    }

    const passwordHash = await hashPassword(adminPassword);
    await client.query(
      `insert into admin_users (login, password_hash)
       values ($1, $2)
       on conflict (login) do update set password_hash = excluded.password_hash`,
      [adminLogin, passwordHash],
    );
    console.log(`✓ Администратор «${adminLogin}» создан/обновлён (пароль хранится как scrypt-хэш)`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('db:init завершился с ошибкой:', error);
  process.exitCode = 1;
});
