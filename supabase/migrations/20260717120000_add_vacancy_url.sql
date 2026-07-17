alter table public.applications add column if not exists vacancy_url text;

-- Разовый перенос: если в note лежит ЦЕЛИКОМ и ТОЛЬКО ссылка (так их
-- клал букмарклет раньше, до появления отдельного поля) — переносим её
-- в vacancy_url и очищаем note. Не трогаем note, если там есть что-то
-- ещё кроме ссылки (осторожно, чтобы не потерять текст заметок).
update public.applications
set vacancy_url = note, note = ''
where vacancy_url is null
 and note ~ '^https?://\S+$';
