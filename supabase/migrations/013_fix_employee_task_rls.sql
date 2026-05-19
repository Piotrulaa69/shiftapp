-- ============================================================
-- 013 – Fix task RLS: employees should only see their own tasks
-- Migration 001 allowed all restaurant members to read all tasks.
-- ============================================================

drop policy if exists "tenant: read own tasks" on public.tasks;

-- Owners/managers see all tasks in their restaurant
-- Employees see only tasks assigned to them
create policy "tenant: read tasks by role"
  on public.tasks for select
  using (
    restaurant_id = public.my_restaurant_id() and (
      public.my_role() in ('owner', 'manager')
      or assigned_to = auth.uid()
    )
  );

-- Also allow employees to update status on their own tasks (start/finish)
create policy "employee: update own task status"
  on public.tasks for update
  using (restaurant_id = public.my_restaurant_id() and assigned_to = auth.uid())
  with check (restaurant_id = public.my_restaurant_id() and assigned_to = auth.uid());
