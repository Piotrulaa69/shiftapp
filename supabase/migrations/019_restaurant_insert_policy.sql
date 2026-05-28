-- Allow authenticated users to create a restaurant (for registration flow)
-- The owner_id must match the authenticated user
create policy "auth: user can create own restaurant"
  on public.restaurants for insert
  with check (owner_id = auth.uid());

-- Allow new users to create their own profile (for registration + join flows)
-- No INSERT policy existed for profiles either
create policy "auth: user can create own profile"
  on public.profiles for insert
  with check (id = auth.uid());
