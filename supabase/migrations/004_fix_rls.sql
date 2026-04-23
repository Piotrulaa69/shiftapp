-- Fix: allow user to always read their own profile row
-- (eliminates circular dependency in tenant RLS policy)
create policy "user: read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- Fix: allow user to always read their own restaurant
create policy "user: read own restaurant by profile"
  on public.restaurants for select
  using (
    id = (select restaurant_id from public.profiles where id = auth.uid())
  );
