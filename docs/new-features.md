# Документация новых функций

## 1. Объединение откликов на одну вакансию разными резюме

### Проблема
Раньше каждый отклик содержал `vacancy_url` как строку, что приводило к дублированию данных для разных версий резюме на одну и ту же вакансию.

### Решение
Создана новая таблица `vacancy_links`:
```sql
CREATE TABLE vacancy_links (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  vacancy_url TEXT NOT NULL UNIQUE per user,
  company_id UUID REFERENCES companies(id),
  role TEXT,
  source TEXT DEFAULT 'manual'
)
```

### Как это работает
- Теперь `applications ссылается на vacancy_links.id` вместо `vacancy_url` напрямую
- Все отклики разных резюме на одну вакансию группироваются по `vacancy_link_id`
- Можно анализировать: "какое резюме лучше конвертирует для этой вакансии?"

---

## 2. Исправление удаления стадий (stages)

### Проблема
Пользователь не мог удалить свойство stage, даже если в нём нет откликов.

### Решение
Обновлена RLS-политика `stages_delete_own`:
```sql
CREATE POLICY "stages_delete_own" ON public.stages FOR DELETE
USING (
  auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM applications a 
    WHERE a.stage_id = stages.id AND a.archived = false
  )
)
```

Теперь можно удалить stage только если:
- В нём нет открытых откликов, ИЛИ
- Все отклики в нём архивированы (`archived = true`)

---

## 3. Аналитическая панель компаний

### Что добавлено
Новая страница `/companies` с:
- Карточками каждой компании из откликов
- Статистикой: количество откликов, рейтинг
- Ссылкой на сайт компании (поле `url` в таблице companies)
- Индикатором наличия открытых откликов
- Интеграцией компонента `AddVacancy` для добавления вакансий

### Будущие улучшения

#### Добавление вакансий из hh.ru
Компонент `AddVacancy` сейчас показывает placeholder с планом реализации:

**Поля:**
- URL вакансии (hh.ru/vacancy/xxx)
- Роль/название вакансии (опционально)
- Источник добавления (текущий: manual)

**Функционал:**
1. Создать запись в `vacancy_links` для компании
2. Показать все вакансии этой компании на отдельной странице
3. Индикация новых вакансий (через webhook/RSS/парсинг)

#### Автоматическое отслеживание вакансий
Варианты реализации:
1. **Webhook на hh.ru** — нет официального API, но можно настроить парсер
2. **RSS/Atom feed** — многие компании публикуют вакансии в RSS
3. **Bookmarklet + Supabase** — сохранить ссылку при переходе на вакансию
4. **Ручной ввод через форму** — самый простой вариант на старте

### Текущий стек для отслеживания вакансий

- Frontend: Next.js pages (`/apps/web/app/companies/page.tsx`)
- Backend: Supabase (таблица `vacancy_links`)
- Парсинг: временно — ручное добавление, в будущем — bookmarklet или webhook

---

## Файлы изменений

### SQL миграции
- `supabase/migrations/20260805184900_vacancy_grouping.sql` — группировка вакансий + фикс стадий

### React компоненты
- `apps/web/app/companies/page.tsx` — новая страница компаний
- `apps/web/components/AddVacancy.tsx` — компонент для добавления вакансий

### Обновлённые файлы
- `apps/web/components/NavTabs.tsx` — добавлен таб "Компании" в навигацию
- `packages/shared/src/types.ts` — обновления типов (если нужно)

---

## Как запустить

```bash
# 1. Применить миграцию Supabase
npm run db:push

# 2. Запустить dev-сервер
npm run dev

# 3. Открыть http://localhost:3000/companies
```

## TODO (следующие улучшения)

1. Реализовать форму добавления вакансий в `AddVacancy` компоненте
2. Создать страницу `/companies/[id]/vacancies` для просмотра всех вакансий компании
3. Добавить webhook/RSS парсинг новых вакансий
4. Сделать аналитику конверсии по компаниям (какая компания даёт лучший acceptance rate)
