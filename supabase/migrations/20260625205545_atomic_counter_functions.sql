-- Атомарные функции инкремента/декремента для числовых "счётчиков",
-- обновляемых с клиента: daily_history.tasks_completed и study_hours.hours.
--
-- Проблема, которую решают эти функции: клиентский код раньше делал
-- "прочитать текущее значение -> прибавить delta на клиенте -> записать
-- обратно". Если пользователь быстро отмечает несколько задач подряд (что
-- вполне реально — в день всего 3-5 задач), два параллельных вызова могут
-- прочитать одно и то же значение до того, как первый успеет его обновить,
-- и одно из увеличений потеряется (классический race condition). Внутри
-- одной SQL-операции Postgres сам гарантирует атомарность — это и используем.

create or replace function public.adjust_daily_history(
  p_user_id uuid,
  p_day date,
  p_delta integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.daily_history (user_id, day, tasks_completed)
  values (p_user_id, p_day, greatest(0, p_delta))
  on conflict (user_id, day)
  do update set tasks_completed = greatest(0, daily_history.tasks_completed + p_delta);
end;
$$;

-- security invoker (не definer) — функция выполняется с правами вызывающего,
-- поэтому RLS-политики на daily_history продолжают применяться как обычно;
-- функция не даёт пользователю доступа к чужим данным.

grant execute on function public.adjust_daily_history(uuid, date, integer) to authenticated;

-- Та же идея для study_hours.hours — атомарный +1/-1 без чтения текущего
-- значения на клиенте. Здесь race condition менее вероятен (кнопки
-- +1ч/-1ч жмут не так часто, как отмечают задачи), но раз паттерн уже
-- есть в проекте, делаем его последовательно везде, где есть "накопительное"
-- числовое поле, обновляемое с клиента.

create or replace function public.adjust_study_hours(
  p_user_id uuid,
  p_track text,
  p_delta numeric
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.study_hours
  set hours = greatest(0, hours + p_delta),
      updated_at = now()
  where user_id = p_user_id and track = p_track;
end;
$$;

grant execute on function public.adjust_study_hours(uuid, text, numeric) to authenticated;
