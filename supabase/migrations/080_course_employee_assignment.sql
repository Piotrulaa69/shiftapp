-- Kurs może być dostępny dla całej restauracji, wybranych grup i/lub konkretnych osób.
-- Brak grup i osób oznacza dostęp dla wszystkich pracowników restauracji.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS assigned_employee_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_courses_assigned_employee_ids
  ON public.courses USING GIN (assigned_employee_ids);

CREATE OR REPLACE FUNCTION public.validate_course_employee_assignments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(NEW.assigned_employee_ids, '{}'::UUID[])) AS assigned(employee_id)
    LEFT JOIN public.profiles profile ON profile.id = assigned.employee_id
    WHERE profile.id IS NULL OR profile.restaurant_id IS DISTINCT FROM NEW.restaurant_id
  ) THEN
    RAISE EXCEPTION 'COURSE_EMPLOYEE_OUTSIDE_RESTAURANT';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_course_employee_assignments_trigger ON public.courses;
CREATE TRIGGER validate_course_employee_assignments_trigger
  BEFORE INSERT OR UPDATE OF restaurant_id, assigned_employee_ids ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.validate_course_employee_assignments();

-- Jeden warunek widoczności współdzielony przez kursy, lekcje i tematy.
CREATE OR REPLACE FUNCTION public.can_view_course(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses course
    WHERE course.id = p_course_id
      AND course.restaurant_id = public.my_restaurant_id()
      AND (
        public.my_role() IN ('owner', 'manager')
        OR (
          COALESCE(cardinality(course.assigned_group_ids), 0) = 0
          AND COALESCE(cardinality(course.assigned_employee_ids), 0) = 0
        )
        OR auth.uid() = ANY(COALESCE(course.assigned_employee_ids, '{}'::UUID[]))
        OR EXISTS (
          SELECT 1
          FROM public.employee_group_assignments assignment
          WHERE assignment.employee_id = auth.uid()
            AND assignment.group_id = ANY(COALESCE(course.assigned_group_ids, '{}'::UUID[]))
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_course(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_course(UUID) TO authenticated;

DROP POLICY IF EXISTS "courses_select" ON public.courses;
CREATE POLICY "courses_select" ON public.courses
  FOR SELECT TO authenticated
  USING (public.can_view_course(id));

DROP POLICY IF EXISTS "lessons_select" ON public.lessons;
CREATE POLICY "lessons_select" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    restaurant_id = public.my_restaurant_id()
    AND public.can_view_course(course_id)
  );

DROP POLICY IF EXISTS "topics_select" ON public.topics;
CREATE POLICY "topics_select" ON public.topics
  FOR SELECT TO authenticated
  USING (
    restaurant_id = public.my_restaurant_id()
    AND EXISTS (
      SELECT 1
      FROM public.lessons lesson
      WHERE lesson.id = topics.lesson_id
        AND public.can_view_course(lesson.course_id)
    )
  );

-- Starszy moduł szkoleń ma pojedyncze pole assigned_to. Przywracamy jego
-- rzeczywiste znaczenie również w polityce odczytu, nie tylko w interfejsie.
CREATE OR REPLACE FUNCTION public.my_job_title()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT job_title FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.my_job_title() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_job_title() TO authenticated;

DROP POLICY IF EXISTS "tenant: read own trainings" ON public.trainings;
CREATE POLICY "tenant: read own trainings" ON public.trainings
  FOR SELECT TO authenticated
  USING (
    restaurant_id = public.my_restaurant_id()
    AND (
      public.my_role() IN ('owner', 'manager')
      OR assigned_to = auth.uid()
      OR (
        assigned_to IS NULL
        AND (
          COALESCE(cardinality(assigned_roles), 0) = 0
          OR public.my_job_title() = ANY(COALESCE(assigned_roles, '{}'::TEXT[]))
        )
      )
    )
  );
