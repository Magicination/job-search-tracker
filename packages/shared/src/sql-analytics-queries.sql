-- Аналитика времени до ответа через application_status_history
-- Используется в графиках и дашбордах

-- 1. Среднее время до первого ответа по дням недели
SELECT 
  EXTRACT(DOW FROM changed_at) AS day_of_week_num,
  CASE EXTRACT(DOW FROM changed_at)
    WHEN 0 THEN 'ВС'
    WHEN 1 THEN 'ПН'
    WHEN 2 THEN 'ВТ'
    WHEN 3 THEN 'СР'
    WHEN 4 THEN 'ЧТ'
    WHEN 5 THEN 'ПТ'
    WHEN 6 THEN 'СБ'
    ELSE '???'
  END AS day_of_week,
  COUNT(*) AS total_applications,
  ROUND(AVG(EXTRACT(EPOCH FROM (changed_at - application.created_at)) / 3600), 1) AS avg_hours_to_response,
  MIN(EXTRACT(EPOCH FROM (changed_at - application.created_at)) / 3600) / 3600 AS min_days_to_first_response
FROM application_status_history
WHERE from_status IS NULL  -- только первые записи истории
GROUP BY EXTRACT(DOW FROM changed_at);

-- 2. Конверсия по времени суток (утро/день/вечер)
SELECT 
  CASE 
    WHEN EXTRACT(HOUR FROM applied_at) BETWEEN 0 AND 11 THEN 'утро'
    WHEN EXTRACT(HOUR FROM applied_at) BETWEEN 12 AND 20 THEN 'день'
    ELSE 'вечер'
  END AS time_of_day,
  COUNT(*) as total_applications,
  SUM(CASE WHEN to_status IN ('interview', 'offer') THEN 1 ELSE 0 END) as responses,
  ROUND(
    CAST(SUM(CASE WHEN to_status IN ('interview', 'offer') THEN 1 ELSE 0 END) AS FLOAT) / 
    NULLIF(COUNT(*), 0) * 100, 1
  ) AS conversion_rate
FROM application_status_history
WHERE from_status IS NULL AND applied_at IS NOT NULL
GROUP BY 
  CASE 
    WHEN EXTRACT(HOUR FROM applied_at) BETWEEN 0 AND 11 THEN 'утро'
    WHEN EXTRACT(HOUR FROM applied_at) BETWEEN 12 AND 20 THEN 'день'
    ELSE 'вечер'
  END
ORDER BY conversion_rate DESC;

-- 3. Анализ по источникам (с учётом history)
SELECT 
  applications.source,
  COUNT(*) as total_applications,
  SUM(CASE WHEN application_status_history.to_status IN ('interview', 'offer') THEN 1 ELSE 0 END) as responded_count,
  ROUND(
    CAST(SUM(CASE WHEN application_status_history.to_status IN ('interview', 'offer') THEN 1 ELSE 0 END) AS FLOAT) / 
    NULLIF(COUNT(*), 0) * 100, 1
  ) AS conversion_rate
FROM applications
LEFT JOIN application_status_history ON applications.id = application_status_history.application_id
WHERE applications.user_id = CURRENT_SETTING('app.current_user_id')::UUID
  AND applications.source IS NOT NULL
GROUP BY applications.source
HAVING COUNT(*) > 0;
