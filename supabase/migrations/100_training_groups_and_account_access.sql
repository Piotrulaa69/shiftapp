-- Training assignment must use the restaurant's real groups. The legacy
-- assigned_roles text array remains readable for previously created content.
alter table public.trainings
  add column if not exists assigned_group_ids uuid[] not null default '{}';

create index if not exists idx_trainings_assigned_group_ids
  on public.trainings using gin (assigned_group_ids);

create or replace function public.validate_training_group_assignments()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from unnest(coalesce(new.assigned_group_ids, '{}'::uuid[])) as assigned(group_id)
    left join public.employee_groups g on g.id = assigned.group_id
    where g.id is null or g.restaurant_id is distinct from new.restaurant_id
  ) then
    raise exception 'TRAINING_GROUP_OUTSIDE_RESTAURANT';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_training_group_assignments_trigger on public.trainings;
create trigger validate_training_group_assignments_trigger
  before insert or update of restaurant_id, assigned_group_ids on public.trainings
  for each row execute function public.validate_training_group_assignments();

drop policy if exists "tenant: read own trainings" on public.trainings;
create policy "tenant: read own trainings" on public.trainings
  for select to authenticated
  using (
    restaurant_id = public.my_restaurant_id()
    and (
      public.my_role() in ('owner', 'manager')
      or assigned_to = auth.uid()
      or (
        assigned_to is null
        and (
          (coalesce(cardinality(assigned_roles), 0) = 0
            and coalesce(cardinality(assigned_group_ids), 0) = 0)
          or public.my_job_title() = any(coalesce(assigned_roles, '{}'::text[]))
          or exists (
            select 1 from public.employee_group_assignments assignment
            where assignment.employee_id = auth.uid()
              and assignment.group_id = any(coalesce(assigned_group_ids, '{}'::uuid[]))
          )
        )
      )
    )
  );

-- Since progress is now written by save_employee_training_result, employees
-- must no longer update the shared training row (including its assignment).
drop policy if exists "employee: update own training progress" on public.trainings;

create or replace function public.save_employee_training_result(
  p_training_id uuid,
  p_percent integer
)
returns table (saved_status text, saved_percent integer, newly_completed boolean, awarded_points integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_training public.trainings%rowtype;
  v_profile public.profiles%rowtype;
  v_prior public.employee_training_progress%rowtype;
  v_completed boolean;
  v_points integer := 0;
begin
  if auth.uid() is null or p_percent is null or p_percent < 0 or p_percent > 100 then
    raise exception 'INVALID_TRAINING_RESULT';
  end if;

  select * into v_profile from public.profiles where id = auth.uid() and is_active is true;
  select * into v_training from public.trainings where id = p_training_id;
  if v_profile.id is null or v_training.id is null
    or v_profile.restaurant_id is distinct from v_training.restaurant_id
    or not (
      v_profile.role in ('owner', 'manager')
      or v_training.assigned_to = auth.uid()
      or (v_training.assigned_to is null and (
        (coalesce(cardinality(v_training.assigned_roles), 0) = 0
          and coalesce(cardinality(v_training.assigned_group_ids), 0) = 0)
        or v_profile.job_title = any(coalesce(v_training.assigned_roles, '{}'::text[]))
        or exists (
          select 1 from public.employee_group_assignments assignment
          where assignment.employee_id = auth.uid()
            and assignment.group_id = any(coalesce(v_training.assigned_group_ids, '{}'::uuid[]))
        )
      ))
    ) then
    raise exception 'TRAINING_NOT_AVAILABLE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_training_id::text || auth.uid()::text, 0));
  select * into v_prior from public.employee_training_progress
    where training_id = p_training_id and employee_id = auth.uid();
  v_completed := p_percent >= 80 and v_prior.status is distinct from 'ukonczone';

  insert into public.employee_training_progress as progress
    (training_id, employee_id, restaurant_id, progress_percent, status, completed_at)
  values (
    p_training_id, auth.uid(), v_training.restaurant_id, p_percent,
    case when p_percent >= 80 then 'ukonczone' else 'w_toku' end,
    case when p_percent >= 80 then now() else null end
  )
  on conflict (training_id, employee_id) do update set
    progress_percent = greatest(progress.progress_percent, excluded.progress_percent),
    status = case when progress.status = 'ukonczone' then 'ukonczone' else excluded.status end,
    completed_at = coalesce(progress.completed_at, excluded.completed_at),
    updated_at = now();

  if v_completed and coalesce(v_training.points, 0) > 0 and not exists (
    select 1 from public.points_ledger
    where employee_id = auth.uid() and reference_id = p_training_id
      and event_type = 'training_completed'
  ) then
    insert into public.points_ledger
      (restaurant_id, employee_id, points, event_type, reference_id, description)
    values (
      v_training.restaurant_id, auth.uid(), v_training.points, 'training_completed',
      p_training_id, 'Szkolenie ukończone: ' || v_training.title
    );
    v_points := v_training.points;
  end if;

  return query select progress.status, progress.progress_percent, v_completed, v_points
  from public.employee_training_progress progress
  where progress.training_id = p_training_id and progress.employee_id = auth.uid();
end;
$$;

revoke all on function public.save_employee_training_result(uuid, integer) from public;
revoke all on function public.save_employee_training_result(uuid, integer) from anon;
grant execute on function public.save_employee_training_result(uuid, integer) to authenticated;

-- Support mode follows my_restaurant_id()/my_role(); direct profile.restaurant_id
-- checks hide the target restaurant from a super-admin with no own restaurant.
drop policy if exists "training_categories_select" on public.training_categories;
create policy "training_categories_select" on public.training_categories
  for select to authenticated
  using (restaurant_id = public.my_restaurant_id());

drop policy if exists "training_categories_manage" on public.training_categories;
create policy "training_categories_manage" on public.training_categories
  for all to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'))
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));

drop policy if exists "courses_insert" on public.courses;
create policy "courses_insert" on public.courses for insert to authenticated
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));
drop policy if exists "courses_update" on public.courses;
create policy "courses_update" on public.courses for update to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'))
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));
drop policy if exists "courses_delete" on public.courses;
create policy "courses_delete" on public.courses for delete to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));

drop policy if exists "lessons_insert" on public.lessons;
create policy "lessons_insert" on public.lessons for insert to authenticated
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));
drop policy if exists "lessons_update" on public.lessons;
create policy "lessons_update" on public.lessons for update to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'))
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));
drop policy if exists "lessons_delete" on public.lessons;
create policy "lessons_delete" on public.lessons for delete to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));

drop policy if exists "topics_insert" on public.topics;
create policy "topics_insert" on public.topics for insert to authenticated
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));
drop policy if exists "topics_update" on public.topics;
create policy "topics_update" on public.topics for update to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'))
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));
drop policy if exists "topics_delete" on public.topics;
create policy "topics_delete" on public.topics for delete to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));

drop policy if exists "manager: insert quiz questions" on public.quiz_questions;
create policy "manager: insert quiz questions" on public.quiz_questions for insert to authenticated
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));
drop policy if exists "manager: update quiz questions" on public.quiz_questions;
create policy "manager: update quiz questions" on public.quiz_questions for update to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'))
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));
drop policy if exists "manager: delete quiz questions" on public.quiz_questions;
create policy "manager: delete quiz questions" on public.quiz_questions for delete to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.my_role() in ('owner', 'manager'));
