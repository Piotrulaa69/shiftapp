-- ══════════════════════════════════════════════════════
-- 024: Fix infinite recursion in super-admin RLS policies
-- The sa_read_profiles policy in 022 queried public.profiles
-- inside a policy ON public.profiles → recursive loop → 500.
-- Fix: use a SECURITY DEFINER helper function that bypasses RLS.
-- ══════════════════════════════════════════════════════

-- 1. Helper function – reads is_super_admin bypassing RLS
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

-- 2. Drop the recursive policy from 022
DROP POLICY IF EXISTS "sa_read_profiles" ON public.profiles;

-- 3. Re-create using the safe helper function (no recursion)
CREATE POLICY "sa_read_profiles" ON public.profiles
  FOR SELECT USING (public.current_user_is_super_admin() = true);

-- 4. Also update restaurants + tasks policies to use the same function
--    (cleaner, same perf – the function result is cached per query)
DROP POLICY IF EXISTS "sa_read_restaurants" ON public.restaurants;
CREATE POLICY "sa_read_restaurants" ON public.restaurants
  FOR SELECT USING (public.current_user_is_super_admin() = true);

DROP POLICY IF EXISTS "sa_read_tasks" ON public.tasks;
CREATE POLICY "sa_read_tasks" ON public.tasks
  FOR SELECT USING (public.current_user_is_super_admin() = true);

-- 5. Update 023 policies too (restaurants insert/update + invitations)
DROP POLICY IF EXISTS "sa_insert_restaurants" ON public.restaurants;
CREATE POLICY "sa_insert_restaurants" ON public.restaurants
  FOR INSERT WITH CHECK (public.current_user_is_super_admin() = true);

DROP POLICY IF EXISTS "sa_update_restaurants" ON public.restaurants;
CREATE POLICY "sa_update_restaurants" ON public.restaurants
  FOR UPDATE USING (public.current_user_is_super_admin() = true);

DROP POLICY IF EXISTS "sa_manage_invitations" ON public.invitations;
CREATE POLICY "sa_manage_invitations" ON public.invitations
  FOR ALL USING (public.current_user_is_super_admin() = true)
  WITH CHECK (public.current_user_is_super_admin() = true);

DROP POLICY IF EXISTS "sa_manage_subscriptions" ON public.subscriptions;
CREATE POLICY "sa_manage_subscriptions" ON public.subscriptions
  FOR ALL USING (public.current_user_is_super_admin() = true);
