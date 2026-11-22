-- Схема служебного раздела /admin. Скрипт идемпотентен: bun run db:init.

create table if not exists admin_users (
  id bigserial primary key,
  login text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  id bigserial primary key,
  user_id bigint not null references admin_users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_sessions_expires_idx on admin_sessions (expires_at);

create table if not exists services (
  id bigserial primary key,
  name text not null unique,
  price numeric(10, 2) not null,
  duration_min integer not null,
  dikidi_service_id text,
  is_active boolean not null default true,
  -- Порядок показа: меньше — выше. Меняется в админке на /admin/services.
  sort_order integer not null default 0
);

-- Колонка появилась позже: добавляем её и на существующей базе.
alter table services add column if not exists sort_order integer not null default 0;

-- Первичный порядок — тот же алфавитный, что был до ручной сортировки.
-- Бэкфилл выполняется один раз: как только порядок задан, значения не трогаем,
-- иначе повторный прогон схемы сбрасывал бы выбор мастера.
update services s
   set sort_order = x.rn
  from (select id, row_number() over (order by name) as rn from services) x
 where s.id = x.id
   and not exists (select 1 from services where sort_order <> 0);

-- Глобальные настройки проекта: одна строка.
create table if not exists app_settings (
  id smallint primary key check (id = 1),
  -- Дублировать записи, созданные через /book, в DIKIDI.
  -- По умолчанию выключено: онлайн-запись живёт только в БД.
  book_sync_dikidi boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into app_settings (id) values (1)
  on conflict (id) do nothing;

-- Настройки онлайн-записи: за сколько часов запись ещё открыта (0 — без ограничения)
-- и буфер между процедурами на уборку/подготовку.
alter table app_settings add column if not exists min_lead_hours integer not null default 2;
alter table app_settings add column if not exists buffer_min integer not null default 10;

create table if not exists appointments (
  id bigserial primary key,
  client_name text not null,
  client_phone text not null,
  service_id bigint references services (id),
  service_name text not null,
  starts_at timestamptz not null,
  duration_min integer not null,
  price numeric(10, 2) not null default 0,
  comment text not null default '',
  -- admin: запись создана в админке; dikidi: пришла из журнала DIKIDI
  source text not null default 'admin' check (source in ('admin', 'dikidi')),
  dikidi_id text unique,
  -- local: только в БД; synced: отправлена в DIKIDI; failed: отправка не удалась
  sync_status text not null default 'local' check (sync_status in ('local', 'synced', 'failed')),
  sync_error text,
  created_by bigint references admin_users (id),
  created_at timestamptz not null default now()
);

-- Отмена — мягкая: строка остаётся для истории, но выпадает из расписания и списков.
alter table appointments add column if not exists cancelled_at timestamptz;
-- Кто отменил: admin (через админку) или dikidi (мастер сделал это в кабинете).
alter table appointments add column if not exists cancelled_source text;

alter table appointments add column if not exists updated_at timestamptz;

-- Время отправки напоминания в Telegram за 60 минут до записи (null = ещё не отправлено).
alter table appointments add column if not exists reminder_sent_at timestamptz;

-- Напоминание клиенту в Telegram: неугадываемый токен для deep-link бота,
-- chat_id после /start и отметка об отправке.
alter table appointments add column if not exists client_token text;
alter table appointments add column if not exists client_chat_id text;
alter table appointments add column if not exists client_reminder_sent_at timestamptz;
create unique index if not exists appointments_client_token_idx on appointments (client_token);

update appointments
   set client_token = md5(id::text || created_at::text || random()::text)
 where client_token is null;

-- Канал записи: admin — создана мастером, online — клиентом через /book,
-- dikidi — пришла из журнала DIKIDI. Нужен для честной аналитики каналов.
alter table appointments drop constraint if exists appointments_source_check;
alter table appointments add constraint appointments_source_check
  check (source in ('admin', 'online', 'dikidi'));

-- Сессия кабинета DIKIDI для прямых HTTP-запросов (транспорт http).
-- Одна строка: cookie `token` переживает рестарт и общая для всех инстансов на serverless.
create table if not exists dikidi_auth (
  id smallint primary key check (id = 1),
  token text not null,
  -- полный cookie-заголовок кабинета (token + cookie_name + uac + cid + lang и др.)
  cookies text,
  -- login: получен автологином; manual: вписан вручную/из env
  source text not null default 'login',
  updated_at timestamptz not null default now()
);

-- Миграция для уже существующих БД: добавляем колонку cookies.
alter table dikidi_auth add column if not exists cookies text;

-- Состояние синхронизации записей DIKIDI -> БД.
alter table dikidi_auth add column if not exists last_sync_at timestamptz;
alter table dikidi_auth add column if not exists last_sync_hash text;

create index if not exists appointments_starts_idx on appointments (starts_at);
create index if not exists appointments_source_idx on appointments (source);
create index if not exists appointments_cancelled_idx on appointments (cancelled_at);

-- Детализация выбранных услуг в записи (мультивыбор).
create table if not exists appointment_services (
  id bigserial primary key,
  appointment_id bigint not null references appointments (id) on delete cascade,
  service_id bigint references services (id),
  service_name text not null,
  price numeric(10, 2) not null default 0,
  duration_min integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists appointment_services_appointment_idx on appointment_services (appointment_id);

-- Расписание мастера для онлайн-записи (/book).
create table if not exists master_schedule_default (
  id smallint primary key check (id = 1),
  is_working boolean not null default true,
  -- ISO-дни недели: 1=Пн ... 7=Вс
  working_days smallint[] not null default '{1,2,3,4,5}',
  work_start time not null default '10:00',
  work_end time not null default '19:00',
  break_start time,
  break_end time,
  updated_at timestamptz not null default now()
);

insert into master_schedule_default (id) values (1)
  on conflict (id) do nothing;

create table if not exists master_schedule_overrides (
  date date primary key,
  is_working boolean not null default true,
  work_start time,
  work_end time,
  break_start time,
  break_end time,
  note text,
  updated_at timestamptz not null default now()
);

create index if not exists master_schedule_overrides_date_idx on master_schedule_overrides (date);
