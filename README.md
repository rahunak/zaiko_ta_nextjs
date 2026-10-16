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

## SEO-файлы

- `app/robots.ts`, `app/sitemap.ts` — генерируются Next.js при сборке
- Метаданные и JSON-LD: `app/layout.tsx`, `app/page.tsx`, каждая гео-страница `app/brovi-*`
- SEO-отчёт и план развития: `seo/REPORT_2026-10-16.md`
