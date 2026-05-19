-- ============================================================
-- 014 – Real notifications table
-- Replaces the hardcoded mock in NotificationsContext
-- ============================================================

create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  type           text not null check (type in ('shift','task','leave','swap','absence','system')),
  title          text not null,
  body           text not null,
  reference_id   uuid,
  read           boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "user: read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "tenant: insert notifications"
  on public.notifications for insert
  with check (restaurant_id = public.my_restaurant_id());

create policy "user: update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "user: delete own notifications"
  on public.notifications for delete
  using (user_id = auth.uid());

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
