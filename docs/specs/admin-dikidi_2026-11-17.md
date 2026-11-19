# Спека и отчёт: служебный раздел /admin + записи DIKIDI через api-anything

**Дата:** 2026-11-17 · **Проект:** `zaiko_ta/zaiko_ta_nextjs` · **Статус:** реализовано; DIKIDI отдаёт чтению усечённые записи (см. «Ограничение»)

## Проблема

Мастеру нужен закрытый служебный раздел на сайте: создавать записи на услуги и видеть
расписание уже записанных клиентов, которое сервис получает из DIKIDI (публичного API у
DIKIDI нет). Доступ — по логину/паролю из PostgreSQL.

## Критерии приёмки и результат

| # | Критерий | Статус | Чем проверено |
|---|---|---|---|
| 1 | `docker compose up -d` поднимает Postgres на `127.0.0.1:5434`, `bun run db:init` идемпотентно создаёт схему и админа | ✅ | контейнер healthy, `\dt` → 4 таблицы, 5 услуг, `admin` со scrypt-хэшем |
| 2 | `bun run build` проходит | ✅ | Next.js 16.3.2, TypeScript OK, 21 страница |
| 3 | `/admin/*` без сессии → login; верный пароль ставит HttpOnly-cookie; неверный — ошибка; logout удаляет сессию | ✅ | curl: `307 → /admin/login`, `303 → /admin` + `Set-Cookie ... HttpOnly`, неверный пароль → `?error=invalid`, без сессии → `307` |
| 4 | Форма создаёт запись и она видна в расписании | ✅ | POST server action → `303 /admin?created=1`, в БД строка `Тест Клиент`, в расписании строка с бейджем «админка · в БД» |
| 5 | Расписание получает записи DIKIDI через api-anything и объединяет с локальными; ошибки — человеческим текстом | ✅ (с ограничением) | операция `journal` с параметрами `company/from/to`: вызов на 16–22.11 вернул 6 записей только внутри окна; `/admin/schedule?date=2026-11-17&range=week` → 6 строк с бейджем DIKIDI, баннера ошибки нет. Ответ DIKIDI повторному HTTP-запросу усечён — см. «Ограничение» |
| 6 | api-anything: репозиторий получен, `setup` в local-only, скилл в `.agents/skills` + `skills-lock.json`, runbook | ✅ | `setup` → claude-code/cursor/gemini/vscode, `localOnly: true`, `share: false`, pin 0.4.0; скилл зарегистрирован; `docs/api-anything-runbook.md` |
| 7 | PII не в логах, `/admin` закрыт от индексации | ✅ | логи не содержат телефонов/пароля; `app/robots.ts` disallow `/admin/`, metadata `noindex` |

## Решения

1. **Раздел внутри существующего приложения** (`zaiko_ta_nextjs`), папка `app/admin/(protected)`
   — защищённый layout, `/admin/login` вне группы, чтобы не было цикла редиректов.
2. **Postgres 17 на порту 5434** — 5431/5432/5433/54322 уже заняты другими контейнерами, чужие процессы не трогались.
3. **Аутентификация**: scrypt-хэш + серверные сессии в `admin_sessions` (cookie только с токеном, 7 дней,
   HttpOnly/SameSite=Lax). Проверка сессии — в layout и в каждой server action.
4. **Данные DIKIDI — через api-anything**, а не через собственный клиент: приложение вызывает
   `POST /v1/call/<site>/<op>`. Имена параметров выученной операции заранее неизвестны, поэтому они
   задаются JSON-шаблоном в env (`DIKIDI_JOURNAL_ARGS`, `DIKIDI_WRITE_ARGS`), а не хардкодом.
5. **Write в DIKIDI — по галочке**: форма сохраняет запись в БД; чекбокс «Дублировать запись в DIKIDI»
   отправляет её в DIKIDI при заданном `DIKIDI_WRITE_OP`; статус синхронизации виден в интерфейсе.
   Последний выбор галочки запоминается в cookie `zaiko_dikidi_sync` (1 год) и подставляется по умолчанию
   при следующей записи. Причина: владелец постепенно отказывается от DIKIDI — дублирование должно быть
   осознанным, а не безусловным.
6. **local-only** для api-anything (выбор владельца): ничего не уходит в общий каталог, ПДн клиентов не шарятся.

## Изменённые/созданные файлы

- `docker-compose.yml`, `.env.example`, `.gitignore` (исключение для `.env.example`)
- `db/schema.sql`, `scripts/db-init.ts`, `package.json` (`db:init`, `api-anything:serve`, `pg`)
- `lib/db.ts`, `lib/auth/password.ts`, `lib/auth/session.ts`
- `lib/api-anything/client.ts`, `lib/api-anything/template.ts`
- `lib/dikidi/types.ts`, `lib/dikidi/map.ts`, `lib/dikidi/source.ts`, `lib/dikidi/send.ts`, `lib/dikidi/time.ts`
- `app/admin/layout.tsx`, `app/admin/login/page.tsx`, `app/admin/actions.ts`,
  `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/page.tsx`,
  `app/admin/(protected)/schedule/page.tsx`
- `README.md` (раздел админки), `docs/api-anything-runbook.md`
- Вне проекта: `~/.api-anything` (serve-токен, профиль), конфиги агентов (бэкапы `.bak-api-anything`),
  `a_projects/.agents/skills/api-anything`, `a_projects/skills-lock.json`, `a_projects/api-anything` (исходники)

## Ограничение: DIKIDI отдаёт усечённые записи

Браузер владельца получает в журнале полные записи (`client_phone`, `services_title`, суммы),
а повторный HTTP-запрос из api-anything — только время, длительность, мастера и иногда имя клиента.
Запрос идентичен браузерному (URL, тело, заголовки), свежая сессия и переобучение операции не помогают:
похоже на защиту DIKIDI от не-браузерных клиентов. Как следствие, карточки DIKIDI в расписании
часто выглядят как «Без имени · Услуга не указана».

Варианты решения (требуют отдельного решения владельца):

1. Официальный партнёрский API DIKIDI — если он доступен салону.
2. Чтение через браузер (playwright) вместо HTTP-реплея — дороже по ресурсам и хрупче.
3. Оставить как есть: время/мастер/длительность видны, детали — в кабинете DIKIDI.

## Что осталось (нужен владелец)

1. `.env.local`: `API_ANYTHING_TOKEN`, `DATABASE_URL`, `ADMIN_LOGIN`/`ADMIN_PASSWORD`
   (агент env не создаёт); `DIKIDI_COMPANY_ID`/`DIKIDI_MASTER_ID` имеют дефолты салона в коде.
2. `bash ../../scripts/api-anything.sh serve --port 8787` держать запущенным (иначе расписание — только локальные записи).
3. Решение по усечённым данным DIKIDI (выше).
4. По желанию — обучение write-операции и `serve --allow-writes` для отправки записей в DIKIDI.

## Риски

- DIKIDI — неофициальный API: смена HTML/эндпоинта ломает операцию; лечится повторным обучением.
- api-anything serve должен быть запущен на машине, иначе расписание показывает только локальные записи.
- Схема БД без миграционного инструмента: изменения — вручную через `db/schema.sql` (idempotent).
- Сессии в БД не чистятся по расписанию (просроченные удаляются при следующем входе).

## Дополнение 2026-11-19: отправка записи в DIKIDI заработала по-настоящему

**Проблема.** Владелец создал запись через `/admin` с включённой галочкой, но в кабинете DIKIDI её не было.
В БД у записи `id=2` оказалось `sync_status='local'`, `sync_error` пуст, `dikidi_id` пуст — то есть приложение
вообще не отправляло запись: `DIKIDI_WRITE_OP` не задан, а write-операции в api-anything не было.

**Что выяснено в DIKIDI (живая компания 1784388, мастер 3834316).**

- Визард «Добавить запись» состоит из `GET /ajax/newrecord/time_reservation/` (создаёт резервацию, отдаёт `record_id`)
  и `POST /owner/ajax/journal/newrecord_record_save/`. Без `client_id` второй шаг отклоняется:
  `Поле "Клиент" не может быть пустым`, а сама резервация в журнале не появляется — путь нерабочий.
- Рабочий путь — один запрос `POST /ru/owner/ajax/journal/record_save/?company=1784388`
  (`protocol_version=2`, `master_id`, `date`, `time`, `services[0][id|duration|price|cost]`, `client_id`,
  `client_name`, `client_phone`, `comments`). Ответ — `event[].data.new.record_id`, запись сразу видна в журнале.
- Клиент обязателен: `POST /ru/owner/ajax/clients/find/` (тело `query=<телефон цифрами>`) ищет, `POST /ru/owner/ajax/clients/save/`
  создаёт карточку (`number` — телефон цифрами с кодом страны).
- `unique_key` сервер не валидирует: проходит и устаревший, и произвольный.
- Удаление записи: `POST /ru/owner/ajax/journal/remove/{record_id}/`.

**Критерии приёмки и результат.**

| # | Критерий | Статус | Чем проверено |
|---|---|---|---|
| 1 | `find-client` отдаёт клиента по телефону | ✅ | `POST /v1/call/dikidi/find-client` → массив с `id`, `name`, `phone` |
| 2 | `save-client` создаёт клиента и возвращает id | ✅ | `POST /v1/write/dikidi/save-client` → `client_info.id=173495669` |
| 3 | `create-record` создаёт запись в DIKIDI | ✅ | `POST /v1/write/dikidi/create-record` → `record_id=1192619239` |
| 4 | Код админки отправляет запись целиком (поиск → создание клиента → запись) | ✅ | `bun run scripts/dikidi-send-check.ts` (временный, удалён): существующий клиент → `synced, dikidiId=1192620545`; новый телефон `80291112266` → `synced, dikidiId=1192620760` |
| 5 | Запись видна в журнале DIKIDI | ✅ | `journal` за 2026-12-02/03/05 → запись с клиентом, услугой и комментарием |
| 6 | Тестовые записи удалены | ✅ | `journal/remove/` для 1192613054, 1192613943, 1192618335, 1192619239, 1192620545, 1192620760 → журнал пуст |
| 7 | `tsc --noEmit` и `next build` проходят | ✅ | оба exit 0, 21 маршрут |
| 8 | Проверка через форму `/admin` в браузере | ❌ не выполнено | логин/пароль админки у агента нет; код вызван напрямую тем же `sendAppointmentToDikidi` |

**Изменённые файлы.**

- `lib/dikidi/send.ts` — полный флоу: `find-client` → при необходимости `save-client` → `create-record`,
  нормализация телефона (9 цифр / `80…` / `+375…`), разбор `record_id` из ответа, понятные ошибки.
- `app/admin/actions.ts` — услуга читается вместе с `dikidi_service_id` и передаётся в отправку.
- `app/admin/(protected)/page.tsx` — подпись под галочкой без ссылки на `DIKIDI_WRITE_OP`.
- `scripts/db-init.ts` — сид услуг с `dikidi_service_id` (`on conflict` дозаполняет пустые значения).
- `package.json` — `api-anything:serve` теперь с `--allow-writes`.
- `README.md`, `docs/api-anything-runbook.md` — описание трёх операций и ограничений.
- Вне проекта: `~/.api-anything/sites/dikidi.json` — операции `find-client`, `save-client`, `create-record`,
  `"loginCookies": ["token"]` (без него serve отказывает write-операциям: эвристика по именам cookie DIKIDI не узнаёт вход).
  Бэкап прежнего файла — `/tmp/dikidi-site.json.bak`.

**Соответствие услуг (проверено по `masters.services`).**

| Услуга в админке | ID в DIKIDI |
|---|---|
| Ламинирование ресниц | 18901252 |
| Долговременная укладка бровей (+окрашивание) | 18901574 |
| Окрашивание и коррекция бровей | 18901268 |
| Коррекция бровей | 18901273 |
| Окрашивание ресниц | 18901290 |

**Что осталось за владельцем.**

1. Проверить одну реальную запись через форму `/admin` (галочка включена) и убедиться, что статус «в DIKIDI».
2. Удалить в кабинете тестовые карточки клиентов, созданные при проверке: «ТЕСТ ИНТЕГРАЦИИ» (+375 29 111-22-33, id 173495287),
   «ТЕСТ ИНТЕГРАЦИИ КЛИЕНТ» (+375 29 111-22-44, id 173495669), «ТЕСТ ИНТЕГРАЦИИ» (+375 29 111-22-66, id 173495778).
   Эндпоинт удаления клиента найти не удалось — только через интерфейс кабинета.
3. Держать serve запущенным с записью: `bun run api-anything:serve` (флаг уже внутри).
4. `.env.example` содержит устаревшие `DIKIDI_WRITE_OP`/`DIKIDI_WRITE_ARGS` — агент env-файлы не правит, строки можно убрать вручную.

**Риски.**

- Порядок «создать клиента → создать запись» не транзакционный: при сбое второго шага в DIKIDI останется карточка клиента без записи.
- Эндпоинты неофициальные; смена полей ломает операцию — лечится переобучением через playwright-разведку.
- `loginCookies` привязан к имени cookie `token`; если DIKIDI переименует её, serve снова начнёт отказывать write-операциям.
