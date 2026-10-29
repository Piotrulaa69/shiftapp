-- An INSERT ... RETURNING on courses must be visible to its owner/manager in
-- the same statement. can_view_course(id) queries the courses table and does
-- not see the just-inserted row at that point, so the old SELECT policy made
-- an otherwise-authorized insert fail with 42501.
drop policy if exists courses_owner_insert_returning on public.courses;
create policy courses_owner_insert_returning on public.courses
  for select to authenticated
  using (
    restaurant_id = public.my_restaurant_id()
    and public.my_role() in ('owner', 'manager')
  );
