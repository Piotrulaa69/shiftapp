-- 038_superadmin_full_access.sql
-- Dodanie pełnych uprawnień super admina do wszystkich tabel

-- ── Restaurants ──────────────────────────────────────────────
DROP POLICY IF EXISTS "sa_insert_restaurants" ON public.restaurants;
CREATE POLICY "sa_insert_restaurants" ON public.restaurants
  FOR INSERT WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

DROP POLICY IF EXISTS "sa_update_restaurants" ON public.restaurants;
CREATE POLICY "sa_update_restaurants" ON public.restaurants
  FOR UPDATE USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

DROP POLICY IF EXISTS "sa_delete_restaurants" ON public.restaurants;
CREATE POLICY "sa_delete_restaurants" ON public.restaurants
  FOR DELETE USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Profiles ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_profiles" ON public.profiles;
CREATE POLICY "sa_manage_profiles" ON public.profiles
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Invitations ───────────────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_invitations" ON public.invitations;
CREATE POLICY "sa_manage_invitations" ON public.invitations
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Shifts ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_shifts" ON public.shifts;
CREATE POLICY "sa_manage_shifts" ON public.shifts
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Tasks ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_tasks" ON public.tasks;
CREATE POLICY "sa_manage_tasks" ON public.tasks
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Trainings ───────────────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_trainings" ON public.trainings;
CREATE POLICY "sa_manage_trainings" ON public.trainings
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Notifications ───────────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_notifications" ON public.notifications;
CREATE POLICY "sa_manage_notifications" ON public.notifications
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Subscriptions ───────────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_subscriptions" ON public.subscriptions;
CREATE POLICY "sa_manage_subscriptions" ON public.subscriptions
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Employee Groups ─────────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_employee_groups" ON public.employee_groups;
CREATE POLICY "sa_manage_employee_groups" ON public.employee_groups
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

DROP POLICY IF EXISTS "sa_manage_employee_group_assignments" ON public.employee_group_assignments;
CREATE POLICY "sa_manage_employee_group_assignments" ON public.employee_group_assignments
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Leave Management ─────────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_leave_quotas" ON public.employee_leave_quotas;
CREATE POLICY "sa_manage_leave_quotas" ON public.employee_leave_quotas
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

DROP POLICY IF EXISTS "sa_manage_leave_type_settings" ON public.employee_leave_type_settings;
CREATE POLICY "sa_manage_leave_type_settings" ON public.employee_leave_type_settings
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Recurring Tasks ────────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_recurring_tasks" ON public.recurring_tasks;
CREATE POLICY "sa_manage_recurring_tasks" ON public.recurring_tasks
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

DROP POLICY IF EXISTS "sa_manage_task_instances" ON public.task_instances;
CREATE POLICY "sa_manage_task_instances" ON public.task_instances
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- ── Document Templates ─────────────────────────────────────
DROP POLICY IF EXISTS "sa_manage_document_templates" ON public.document_templates;
CREATE POLICY "sa_manage_document_templates" ON public.document_templates
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );
