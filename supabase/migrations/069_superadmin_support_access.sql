-- 069_superadmin_support_access.sql
-- FIX: In support mode ("Wejdź jako wsparcie") a super-admin cannot configure many
-- things — employee groups, staffing settings, shift types, availability, leave,
-- announcements, courses, etc.
--
-- Why: impersonation works by patching my_restaurant_id()/my_role() (047) to honour
-- active_restaurant_id. But those tables' RLS policies use an INLINE lookup
--   restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
-- which returns the super-admin's OWN (NULL) restaurant_id, not the impersonated one —
-- so access is denied. (Migration 038 added super-admin policies but 041 reverted them.)
--
-- Fix: additively grant super-admins full access to every restaurant-scoped table
-- (same pattern as 038). This is OR-combined with existing policies, so normal
-- owner/manager/employee access is untouched. The app always queries the active
-- restaurant, so nothing extra is exposed in the UI.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'employee_groups','employee_group_assignments','restaurant_settings','shift_types',
    'availability','work_time_rules','leave_types','leave_requests','employee_leave_quotas',
    'employee_leave_type_settings','document_templates','documents','announcements',
    'courses','lessons','topics','course_progress','topic_progress','task_instances',
    'qr_session_tokens','shifts','tasks','trainings','absences','shift_swaps','locations',
    'employee_training_progress','conversations','messages','points_ledger','clock_ins',
    'task_confirmations','quiz_questions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'sa_support_full_access', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL '
        || 'USING ((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true) '
        || 'WITH CHECK ((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true)',
        'sa_support_full_access', t
      );
    END IF;
  END LOOP;
END $$;
