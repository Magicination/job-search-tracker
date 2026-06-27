-- Аналитика откликов: история переходов статуса, точное время отклика,
-- версии резюме/сопроводительного. Полностью аддитивно — ничего не удаляет
-- и не переименовывает в существующих таблицах, безопасно для данных,
-- накопленных до этой миграции.

-- ============================================================
-- resume_versions — переиспользуемые версии пакета "резюме + сопроводительное"
-- ============================================================
create table resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                  -- например "v2 — упор на SQL/аналитику"
  notes text not null default '',
  file_url text,                       -- необязательная ссылка на файл (PDF/docx), можно оставить пустым
  created_at timestamptz not null default now()
);

alter table resume_versions enable row level security;

create policy "Users can view own resume_versions" on resume_versions
  for select using (auth.uid() = user_id);
create policy "Users can insert own resume_versions" on resume_versions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own resume_versions" on resume_versions
  for update using (auth.uid() = user_id);
create policy "Users can delete own resume_versions" on resume_versions
  for delete using (auth.uid() = user_id);

-- ============================================================
-- application_status_history — журнал каждого изменения статуса отклика
-- (а не только текущее значение) — нужен для расчёта времени до ответа,
-- конверсии по дням недели и т.д.
-- ============================================================
create table application_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  from_status text,                    -- null для самой первой записи (момент создания отклика)
  to_status text not null check (to_status in ('applied', 'screen', 'interview', 'offer', 'rejected')),
  changed_at timestamptz not null default now()
);

create index application_status_history_application_idx on application_status_history(application_id);
create index application_status_history_user_idx on application_status_history(user_id);

alter table application_status_history enable row level security;

create policy "Users can view own application_status_history" on application_status_history
  for select using (auth.uid() = user_id);
create policy "Users can insert own application_status_history" on application_status_history
  for insert with check (auth.uid() = user_id);
create policy "Users can update own application_status_history" on application_status_history
  for update using (auth.uid() = user_id);
create policy "Users can delete own application_status_history" on application_status_history
  for delete using (auth.uid() = user_id);

-- ============================================================
-- applications — добавляем точное время отклика и ссылку на версию резюме
-- ============================================================

-- applied_date (date) остаётся как есть для совместимости и быстрых
-- date-фильтров. applied_at (timestamptz) — точное время, нужно для анализа
-- "утро/вечер" и точного дня недели без потери информации о времени суток.
alter table applications add column applied_at timestamptz;

alter table applications add column resume_version_id uuid references resume_versions(id) on delete set null;

-- ============================================================
-- Бэкафилл: для существующих откликов создаём начальную запись в истории
-- статусов на основе текущего статуса, чтобы новые отчёты не "ломались"
-- из-за отсутствия истории у старых данных. from_status = null означает
-- "это состояние на момент введения истории", а не реальный первый статус.
-- ============================================================
insert into application_status_history (user_id, application_id, from_status, to_status, changed_at)
select user_id, id, null, status, created_at
from applications;
