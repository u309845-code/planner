-- Выполнить один раз: Supabase -> SQL Editor -> New query -> вставить -> Run
-- Чеклист (подпункты) и правило повтора для регулярных задач.

alter table public.tasks
  add column if not exists checklist jsonb not null default '[]'::jsonb,
  add column if not exists recurrence jsonb;
