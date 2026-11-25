/**
 * Третий, внутренний триггер напоминаний: pg_cron + pg_net внутри Supabase.
 *
 * Зачем: cron-job.org может отключить задание после серии ошибок, у QStash есть
 * квота. pg_cron не зависит ни от одного внешнего аккаунта — он тикает из самой
 * базы. Заменой внешним планировщикам он не является: если база недоступна,
 * недоступна и очередь напоминаний, а «успех» задания pg_cron означает только
 * «запрос поставлен в очередь pg_net», не «эндпоинт ответил 200».
 *
 * Скрипт идемпотентен: пересоздаёт одно задание с тем же именем.
 *
 * Запуск (нужен direct-URL Supabase, не pooler):
 *   DATABASE_URL="postgres://postgres:<пароль>@db.<ref>.supabase.co:5432/postgres" \
 *   CRON_SECRET="<секрет>" bun run db:cron
 *
 * Посмотреть, что получится, ничего не меняя:
 *   ... bun run db:cron --dry-run
 *
 * Удалить задание:
 *   ... bun run db:cron --remove
 */

import { Client } from 'pg';

const JOB_NAME = 'zaiko-reminders-pgnet';
/** Раз в 10 минут: резервный ритм, основной внешний тик идёт раз в 5. */
const SCHEDULE = '*/10 * * * *';
const DEFAULT_BASE_URL = 'https://zaiko.by';
const REQUEST_TIMEOUT_MS = 20_000;

const flags = new Set(process.argv.slice(2));
const dryRun = flags.has('--dry-run');
const remove = flags.has('--remove');

const databaseUrl = process.env.DATABASE_URL ?? '';
const secret = (process.env.CRON_SECRET ?? '').trim();
const baseUrl = (process.env.APP_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(2);
}

function mask(value: string): string {
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}…${value.slice(-3)}`;
}

function safeTarget(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return `${parsed.protocol}//${parsed.username}:***@${parsed.host}${parsed.pathname}`;
  } catch {
    return '<не удалось разобрать DATABASE_URL>';
  }
}

/**
 * Тело задания. Секрет экранируется для SQL-литерала: команда хранится в cron.job
 * текстом, поэтому кавычка в секрете иначе сломала бы задание при запуске.
 */
function buildCommand(secretValue: string = secret): string {
  const escaped = secretValue.replace(/'/g, "''");
  return `select net.http_post(
      url := '${baseUrl}/api/cron/dispatch?source=pg_cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ${escaped}'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := ${REQUEST_TIMEOUT_MS}
    );`;
}

async function main(): Promise<void> {
  if (!databaseUrl) {
    fail('DATABASE_URL не задан. Для расширений нужен direct-URL Supabase, не pooler.');
  }
  if (!secret) {
    fail('CRON_SECRET не задан: без него эндпоинт ответит 401 и задание будет бесполезным.');
  }

  console.log(`Цель: ${safeTarget(databaseUrl)}`);
  console.log(`Задание: ${JOB_NAME} · ${SCHEDULE} · ${baseUrl}/api/cron/dispatch?source=pg_cron`);
  console.log(`Секрет: ${mask(secret)}`);

  if (dryRun) {
    console.log('\n--- команда задания (секрет скрыт) ---');
    console.log(buildCommand(mask(secret)));
    console.log('\n--dry-run: база не изменялась.');
    return;
  }

  if (databaseUrl.includes('pooler.supabase.com')) {
    console.warn(
      '! DATABASE_URL указывает на pooler. Расширения ставятся через direct-URL ' +
        '(db.<ref>.supabase.co:5432) или через Dashboard → Database → Extensions.',
    );
  }

  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 15_000 });
  await client.connect();

  try {
    const available = await client.query<{ name: string }>(
      `select name from pg_available_extensions where name in ('pg_cron', 'pg_net')`,
    );
    const names = new Set(available.rows.map((row) => row.name));

    if (!names.has('pg_cron') || !names.has('pg_net')) {
      fail(
        'В этой базе нет pg_cron/pg_net. Внутренний триггер работает только на Supabase: ' +
          'Dashboard → Database → Extensions, либо используйте внешний планировщик.',
      );
    }

    const schema = await client.query<{ reminders: string | null }>(
      `select to_regclass('public.reminders')::text as reminders`,
    );
    if (!schema.rows[0]?.reminders) {
      fail('В базе нет таблицы reminders. Сначала примените db/schema.sql, потом включайте тик.');
    }

    if (remove) {
      const removed = await client.query<{ jobid: number }>(
        `select cron.unschedule(jobid) as jobid from cron.job where jobname = $1`,
        [JOB_NAME],
      );
      console.log(
        removed.rowCount
          ? `✓ Задание ${JOB_NAME} удалено (jobid ${removed.rows[0].jobid}).`
          : `! Задания ${JOB_NAME} нет — удалять нечего.`,
      );
      return;
    }

    await client.query('create extension if not exists pg_cron with schema pg_catalog');
    await client.query('create extension if not exists pg_net with schema extensions');

    // Пересоздаём задание: cron.schedule с тем же именем не гарантирует замену
    // во всех версиях pg_cron, а два одинаковых тика нам не нужны.
    await client.query(`select cron.unschedule(jobid) from cron.job where jobname = $1`, [JOB_NAME]);

    const scheduled = await client.query<{ jobid: number }>(
      `select cron.schedule($1, $2, $3) as jobid`,
      [JOB_NAME, SCHEDULE, buildCommand()],
    );

    console.log(`✓ Задание создано: jobid ${scheduled.rows[0]?.jobid}, расписание ${SCHEDULE}.`);
    console.log(
      '  Первый запуск — в ближайшую минуту, кратную 10. Через 10–15 минут проверьте:\n' +
        '  • /admin/reminders — источник pg_cron и свежий тик;\n' +
        '  • в базе: select status_code, error_msg, created from net._http_response order by created desc limit 3;\n' +
        '  • задания: select jobname, schedule, active from cron.job.',
    );
    console.log(
      '  Помните: «succeeded» в cron.job_run_details значит только «запрос отправлен» — ' +
        'ответ эндпоинта виден в net._http_response (хранится 6 часов).',
    );
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error('✗ Ошибка настройки pg_cron:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
