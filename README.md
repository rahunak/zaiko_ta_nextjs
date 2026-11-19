# Зайко Татьяна — сайт-визитка (zaiko.by)

Лендинг мастера по бровям и ресницам: услуги, работы, отзывы, онлайн-запись.
Плюс три гео-посадочные страницы для клиенток из Толочина, Новолукомля и Борисова.

## Стек

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS 4
- Пакетный менеджер — **bun** (bun.lock; package-lock.json не используется)

## Запуск

Установка зависимостей:

```bash
bun install
```

Режим разработки:

```bash
bun run dev
```

Открыть [http://localhost:3000](http://localhost:3000).

Прод-сборка и запуск:

```bash
bun run build
bun run start
```

Линтер:

```bash
bun run lint
```

## Служебный раздел /admin

Закрытая админка мастера: запись на услуги и расписание. Логин и пароль хранятся в
PostgreSQL (пароль — scrypt-хэш), записи DIKIDI читаются через api-anything (локально)
или прямыми запросами к dikidi.net (прод, Vercel).

### Первый запуск

```bash
cp .env.example .env         # POSTGRES_* для docker compose
cp .env.example .env.local   # DATABASE_URL, ADMIN_*, API_ANYTHING_*
docker compose up -d         # Postgres на 127.0.0.1:5434
bun run db:init              # схема, услуги, администратор из ADMIN_LOGIN/ADMIN_PASSWORD
bun run api-anything:serve   # отдельный терминал; токен в ~/.api-anything/serve-token
bun run dev
```

`DATABASE_URL` по умолчанию — `postgres://zaiko:zaiko_dev_password@127.0.0.1:5434/zaiko_admin`.

### Что внутри

- `/admin/login` — вход; `/admin` — новая запись и последние записи; `/admin/schedule` —
  расписание на день/неделю с объединением DIKIDI и локальных записей.
- `lib/auth/*` — scrypt и серверные сессии в БД; cookie `zaiko_admin_session` (HttpOnly, 7 дней).
- `app/admin/actions.ts` — server actions с проверкой сессии в каждой мутации.
- `lib/dikidi/*`, `lib/api-anything/*` — чтение журнала и отправка записи через api-anything;
  аргументы операции чтения задаются шаблоном `DIKIDI_JOURNAL_ARGS`, отправка записи — `lib/dikidi/send.ts`
  (операции `find-client` → `save-client` → `create-record`).
- `docs/api-anything-runbook.md` — как получить API к любому сайту и как включить отправку в DIKIDI.
- `db/schema.sql`, `scripts/db-init.ts` — схема и идемпотентная инициализация.

api-anything работает в local-only. Запись из админки сохраняется в БД, а в DIKIDI дублируется
только при включённой галочке (нужен serve с `--allow-writes`, он уже в `bun run api-anything:serve`).
ID услуги для DIKIDI — колонка `services.dikidi_service_id`.

### Транспорты DIKIDI

`lib/dikidi/api.ts` выбирает, как обращаться к DIKIDI (`callDikidi`), а `send.ts`/`availability.ts`
о нём не знают:

- **`api-anything`** — локальный serve на `127.0.0.1:8787` (разработка, как раньше);
- **`http`** — прямые form-POST на `dikidi.net` с cookie кабинета (`lib/dikidi/http.ts`),
  работает на serverless, где локальный процесс невозможен.

Выбор: `DIKIDI_TRANSPORT=http|api-anything`; если переменная не задана — `http` при наличии
доступа (токен в БД/`DIKIDI_TOKEN` или пара `DIKIDI_LOGIN`/`DIKIDI_PASSWORD`), иначе `api-anything`.
Таким образом на Vercel api-anything не нужен, а локальная разработка его не требует менять.

| Переменная | Назначение |
|---|---|
| `DIKIDI_TRANSPORT` | `http` / `api-anything`; не задана — авто (см. выше) |
| `DIKIDI_TOKEN` | cookie `token` кабинета DIKIDI (ручной вариант) |
| `DIKIDI_LOGIN` | телефон владельца кабинета для автологина (напр. `+375291234567`) |
| `DIKIDI_PASSWORD` | пароль кабинета DIKIDI для автологина |
| `DIKIDI_BASE_URL` | адрес DIKIDI, по умолчанию `https://dikidi.net` (тестовый стенд) |

Автологин (`lib/dikidi/login.ts`) выполняется, когда DIKIDI перестаёт принимать cookie: телефон →
`auth.dikidi.net/ajax/check/auth/` → пароль → `/ajax/user/auth/`. Полученный токен сохраняется
в таблице `dikidi_auth` (одна строка) и переживает рестарт инстанса. Если DIKIDI требует
SMS-код или капчу, синхронизация вернёт ошибку с просьбой задать `DIKIDI_TOKEN` вручную.
Токен и пароль нигде не логируются.

## SEO-файлы

- `app/robots.ts`, `app/sitemap.ts` — генерируются Next.js при сборке
- Метаданные и JSON-LD: `app/layout.tsx`, `app/page.tsx`, каждая гео-страница `app/brovi-*`
- SEO-отчёт и план развития: `seo/REPORT_2026-10-16.md`
