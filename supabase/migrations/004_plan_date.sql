-- Выполнить один раз: Supabase -> SQL Editor -> New query -> вставить -> Run
-- День, на который задача поставлена в плане (отдельно от дедлайна). Нужен для вида «Неделя».

alter table public.tasks
  add column if not exists plan_date date;

create index if not exists tasks_user_plan_date_idx on public.tasks (user_id, plan_date);
