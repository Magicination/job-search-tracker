-- ============================================================
-- 20260806120000_add_source_column.sql
-- Добавляем поле 'source' в таблицу applications для аналитики по источникам
-- ============================================================

-- Добавляем поле source (необязательное, может быть пустым)
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '';

-- Индекс для быстрой фильтрации по источнику
CREATE INDEX IF NOT EXISTS applications_source_idx ON public.applications(source);

-- Создаём view для удобства анализа по источникам
CREATE OR REPLACE VIEW application_sources AS
SELECT 
  source,
  COUNT(*) as total_applications,
  ARRAY_AGG(status) as statuses_present
FROM applications
GROUP BY source;
