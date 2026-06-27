-- 0003_seed_new_user_trigger.sql
-- Автоматическое сидирование данных нового пользователя через Postgres-триггер
-- на auth.users (более надёжно, чем клиентский seedNewUser(), не зависит от того,
-- выполнится ли клиентский код после регистрации).
-- См. /docs/01-data-model.md, раздел "Сиды", рекомендация Cursor.

create or replace function public.seed_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1) schedule_slots — 21 строка по шаблону недели (день недели x time_block)
  insert into public.schedule_slots (user_id, day_of_week, time_block, slot_type)
  values
    (new.id, 0, 'morning', 'job'), (new.id, 0, 'afternoon', 'sql'), (new.id, 0, 'evening', 'eng'),
    (new.id, 1, 'morning', 'job'), (new.id, 1, 'afternoon', 'sql'), (new.id, 1, 'evening', 'rest'),
    (new.id, 2, 'morning', 'job'), (new.id, 2, 'afternoon', 'eng'), (new.id, 2, 'evening', 'case'),
    (new.id, 3, 'morning', 'job'), (new.id, 3, 'afternoon', 'sql'), (new.id, 3, 'evening', 'eng'),
    (new.id, 4, 'morning', 'job'), (new.id, 4, 'afternoon', 'case'), (new.id, 4, 'evening', 'rest'),
    (new.id, 5, 'morning', 'eng'), (new.id, 5, 'afternoon', 'rest'), (new.id, 5, 'evening', 'rest'),
    (new.id, 6, 'morning', 'rest'), (new.id, 6, 'afternoon', 'rest'), (new.id, 6, 'evening', 'rest');

  -- 2) study_hours — цели по умолчанию: eng=200ч, sql=80ч
  insert into public.study_hours (user_id, track, hours, goal_hours)
  values
    (new.id, 'eng', 0, 200),
    (new.id, 'sql', 0, 80);

  -- 3) tasks — 3 дефолтные задачи на сегодня (UTC-дата на момент регистрации;
  -- клиент при необходимости может пересоздать на свою локальную "сегодня"
  -- через ensureDefaultTasksForToday(), см. 04-features-logic.md)
  insert into public.tasks (user_id, day, text, category)
  values
    (new.id, current_date, 'Откликнуться на 5 вакансий PM (удалённо)', 'job'),
    (new.id, current_date, '30 минут SQL-тренажёра', 'study'),
    (new.id, current_date, '20 минут английского (Speaking/listening)', 'eng');

  -- 4) user_settings — дефолтный ориентир часов в неделю
  insert into public.user_settings (user_id, hours_per_week)
  values (new.id, 40);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.seed_new_user();
