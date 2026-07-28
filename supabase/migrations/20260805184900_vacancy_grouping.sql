-- ============================================================
-- Объединение откликов на одну вакансию разными резюме
-- Добавляем vacancy_group_key для группировки по вакансии
-- ============================================================

-- Шаг 1: Создаём таблицу vacancy_links (связь компании + роли)
create table if not exists public.vacancy_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vacancy_url text not null,
  company_id uuid references public.companies(id) on delete set null, -- опционально
  role text not null default '',
  source text not null default '',
  first_applied_at timestamptz default now(),
  unique(user_id, vacancy_url),
  created_at timestamptz not null default now()
);

create index if not exists vacancy_links_user_idx on public.vacancy_links(user_id);
create index if not exists vacancy_links_url_idx on public.vacancy_links(vacancy_url);

alter table public.vacancy_links enable row level security;

create policy "vacancy_links_select_own" on public.vacancy_links
  for select using (auth.uid() = user_id);

create policy "vacancy_links_insert_own" on public.vacancy_links
  for insert with check (auth.uid() = user_id);

create policy "vacancy_links_update_own" on public.vacancy_links
  for update using (auth.uid() = user_id);

create policy "vacancy_links_delete_own" on public.vacancy_links
  for delete using (auth.uid() = user_id);

-- Шаг 2: Бэкфилл — создаём vacancy_links для существующих откликов
-- Используем агрегацию по vacancy_url и company_id
insert into public.vacancy_links (user_id, vacancy_url, role, source)
select distinct a.user_id, a.vacancy_url, a.role, a.source
from public.applications a
where a.vacancy_url is not null and trim(a.vacancy_url) <> ''
on conflict (user_id, vacancy_url) do nothing;

-- Шаг 3: Перенаправляем vacancy_url из applications на vacancy_link_id
alter table public.applications add column if not exists vacancy_link_id uuid references public.vacancy_links(id) on delete set null;

-- Миграция существующих данных (если vacancy_url ещё есть в applications)
update public.applications a
set vacancy_link_id = vl.id
from public.vacancy_links vl
where a.vacancy_link_id is null
  and a.user_id = vl.user_id
  and a.vacancy_url = vl.vacancy_url;

-- Шаг 4: Удаляем старое поле vacancy_url из applications (теперь ссылка в vacancy_links)
alter table public.applications drop column if exists vacancy_url;

-- ============================================================
-- Исправление удаления стадий без откликов
-- ============================================================

drop policy if exists "stages_delete_own" on public.stages;
create policy "stages_delete_own" on public.stages
  for delete using (
    auth.uid() = user_id 
    and (
      -- Если этапов вообще нет, или только на архивированных откликах
      not exists (
        select 1 from applications a where a.stage_id = stages.id and a.archived = false
      )
    )
  );

-- ============================================================
-- Поле vacancy_description остаётся для истории/архива
-- ============================================================
