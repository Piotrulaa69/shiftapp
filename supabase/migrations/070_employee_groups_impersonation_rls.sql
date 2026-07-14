-- 070_employee_groups_impersonation_rls.sql
-- Definitive fix for "grupy nie działają na wejściu" (support/impersonation mode).
--
-- The employee_groups / employee_group_assignments policies (032) scoped access with
--   restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
-- which, for an impersonating super-admin, returns their OWN (NULL) restaurant — not
-- the impersonated one. Migration 047 already made impersonation work everywhere else
-- by having my_restaurant_id() / my_role() honour active_restaurant_id. Rewrite these
-- policies to use those helpers, so support mode behaves exactly like the owner.
-- Semantics for normal users are unchanged (my_restaurant_id() = their restaurant,
-- my_role() = their role).

-- ── employee_groups ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "employee_groups_select" ON public.employee_groups;
CREATE POLICY "employee_groups_select" ON public.employee_groups
  FOR SELECT USING (restaurant_id = public.my_restaurant_id());

DROP POLICY IF EXISTS "employee_groups_insert" ON public.employee_groups;
CREATE POLICY "employee_groups_insert" ON public.employee_groups
  FOR INSERT WITH CHECK (
    restaurant_id = public.my_restaurant_id() AND public.my_role() IN ('owner','manager')
  );

DROP POLICY IF EXISTS "employee_groups_update" ON public.employee_groups;
CREATE POLICY "employee_groups_update" ON public.employee_groups
  FOR UPDATE USING (
    restaurant_id = public.my_restaurant_id() AND public.my_role() IN ('owner','manager')
  ) WITH CHECK (
    restaurant_id = public.my_restaurant_id() AND public.my_role() IN ('owner','manager')
  );

DROP POLICY IF EXISTS "employee_groups_delete" ON public.employee_groups;
CREATE POLICY "employee_groups_delete" ON public.employee_groups
  FOR DELETE USING (
    restaurant_id = public.my_restaurant_id() AND public.my_role() IN ('owner','manager')
  );

-- ── employee_group_assignments (scoped through the parent group) ──────
DROP POLICY IF EXISTS "employee_group_assignments_select" ON public.employee_group_assignments;
CREATE POLICY "employee_group_assignments_select" ON public.employee_group_assignments
  FOR SELECT USING (
    group_id IN (SELECT id FROM public.employee_groups g WHERE g.restaurant_id = public.my_restaurant_id())
  );

DROP POLICY IF EXISTS "employee_group_assignments_insert" ON public.employee_group_assignments;
CREATE POLICY "employee_group_assignments_insert" ON public.employee_group_assignments
  FOR INSERT WITH CHECK (
    group_id IN (SELECT id FROM public.employee_groups g WHERE g.restaurant_id = public.my_restaurant_id())
    AND public.my_role() IN ('owner','manager')
  );

DROP POLICY IF EXISTS "employee_group_assignments_delete" ON public.employee_group_assignments;
CREATE POLICY "employee_group_assignments_delete" ON public.employee_group_assignments
  FOR DELETE USING (
    group_id IN (SELECT id FROM public.employee_groups g WHERE g.restaurant_id = public.my_restaurant_id())
    AND public.my_role() IN ('owner','manager')
  );
