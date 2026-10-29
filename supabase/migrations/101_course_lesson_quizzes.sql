-- Quizzes belong to a lesson or to the end of a course, never to a topic.
-- Keep a recoverable copy of legacy topic quizzes while consolidating their
-- questions into one final course quiz in lesson/topic/question order.
begin;

alter table public.courses add column if not exists quiz_data jsonb;
alter table public.lessons add column if not exists quiz_data jsonb;
alter table public.topics add column if not exists legacy_quiz_data jsonb;
alter table public.course_progress
  add column if not exists quiz_score integer,
  add column if not exists quiz_passed boolean not null default false,
  add column if not exists quiz_attempt_count integer not null default 0,
  add column if not exists quiz_last_attempt_at timestamptz;

create table if not exists public.lesson_quiz_progress (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  quiz_score integer,
  quiz_passed boolean not null default false,
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  primary key (lesson_id, employee_id)
);
create index if not exists idx_lesson_quiz_progress_employee
  on public.lesson_quiz_progress (employee_id, course_id);
alter table public.lesson_quiz_progress enable row level security;
drop policy if exists lesson_quiz_progress_select on public.lesson_quiz_progress;
create policy lesson_quiz_progress_select on public.lesson_quiz_progress
  for select to authenticated
  using (
    restaurant_id = public.my_restaurant_id()
    and (employee_id = auth.uid() or public.my_role() in ('owner', 'manager'))
  );

update public.topics
set legacy_quiz_data = quiz_data
where quiz_data is not null and legacy_quiz_data is null;

with question_rows as (
  select lesson.course_id,
    lesson.sort_order as lesson_order,
    topic.sort_order as topic_order,
    question.ordinality as question_order,
    jsonb_set(
      question.value, '{id}',
      to_jsonb(topic.id::text || ':' || coalesce(question.value->>'id', question.ordinality::text)),
      true
    ) as question,
    coalesce((topic.quiz_data->>'pass_score')::integer, 70) as pass_score
  from public.topics topic
  join public.lessons lesson on lesson.id = topic.lesson_id
  cross join lateral jsonb_array_elements(coalesce(topic.quiz_data->'questions', '[]'::jsonb))
    with ordinality as question(value, ordinality)
), merged as (
  select course_id,
    jsonb_agg(question order by lesson_order, topic_order, question_order) as questions,
    max(pass_score) as pass_score
  from question_rows group by course_id
)
update public.courses course
set quiz_data = jsonb_build_object(
  'questions', coalesce(course.quiz_data->'questions', '[]'::jsonb) || merged.questions,
  'pass_score', greatest(coalesce((course.quiz_data->>'pass_score')::integer, 0), merged.pass_score)
), updated_at = now()
from merged where merged.course_id = course.id;

-- Somebody who passed every old topic quiz in a course keeps that earned pass.
with total_quizzes as (
  select lesson.course_id, count(*) as quiz_count
  from public.topics topic join public.lessons lesson on lesson.id = topic.lesson_id
  where topic.quiz_data is not null
    and jsonb_array_length(coalesce(topic.quiz_data->'questions', '[]'::jsonb)) > 0
  group by lesson.course_id
), passed_quizzes as (
  select lesson.course_id, progress.employee_id,
    count(*) filter (where progress.quiz_passed) as passed_count,
    round(avg(progress.quiz_score) filter (where progress.quiz_passed))::integer as score
  from public.topic_progress progress
  join public.topics topic on topic.id = progress.topic_id
  join public.lessons lesson on lesson.id = topic.lesson_id
  where topic.quiz_data is not null
    and jsonb_array_length(coalesce(topic.quiz_data->'questions', '[]'::jsonb)) > 0
  group by lesson.course_id, progress.employee_id
)
insert into public.course_progress
  (course_id, employee_id, restaurant_id, progress_percent, completed, quiz_score, quiz_passed)
select passed.course_id, passed.employee_id, course.restaurant_id, 0, false, passed.score, true
from passed_quizzes passed
join total_quizzes total on total.course_id = passed.course_id
join public.courses course on course.id = passed.course_id
where passed.passed_count = total.quiz_count
on conflict (course_id, employee_id) do update set
  quiz_score = coalesce(public.course_progress.quiz_score, excluded.quiz_score),
  quiz_passed = true;

update public.topics set quiz_data = null where quiz_data is not null;

-- Course completion is based on all content units: topics, lesson quizzes and
-- the optional final course quiz. Clients cannot set an arbitrary percentage.
create or replace function public.refresh_course_progress_internal(
  p_course_id uuid, p_employee_id uuid
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_restaurant_id uuid;
  v_topics integer;
  v_done_topics integer;
  v_lesson_quizzes integer;
  v_done_lesson_quizzes integer;
  v_course_quiz integer;
  v_course_pass integer;
  v_total integer;
  v_done integer;
  v_percent integer;
begin
  select restaurant_id,
    case when jsonb_array_length(coalesce(quiz_data->'questions', '[]'::jsonb)) > 0 then 1 else 0 end
  into v_restaurant_id, v_course_quiz
  from public.courses where id = p_course_id;
  if v_restaurant_id is null then return; end if;

  select count(*), count(*) filter (where progress.completed)
  into v_topics, v_done_topics
  from public.topics topic
  join public.lessons lesson on lesson.id = topic.lesson_id
  left join public.topic_progress progress
    on progress.topic_id = topic.id and progress.employee_id = p_employee_id
  where lesson.course_id = p_course_id;

  select count(*), count(*) filter (where progress.quiz_passed)
  into v_lesson_quizzes, v_done_lesson_quizzes
  from public.lessons lesson
  left join public.lesson_quiz_progress progress
    on progress.lesson_id = lesson.id and progress.employee_id = p_employee_id
  where lesson.course_id = p_course_id
    and jsonb_array_length(coalesce(lesson.quiz_data->'questions', '[]'::jsonb)) > 0;

  select case when quiz_passed then 1 else 0 end into v_course_pass
  from public.course_progress
  where course_id = p_course_id and employee_id = p_employee_id;

  v_total := v_topics + v_lesson_quizzes + v_course_quiz;
  v_done := v_done_topics + v_done_lesson_quizzes
    + case when v_course_quiz = 1 then coalesce(v_course_pass, 0) else 0 end;
  v_percent := case when v_total = 0 then 0 else round(100.0 * v_done / v_total)::integer end;

  insert into public.course_progress
    (course_id, employee_id, restaurant_id, progress_percent, completed, completed_at)
  values (
    p_course_id, p_employee_id, v_restaurant_id, v_percent,
    v_total > 0 and v_done = v_total,
    case when v_total > 0 and v_done = v_total then now() else null end
  )
  on conflict (course_id, employee_id) do update set
    progress_percent = excluded.progress_percent,
    completed = excluded.completed,
    completed_at = case
      when excluded.completed then coalesce(public.course_progress.completed_at, now())
      else null end,
    updated_at = now();
end;
$$;
revoke all on function public.refresh_course_progress_internal(uuid, uuid) from public, anon, authenticated;

create or replace function public.sync_course_progress(p_course_id uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles profile
    join public.courses course on course.restaurant_id = profile.restaurant_id
    where profile.id = auth.uid() and profile.is_active
      and course.id = p_course_id and public.can_view_course(course.id)
  ) then raise exception 'COURSE_NOT_AVAILABLE'; end if;
  perform public.refresh_course_progress_internal(p_course_id, auth.uid());
end;
$$;
revoke all on function public.sync_course_progress(uuid) from public, anon;
grant execute on function public.sync_course_progress(uuid) to authenticated;

create or replace function public.normalize_training_quiz_answer(p_value text)
returns text language sql immutable
set search_path = public, pg_temp
as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(p_value, '')), 'ąćęłńóśźż', 'acelnoszz'),
    '[^a-z0-9[:space:]]', ' ', 'g'
  ));
$$;

create or replace function public.submit_training_quiz(
  p_scope text, p_target_id uuid, p_answers jsonb
)
returns table (score integer, passed boolean, completed boolean)
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_course_id uuid;
  v_restaurant_id uuid;
  v_quiz jsonb;
  v_question jsonb;
  v_answer text;
  v_correct integer := 0;
  v_total integer;
  v_score integer;
  v_passed boolean;
  v_all_topics integer;
  v_done_topics integer;
  v_lesson_quizzes integer;
  v_done_lesson_quizzes integer;
  v_completed boolean;
begin
  if auth.uid() is null or p_scope not in ('course', 'lesson')
     or p_target_id is null or jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'INVALID_QUIZ_SUBMISSION';
  end if;

  if p_scope = 'course' then
    select id, restaurant_id, quiz_data into v_course_id, v_restaurant_id, v_quiz
    from public.courses where id = p_target_id;
  else
    select course_id, restaurant_id, quiz_data into v_course_id, v_restaurant_id, v_quiz
    from public.lessons where id = p_target_id;
  end if;
  if v_course_id is null or not exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.is_active
      and profile.restaurant_id = v_restaurant_id
  ) or not public.can_view_course(v_course_id) then
    raise exception 'QUIZ_NOT_AVAILABLE';
  end if;

  v_total := jsonb_array_length(coalesce(v_quiz->'questions', '[]'::jsonb));
  if v_total = 0 then raise exception 'QUIZ_NOT_CONFIGURED'; end if;

  select count(*), count(*) filter (where progress.completed)
  into v_all_topics, v_done_topics
  from public.topics topic
  join public.lessons lesson on lesson.id = topic.lesson_id
  left join public.topic_progress progress
    on progress.topic_id = topic.id and progress.employee_id = auth.uid()
  where (p_scope = 'course' and lesson.course_id = v_course_id)
     or (p_scope = 'lesson' and lesson.id = p_target_id);
  if v_done_topics < v_all_topics then raise exception 'QUIZ_CONTENT_INCOMPLETE'; end if;

  if p_scope = 'course' then
    select count(*), count(*) filter (where progress.quiz_passed)
    into v_lesson_quizzes, v_done_lesson_quizzes
    from public.lessons lesson
    left join public.lesson_quiz_progress progress
      on progress.lesson_id = lesson.id and progress.employee_id = auth.uid()
    where lesson.course_id = v_course_id
      and jsonb_array_length(coalesce(lesson.quiz_data->'questions', '[]'::jsonb)) > 0;
    if v_done_lesson_quizzes < v_lesson_quizzes then
      raise exception 'QUIZ_LESSONS_INCOMPLETE';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || p_target_id::text, 0));
  for v_question in select value from jsonb_array_elements(v_quiz->'questions') loop
    v_answer := btrim(coalesce(p_answers->>(v_question->>'id'), ''));
    if v_answer = '' then raise exception 'QUIZ_ANSWER_MISSING'; end if;
    if v_question->>'type' = 'open' then
      if exists (
        select 1 from jsonb_array_elements_text(coalesce(v_question->'accepted_answers', '[]'::jsonb)) as variant(value)
        where regexp_replace(public.normalize_training_quiz_answer(variant.value), '[[:space:]]+', ' ', 'g')
          = regexp_replace(public.normalize_training_quiz_answer(v_answer), '[[:space:]]+', ' ', 'g')
      ) then v_correct := v_correct + 1; end if;
    elsif exists (
      select 1 from jsonb_array_elements(coalesce(v_question->'answers', '[]'::jsonb)) as answer(value)
      where answer.value->>'id' = v_answer and coalesce((answer.value->>'correct')::boolean, false)
    ) then v_correct := v_correct + 1;
    end if;
  end loop;
  v_score := round(100.0 * v_correct / v_total)::integer;
  v_passed := v_score >= coalesce((v_quiz->>'pass_score')::integer, 70);

  if p_scope = 'lesson' then
    insert into public.lesson_quiz_progress
      (lesson_id, course_id, employee_id, restaurant_id, quiz_score, quiz_passed, attempt_count, last_attempt_at)
    values (p_target_id, v_course_id, auth.uid(), v_restaurant_id, v_score, v_passed, 1, now())
    on conflict (lesson_id, employee_id) do update set
      quiz_score = greatest(coalesce(public.lesson_quiz_progress.quiz_score, 0), excluded.quiz_score),
      quiz_passed = public.lesson_quiz_progress.quiz_passed or excluded.quiz_passed,
      attempt_count = public.lesson_quiz_progress.attempt_count + 1,
      last_attempt_at = now();
  else
    insert into public.course_progress
      (course_id, employee_id, restaurant_id, quiz_score, quiz_passed, quiz_attempt_count, quiz_last_attempt_at)
    values (v_course_id, auth.uid(), v_restaurant_id, v_score, v_passed, 1, now())
    on conflict (course_id, employee_id) do update set
      quiz_score = greatest(coalesce(public.course_progress.quiz_score, 0), excluded.quiz_score),
      quiz_passed = public.course_progress.quiz_passed or excluded.quiz_passed,
      quiz_attempt_count = public.course_progress.quiz_attempt_count + 1,
      quiz_last_attempt_at = now(),
      updated_at = now();
  end if;

  perform public.refresh_course_progress_internal(v_course_id, auth.uid());
  select progress.completed into v_completed from public.course_progress progress
    where progress.course_id = v_course_id and progress.employee_id = auth.uid();
  return query select v_score, v_passed, coalesce(v_completed, false);
end;
$$;
revoke all on function public.submit_training_quiz(text, uuid, jsonb) from public, anon;
grant execute on function public.submit_training_quiz(text, uuid, jsonb) to authenticated;

-- Keep quiz completion server-owned; topic completion still uses its own RLS.
drop policy if exists course_progress_insert on public.course_progress;
drop policy if exists course_progress_update on public.course_progress;

-- Quiz edits invalidate the corresponding pass. Other content updates do not.
create or replace function public.invalidate_training_quiz_progress()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_employee_id uuid; v_course_id uuid;
begin
  if old.quiz_data is not distinct from new.quiz_data then return new; end if;
  if tg_table_name = 'courses' then
    v_course_id := new.id;
    update public.course_progress set quiz_passed = false, quiz_score = null
      where course_id = v_course_id;
  else
    v_course_id := new.course_id;
    update public.lesson_quiz_progress set quiz_passed = false, quiz_score = null
      where lesson_id = new.id;
  end if;
  for v_employee_id in
    select employee_id from public.course_progress where course_id = v_course_id
  loop
    perform public.refresh_course_progress_internal(v_course_id, v_employee_id);
  end loop;
  return new;
end;
$$;
drop trigger if exists invalidate_course_quiz_progress on public.courses;
create trigger invalidate_course_quiz_progress
  after update of quiz_data on public.courses
  for each row execute function public.invalidate_training_quiz_progress();
drop trigger if exists invalidate_lesson_quiz_progress on public.lessons;
create trigger invalidate_lesson_quiz_progress
  after update of quiz_data on public.lessons
  for each row execute function public.invalidate_training_quiz_progress();

do $$
declare v_progress record;
begin
  for v_progress in select course_id, employee_id from public.course_progress loop
    perform public.refresh_course_progress_internal(v_progress.course_id, v_progress.employee_id);
  end loop;
end;
$$;
commit;
