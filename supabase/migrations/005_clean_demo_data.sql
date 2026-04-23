-- Remove demo shifts and tasks so owners start with a clean slate
delete from public.shifts where restaurant_id in (
  'aaaaaaaa-0001-0000-0000-000000000001',
  'aaaaaaaa-0002-0000-0000-000000000002'
);

delete from public.tasks where restaurant_id in (
  'aaaaaaaa-0001-0000-0000-000000000001',
  'aaaaaaaa-0002-0000-0000-000000000002'
);

-- Reset training progress (keep the trainings, just reset progress)
update public.trainings
set progress_percent = 0, status = 'nierozpoczete'
where restaurant_id in (
  'aaaaaaaa-0001-0000-0000-000000000001',
  'aaaaaaaa-0002-0000-0000-000000000002'
);
