-- 036_add_min_hours_to_profiles.sql
-- Dodanie pól min_hours_weekly i min_hours_monthly do tabeli profiles

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS min_hours_weekly INTEGER,
ADD COLUMN IF NOT EXISTS min_hours_monthly INTEGER;

-- Ustawienie domyślnych wartości dla istniejących rekordów (opcjonalne)
-- UPDATE profiles SET min_hours_weekly = 0 WHERE min_hours_weekly IS NULL;
-- UPDATE profiles SET min_hours_monthly = 0 WHERE min_hours_monthly IS NULL;
