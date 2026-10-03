-- Выполнить один раз: Supabase -> SQL Editor -> New query -> вставить -> Run
-- Журнал времени: каждый запуск таймера записывается отдельной строкой,
-- поэтому можно считать время по дням (задача может тянуться несколько дней).
-- Название и теги копируются в строку, чтобы статистика не пропадала при удалении задачи.

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  task_title text not null default '',
  tags text[] not null default '{}',
  started_at timestamptz not null,
  ended_at timestamptz not null,
  seconds integer not null check (seconds >= 0)
);

create index if not exists time_entries_user_started_idx on public.time_entries (user_id, started_at);
create index if not exists time_entries_task_idx on public.time_entries (task_id);

alter table public.time_entries enable row level security;

create policy "time_entries_select_own" on public.time_entries
  for select using (auth.uid() = user_id);

create policy "time_entries_insert_own" on public.time_entries
  for insert with check (auth.uid() = user_id);

create policy "time_entries_update_own" on public.time_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "time_entries_delete_own" on public.time_entries
  for delete using (auth.uid() = user_id);
