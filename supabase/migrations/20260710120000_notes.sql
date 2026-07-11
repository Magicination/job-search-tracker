-- Личный блокнот пользователя — быстрые заметки/ссылки/файлы. Заменяет
-- раздел "Ресурсы и ссылки". is_shared — по желанию пользователя запись
-- становится видна и остальным.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  url text,
  file_path text,
  file_name text,
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_shared_idx on public.notes(is_shared) where is_shared = true;

alter table public.notes enable row level security;

create policy "notes_select_own_or_shared" on public.notes
  for select using (auth.uid() = user_id or is_shared = true);

create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);

create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id);

create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);
