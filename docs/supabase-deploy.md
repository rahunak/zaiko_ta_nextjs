# Деплой БД в Supabase

## Что нужно (и что не нужно)

Проект использует `pg` напрямую через `DATABASE_URL` — своя авторизация (scrypt + сессии
в БД), без Supabase SDK. Поэтому для переноса БД достаточно **одной переменной `DATABASE_URL`**
— строки подключения Supabase. Ключи `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL` нужны только если вы перейдёте на Supabase Auth/SDK;
сейчас они не используются. Если включите Supabase Auth для админки — тогда понадобятся все
четыре и переписка `lib/auth`.

## Шаги

1. Создать проект на supabase.com (регион EU, пароль БД сохранить — он больше не покажется).
2. Dashboard → Project Settings → Database → Connection string:
   - **Transaction pooler** (порт 6543) — для рантайма (Vercel). Скопировать URI.
   - **Direct connection** (порт 5432) — для миграций/инита.
   URI должен содержать `?sslmode=require` (Supabase добавляет).
3. В Vercel → Project → Settings → Environment Variables:
   - `DATABASE_URL` = URI pooler-а (Production + Preview).
   - Остальное — как в `.env.example` (`ADMIN_LOGIN`, `ADMIN_PASSWORD`, `DIKIDI_*`).
4. Применить схему к Supabase (локально, с direct URI):
   ```bash
   DATABASE_URL="<direct uri>" ADMIN_LOGIN=admin ADMIN_PASSWORD='...' bun run db:init
   ```
   Скрипт идемпотентен: создаст таблицы, услуги, админа. Повторный запуск ничего не затрёт.
5. Проверить: `DATABASE_URL="<pooler uri>" bun run dev` → войти в `/admin`, создать тестовую
   запись, убедиться, что она появилась в Supabase Table Editor.
6. Деплой: `bun run build` (должен проходить), затем push/деплой на Vercel.

## Перенос данных из docker (если нужно сохранить)

```bash
pg_dump -h 127.0.0.1 -p 5434 -U zaiko -d zaiko_admin --no-owner --no-privileges -Fc -f zaiko.dump
pg_restore --no-owner --no-privileges -d "<direct uri>" zaiko.dump
# после restore — всё равно запустить db:init (идемпотентно)
```

## Нюансы

- Pooler работает в transaction mode: нет сессионных prepared statements и advisory locks. Наш код
  использует простые запросы — ок. Если появятся транзакции с несколькими запросами, используйте
  direct URL или отдельный клиент.
- Free tier приостанавливает проект после 7 дней бездействия — для продакшена нужна активность
  или платный план.
- RLS: по умолчанию таблицы доступны anon-ключу. Так как мы подключаемся postgres-ролью, включите
  RLS без политик (или отзовите права у anon), чтобы при утечке ключа данные не отдались.
- SSL обязателен — URI должен содержать `sslmode=require`.
- Порт 5432 часто блокируется корпоративными сетями — тогда для init используйте pooler через
  VPN или запускайте `db:init` на Vercel через one-off.
- `DATABASE_URL` и пароль БД — секреты: только в env, не в репозиторий. `.env.example` обновлять
  можно (без значений).

## Если появилась ошибка `EMAXCONNSESSION` (max clients reached in session mode)

`error: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15`
означает, что приложение подключено к **session pooler** Supabase (порт **5432**). В этом режиме
на проект отводится ~15 соединений, и каждое удерживается за клиентом: dev-сервер, сборка и
несколько инстансов выбирают лимит за минуты.

Что сделано в коде (`lib/db.ts`):

- если в `DATABASE_URL` хост `*.pooler.supabase.com` и порт `5432`, порт автоматически меняется
  на `6543` (transaction pooler) с предупреждением в логе — пароль и логин не перекодируются;
- размер пула по умолчанию 3 (`PG_POOL_MAX`, можно уменьшить до 1–2 для serverless);
- добавлены `idleTimeoutMillis`, `connectionTimeoutMillis`, `keepAlive` и обработчик ошибок
  простаивающих соединений (без него такая ошибка роняет процесс).

Рекомендуется всё же прописать правильный URL явно:

```
DATABASE_URL=postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require
```

Прямое подключение (порт 5432, `db.<project-ref>.supabase.co`) — только для миграций и `db:init`,
в рантайме не использовать.
