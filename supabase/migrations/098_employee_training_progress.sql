-- Legacy trainings need progress per employee. The old status/progress fields on
-- trainings describe the content, not a person's completion.
create table if not exists public.employee_training_progress (
  training_id uuid not null references public.trainings(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  status text not null default 'nierozpoczete' check (status in ('nierozpoczete', 'w_toku', 'ukonczone')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (training_id, employee_id)
);

create index if not exists idx_employee_training_progress_employee
  on public.employee_training_progress (employee_id, restaurant_id);

alter table public.employee_training_progress enable row level security;
drop policy if exists employee_training_progress_select on public.employee_training_progress;
create policy employee_training_progress_select on public.employee_training_progress
  for select to authenticated
  using (employee_id = auth.uid() and restaurant_id = public.my_restaurant_id());

-- Atomic progress update and one-time award. SECURITY DEFINER is necessary
-- because employees may not update the shared training content or points ledger.
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
        coalesce(cardinality(v_training.assigned_roles), 0) = 0
        or v_profile.job_title = any(coalesce(v_training.assigned_roles, '{}'::text[]))
      ))
    ) then
    raise exception 'TRAINING_NOT_AVAILABLE';
  end if;

  -- Serialise double taps and concurrent browser requests for this employee.
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
