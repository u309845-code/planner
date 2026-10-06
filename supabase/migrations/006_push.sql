-- Выполнить один раз: Supabase -> SQL Editor -> New query -> вставить -> Run
-- Пуш-уведомления: подписки устройств, настройки напоминаний, журнал отправленных.

-- Устройства, на которые можно присылать уведомления
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Настройки пользователя: за сколько минут до дедлайна напоминать (по умолчанию за час)
create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  remind_before_min integer[] not null default '{60}',
  tz text,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Журнал отправленных напоминаний (чтобы не слать дважды).
-- Политик нет: пишет и читает только облачная функция с серверным ключом.
create table if not exists public.reminders_sent (
  task_id uuid not null references public.tasks (id) on delete cascade,
  due_at timestamptz not null,
  offset_min integer not null,
  sent_at timestamptz not null default now(),
  primary key (task_id, due_at, offset_min)
);

alter table public.reminders_sent enable row level security;
