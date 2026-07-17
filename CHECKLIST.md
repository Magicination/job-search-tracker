# Задание: стабилизация + напоминание + экспорт + защита от дублей

## 1. Стабилизация — защита от повторения прошлых инцидентов

### 1.1 apps/web/.gitignore — не дать pnpm-lock.yaml повториться

Найти:
# Vercel
.vercel

Заменить на:
# Vercel
.vercel

# Не используем pnpm/yarn в этом проекте — если один из них случайно
# стоит глобально и сгенерирует свой лок-файл, коммитить его нельзя,
# именно так один раз уже уронили деплой на Vercel.
pnpm-lock.yaml
yarn.lock

(добавить в корневой .gitignore, не в apps/web/.gitignore — файл один
на весь монорепозиторий, в корне)

### 1.2 Корневой package.json — единая команда проверки перед пушем

Найти:
  "scripts": {
    "dev": "node scripts/check-env.js && npm run dev --workspace=web",
    "build": "npm run build --workspace=web",
    "setup": "node scripts/check-env.js",
    "db:link": "supabase link",
    "db:push": "supabase db push",
    "db:new": "supabase migration new"
  },

Заменить на:
  "scripts": {
    "dev": "node scripts/check-env.js && npm run dev --workspace=web",
    "build": "npm run build --workspace=web",
    "verify": "npm run build --workspace=web",
    "setup": "node scripts/check-env.js",
    "db:link": "supabase link",
    "db:push": "supabase db push",
    "db:new": "supabase migration new"
  },

(npm run build уже включает полную проверку TypeScript — next build сам
гоняет "Running TypeScript" на каждом прогоне; "verify" — просто
понятный алиас, чтобы перед пушем была одна команда, которую легко не
забывать и легко объяснить локалке: "прогони npm run verify перед пушем")

### 1.3 Новый файл CHECKLIST.md в корне репозитория

# Чек-лист перед деплоем

Прогонять руками после любых изменений, перед git push:

1. `npm run verify` — должно быть "Compiled successfully" и
   "Finished TypeScript" без единой ошибки.
2. Если менялась схема БД — применить миграцию (`npm run db:push`)
   и проверить в Supabase Studio, что таблицы/колонки на месте.
3. Открыть приложение локально или на превью-деплое Vercel и руками
   пройти:
   - [ ] Добавить отклик вручную (+ Новый отклик)
   - [ ] Изменить поля отклика (компания, вакансия, зарплата, статус)
   - [ ] Сменить статус через стрелки ‹ › и через drag-and-drop
   - [ ] Удалить отклик (кнопка "Удалить отклик" внизу карточки)
   - [ ] Добавить отклик через букмарклет с реальной вакансии hh.ru
   - [ ] Проверить фильтры (поиск, статус, источник, даты)
   - [ ] Открыть вкладку "Аналитика", переключить период
   - [ ] Экспортировать CSV (кнопка "Экспорт")
4. Проверить git status — не попал ли в коммит pnpm-lock.yaml,
   yarn.lock или .env файлы.

## 2. Бейдж "давно без ответа"

apps/web/components/KanbanCard.tsx — добавить стикер для аппликейшенов
с статусом `applied`, которые больше 7 дней ждут изменения статуса:

```typescript
const STALE_DAYS_THRESHOLD = 7;

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const applied = new Date(dateStr);
  const now = new Date();
  const diffMs = now.setHours(0, 0, 0, 0) - applied.setHours(0, 0, 0, 0);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// В JSX карточки:
const idx = STATUS_ORDER.indexOf(app.status);
const days = app.status === 'applied' ? daysSince(app.applied_date) : null;
const isStale = days !== null && days >= STALE_DAYS_THRESHOLD;

// Рендер бейджа (если нужно):
{isStale && (
  <p className="mt-1 text-xs text-accent-amber" title={`Долго без изменения статуса: ${days} дн.`}>
    ⚠ {days} дн. без ответа
  </p>
)}
```

## 3. Экспорт в CSV

apps/web/lib/exportApplications.ts — файл уже создан с функцией
`exportApplicationsToCsv`.

apps/web/app/applications/page.tsx — добавить кнопку "Экспорт" рядом с "+ Новый отклик":

```tsx
import { exportApplicationsToCsv } from '../../lib/exportApplications';

// В JSX:
<div className="flex flex-wrap gap-2">
  <BookmarkletCard />
  <button
    onClick={() => exportApplicationsToCsv(applications)}
    disabled={applications.length === 0}
    className="shrink-0 rounded-lg border border-border px-4 py-2.5 text-sm text-text-dim transition hover:border-border-soft disabled:opacity-50"
    title="Скачать все отклики в CSV"
  >
    Экспорт
  </button>
  <button
    onClick={handleAddEmpty}
    className="shrink-0 rounded-lg bg-accent-amber px-5 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90"
  >
    + Новый отклик
  </button>
</div>
```

## 4. Проверка на дубли при добавлении через букмарклет

apps/web/app/add/page.tsx — добавить проверку на дубликаты на основе:
1. vacancy_url (если есть)
2. company + role (по совпадению в нижнем регистре)

```tsx
const duplicate = applications.find(
  (a) =>
    (url && a.vacancy_url === url) ||
    (company.trim() &&
      role.trim() &&
      a.company.trim().toLowerCase() === company.trim().toLowerCase() &&
      a.role.trim().toLowerCase() === role.trim().toLowerCase())
);

// В начале handleSubmit:
if (duplicate) {
  const proceed = window.confirm(
    `Похоже, такой отклик уже есть (добавлен ${new Date(duplicate.created_at).toLocaleDateString('ru-RU')}). Всё равно создать ещё один?`
  );
  if (!proceed) return;
}

// Рендер предупреждения:
{duplicate && (
  <p className="rounded-lg border border-accent-amber/50 bg-accent-amber/10 p-2 text-sm text-text-dim">
    Похоже, такой отклик уже есть в списке (добавлен{' '}
    {new Date(duplicate.created_at).toLocaleDateString('ru-RU')}). Можно всё равно продолжить.
  </p>
)}

// Текст кнопки при наличии дубля:
<button
  type="submit"
  disabled={submitting}
  className="rounded-lg bg-accent-amber px-4 py-2 text-sm font-semibold text-bg transition disabled:opacity-60"
>
  {submitting ? 'Сохранение…' : duplicate ? 'Всё равно создать' : 'Создать отклик'}
</button>
```

## После всех правок

1. npm run verify — Compiled successfully + Finished TypeScript, без ошибок.
2. Применить обе миграции по порядку (если ещё не применены):
   - 20260717120000_add_vacancy_url.sql
3. Прислать полный вывод консоли.
