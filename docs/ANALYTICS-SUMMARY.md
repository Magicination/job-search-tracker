# 📊 Аналитика Job Search Tracker — Готово к использованию!

## ✅ Что реализовано

### Компоненты аналитики

| Компонент | Файл | Статус |
|-----------|------|--------|
| Главный дашборд | `/analytics/dashboard/page.tsx` | ✅ Работает с Supabase |
| Тепловая карта воронки | `/components/FunnelHeatmap.tsx` | ✅ Интегрировано с данными |
| График дней недели | `/components/WeekdayChart.tsx` | ✅ Готов к данным |
| Рекомендации | `/components/Recommendations.tsx` | ✅ Работает с паттернами |
| Аналитика источников | `/components/SourceAnalytics.tsx` | ✅ Подключена к Supabase |
| График времени суток | `HourlyChart.tsx` (существует) | ✅ Готов для интеграции |

### Хуки данных

- `useApplicationAnalytics()` — основной хук с данными из Supabase ✅
- `useApplicationSources()` — аналитика по источникам откликов ✅
- `useApplicationHistory()` — история статусов переходов ✅
- `useStages()` — текущие этапы канбана ✅

### База данных

**Таблицы:**
- `applications` — с полями `source`, `applied_at`, `vacancy_url` ✅
- `application_status_history` — история переходов по этапам ✅
- `resume_versions` — версии резюме ✅

**Миграции:**
- `20260806120000_add_source_column.sql` — поле source для источников ✅
- Все миграции в `/supabase/migrations/` ✅

## 🚀 Как использовать

### 1. Дашборд аналитики

```bash
npm run dev
# Откроется http://localhost:3000/analytics
# или http://localhost:3000/analytics/dashboard
```

### 2. Встраивание в другие страницы

**Пример использования хука:**

```typescript
'use client';

import { useApplicationAnalytics } from '@/lib/hooks/useApplicationAnalytics';
import SourceAnalytics from '@/components/SourceAnalytics';

export default function AnalyticsPage() {
  const { applications, history, loading } = useApplicationAnalytics();

  if (loading) return <div>Загрузка аналитики...</div>;

  return (
    <div>
      <h1>Аналитика откликов</h1>
      <p>{applications.length} откликов всего</p>
      
      <SourceAnalytics applications={applications} />
      {/* другие компоненты */}
    </div>
  );
}
```

### 3. SQL-запросы для экспорта

Используйте `/packages/shared/src/sql-analytics-queries.sql` для получения агрегированных данных:

```sql
-- Время до ответа по дням недели
SELECT EXTRACT(DOW FROM changed_at) as dow, COUNT(*) 
FROM application_status_history WHERE from_status IS NULL 
GROUP BY 1 ORDER BY 1;

-- Конверсия по источникам  
SELECT source, COUNT(*), SUM(CASE WHEN to_status IN ('interview','offer') THEN 1 END)
FROM applications 
JOIN application_status_history ON ...
GROUP BY source;
```

## 📈 Что показывается в дашборде

### Статистика:
- 💯 Всего откликов
- 🎯 Конверсия воронки (отклик → ответ)
- 📊 Распределение по этапам канбана

### Аналитика:
- 🌡️ Тепловая карта (кто где сейчас)
- 📅 График по дням недели
- ⏰ График по времени суток
- 📱 Источник откликов (hh.ru, Super Talent и др.)

### Рекомендации:
- ⏰ Лучшее время для откликов
- 📅 Лучшие дни недели
- 🎯 Эффективные источники

## 🔍 Следующие улучшения (опционально)

### Высокий приоритет:
1. **Real-time обновления** — уже есть через `supabase.on()` ✅
2. **Экспорт в CSV/Excel** — добавить кнопку экспорта аналитики
3. **Сравнение периодов** — "на этой неделе vs прошлой"

### Средний приоритет:
4. **Прогноз конверсии** через `application_status_history`
5. **Анализ молчащих компаний** (не отвечают >7 дней)
6. **Сравнение версий резюме** (какая эффективнее)

### Низкий приоритет:
7. **Word frequency** для вакансий (анализ описания)
8. **Интеграция с AI** для рекомендаций по текстам сопроводительных

## 📝 Примечания

- Все компоненты используют типизированные типы из `@job-search-tracker/shared` ✅
- Данные автоматически синхронизируются через Realtime Supabase ✅
- Компоненты оптимизированы для React 18+ ✅
- Поддерживается темизация через CSS variables ✅

## 🐛 Тестирование

**Проверьте работу:**
```bash
# Запуск dev-сервера
npm run dev

# Проверка аналитики
# → Откройте http://localhost:3000/analytics/dashboard
# → Должно загрузить данные из Supabase

# Проверка миграций в базе
# → Supabase Dashboard → SQL Editor → проверьте таблицу applications
# → должно быть поле source
```
