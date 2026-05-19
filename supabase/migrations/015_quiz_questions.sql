-- ============================================================
-- 015 – Quiz questions table (per training, created by admin)
-- ============================================================

create table if not exists public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  training_id    uuid not null references public.trainings(id) on delete cascade,
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  question       text not null,
  options        jsonb not null default '[]',   -- string[]
  correct_index  integer not null default 0,
  explanation    text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.quiz_questions enable row level security;

create policy "tenant: read quiz questions"
  on public.quiz_questions for select
  using (restaurant_id = public.my_restaurant_id());

create policy "manager: insert quiz questions"
  on public.quiz_questions for insert
  with check (
    restaurant_id = public.my_restaurant_id() and
    (select role from public.profiles where id = auth.uid()) in ('owner', 'manager')
  );

create policy "manager: update quiz questions"
  on public.quiz_questions for update
  using (
    restaurant_id = public.my_restaurant_id() and
    (select role from public.profiles where id = auth.uid()) in ('owner', 'manager')
  );

create policy "manager: delete quiz questions"
  on public.quiz_questions for delete
  using (
    restaurant_id = public.my_restaurant_id() and
    (select role from public.profiles where id = auth.uid()) in ('owner', 'manager')
  );

create index if not exists quiz_questions_training_id_idx on public.quiz_questions(training_id);
