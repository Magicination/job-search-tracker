-- Собственные этапы канбана вместо жёсткого списка (Отправлен/Интервью/
-- Оффер/Отклонён). Каждый пользователь получает свой набор строк-этапов
-- (название, цвет, порядок), отклик ссылается на этап по id, а не на
-- фиксированный enum. Существующие данные переносятся ПЕРЕД удалением
-- старых колонок — на каждом шаге можно проверить промежуточный
-- результат, ничего не роняется одной командой.

-- 1. Таблица этапов.
create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default 'blue' check (color in ('blue', 'amber', 'teal', 'coral', 'neutral')),
  position integer not null,
  -- Этапы с auto_archive=true ведут себя как раньше "Отклонён": отклик
  -- остаётся на доске до конца дня, на следующий день уходит в архив.
  auto_archive boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, position)
);

create index if not exists stages_user_id_idx on public.stages(user_id);

alter table public.stages enable row level security;

create policy "stages_select_own" on public.stages
  for select using (auth.uid() = user_id);

create policy "stages_insert_own" on public.stages
  for insert with check (auth.uid() = user_id);

create policy "stages_update_own" on public.stages
  for update using (auth.uid() = user_id);

create policy "stages_delete_own" on public.stages
  for delete using (auth.uid() = user_id);

-- 2. Дефолтные 4 этапа для каждого пользователя, у которого уже есть
-- отклики (новые пользователи получат их при первом заходе в приложение,
-- см. lib/hooks/useStages.ts).
insert into public.stages (user_id, name, color, position, auto_archive)
select distinct a.user_id, v.name, v.color, v.position, v.auto_archive
from public.applications a
cross join (
  values
    ('Отправлен', 'blue', 0, false),
    ('Интервью', 'amber', 1, false),
    ('Оффер', 'teal', 2, false),
    ('Отклонён', 'coral', 3, true)
) as v(name, color, position, auto_archive)
where not exists (
  select 1 from public.stages s where s.user_id = a.user_id
)
on conflict (user_id, position) do nothing;

-- 3. Новая колонка на applications, бэкфилл по имени старого статуса.
alter table public.applications add column if not exists stage_id uuid references public.stages(id);

update public.applications a
set stage_id = s.id
from public.stages s
where a.stage_id is null
  and s.user_id = a.user_id
  and s.name = case a.status
    when 'applied' then 'Отправлен'
    when 'interview' then 'Интервью'
    when 'offer' then 'Оффер'
    when 'rejected' then 'Отклонён'
  end;

-- Проверка перед тем, как сделать колонку обязательной и удалить старую:
-- если это условие когда-нибудь вернёт строки — значит бэкфилл выше
-- сработал не для всех, останавливаемся и разбираемся, НЕ выполняя
-- команды ниже этой черты.
do $$
declare
  missing_count integer;
begin
  select count(*) into missing_count from public.applications where stage_id is null;
  if missing_count > 0 then
    raise exception 'Бэкфилл stage_id не покрыл % строк(и) — проверьте вручную перед продолжением', missing_count;
  end if;
end $$;

alter table public.applications alter column stage_id set not null;

-- 4. Аналогичный перенос в историю статусов.
alter table public.application_status_history add column if not exists from_stage_id uuid references public.stages(id);
alter table public.application_status_history add column if not exists to_stage_id uuid references public.stages(id);

update public.application_status_history h
set to_stage_id = s.id
from public.stages s
where h.to_stage_id is null
  and s.user_id = h.user_id
  and s.name = case h.to_status
    when 'applied' then 'Отправлен'
    when 'interview' then 'Интервью'
    when 'offer' then 'Оффер'
    when 'rejected' then 'Отклонён'
  end;

update public.application_status_history h
set from_stage_id = s.id
from public.stages s
where h.from_status is not null
  and h.from_stage_id is null
  and s.user_id = h.user_id
  and s.name = case h.from_status
    when 'applied' then 'Отправлен'
    when 'interview' then 'Интервью'
    when 'offer' then 'Оффер'
    when 'rejected' then 'Отклонён'
  end;

do $$
declare
  missing_count integer;
begin
  select count(*) into missing_count from public.application_status_history where to_stage_id is null;
  if missing_count > 0 then
    raise exception 'Бэкфилл to_stage_id не покрыл % строк(и) — проверьте вручную перед продолжением', missing_count;
  end if;
end $$;

alter table public.application_status_history alter column to_stage_id set not null;

-- 5. Удаляем старые колонки и constraint только после успешного бэкфилла выше.
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications drop column if exists status;

alter table public.application_status_history drop constraint if exists application_status_history_to_status_check;
alter table public.application_status_history drop column if exists from_status;
alter table public.application_status_history drop column if exists to_status;

-- 6. Отложенный архив: момент, когда отклик попал на "проигрышный" этап
-- (auto_archive=true) — сам архив выставляется лениво на следующий день,
-- не сразу, см. lib/hooks/useApplications.ts.
alter table public.applications add column if not exists rejected_at timestamptz;
