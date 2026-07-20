# job-search-tracker

Трекер поиска работы + обучения. Полное ТЗ — в `/docs`.

## Локальный запуск (web)

```bash
npm install
npm run dev
```

Это всё. Скрипт `scripts/check-env.js` сам:
- создаст `apps/web/.env.local` из шаблона, если его ещё нет;
- покажет инструкцию, если в файле остались значения-заглушки.

После того как заполните `.env.local` реальными ключами (см. ниже) и
выполните SQL-миграции — запустите `npm run dev` ещё раз, откроется
http://localhost:3000 с автоматическим редиректом на `/login`.

## Структура репозитория

Когда локально всё работает, выкладываем в продакшен. Supabase уже настроен
(шаги 1–4 выше) — для Vercel нужны те же два ключа, просто в другом месте.

### 1. Закиньте репозиторий на GitHub

```bash
git init
git add .
git commit -m "Initial commit"
```

Создайте пустой репозиторий на GitHub и запушьте туда (`git remote add
origin ...` → `git push -u origin main`). Vercel разворачивает именно из
git-репозитория, не из локальной папки — это даёт автодеплой при каждом
пуше.

### 2. Импортируйте проект в Vercel

На https://vercel.com → **Add New** → **Project** → выберите этот
репозиторий из списка. Это монорепо (несколько папок внутри одного
репозитория), поэтому **до первого деплоя** обязательно настройте:

- **Root Directory** → нажмите Edit и выберите `apps/web`
  (Vercel сам подтянет корневой `package.json`/`package-lock.json` и поймёт,
  что это npm workspace — Install Command трогать не нужно)
- **Framework Preset** → должен определиться автоматически как Next.js

Остальные настройки (Build Command, Output Directory) можно оставить по
умолчанию.

### 3. Добавьте переменные окружения

В том же экране импорта (или позже в **Project Settings → Environment
Variables**) добавьте те же два значения, что и в `.env.local`:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ваш Project URL из Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ваш anon/publishable key из Supabase |

Важно: переменные с префиксом `NEXT_PUBLIC_` Next.js "запекает" в код прямо
на этапе сборки. Если добавить или изменить их после деплоя — нужен новый
деплой (Vercel → Deployments → ⋯ → Redeploy), просто перезапуск приложения
их не подхватит.

### 4. Deploy

Жмите **Deploy**. Через 1-2 минуты Vercel выдаст рабочий URL вида
`your-project.vercel.app`. Дальше каждый `git push` в основную ветку будет
автоматически пересобирать и обновлять прод.

### Если поменяется домен или CORS

Supabase Auth по умолчанию не блокирует запросы по домену для самого
клиента (это не CORS-ограниченный сценарий, как для серверных secret-ключей),
так что anon key с любого домена будет работать после деплоя без
дополнительной настройки. Если захотите настроить magic-link письма или
redirect-URLs — это делается в Supabase → Authentication → URL
Configuration, добавив туда ваш `*.vercel.app` домен.

## Структура репозитория

```
/apps
  /web          — Next.js приложение
/packages
  /shared       — общие типы и бизнес-логика (streak, прогресс обучения, аналитика откликов)
/supabase
  /migrations   — версионированные SQL-миграции (управляются Supabase CLI)
  config.toml   — конфигурация CLI
/docs           — исходное ТЗ (6 файлов)
/scripts        — вспомогательные скрипты (check-env.js)
```

## Как добавлять новые фичи в базу данных

Любое изменение схемы — это новый файл миграции, никогда правка существующих
или ручные правки в Dashboard:

```bash
npm run db:new -- добавить_что-то
# → создаёт supabase/migrations/<timestamp>_добавить_что-то.sql
```

Откройте созданный файл, напишите SQL (новые таблицы, `alter table add
column`, новые индексы — всегда аддитивно, без `drop`/`truncate` на
существующих данных), затем:

```bash
npm run db:push
```

Если меняете и TypeScript-типы в `@job-search-tracker/shared` (см.
`packages/shared/src/types.ts`) — обновите их в той же сессии работы, чтобы
типы не расходились со схемой.
