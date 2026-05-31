-- ══════════════════════════════════════════════════════
-- 022: Super-admin support + AI scheduling tables
-- ══════════════════════════════════════════════════════

-- 1. Super-admin flag on profiles + allow null restaurant_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ALTER COLUMN restaurant_id DROP NOT NULL;

-- 2. RLS policies so super-admin can read ALL data across tenants
CREATE POLICY "sa_read_restaurants" ON public.restaurants
  FOR SELECT USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

CREATE POLICY "sa_read_profiles" ON public.profiles
  FOR SELECT USING (
    (SELECT is_super_admin FROM public.profiles p2 WHERE p2.id = auth.uid() LIMIT 1) = true
  );

CREATE POLICY "sa_read_tasks" ON public.tasks
  FOR SELECT USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- 3. Schedule preferences (per restaurant)
CREATE TABLE IF NOT EXISTS public.schedule_preferences (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id        uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  min_staff_per_shift  int  NOT NULL DEFAULT 2,
  max_hours_per_week   int  NOT NULL DEFAULT 40,
  min_hours_per_week   int  NOT NULL DEFAULT 20,
  shift_start          text NOT NULL DEFAULT '08:00',
  shift_end            text NOT NULL DEFAULT '16:00',
  max_consecutive_days int  NOT NULL DEFAULT 5,
  notes                text,
  updated_at           timestamptz DEFAULT now(),
  UNIQUE(restaurant_id)
);

ALTER TABLE public.schedule_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_prefs" ON public.schedule_preferences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND restaurant_id = schedule_preferences.restaurant_id)
  );

CREATE POLICY "owners_manage_prefs" ON public.schedule_preferences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND restaurant_id = schedule_preferences.restaurant_id AND role IN ('owner','manager'))
  );

-- 4. Employee availability
CREATE TABLE IF NOT EXISTS public.employee_availability (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week     int  NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  available       boolean NOT NULL DEFAULT true,
  preferred_start text DEFAULT '08:00',
  preferred_end   text DEFAULT '16:00',
  notes           text,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(employee_id, day_of_week)
);

ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_restaurant_avail" ON public.employee_availability
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND restaurant_id = employee_availability.restaurant_id)
  );

CREATE POLICY "manage_own_or_admin_avail" ON public.employee_availability
  FOR ALL USING (
    auth.uid() = employee_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND restaurant_id = employee_availability.restaurant_id AND role IN ('owner','manager'))
  );

-- ──────────────────────────────────────────────────────
-- AFTER RUNNING THIS MIGRATION:
--
-- Create a Supabase auth user for team@shiftapp.pl via
-- the Supabase dashboard (Authentication > Users > Invite),
-- then run:
--
--   INSERT INTO public.profiles (id, is_super_admin, first_name, last_name, role, job_title, avatar_color)
--   VALUES ('<paste-user-uuid-here>', true, 'ShiftApp', 'Team', 'owner', 'Super Admin', '#7C3AED');
--
-- ──────────────────────────────────────────────────────
