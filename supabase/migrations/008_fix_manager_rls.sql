-- ============================================================
-- 008 – Fix RLS policies to allow 'manager' role write access
-- Previously only 'owner' could manage shifts/tasks/trainings.
-- ============================================================

-- ── Shifts ──────────────────────────────────────────────────
drop policy if exists "owner: manage shifts" on public.shifts;
create policy "owner_manager: manage shifts"
  on public.shifts for all
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner','manager'));

-- ── Tasks ───────────────────────────────────────────────────
drop policy if exists "owner: manage tasks" on public.tasks;
create policy "owner_manager: manage tasks"
  on public.tasks for all
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner','manager'));

-- ── Trainings ───────────────────────────────────────────────
drop policy if exists "owner: manage trainings" on public.trainings;
create policy "owner_manager: manage trainings"
  on public.trainings for all
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner','manager'));

-- ── Invitations ─────────────────────────────────────────────
drop policy if exists "owner: manage invitations" on public.invitations;
create policy "owner_manager: manage invitations"
  on public.invitations for all
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner','manager'));

-- ── Restaurant update ────────────────────────────────────────
drop policy if exists "tenant: owner can update restaurant" on public.restaurants;
create policy "tenant: owner_manager can update restaurant"
  on public.restaurants for update
  using (id = public.my_restaurant_id() and public.my_role() in ('owner','manager'));

-- ── Profiles: manager can deactivate employees ───────────────
drop policy if exists "owner: delete employee profile" on public.profiles;
create policy "owner_manager: deactivate employee profile"
  on public.profiles for update
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner','manager') and id <> auth.uid());
