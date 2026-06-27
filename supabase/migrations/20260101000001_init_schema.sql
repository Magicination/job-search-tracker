-- 0001_init_schema.sql
-- Схема Postgres для job-search-tracker.
-- См. /docs/01-data-model.md за полным описанием.

create extension if not exists "pgcrypto";

-- ============================================================
-- tasks — ежедневные задачи / чек-лист
-- ============================================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  text text not null,
  category text not null check (category in ('job', 'study', 'eng')),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index tasks_user_day_idx on tasks(user_id, day);

-- ============================================================
-- schedule_slots — недельный шаблон графика (21 строка на пользователя)
-- ============================================================
create table schedule_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  time_block text not null check (time_block in ('morning', 'afternoon', 'evening')),
  slot_type text not null default 'empty' check (slot_type in ('empty', 'job', 'sql', 'eng', 'case', 'rest')),
  unique(user_id, day_of_week, time_block)
);

-- ============================================================
-- applications — трекер откликов на вакансии
-- ============================================================
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null default '',
  role text not null default '',
  source text not null default '',
  applied_date date,
  status text not null default 'applied' check (status in ('applied', 'screen', 'interview', 'offer', 'rejected')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_idx on applications(user_id);

-- ============================================================
-- study_hours — накопленные часы обучения
-- ============================================================
create table study_hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track text not null check (track in ('eng', 'sql')),
  hours numeric not null default 0 check (hours >= 0),
  goal_hours numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, track)
);

-- ============================================================
-- daily_notes — рефлексия дня
-- ============================================================
create table daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  unique(user_id, day)
);

-- ============================================================
-- daily_history — агрегат для расчёта streak
-- ============================================================
create table daily_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  tasks_completed integer not null default 0 check (tasks_completed >= 0),
  unique(user_id, day)
);

-- ============================================================
-- user_settings — некритичные для синхронизации пользовательские настройки
-- (см. 02-screens-web.md, /schedule: "часов в неделю" — ориентир, не обязателен к
-- строгой синхронизации, но храним в Supabase, чтобы не терять при смене устройства)
-- ============================================================
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hours_per_week numeric not null default 40,
  updated_at timestamptz not null default now()
);
