-- ============================================================
-- 007 – Full schema extension for spec compliance
-- Adds: manager role, clock_ins, availability, leave system,
--       shift_swaps, absences, documents, chat, points, pay,
--       locations, notification prefs
-- ============================================================

-- ── 0. Extend profiles role CHECK to include 'manager' ──────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner','manager','employee'));

-- Add phone + photo_url to profiles
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists photo_url text;
alter table public.profiles add column if not exists onboarding_done boolean not null default false;

-- ── 1. LOCATIONS ────────────────────────────────────────────
create table if not exists public.locations (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text not null,
  address         text not null default '',
  gps_lat         double precision,
  gps_lng         double precision,
  gps_radius_m    integer not null default 100,
  manager_id      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_locations_restaurant on public.locations(restaurant_id);

-- ── 2. CLOCK-INS ────────────────────────────────────────────
create table if not exists public.clock_ins (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  shift_id        uuid not null references public.shifts(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  clock_in_at     timestamptz,
  clock_out_at    timestamptz,
  method          text not null default 'manual' check (method in ('pin','qr','gps','manual')),
  gps_lat         double precision,
  gps_lng         double precision,
  late_minutes    integer not null default 0,
  overtime_min    integer not null default 0,
  clock_out_note  text,
  status          text not null default 'pending' check (status in ('pending','active','completed','auto_closed')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_clock_ins_shift on public.clock_ins(shift_id);
create index if not exists idx_clock_ins_employee on public.clock_ins(employee_id);

-- ── 3. AVAILABILITY ─────────────────────────────────────────
create table if not exists public.availability (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  day             date not null,
  status          text not null default 'available' check (status in ('available','unavailable','partial')),
  slot1_start     text, -- e.g. '08:00'
  slot1_end       text,
  slot2_start     text,
  slot2_end       text,
  created_at      timestamptz not null default now(),
  unique (employee_id, day)
);
create index if not exists idx_availability_emp on public.availability(employee_id, day);

-- ── 4. LEAVE TYPES ──────────────────────────────────────────
create table if not exists public.leave_types (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text not null,
  days_per_year   integer not null default 26,
  requires_attachment boolean not null default false,
  requires_comment    boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_leave_types_rest on public.leave_types(restaurant_id);

-- ── 5. LEAVE REQUESTS ───────────────────────────────────────
create table if not exists public.leave_requests (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  leave_type_id   uuid not null references public.leave_types(id) on delete cascade,
  date_from       date not null,
  date_to         date not null,
  days_count      integer not null default 1,
  status          text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  comment         text,
  attachment_url  text,
  reviewed_by     uuid references public.profiles(id),
  review_comment  text,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_leave_req_emp on public.leave_requests(employee_id);

-- ── 6. ABSENCES ─────────────────────────────────────────────
create table if not exists public.absences (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  shift_id        uuid not null references public.shifts(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  absence_type    text not null check (absence_type in ('l4','child_care','force_majeure','other')),
  description     text,
  attachment_url  text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

-- ── 7. SHIFT SWAPS ──────────────────────────────────────────
create table if not exists public.shift_swaps (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  requester_id    uuid not null references public.profiles(id) on delete cascade,
  responder_id    uuid not null references public.profiles(id) on delete cascade,
  requester_shift uuid not null references public.shifts(id) on delete cascade,
  responder_shift uuid references public.shifts(id) on delete set null, -- null = "give away"
  swap_type       text not null default 'swap' check (swap_type in ('swap','give')),
  status          text not null default 'pending_responder'
                  check (status in ('pending_responder','pending_manager','approved','rejected_responder','rejected_manager')),
  manager_id      uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

-- ── 8. DOCUMENTS ────────────────────────────────────────────
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  doc_type        text not null default 'other' check (doc_type in ('contract','certificate','attestation','other')),
  file_url        text,
  expires_at      date,
  status          text not null default 'active' check (status in ('active','expiring','expired')),
  uploaded_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);
create index if not exists idx_documents_emp on public.documents(employee_id);

-- ── 9. CONVERSATIONS + MESSAGES (chat 1:1) ──────────────────
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  participant_a   uuid not null references public.profiles(id) on delete cascade,
  participant_b   uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (participant_a, participant_b)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null default '',
  image_url       text,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at);

-- ── 10. POINTS LEDGER ───────────────────────────────────────
create table if not exists public.points_ledger (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  points          integer not null default 0,
  event_type      text not null, -- 'clock_in_on_time','task_completed','training_completed','quiz_score'
  reference_id    uuid, -- task_id / training_id / shift_id
  description     text,
  period_start    date,
  created_at      timestamptz not null default now()
);
create index if not exists idx_points_emp on public.points_ledger(employee_id, created_at);

-- ── 11. POINT CONFIG (per restaurant) ───────────────────────
create table if not exists public.point_config (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid unique not null references public.restaurants(id) on delete cascade,
  clock_in_on_time  integer not null default 10,
  task_completed    integer not null default 20,
  training_completed integer not null default 30,
  quiz_score_multiplier numeric(3,2) not null default 0.5, -- points = score% * multiplier
  description_for_employees text,
  created_at      timestamptz not null default now()
);

-- ── 12. PAY PERIODS ─────────────────────────────────────────
create table if not exists public.pay_periods (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  period_type     text not null default 'monthly' check (period_type in ('weekly','biweekly','monthly','custom')),
  date_from       date not null,
  date_to         date not null,
  status          text not null default 'open' check (status in ('open','closed')),
  created_at      timestamptz not null default now()
);

-- ── 13. PAY RATES ───────────────────────────────────────────
create table if not exists public.pay_rates (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  job_title       text not null,
  hourly_rate     numeric(10,2) not null default 0,
  overtime_multiplier numeric(3,2) not null default 1.5,
  overtime_daily_threshold integer not null default 8,  -- hours
  overtime_weekly_threshold integer not null default 40,
  created_at      timestamptz not null default now()
);

-- ── 14. NOTIFICATION PREFERENCES ────────────────────────────
create table if not exists public.notification_preferences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique not null references public.profiles(id) on delete cascade,
  schedule_new    text not null default 'push' check (schedule_new in ('push','email','both','off')),
  schedule_change text not null default 'push',
  schedule_reminder text not null default 'push',
  leave_decision  text not null default 'push',
  task_assigned   text not null default 'push',
  task_decision   text not null default 'push',
  training_new    text not null default 'push',
  points_earned   text not null default 'off',
  chat_message    text not null default 'push',
  document_expiry text not null default 'both',
  swap_update     text not null default 'push',
  created_at      timestamptz not null default now()
);

-- ── 15. Add hours_limit columns to profiles ─────────────────
alter table public.profiles add column if not exists max_hours_weekly integer;
alter table public.profiles add column if not exists max_hours_monthly integer;
alter table public.profiles add column if not exists employment_type text not null default 'full_time'
  check (employment_type in ('full_time','part_time','contract'));

-- ── 16. Restaurant config extensions ────────────────────────
alter table public.restaurants add column if not exists clock_in_method text not null default 'manual'
  check (clock_in_method in ('pin','qr','gps','manual'));
alter table public.restaurants add column if not exists clock_in_window_min integer not null default 15;
alter table public.restaurants add column if not exists late_threshold_min integer not null default 5;
alter table public.restaurants add column if not exists pay_period_type text not null default 'monthly'
  check (pay_period_type in ('weekly','biweekly','monthly','custom'));

-- ── 17. Add QR/PIN fields to shifts ─────────────────────────
alter table public.shifts add column if not exists pin_code text;
alter table public.shifts add column if not exists qr_code text;

-- ── 18. Extend tasks with points + approval flow ────────────
alter table public.tasks add column if not exists points integer not null default 0;
alter table public.tasks add column if not exists is_cyclic boolean not null default false;
alter table public.tasks add column if not exists cycle_rule text; -- 'daily','weekly','monthly'
alter table public.tasks add column if not exists proof_photo_url text;
alter table public.tasks add column if not exists proof_comment text;

-- Update status CHECK to include approval flow
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('do_zrobienia','w_trakcie','czeka_na_zatwierdzenie','zatwierdzone','odrzucone','zamkniete'));

-- ── 19. Extend trainings with points + assignment ───────────
alter table public.trainings add column if not exists points integer not null default 0;
alter table public.trainings add column if not exists material_url text;
alter table public.trainings add column if not exists material_type text check (material_type in ('pdf','video'));
alter table public.trainings add column if not exists assigned_to uuid references public.profiles(id);
alter table public.trainings add column if not exists assigned_role text;
alter table public.trainings add column if not exists deadline date;

-- ── 20. RLS for new tables ──────────────────────────────────
alter table public.locations              enable row level security;
alter table public.clock_ins              enable row level security;
alter table public.availability           enable row level security;
alter table public.leave_types            enable row level security;
alter table public.leave_requests         enable row level security;
alter table public.absences               enable row level security;
alter table public.shift_swaps            enable row level security;
alter table public.documents              enable row level security;
alter table public.conversations          enable row level security;
alter table public.messages               enable row level security;
alter table public.points_ledger          enable row level security;
alter table public.point_config           enable row level security;
alter table public.pay_periods            enable row level security;
alter table public.pay_rates              enable row level security;
alter table public.notification_preferences enable row level security;

-- RLS policies: same tenant isolation pattern
do $$
declare
  t text;
begin
  for t in values
    ('locations'),('clock_ins'),('availability'),('leave_types'),
    ('leave_requests'),('absences'),('shift_swaps'),('documents'),
    ('points_ledger'),('point_config'),('pay_periods'),('pay_rates')
  loop
    execute format(
      'create policy %I on public.%I for all using (restaurant_id = public.my_restaurant_id())',
      'tenant_isolation_' || t, t
    );
  end loop;
end;
$$;

-- Conversations: participant must be current user
create policy tenant_isolation_conversations on public.conversations
  for all using (
    participant_a = auth.uid() or participant_b = auth.uid()
  );

-- Messages: user must be participant in conversation
create policy tenant_isolation_messages on public.messages
  for all using (
    conversation_id in (
      select id from public.conversations
      where participant_a = auth.uid() or participant_b = auth.uid()
    )
  );

-- Notification prefs: own record only
create policy own_prefs on public.notification_preferences
  for all using (user_id = auth.uid());

-- ── 21. Default leave types for existing restaurants ────────
insert into public.leave_types (restaurant_id, name, days_per_year, requires_attachment, requires_comment)
select r.id, lt.name, lt.days, lt.attach, lt.comment
from public.restaurants r
cross join (values
  ('Urlop wypoczynkowy', 26, false, false),
  ('Urlop na żądanie', 4, false, true),
  ('L4 – zwolnienie lekarskie', 0, true, false),
  ('Opieka nad dzieckiem', 2, false, true)
) as lt(name, days, attach, comment)
on conflict do nothing;

-- ── 22. Default point config for existing restaurants ───────
insert into public.point_config (restaurant_id)
select id from public.restaurants
on conflict (restaurant_id) do nothing;
