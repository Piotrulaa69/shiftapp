-- ============================================================
-- 018 – Allow employees to read all tasks in restaurant
-- Employees can see all tasks, but can filter to their own in UI
-- ============================================================

drop policy if exists "tenant: read tasks by role" on public.tasks;

-- Owners/managers see all tasks
-- Employees see all tasks (can filter in UI)
create policy "tenant: read tasks by role"
  on public.tasks for select
  using (
    restaurant_id = public.my_restaurant_id()
  );
