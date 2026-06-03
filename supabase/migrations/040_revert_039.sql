-- 040_revert_039.sql
-- Cofnięcie zmian z 039_support_role.sql - przywrócenie działającego stanu

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

-- 4. Upewnij się że super admin ma restaurant_id (jeśli nie, ustaw na NULL - to OK dla super admina)
UPDATE profiles SET restaurant_id = NULL WHERE is_super_admin = true AND restaurant_id IS NULL;

-- 4. Usuń wszystkie policies z 039 dla notifications
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

-- 6. Usuń policies z 039 dla innych tabel
DROP POLICY IF EXISTS "superadmin_full_access_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "superadmin_full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "superadmin_full_access_shifts" ON public.shifts;
DROP POLICY IF EXISTS "superadmin_full_access_tasks" ON public.tasks;
DROP POLICY IF EXISTS "superadmin_full_access_trainings" ON public.trainings;
DROP POLICY IF EXISTS "superadmin_full_access_invitations" ON public.invitations;
DROP POLICY IF EXISTS "superadmin_full_access_subscriptions" ON public.subscriptions;
