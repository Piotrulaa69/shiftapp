-- 065_restaurant_settings_ai_columns.sql
-- Root cause of "nie da się zapisać" (restaurant settings incl. minimalna obsada):
-- the app's RestaurantSettings type / DEFAULT_SETTINGS include extended AI columns
-- that were never added to the restaurant_settings table (043 created only a
-- limited column set). upsertRestaurantSettings() sends ALL fields, so PostgREST
-- rejected the ENTIRE request with "column ... does not exist" and nothing saved,
-- including min_staffing.
--
-- This adds every missing column (idempotent) so the full settings payload persists.

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS ai_prefer_same_shifts       BOOLEAN  DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_respect_day_off_requests BOOLEAN  DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_balance_weekends         BOOLEAN  DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_avoid_single_day_gaps    BOOLEAN  DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_use_shift_types          BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_default_shift_start      TEXT     DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS ai_default_shift_end        TEXT     DEFAULT '16:00',
  ADD COLUMN IF NOT EXISTS ai_min_hours_per_employee   INTEGER  DEFAULT 20,
  ADD COLUMN IF NOT EXISTS ai_max_consecutive_days     INTEGER  DEFAULT 5,
  ADD COLUMN IF NOT EXISTS ai_notes                    TEXT     DEFAULT '';
