-- ============================================================
-- 012 – Allow employees to update their training progress
-- Migration 008 blocked ALL training writes for employees.
-- This restores progress/status updates for authenticated users.
-- ============================================================

-- Allow employees to update progress_percent and status on trainings
-- (they are in the same restaurant)
create policy "employee: update own training progress"
  on public.trainings for update
  using (restaurant_id = public.my_restaurant_id())
  with check (restaurant_id = public.my_restaurant_id());
