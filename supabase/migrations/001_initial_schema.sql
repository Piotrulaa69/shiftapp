-- ============================================================
-- ShiftApp – Multi-Tenant SaaS Schema
-- Every table is isolated by restaurant_id.
-- RLS (Row Level Security) ensures tenants can NEVER see each
-- other's data even if they share the same Postgres instance.
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
-- 1. RESTAURANTS (tenant root)
-- ─────────────────────────────────────────────
create table public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null default '',
  phone       text not null default '',
  owner_id    uuid,                          -- filled after owner is created
  plan        text not null default 'basic' check (plan in ('basic','premium')),
  logo_color  text not null default '#2196C9',
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 2. PROFILES (extends Supabase auth.users)
--    One profile per auth user. Scoped to a restaurant.
-- ─────────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  first_name      text not null default '',
  last_name       text not null default '',
  role            text not null default 'employee' check (role in ('owner','employee')),
  job_title       text not null default '',
  avatar_color    text not null default '#2196C9',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- back-fill owner_id once profile exists
create or replace function public.sync_owner_id()
returns trigger language plpgsql security definer as $$
begin
  if new.role = 'owner' then
    update public.restaurants
    set owner_id = new.id
    where id = new.restaurant_id and owner_id is null;
  end if;
  return new;
end;
$$;

create trigger trg_sync_owner_id
after insert on public.profiles
for each row execute procedure public.sync_owner_id();

-- ─────────────────────────────────────────────
-- 3. INVITATIONS
-- ─────────────────────────────────────────────
create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  code            text not null unique,
  created_by      uuid not null references public.profiles(id) on delete cascade,
  job_title       text not null default '',
  expires_at      timestamptz not null default (now() + interval '7 days'),
  used            boolean not null default false,
  used_by         uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

create index idx_invitations_code on public.invitations(code);

-- ─────────────────────────────────────────────
-- 4. SHIFTS
-- ─────────────────────────────────────────────
create table public.shifts (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  employee_name   text not null default '',
  job_title       text not null default '',
  start_time      text not null default '',
  end_time        text not null default '',
  day             date not null,
  location        text not null default '',
  status          text not null default 'zaplanowana'
                  check (status in ('zaplanowana','do_potwierdzenia','potwierdzona','urlop')),
  created_at      timestamptz not null default now()
);

create index idx_shifts_restaurant on public.shifts(restaurant_id);
create index idx_shifts_employee   on public.shifts(employee_id);
create index idx_shifts_day        on public.shifts(day);

-- ─────────────────────────────────────────────
-- 5. TASKS
-- ─────────────────────────────────────────────
create table public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  restaurant_id       uuid not null references public.restaurants(id) on delete cascade,
  assigned_to         uuid references public.profiles(id) on delete set null,
  title               text not null,
  description         text not null default '',
  assigned_time       text not null default '',
  completed           boolean not null default false,
  priority            text not null default 'normalny'
                      check (priority in ('wysoki','normalny','niski')),
  status              text not null default 'do_zrobienia'
                      check (status in ('do_zrobienia','w_trakcie','zamkniete')),
  duration_min        integer not null default 0,
  confirmation_type   text check (confirmation_type in ('photo','values','description')),
  created_at          timestamptz not null default now()
);

create index idx_tasks_restaurant on public.tasks(restaurant_id);
create index idx_tasks_assigned   on public.tasks(assigned_to);

-- ─────────────────────────────────────────────
-- 6. TRAININGS
-- ─────────────────────────────────────────────
create table public.trainings (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references public.restaurants(id) on delete cascade,
  title             text not null,
  category          text not null default '',
  duration_min      integer not null default 0,
  progress_percent  integer not null default 0,
  required          boolean not null default false,
  status            text not null default 'nierozpoczete'
                    check (status in ('w_toku','ukonczone','nierozpoczete')),
  created_at        timestamptz not null default now()
);

create index idx_trainings_restaurant on public.trainings(restaurant_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- The key rule: a logged-in user can only see rows where
-- restaurant_id matches their own profile's restaurant_id.
-- ============================================================

alter table public.restaurants  enable row level security;
alter table public.profiles     enable row level security;
alter table public.invitations  enable row level security;
alter table public.shifts       enable row level security;
alter table public.tasks        enable row level security;
alter table public.trainings    enable row level security;

-- Helper function: returns the restaurant_id of the current user
create or replace function public.my_restaurant_id()
returns uuid language sql stable security definer as $$
  select restaurant_id from public.profiles where id = auth.uid()
$$;

-- Helper function: returns role of current user
create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ── restaurants ──
create policy "tenant: read own restaurant"
  on public.restaurants for select
  using (id = public.my_restaurant_id());

create policy "tenant: owner can update restaurant"
  on public.restaurants for update
  using (id = public.my_restaurant_id() and public.my_role() = 'owner');

-- ── profiles ──
create policy "tenant: read own restaurant profiles"
  on public.profiles for select
  using (restaurant_id = public.my_restaurant_id());

create policy "tenant: owner can insert profiles (via invitation)"
  on public.profiles for insert
  with check (restaurant_id = public.my_restaurant_id());

create policy "user: update own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "owner: delete employee profile"
  on public.profiles for delete
  using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner' and id <> auth.uid());

-- ── invitations ──
create policy "tenant: read own restaurant invitations"
  on public.invitations for select
  using (restaurant_id = public.my_restaurant_id());

create policy "owner: manage invitations"
  on public.invitations for all
  using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- Allow anyone (even unauthenticated) to look up an invitation by code
-- so the join flow works BEFORE the user is logged in.
create policy "public: find invitation by code"
  on public.invitations for select
  using (true);

-- ── shifts ──
create policy "tenant: read own shifts"
  on public.shifts for select
  using (restaurant_id = public.my_restaurant_id());

create policy "owner: manage shifts"
  on public.shifts for all
  using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

create policy "employee: confirm own shift"
  on public.shifts for update
  using (employee_id = auth.uid());

-- ── tasks ──
create policy "tenant: read own tasks"
  on public.tasks for select
  using (restaurant_id = public.my_restaurant_id());

create policy "owner: manage tasks"
  on public.tasks for all
  using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

create policy "employee: update own task"
  on public.tasks for update
  using (assigned_to = auth.uid());

-- ── trainings ──
create policy "tenant: read own trainings"
  on public.trainings for select
  using (restaurant_id = public.my_restaurant_id());

create policy "owner: manage trainings"
  on public.trainings for all
  using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- ============================================================
-- SPECIAL: allow profile insert on signup (before RLS resolves)
-- New user creates their own profile row right after auth signup
-- ============================================================
create policy "user: insert own profile on signup"
  on public.profiles for insert
  with check (id = auth.uid());

-- ============================================================
-- UTILITY: accept_invitation RPC
-- Called during join flow. Marks invitation as used and
-- returns restaurant info so client can build profile.
-- Runs as SECURITY DEFINER so it bypasses RLS for this op.
-- ============================================================
create or replace function public.accept_invitation(p_code text)
returns json language plpgsql security definer as $$
declare
  v_inv   public.invitations%rowtype;
  v_rest  public.restaurants%rowtype;
begin
  select * into v_inv
  from public.invitations
  where upper(code) = upper(p_code)
    and used = false
    and expires_at > now();

  if not found then
    return json_build_object('error', 'Kod nieważny lub wygasł');
  end if;

  select * into v_rest from public.restaurants where id = v_inv.restaurant_id;

  return json_build_object(
    'invitation_id',  v_inv.id,
    'restaurant_id',  v_inv.restaurant_id,
    'restaurant_name', v_rest.name,
    'job_title',      v_inv.job_title
  );
end;
$$;

-- ============================================================
-- UTILITY: mark_invitation_used RPC
-- Called after profile is created to mark the code as used.
-- ============================================================
create or replace function public.mark_invitation_used(p_code text, p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.invitations
  set used = true, used_by = p_user_id
  where upper(code) = upper(p_code);
end;
$$;
