-- 075: Editable, restaurant-specific training categories.

CREATE TABLE IF NOT EXISTS public.training_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  color TEXT NOT NULL DEFAULT '#2563EB',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS training_categories_restaurant_name_lower_idx
  ON public.training_categories (restaurant_id, lower(name));

ALTER TABLE public.training_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_categories_select" ON public.training_categories;
CREATE POLICY "training_categories_select" ON public.training_categories
  FOR SELECT TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "training_categories_manage" ON public.training_categories;
CREATE POLICY "training_categories_manage" ON public.training_categories
  FOR ALL TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ))
  WITH CHECK (restaurant_id IN (
    SELECT restaurant_id FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));

-- Provide a useful starting set for every restaurant. It can later be freely
-- extended, renamed or (when unused) removed.
INSERT INTO public.training_categories (restaurant_id, name, color, sort_order)
SELECT restaurant.id, defaults.name, defaults.color, defaults.sort_order
FROM public.restaurants AS restaurant
CROSS JOIN (VALUES
  ('BHP', '#EF4444', 0),
  ('Obsługa', '#8B5CF6', 1),
  ('Kuchnia', '#22C55E', 2),
  ('Barista', '#F97316', 3),
  ('Sprzedaż', '#06B6D4', 4),
  ('Procedury', '#2563EB', 5),
  ('Ogólne', '#64748B', 6)
) AS defaults(name, color, sort_order)
ON CONFLICT DO NOTHING;

-- Preserve any non-standard categories already used by the legacy and course
-- training systems.
INSERT INTO public.training_categories (restaurant_id, name, color, sort_order)
SELECT DISTINCT ON (source.restaurant_id, lower(trim(source.category)))
  source.restaurant_id, trim(source.category), '#2563EB', 100
FROM (
  SELECT restaurant_id, category FROM public.courses
  UNION ALL
  SELECT restaurant_id, category FROM public.trainings
) AS source
WHERE source.category IS NOT NULL AND trim(source.category) <> ''
ON CONFLICT DO NOTHING;

-- Category values in courses/trainings are intentionally text for backwards
-- compatibility. Renaming a category therefore propagates to both systems.
CREATE OR REPLACE FUNCTION public.sync_training_category_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.name := trim(NEW.name);
  NEW.updated_at := NOW();
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.courses
      SET category = NEW.name, updated_at = NOW()
      WHERE restaurant_id = OLD.restaurant_id AND category = OLD.name;
    UPDATE public.trainings
      SET category = NEW.name
      WHERE restaurant_id = OLD.restaurant_id AND category = OLD.name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_training_category_name_trigger
  ON public.training_categories;
CREATE TRIGGER sync_training_category_name_trigger
BEFORE UPDATE ON public.training_categories
FOR EACH ROW EXECUTE FUNCTION public.sync_training_category_name();

CREATE OR REPLACE FUNCTION public.prevent_used_training_category_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.courses
    WHERE restaurant_id = OLD.restaurant_id AND category = OLD.name
  ) OR EXISTS (
    SELECT 1 FROM public.trainings
    WHERE restaurant_id = OLD.restaurant_id AND category = OLD.name
  ) THEN
    RAISE EXCEPTION 'TRAINING_CATEGORY_IN_USE';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_used_training_category_delete_trigger
  ON public.training_categories;
CREATE TRIGGER prevent_used_training_category_delete_trigger
BEFORE DELETE ON public.training_categories
FOR EACH ROW EXECUTE FUNCTION public.prevent_used_training_category_delete();
