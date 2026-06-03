-- 039_support_role.sql
-- Dodanie roli 'support' i active_restaurant_id dla super adminów

-- 1. Dodaj kolumnę active_restaurant_id dla super adminów
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_restaurant_id UUID REFERENCES restaurants(id);

-- 2. Zaktualizuj funkcję my_restaurant_id() aby zwracała active_restaurant_id dla super adminów
-- Super admin bez active_restaurant_id zwraca NULL (co oznacza "wszystkie restauracje")
CREATE OR REPLACE FUNCTION public.my_restaurant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true 
        AND (SELECT active_restaurant_id FROM profiles WHERE id = auth.uid() LIMIT 1) IS NOT NULL
      THEN (SELECT active_restaurant_id FROM profiles WHERE id = auth.uid() LIMIT 1)
      ELSE restaurant_id
    END
  FROM profiles WHERE id = auth.uid();
$$;

-- 3. Zaktualizuj funkcję my_role() aby zwracała 'owner' jeśli to super admin z aktywną restauracją
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true 
        AND (SELECT active_restaurant_id FROM profiles WHERE id = auth.uid() LIMIT 1) IS NOT NULL
      THEN 'owner' -- Super admin z aktywną restauracją działa jak owner
      ELSE COALESCE(role, 'employee')
    END
  FROM profiles WHERE id = auth.uid();
$$;

-- 4. Dodaj RLS policies dla super adminów (pełny dostęp do wszystkiego)
-- Restaurants
DROP POLICY IF EXISTS "superadmin_full_access_restaurants" ON public.restaurants;
CREATE POLICY "superadmin_full_access_restaurants" ON public.restaurants
  FOR ALL USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Profiles
DROP POLICY IF EXISTS "superadmin_full_access_profiles" ON public.profiles;
CREATE POLICY "superadmin_full_access_profiles" ON public.profiles
  FOR ALL USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Shifts
DROP POLICY IF EXISTS "superadmin_full_access_shifts" ON public.shifts;
CREATE POLICY "superadmin_full_access_shifts" ON public.shifts
  FOR ALL USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Tasks
DROP POLICY IF EXISTS "superadmin_full_access_tasks" ON public.tasks;
CREATE POLICY "superadmin_full_access_tasks" ON public.tasks
  FOR ALL USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Trainings
DROP POLICY IF EXISTS "superadmin_full_access_trainings" ON public.trainings;
CREATE POLICY "superadmin_full_access_trainings" ON public.trainings
  FOR ALL USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Invitations
DROP POLICY IF EXISTS "superadmin_full_access_invitations" ON public.invitations;
CREATE POLICY "superadmin_full_access_invitations" ON public.invitations
  FOR ALL USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Notifications - przywróć oryginalne policies i dodaj super admin
DROP POLICY IF EXISTS "user: read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "tenant: insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "user: update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "user: delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "sa_manage_notifications" ON public.notifications;
DROP POLICY IF EXISTS "superadmin_full_access_notifications" ON public.notifications;

-- Super admin - osobne policies dla każdej operacji
CREATE POLICY "superadmin_select_notifications" ON public.notifications
  FOR SELECT USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

CREATE POLICY "superadmin_insert_notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

CREATE POLICY "superadmin_update_notifications" ON public.notifications
  FOR UPDATE USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

CREATE POLICY "superadmin_delete_notifications" ON public.notifications
  FOR DELETE USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Zwykli użytkownicy - SELECT własne notifications
CREATE POLICY "user: read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Zwykli użytkownicy - INSERT do swojej restauracji
CREATE POLICY "tenant: insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (restaurant_id = public.my_restaurant_id());

-- Zwykli użytkownicy - UPDATE własne notifications
CREATE POLICY "user: update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Zwykli użytkownicy - DELETE własne notifications
CREATE POLICY "user: delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- Subscriptions
DROP POLICY IF EXISTS "superadmin_full_access_subscriptions" ON public.subscriptions;
CREATE POLICY "superadmin_full_access_subscriptions" ON public.subscriptions
  FOR ALL USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );
