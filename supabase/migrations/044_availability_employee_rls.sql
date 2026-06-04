-- Fix: allow employees to upsert their own availability records
-- The existing "tenant_isolation_availability" policy uses USING only (no WITH CHECK),
-- which blocks INSERT/UPDATE for non-owner roles.

-- Drop the broad policy and replace with two targeted ones.
DROP POLICY IF EXISTS "tenant_isolation_availability" ON public.availability;

-- Managers and owners: full access within their restaurant
CREATE POLICY "manager: manage availability"
  ON public.availability FOR ALL
  USING (
    restaurant_id = public.my_restaurant_id()
    AND public.my_role() IN ('owner', 'manager')
  )
  WITH CHECK (
    restaurant_id = public.my_restaurant_id()
    AND public.my_role() IN ('owner', 'manager')
  );

-- Employees: read all in their restaurant, write only their own rows
CREATE POLICY "employee: read restaurant availability"
  ON public.availability FOR SELECT
  USING (restaurant_id = public.my_restaurant_id());

CREATE POLICY "employee: upsert own availability"
  ON public.availability FOR INSERT
  WITH CHECK (
    restaurant_id = public.my_restaurant_id()
    AND employee_id = auth.uid()
  );

CREATE POLICY "employee: update own availability"
  ON public.availability FOR UPDATE
  USING (
    restaurant_id = public.my_restaurant_id()
    AND employee_id = auth.uid()
  )
  WITH CHECK (
    restaurant_id = public.my_restaurant_id()
    AND employee_id = auth.uid()
  );
