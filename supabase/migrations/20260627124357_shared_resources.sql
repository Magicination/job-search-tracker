-- Расшаренные ресурсы — в отличие от остальных таблиц, эта ВИДНА ВСЕМ
-- авторизованным пользователям, не только автору записи. Решение принято
-- явно (без модерации, открытый список) — см. обсуждение фичи. Статический
-- список из 05-resources-content.md продолжает жить в коде (RESOURCE_SECTIONS)
-- как стартовый набор; эта таблица — для того, что добавляют сами пользователи
-- сверху.

create table shared_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, -- автор записи
  title text not null,
  url text not null,
  note text not null default '',
  category text not null default 'other' check (
    category in ('job_boards', 'internships', 'sql_analytics', 'english', 'interview_prep', 'other')
  ),
  created_at timestamptz not null default now()
);

create index shared_resources_created_idx on shared_resources(created_at desc);

alter table shared_resources enable row level security;

-- SELECT открыт для всех авторизованных пользователей — это и есть
-- "расшаренный список", в отличие от остальных таблиц проекта.
create policy "Any authenticated user can view shared_resources" on shared_resources
  for select to authenticated using (true);

-- INSERT/UPDATE/DELETE — только свои записи, как и везде.
create policy "Users can insert own shared_resources" on shared_resources
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own shared_resources" on shared_resources
  for update to authenticated using ((select auth.uid()) = user_id);
create policy "Users can delete own shared_resources" on shared_resources
  for delete to authenticated using ((select auth.uid()) = user_id);
