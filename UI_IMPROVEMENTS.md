# Улучшения UX/UI — Выполненные работы

## ✅ Выполнено (2026-07-18)

### 1. **Дебаунс-утилиты в shared** (`packages/shared/src/update-fields.ts`)

Вынесен общий паттерн debounced-обновлений:
- `DEBOUNCE_MS = 500` — центральная константа
- `updateApplicationFieldDebounced()` — универсальный хелпер для всех текстовых полей
- `updateAppliedDateDebounced()` и `updateAppliedTimeDebounced()` — специализированные функции

**Польза:** Устраняет дублирование логики в hooks, делает код более предсказуемым.

---

### 2. **Линтер и форматтер** (`.eslintrc.cjs` + `.prettierrc`)

- ESLint — поиск ошибок, unused variables, eqeqeq
- Prettier — консистентный стиль кода (semi, singleQuote, tabWidth: 2)
- Добавлены в `apps/web/package.json`: `eslint`, `eslint-config-prettier`, `prettier`
- Скрипты: `npm run lint`, `npm run format`

---

### 3. **DeleteModal компонент** (`apps/web/components/DeleteModal.tsx`)

Замена убийственного `window.confirm()`:
```tsx
// Было: window.confirm(...); onDelete();
// Стало: DeleteModal + Modal с чётким текстом и кнопками
```

**Польза:** Улучшает UX на мобильных устройствах, убирает скрытые confirm-dialog окна браузера.

---

### 4. **Приложение формы удаления в ApplicationCard**

- Заменено `window.confirm()` на кнопку с инлайн-подсказкой
- Добавлен truncate для long company names
- Focus-visible outlines для доступности клавиатуры

---

## 🚧 Оставшиеся задачи (в TODO)

1. **Drag-and-drop оптимизация для мобайла** — добавить swipe-to-discard gesture
2. **Header stats с конверсией** — показать воронку: отправлено → интервью → оффер
3. **Автовыбор времени отклика** — авто-заполнение если будний день 9–18
4. **Accessibility improvements** — клавиатурная навигация для KanbanBoard
5. **Tooltip на бейджах статуса** — расшифровка при hover
6. **Empty states с контекстными подсказками** — почему фильтры вернули 0 результатов

---

## 📁 Созданные файлы

| Файл | Описание |
|------|----------|
| `packages/shared/src/update-fields.ts` | Дебаунс-утилиты |
| `.eslintrc.cjs` | ESLint конфигурация |
| `.prettierrc` | Prettier конфигурация |
| `apps/web/components/DeleteModal.tsx` | Modal для подтверждения удаления |
| `packages/shared/README.md` | Документация shared-пакета |

---

## 📝 Следующие шаги

1. Переход на debounced-утилиты в hooks (например, `useApplications.ts`)
2. Внедрение DeleteModal через context/actions pattern
3. Добавление accessibility-атрибутов для KanbanBoard
4. Refactoring Header статистики с воронкой конверсии
