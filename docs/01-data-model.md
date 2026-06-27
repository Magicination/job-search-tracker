# Схема данных (Supabase / Postgres)

Все таблицы имеют `user_id uuid references auth.users(id)` и Row Level Security (RLS), ограничивающую доступ только владельцу строки. Это база на одного пользователя, но RLS закладываем сразу — это стандартная практика Supabase и ничего не усложняет.

## Общие политики RLS

Для каждой таблицы ниже включить RLS и добавить четыре политики (select/insert/update/delete), пример для таблицы `tasks`:

```sql
alter table tasks enable row level security;

create policy "Users can view own tasks" on tasks
  for select using (auth.uid() = user_id);

create policy "Users can insert own tasks" on tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own tasks" on tasks
  for update using (auth.uid() = user_id);

create policy "Users can delete own tasks" on tasks
  for delete using (auth.uid() = user_id);
```

Эти же 4 политики продублировать для всех таблиц ниже (`tasks`, `schedule_slots`, `applications`, `study_hours`, `daily_notes`, `daily_history`).

## Таблица `tasks` — ежедневные задачи / чек-лист

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,                  -- дата, к которой относится задача
  text text not null,
  category text not null check (category in ('job', 'study', 'eng')),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  done_at timestamptz                 -- момент отметки выполненной, нужен для streak-расчёта
);

create index tasks_user_day_idx on tasks(user_id, day);
```

Категории:
- `job` — поиск работы (отклики, мониторинг вакансий)
- `study` — SQL / продуктовая аналитика
- `eng` — английский язык

## Таблица `schedule_slots` — недельный шаблон графика

Шаблон недели — это не привязка к конкретным датам, а повторяющийся шаблон («каждый понедельник утром — поиск работы»). Храним как 21 строку (7 дней × 3 блока) на пользователя, перезаписываемых при редактировании.

```sql
create table schedule_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=понедельник ... 6=воскресенье
  time_block text not null check (time_block in ('morning', 'afternoon', 'evening')),
  slot_type text not null default 'empty' check (slot_type in ('empty', 'job', 'sql', 'eng', 'case', 'rest')),
  unique(user_id, day_of_week, time_block)
);
```

`slot_type` значения и их смысл:
- `empty` — не назначено
- `job` — поиск работы / отклики
- `sql` — SQL / аналитика
- `eng` — английский
- `case` — подготовка к кейсам/собеседованиям
- `rest` — отдых/буфер

## Таблица `applications` — трекер откликов на вакансии

```sql
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null default '',
  role text not null default '',
  source text not null default '',         -- hh.ru, LinkedIn, Wellfound и т.д.
  applied_date date,
  status text not null default 'applied' check (status in ('applied', 'screen', 'interview', 'offer', 'rejected')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_idx on applications(user_id);
```

Статусы и их порядок прогресса:
1. `applied` — отклик отправлен
2. `screen` — скрининг с HR
3. `interview` — собеседование (с нанимающим менеджером/командой)
4. `offer` — получен оффер
5. `rejected` — отказ (может произойти на любом этапе)

## Таблица `study_hours` — накопленные часы обучения

```sql
create table study_hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track text not null check (track in ('eng', 'sql')),
  hours numeric not null default 0,
  goal_hours numeric not null default 0,   -- целевое число часов (200 для eng, 80 для sql по умолчанию)
  updated_at timestamptz not null default now(),
  unique(user_id, track)
);
```

Эта таблица хранит просто текущий накопленный итог (а не лог каждого изменения) — UI инкрементирует/декрементирует `hours` напрямую. Если в будущем понадобится история по дням — можно завести отдельную `study_hours_log`, но для MVP это избыточно.

## Таблица `daily_notes` — рефлексия дня

```sql
create table daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  unique(user_id, day)
);
```

## Таблица `daily_history` — для расчёта streak

Отдельная агрегирующая таблица, обновляемая при каждой отметке задачи выполненной (см. `04-features-logic.md` за деталями расчёта streak).

```sql
create table daily_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  tasks_completed integer not null default 0,
  unique(user_id, day)
);
```

При отметке любой задачи как выполненной — делать upsert в эту таблицу: `tasks_completed = tasks_completed + 1` для текущего дня. Это вынесено в отдельную таблицу, а не вычисляется каждый раз через `count(*) from tasks where done=true group by day`, чтобы расчёт streak был быстрым и простым запросом.

## Сиды (начальные данные при первом запуске пользователя)

После первой регистрации пользователя (на стороне клиента, при первом входе в приложение, либо через Supabase database function/trigger на `auth.users` insert) создать:

1. **`schedule_slots`** — 21 строка по шаблону (день недели × time_block), значения по умолчанию:

| День | Утро | День | Вечер |
|---|---|---|---|
| Пн | job | sql | eng |
| Вт | job | sql | rest |
| Ср | job | eng | case |
| Чт | job | sql | eng |
| Пт | job | case | rest |
| Сб | eng | rest | rest |
| Вс | rest | rest | rest |

2. **`study_hours`** — две строки: `track='eng', hours=0, goal_hours=200` и `track='sql', hours=0, goal_hours=80`.

3. **`tasks`** на текущий день (day = today), три дефолтные задачи:
   - «Откликнуться на 5 вакансий PM (удалённо)», category=`job`
   - «30 минут SQL-тренажёра», category=`study`
   - «20 минут английского (Speaking/listening)», category=`eng`

Рекомендация для Cursor: реализовать это как функцию `seedNewUser(userId)` на клиенте, вызываемую один раз после успешной регистрации (проверка — например, по отсутствию строк в `schedule_slots` для этого `user_id`), либо как Postgres-триггер на `auth.users` (более надёжно, не зависит от клиента). Предпочтительно — триггер на стороне Supabase, чтобы сиды создавались даже если клиент случайно не выполнит код после регистрации.
