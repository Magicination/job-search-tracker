-- 0002_rls_policies.sql
-- Row Level Security: каждый пользователь видит и меняет только свои строки.
-- См. /docs/01-data-model.md, раздел "Общие политики RLS".

-- tasks
alter table tasks enable row level security;

create policy "Users can view own tasks" on tasks
  for select using (auth.uid() = user_id);
create policy "Users can insert own tasks" on tasks
  for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on tasks
  for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on tasks
  for delete using (auth.uid() = user_id);

-- schedule_slots
alter table schedule_slots enable row level security;

create policy "Users can view own schedule_slots" on schedule_slots
  for select using (auth.uid() = user_id);
create policy "Users can insert own schedule_slots" on schedule_slots
  for insert with check (auth.uid() = user_id);
create policy "Users can update own schedule_slots" on schedule_slots
  for update using (auth.uid() = user_id);
create policy "Users can delete own schedule_slots" on schedule_slots
  for delete using (auth.uid() = user_id);

-- applications
alter table applications enable row level security;

create policy "Users can view own applications" on applications
  for select using (auth.uid() = user_id);
create policy "Users can insert own applications" on applications
  for insert with check (auth.uid() = user_id);
create policy "Users can update own applications" on applications
  for update using (auth.uid() = user_id);
create policy "Users can delete own applications" on applications
  for delete using (auth.uid() = user_id);

-- study_hours
alter table study_hours enable row level security;

create policy "Users can view own study_hours" on study_hours
  for select using (auth.uid() = user_id);
create policy "Users can insert own study_hours" on study_hours
  for insert with check (auth.uid() = user_id);
create policy "Users can update own study_hours" on study_hours
  for update using (auth.uid() = user_id);
create policy "Users can delete own study_hours" on study_hours
  for delete using (auth.uid() = user_id);

-- daily_notes
alter table daily_notes enable row level security;

create policy "Users can view own daily_notes" on daily_notes
  for select using (auth.uid() = user_id);
create policy "Users can insert own daily_notes" on daily_notes
  for insert with check (auth.uid() = user_id);
create policy "Users can update own daily_notes" on daily_notes
  for update using (auth.uid() = user_id);
create policy "Users can delete own daily_notes" on daily_notes
  for delete using (auth.uid() = user_id);

-- daily_history
alter table daily_history enable row level security;

create policy "Users can view own daily_history" on daily_history
  for select using (auth.uid() = user_id);
create policy "Users can insert own daily_history" on daily_history
  for insert with check (auth.uid() = user_id);
create policy "Users can update own daily_history" on daily_history
  for update using (auth.uid() = user_id);
create policy "Users can delete own daily_history" on daily_history
  for delete using (auth.uid() = user_id);

-- user_settings
alter table user_settings enable row level security;

create policy "Users can view own user_settings" on user_settings
  for select using (auth.uid() = user_id);
create policy "Users can insert own user_settings" on user_settings
  for insert with check (auth.uid() = user_id);
create policy "Users can update own user_settings" on user_settings
  for update using (auth.uid() = user_id);
create policy "Users can delete own user_settings" on user_settings
  for delete using (auth.uid() = user_id);
