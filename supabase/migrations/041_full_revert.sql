-- 041_full_revert.sql
-- Kompletne przywrócenie stanu sprzed 039 - przywrócenie policies z 038

-- 1. Usuń kolumnę active_restaurant_id
ALTER TABLE profiles DROP COLUMN IF EXISTS active_restaurant_id;

-- 2. Przywróć oryginalną funkcję my_restaurant_id()
CREATE OR REPLACE FUNCTION public.my_restaurant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM profiles WHERE id = auth.uid();
$$;

-- 3. Przywróć oryginalną funkcję my_role()
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'employee') FROM profiles WHERE id = auth.uid();
$$;

-- 4. Usuń wszystkie policies z 039
DROP POLICY IF EXISTS "superadmin_full_access_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "superadmin_full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "superadmin_full_access_shifts" ON public.shifts;
DROP POLICY IF EXISTS "superadmin_full_access_tasks" ON public.tasks;
DROP POLICY IF EXISTS "superadmin_full_access_trainings" ON public.trainings;
DROP POLICY IF EXISTS "superadmin_full_access_invitations" ON public.invitations;
DROP POLICY IF EXISTS "superadmin_full_access_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "superadmin_select_notifications" ON public.notifications;
DROP POLICY IF EXISTS "superadmin_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "superadmin_update_notifications" ON public.notifications;
DROP POLICY IF EXISTS "superadmin_delete_notifications" ON public.notifications;
DROP POLICY IF EXISTS "superadmin_full_access_notifications" ON public.notifications;

-- 5. Przywróć oryginalne policies dla notifications
DROP POLICY IF EXISTS "user: read own notifications" ON public.notifications;
CREATE POLICY "user: read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tenant: insert notifications" ON public.notifications;
CREATE POLICY "tenant: insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (restaurant_id = public.my_restaurant_id());

DROP POLICY IF EXISTS "user: update own notifications" ON public.notifications;
CREATE POLICY "user: update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user: delete own notifications" ON public.notifications;
CREATE POLICY "user: delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- 6. USUŃ wszystkie policies dla super admina (powodują konflikty)
DROP POLICY IF EXISTS "sa_insert_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "sa_update_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "sa_delete_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "sa_manage_profiles" ON public.profiles;
DROP POLICY IF EXISTS "sa_manage_notifications" ON public.notifications;
DROP POLICY IF EXISTS "sa_manage_subscriptions" ON public.subscriptions;

-- 7. Usuń WSZYSTKIE SELECT policies dla profiles
DROP POLICY IF EXISTS "restaurant_users_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "tenant: read own restaurant profiles" ON public.profiles;
DROP POLICY IF EXISTS "sa_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "superadmin_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user: read own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_select_own_profile" ON public.profiles;

-- 8. Dodaj jedną prostą policy dla SELECT profiles
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- 9. Usuń WSZYSTKIE SELECT policies dla restaurants
DROP POLICY IF EXISTS "restaurants_select_for_profiles" ON public.restaurants;
DROP POLICY IF EXISTS "sa_read_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "tenant: read own restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "user: read own restaurant by profile" ON public.restaurants;

-- 10. Dodaj jedną prostą policy dla SELECT restaurants
CREATE POLICY "restaurants_select_all" ON public.restaurants
  FOR SELECT USING (true);
