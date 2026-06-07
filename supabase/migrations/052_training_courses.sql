-- 052_training_courses.sql
-- Nowy system szkoleń: Kursy → Lekcje → Tematy (z video)

-- ─── Tabela kursów ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Ogólne',
  cover_image_url TEXT,
  assigned_roles TEXT[] DEFAULT '{}',
  required BOOLEAN NOT NULL DEFAULT false,
  is_template BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tabela lekcji ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tabela tematów ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_text TEXT,
  video_url TEXT,
  video_storage_path TEXT,
  video_duration_sec INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Postęp pracownika na poziomie tematu ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(topic_id, employee_id)
);

-- ─── Postęp pracownika na poziomie kursu ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, employee_id)
);

-- ─── Indeksy ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_courses_restaurant_id ON public.courses(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_restaurant_id ON public.lessons(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_topics_lesson_id ON public.topics(lesson_id);
CREATE INDEX IF NOT EXISTS idx_topics_restaurant_id ON public.topics(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_employee_id ON public.topic_progress(employee_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_employee_id ON public.course_progress(employee_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Courses: czytanie przez wszystkich w restauracji, zapis przez owner/manager
CREATE POLICY "courses_select" ON public.courses FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "courses_insert" ON public.courses FOR INSERT TO authenticated
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "courses_update" ON public.courses FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "courses_delete" ON public.courses FOR DELETE TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Lessons
CREATE POLICY "lessons_select" ON public.lessons FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "lessons_insert" ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "lessons_update" ON public.lessons FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "lessons_delete" ON public.lessons FOR DELETE TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Topics
CREATE POLICY "topics_select" ON public.topics FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "topics_insert" ON public.topics FOR INSERT TO authenticated
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "topics_update" ON public.topics FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "topics_delete" ON public.topics FOR DELETE TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Topic progress: pracownik widzi/edytuje swoje
CREATE POLICY "topic_progress_select" ON public.topic_progress FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "topic_progress_insert" ON public.topic_progress FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "topic_progress_update" ON public.topic_progress FOR UPDATE TO authenticated
  USING (employee_id = auth.uid());

-- Course progress
CREATE POLICY "course_progress_select" ON public.course_progress FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "course_progress_insert" ON public.course_progress FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "course_progress_update" ON public.course_progress FOR UPDATE TO authenticated
  USING (employee_id = auth.uid());

-- ─── Storage bucket na video ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-videos',
  'training-videos',
  false,
  524288000,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "training_videos_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'training-videos' AND (storage.foldername(name))[1] IN (
    SELECT restaurant_id::TEXT FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "training_videos_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'training-videos' AND (storage.foldername(name))[1] IN (
    SELECT restaurant_id::TEXT FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));

CREATE POLICY "training_videos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'training-videos' AND (storage.foldername(name))[1] IN (
    SELECT restaurant_id::TEXT FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));
