# Shared Package

Общие типы и бизнес-логика для job-search-tracker.

## Что внутри

- `/src/types.ts` — TypeScript-типы, зеркалящие Supabase схему
- `/src/update-fields.ts` — утилиты с debounce (новые)
- `/src/design-tokens.ts` — дизайн-токены и переводчики лейблов
- `/src/date-utils.ts` — работы с датами в локальной таймзоне

## Использование

```typescript
import type { Application } from '@job-search-tracker/shared';
import { updateApplicationFieldDebounced } from '@job-search-tracker/shared/update-fields';

const app: Application = { /* ... */ };

await updateApplicationFieldDebounced(
  app.id,
  'company',
  'Новая компания'
);
```

## Дизайн-токены

Используйте `@job-search-tracker/shared/design-tokens` для консистентных цветов.
