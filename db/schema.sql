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
  is_active boolean not null default true
);

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
