-- Выполнить один раз: Supabase -> SQL Editor -> New query -> вставить -> Run
-- Добавляет теги, приоритет, план/факт времени, таймер, тип записи (задача/заметка)

alter table public.tasks
  add column if not exists kind text not null default 'task' check (kind in ('task', 'note')),
  add column if not exists tags text[] not null default '{}',
  add column if not exists priority smallint not null default 0 check (priority between 0 and 2),
  add column if not exists planned_min integer check (planned_min >= 0),
  add column if not exists spent_sec integer not null default 0,
  add column if not exists timer_started_at timestamptz,
  add column if not exists done_at timestamptz;
