-- Repair quizzes reintroduced by old clients after migration 101.
-- No content is deleted: every source payload is retained on the topic.
begin;

alter table public.topics add column if not exists legacy_quiz_versions jsonb not null default '[]'::jsonb;

do $$
declare
  source record;
  target_quiz jsonb;
  merged_questions jsonb;
  question jsonb;
  ordinal bigint;
  promoted_id text;
begin
  for source in
    select topic.id, topic.quiz_data, lesson.course_id
    from public.topics topic
    join public.lessons lesson on lesson.id = topic.lesson_id
    where topic.quiz_data is not null
    order by lesson.course_id, lesson.sort_order, topic.sort_order, topic.id
    for update of topic
  loop
    select quiz_data into target_quiz from public.courses
      where id = source.course_id for update;
    merged_questions := coalesce(target_quiz->'questions', '[]'::jsonb);
    for question, ordinal in
      select value, ordinality
      from jsonb_array_elements(coalesce(source.quiz_data->'questions', '[]'::jsonb)) with ordinality
    loop
      promoted_id := source.id::text || ':' || coalesce(question->>'id', ordinal::text);
      -- The user may already have manually copied the question into the course.
      -- Compare payloads, not just ids, so changed answers are never discarded.
      if not exists (
        select 1 from jsonb_array_elements(merged_questions) existing
        where existing - 'id' = question - 'id'
      ) then
        merged_questions := merged_questions || jsonb_build_array(
          jsonb_set(question, '{id}', to_jsonb(promoted_id), true)
        );
      end if;
    end loop;

    if merged_questions is distinct from coalesce(target_quiz->'questions', '[]'::jsonb) then
      update public.courses set quiz_data = jsonb_build_object(
        'questions', merged_questions,
        'pass_score', greatest(coalesce((target_quiz->>'pass_score')::integer, 0),
                               coalesce((source.quiz_data->>'pass_score')::integer, 70))
      ), updated_at = now() where id = source.course_id;
    end if;

    update public.topics set
      legacy_quiz_data = coalesce(legacy_quiz_data, source.quiz_data),
      legacy_quiz_versions = case
        when legacy_quiz_versions @> jsonb_build_array(source.quiz_data) then legacy_quiz_versions
        else legacy_quiz_versions || jsonb_build_array(source.quiz_data) end,
      quiz_data = null
    where id = source.id;
  end loop;
end;
$$;

create or replace function public.prevent_topic_quiz_regression()
returns trigger language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.quiz_data is not null then
    raise exception using errcode = '23514',
      message = 'QUIZ_BELONGS_TO_COURSE_OR_LESSON',
      hint = 'Refresh the application and edit Quiz kursu or Quiz lekcji. Topic content has not been changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_topic_quiz_regression on public.topics;
create trigger prevent_topic_quiz_regression
  before insert or update of quiz_data on public.topics
  for each row execute function public.prevent_topic_quiz_regression();

commit;
