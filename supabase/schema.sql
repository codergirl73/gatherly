-- Gatherly: saved events, one row per planned event, private to the signed-in user.
-- Run once in the Supabase SQL editor (Project -> SQL Editor -> New query).

create table if not exists public.events (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id         text    not null,
  created_at bigint  not null,
  status     text    not null check (status in ('running', 'done', 'error')),
  input      jsonb   not null,
  plan       jsonb,
  baseline   jsonb,
  overlap    jsonb,
  evidence   jsonb,
  warnings   jsonb   not null default '[]'::jsonb,
  error      jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists events_user_created_idx on public.events (user_id, created_at desc);

alter table public.events enable row level security;

drop policy if exists "events_select_own" on public.events;
drop policy if exists "events_insert_own" on public.events;
drop policy if exists "events_update_own" on public.events;
drop policy if exists "events_delete_own" on public.events;

create policy "events_select_own" on public.events for select to authenticated using (auth.uid() = user_id);
create policy "events_insert_own" on public.events for insert to authenticated with check (auth.uid() = user_id);
create policy "events_update_own" on public.events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "events_delete_own" on public.events for delete to authenticated using (auth.uid() = user_id);
