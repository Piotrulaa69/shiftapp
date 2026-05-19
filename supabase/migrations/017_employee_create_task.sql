-- ============================================================
-- 017 – Allow employees to create tasks assigned to themselves
-- ============================================================

create policy "employee: insert own tasks"
  on public.tasks for insert
  with check (
    restaurant_id = public.my_restaurant_id()
    and assigned_to = auth.uid()
  );
