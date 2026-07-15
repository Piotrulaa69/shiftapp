-- 071_ui_translations.sql
-- Global shared cache for automatic UI translation (EN / UK).
-- Each unique Polish UI string is machine-translated ONCE, stored here, and
-- reused by every user/device — long-term the app translates itself with no
-- dictionary maintenance and near-zero repeated API calls.

CREATE TABLE IF NOT EXISTS public.ui_translations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lang       TEXT NOT NULL CHECK (lang IN ('en','uk')),
  source     TEXT NOT NULL,
  translated TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lang, source)
);

CREATE INDEX IF NOT EXISTS ui_translations_lang_source_idx
  ON public.ui_translations (lang, source);

ALTER TABLE public.ui_translations ENABLE ROW LEVEL SECURITY;

-- Anyone (including pre-login screens / kiosk) can read the cache.
DROP POLICY IF EXISTS "ui_translations_select" ON public.ui_translations;
CREATE POLICY "ui_translations_select" ON public.ui_translations
  FOR SELECT USING (true);

-- Logged-in users populate the cache as new strings appear.
DROP POLICY IF EXISTS "ui_translations_insert" ON public.ui_translations;
CREATE POLICY "ui_translations_insert" ON public.ui_translations
  FOR INSERT TO authenticated WITH CHECK (lang IN ('en','uk'));
