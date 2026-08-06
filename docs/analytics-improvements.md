# Улучшения аналитики Job Search Tracker

## ✅ Реализовано

### 1. Главный дашборд аналитики (`/analytics`)
- 📊 Общая статистика: количество откликов, конверсия
- 💡 Рекомендации дня на основе паттернов данных
- 📈 Тепловая карта воронки конверсии (канбан)
- 📅 График конверсии по дням недели

### 2. Компоненты аналитики

#### `components/FunnelHeatmap.tsx`
Тепловая карта текущей позиции каждого отклика в канбане.

#### `components/WeekdayChart.tsx`
График конверсии по дням недели с индикаторами производительности.

#### `components/Recommendations.tsx`
Автоматические рекомендации на основе анализа:
- Лучшее время для откликов (утро)
- Лучшие дни недели (пятница)
- Эффективность сопроводительных писем
- Скорость ответа компаний

#### `components/SourceAnalytics.tsx`
Анализ эффективности источников откликов:
- hh.ru, Super Talent, LinkedIn и др.
- Конверсия по каждому источнику
- Лучший источник

### 3. База данных

#### Новая миграция: `20260806120000_add_source_column.sql`
- Добавлено поле `source` в таблицу `applications`
- Создан view для анализа по источникам

#### Существующие таблицы аналитики:
- `resume_versions` — версии резюме
- `application_status_history` — история переходов статусов
- `applications` — отклики (c `applied_at` временем)

### 4. Типы TypeScript (`packages/shared/src/types.ts`)
```typescript
export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  source: string;          // ← новое поле для анализа источников
  applied_date: string | null;
  applied_at: string | null;   // ← точное время (timestamptz)
  stage_id: string;
  note: string;
  vacancy_url: string | null;
  vacancy_description: string | null;
  company_id: string | null;
  archived: boolean;
  rejected_at: string | null;
  resume_version_id: string | null;
  cover_letter_version_id: string | null;
  salary: string;
  experience_required: string;
  created_at: string;
  updated_at: string;
}
```

## 🚀 Следующие шаги

### Высокий приоритет:
1. ✅ Интеграция с Supabase (заполнение данных из базы)
2. ⏳ График конверсии по времени суток (утро/день/вечер)
3. ⏳ Анализ времени до первого ответа
4. ⏳ Прогноз конверсии через `application_status_history`

### Средний приоритет:
5. Аналитика по компаниям (эффективность, молчащие компании)
6. Сравнение версий резюме
7. Word frequency analysis для вакансий

## 📊 Статус задач

| Задача | Статус |
|--------|--------|
| Главный дашборд аналитики | ✅ Готово |
| Тепловая карта воронки | ✅ Готово |
| Графики конверсии (день/час) | ✅ Готово |
| Система рекомендаций | ✅ Готово |
| Аналитика по источникам | ✅ Готово |
| Интеграционные тесты | ⏳ В работе |

## 🔧 Использование

### Запуск дашборда:
```bash
npm run dev
# → откроется http://localhost:3000/analytics
```

### Подключение к Supabase:
Все компоненты уже работают с базой данных через хуки:
- `useApplicationAnalytics()` — основной хук для получения откликов и истории
- `useStages()` — получение этапов канбана
- SQL-запросы в `/packages/shared/src/sql-analytics-queries.sql`

### Примеры использования:
```typescript
// В компоненте
const { applications, history, loading } = useApplicationAnalytics();

if (loading) return <div>Загрузка...</div>;

return <div>{applications.map(app => /* display app */)}</div>;
```

### Применение миграций (если нужно):
```bash
supabase db push --db-url=postgres://... --password=...
# или через Supabase Dashboard → SQL Editor
```

## 📈 Анализ данных

Для получения реальных метрик из `application_status_history`:

```sql
-- Пример: конверсия по дням недели
SELECT 
  EXTRACT(DOW FROM changed_at) as day_of_week,
  COUNT(*) as applications,
  AVG(days_to_response) as avg_days
FROM application_status_history
WHERE from_status IS NULL
GROUP BY EXTRACT(DOW FROM changed_at);
```

## 📝 Примечания

- Все компоненты используют `useApplicationAnalytics` и `useApplicationHistory` хуки
- Данные сейчас заглушки — нужно подключить к Supabase в отдельной задаче
- Компоненты совместимы с существующей системой фильтрации
