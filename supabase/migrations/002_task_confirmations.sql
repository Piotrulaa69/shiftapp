-- ============================================================
-- Task Confirmations table
-- Stores proof data for task completion (photo, values, description)
-- ============================================================

create table public.task_confirmations (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  task_id         uuid not null references public.tasks(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  confirmation_type text not null check (confirmation_type in ('photo','values','description')),

  -- photo confirmation
  photo_url       text,
  photo_notes     text,

  -- values confirmation (HACCP)
  values_data     jsonb,  -- array of {name, value, unit, min, max, status}

  -- description confirmation
  description     text,
  checklist_data  jsonb,  -- array of {label, checked}

  created_at      timestamptz not null default now()
);

create index idx_task_confirmations_task on public.task_confirmations(task_id);
create index idx_task_confirmations_restaurant on public.task_confirmations(restaurant_id);

-- RLS
alter table public.task_confirmations enable row level security;

create policy "Users can view confirmations in their restaurant"
  on public.task_confirmations for select
  using (restaurant_id in (
    select restaurant_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert confirmations in their restaurant"
  on public.task_confirmations for insert
  with check (restaurant_id in (
    select restaurant_id from public.profiles where id = auth.uid()
  ));
