-- Расширение applications новыми полями + разделение версий резюме и
-- сопроводительного письма на две отдельные сущности (раньше было одно
-- "resume_versions" на пару) + поддержка прикладываемых файлов через
-- Supabase Storage. Полностью аддитивно — ничего не удаляет.

-- ============================================================
-- Новые поля в applications
-- ============================================================

alter table applications add column salary text not null default '';
alter table applications add column experience_required text not null default '';

-- cover_letter_version_id — отдельная ссылка на версию сопроводительного,
-- независимая от resume_version_id (раньше одна версия покрывала и резюме,
-- и сопроводительное вместе — теперь это две независимые сущности, см. ниже).
alter table applications add column cover_letter_version_id uuid;

-- ============================================================
-- cover_letter_versions — версии сопроводительных писем, отдельно от резюме
-- ============================================================
create table cover_letter_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text not null default '',
  file_path text, -- путь в Supabase Storage bucket 'application-documents'
  file_name text not null default '', -- оригинальное имя файла, для отображения
  created_at timestamptz not null default now()
);

alter table applications
  add constraint applications_cover_letter_version_id_fkey
  foreign key (cover_letter_version_id) references cover_letter_versions(id) on delete set null;

alter table cover_letter_versions enable row level security;

create policy "Users can view own cover_letter_versions" on cover_letter_versions
  for select using (auth.uid() = user_id);
create policy "Users can insert own cover_letter_versions" on cover_letter_versions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own cover_letter_versions" on cover_letter_versions
  for update using (auth.uid() = user_id);
create policy "Users can delete own cover_letter_versions" on cover_letter_versions
  for delete using (auth.uid() = user_id);

-- ============================================================
-- resume_versions — добавляем поддержку файла (path в Storage)
-- ============================================================
alter table resume_versions add column file_path text;
alter table resume_versions add column file_name text not null default '';

-- Старое поле file_url (просто текстовая ссылка, без файла в Storage)
-- остаётся для совместимости с уже введёнными вручную ссылками.

-- ============================================================
-- Storage bucket для файлов резюме/сопроводительных
-- ============================================================
insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

-- RLS-политики на сам bucket: пользователь может работать только с файлами
-- в "своей" подпапке — путь файла должен начинаться с {user_id}/...
-- `to authenticated` ограничивает политику только залогиненными (анонимам
-- сразу отказ, без вычисления условия); `(select auth.uid())` — обёртка,
-- которую рекомендует Supabase для производительности (вычисляется один раз,
-- не на каждую строку).
create policy "Users can view own documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'application-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload own documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'application-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete own documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'application-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
