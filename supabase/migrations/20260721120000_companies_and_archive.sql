-- Компании как отдельная сущность: название + ссылка на сайт компании
-- (не путать с vacancy_url — это ссылка на конкретную вакансию) + личный
-- рейтинг 1-5, который ставит сам пользователь (не автосбор с внешних
-- источников — hh.ru не даёт публичного API под это, а парсинг чужой
-- вёрстки уже принёс достаточно проблем с букмарклетом).
--
-- archived на applications — отклики теперь не удаляются физически:
-- "удаление" помечает archived=true, восстановимо. Автоматически
-- архивируются отклики при смене статуса на 'rejected'.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text,
  rating smallint check (rating is null or (rating between 1 and 5)),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists companies_user_id_idx on public.companies(user_id);

alter table public.companies enable row level security;

create policy "companies_select_own" on public.companies
  for select using (auth.uid() = user_id);

create policy "companies_insert_own" on public.companies
  for insert with check (auth.uid() = user_id);

create policy "companies_update_own" on public.companies
  for update using (auth.uid() = user_id);

create policy "companies_delete_own" on public.companies
  for delete using (auth.uid() = user_id);

alter table public.applications add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.applications add column if not exists archived boolean not null default false;

create index if not exists applications_company_id_idx on public.applications(company_id);
create index if not exists applications_archived_idx on public.applications(archived);

-- Бэкфилл: по каждому пользователю и уникальному (непустому) названию
-- компании создаём запись в companies и проставляем company_id на всех
-- существующих откликах с этим названием.
insert into public.companies (user_id, name)
select distinct user_id, company
from public.applications
where company is not null and trim(company) <> ''
on conflict (user_id, name) do nothing;

update public.applications a
set company_id = c.id
from public.companies c
where c.user_id = a.user_id
  and c.name = a.company
  and a.company_id is null;

-- Существующие отклонённые отклики сразу помечаем архивными — до этой
-- миграции архива не было, они просто копились на доске.
update public.applications set archived = true where status = 'rejected' and archived = false;
