# Web-приложение (Next.js)

Часть монорепо `job-search-tracker`. См. `/docs` в корне репозитория за полным ТЗ.

## Запуск одной командой

Из корня монорепо:

```bash
npm install
npm run dev
```

При первом запуске скрипт сам создаст `apps/web/.env.local` из шаблона и
покажет инструкцию, где взять ключи Supabase (см. также корневой README.md).
Заполните `.env.local` реальными значениями и запустите `npm run dev` ещё раз.

Откройте http://localhost:3000 — должен сработать редирект на `/login`.

Деплой на Vercel — см. раздел «Деплой на Vercel» в корневом `README.md`.

## Структура

- `app/` — роуты Next.js App Router (`/applications`, `/analytics`,
  `/resources`, `/login`)
- `components/` — общие UI-компоненты (Header, NavTabs, AppShell, Badge)
- `lib/hooks/` — React-хуки с бизнес-логикой экранов (fetch + realtime + optimistic update)
- `lib/supabase.ts` — клиент Supabase для браузера (localStorage по умолчанию)

Общие типы и чистая бизнес-логика (расчёт streak, прогресс-баров, циклическое
переключение типов слотов графика, контент ресурсов) — в `@job-search-tracker/shared`
(`../../packages/shared`).
