-- Integration checks against real RLS, with every fixture rolled back.
begin;

do $$
<<test_case>>
declare
  restaurant uuid := 'de000000-0001-0000-0000-000000000001';
  owner_id uuid;
  employee_id uuid;
  manager_id uuid;
  category_id uuid := gen_random_uuid();
  course_id uuid := gen_random_uuid();
  lesson_id uuid := gen_random_uuid();
  topic_id uuid := gen_random_uuid();
  category_name text := 'Regression ' || category_id::text;
  result record;
  count_rows integer;
  denied boolean;
  quiz jsonb := '{"pass_score":100,"questions":[{"id":"choice","question":"Wybierz A","answers":[{"id":"a","text":"A","correct":true},{"id":"b","text":"B","correct":false}]},{"id":"open","type":"open","question":"Napisz warzywa","answers":[],"accepted_answers":["warzywa"]}]}'::jsonb;
begin
  select id into owner_id from public.profiles where restaurant_id=restaurant and role='owner' and is_active limit 1;
  select id into employee_id from public.profiles where restaurant_id=restaurant and role='employee' and is_active limit 1;
  select id into manager_id from public.profiles where restaurant_id=restaurant and role='manager' and is_active limit 1;
  if owner_id is null or employee_id is null then raise exception 'Missing test accounts'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.training_categories (id,restaurant_id,name,color) values (category_id,restaurant,category_name,'#2563EB');
  insert into public.courses (id,restaurant_id,title,category,assigned_employee_ids,quiz_data)
    values (course_id,restaurant,'Regression course',category_name,array[employee_id],quiz);
  insert into public.lessons (id,restaurant_id,course_id,title,quiz_data)
    values (lesson_id,restaurant,course_id,'Regression lesson',quiz);
  insert into public.topics (id,restaurant_id,lesson_id,title,content_text)
    values (topic_id,restaurant,lesson_id,'Regression topic','Material');

  update public.training_categories set name=category_name || ' renamed', color='#16A34A' where id=category_id;
  if not exists (select 1 from public.courses where id=course_id and category=category_name || ' renamed') then
    raise exception 'Category rename did not reach course';
  end if;
  denied := false;
  begin
    update public.topics set quiz_data=quiz where id=topic_id;
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'Topic quizzes were not blocked'; end if;

  denied := false;
  begin
    delete from public.training_categories where id=category_id;
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'Used category deletion was not blocked'; end if;

  execute 'reset role';
  if manager_id is not null then
    perform set_config('request.jwt.claims',jsonb_build_object('sub',manager_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    update public.training_categories set color='#EF4444' where id=category_id;
    get diagnostics count_rows = row_count;
    if count_rows <> 1 then raise exception 'Manager cannot edit categories'; end if;
    execute 'reset role';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', employee_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into count_rows from public.courses where id=course_id;
  if count_rows <> 1 then raise exception 'Employee cannot see assigned course'; end if;
  if exists (select 1 from public.training_categories where restaurant_id <> restaurant) then
    raise exception 'Cross-tenant categories visible';
  end if;
  update public.training_categories set name='Forbidden' where id=category_id;
  get diagnostics count_rows = row_count;
  if count_rows <> 0 then raise exception 'Employee can edit categories'; end if;

  denied := false;
  begin
    perform public.submit_training_quiz('lesson',lesson_id,'{"choice":"a","open":"warzywa"}');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'Quiz unlocked before material completion'; end if;

  insert into public.topic_progress (topic_id,employee_id,restaurant_id,completed,completed_at)
    values (topic_id,employee_id,restaurant,true,now());
  perform public.sync_course_progress(course_id);

  select * into result from public.submit_training_quiz('lesson',lesson_id,'{"choice":"b","open":"warzywa"}');
  if result.passed or result.score <> 50 then raise exception 'Incorrect answers accepted'; end if;
  select * into result from public.submit_training_quiz('lesson',lesson_id,'{"choice":"a","open":"WARZYWA"}');
  if not result.passed or result.score <> 100 then raise exception 'Lesson quiz or open answer failed'; end if;
  select * into result from public.submit_training_quiz('course',course_id,'{"choice":"a","open":"warzywa"}');
  if not result.passed or not result.completed then raise exception 'Final quiz did not complete course'; end if;
  if not exists (select 1 from public.course_progress where course_progress.course_id=test_case.course_id and course_progress.employee_id=test_case.employee_id and completed and progress_percent=100) then
    raise exception 'Course progress not persisted';
  end if;
  execute 'reset role';
end;
$$;

do $$
declare
  account record;
  expected_categories integer;
  actual_categories integer;
  expected_courses integer;
  actual_courses integer;
begin
  for account in select id,restaurant_id,role from public.profiles
    where is_active and not coalesce(is_super_admin,false) and restaurant_id is not null
  loop
    select count(*) into expected_categories from public.training_categories where restaurant_id=account.restaurant_id;
    select count(*) into expected_courses from public.courses where restaurant_id=account.restaurant_id;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',account.id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    select count(*) into actual_categories from public.training_categories where restaurant_id=account.restaurant_id;
    if actual_categories <> expected_categories then raise exception 'Incomplete categories for role %',account.role; end if;
    if account.role in ('owner','manager') then
      select count(*) into actual_courses from public.courses where restaurant_id=account.restaurant_id;
      if actual_courses <> expected_courses then raise exception 'Incomplete courses for role %',account.role; end if;
    end if;
    if exists(select 1 from public.training_categories where restaurant_id<>account.restaurant_id) then
      raise exception 'Cross-tenant category access for role %',account.role;
    end if;
    perform count(*) from public.trainings where restaurant_id=account.restaurant_id;
    perform count(*) from public.employee_training_progress where employee_id=account.id;
    perform count(*) from public.course_progress where employee_id=account.id;
    perform count(*) from public.lesson_quiz_progress where employee_id=account.id;
    execute 'reset role';
  end loop;
end;
$$;

rollback;
select 'PASS: all active accounts see complete categories; category create/rename, tenant isolation, employee restrictions, topic guard, lesson/course quizzes, open answers and persisted progress; all fixtures rolled back' as result;
