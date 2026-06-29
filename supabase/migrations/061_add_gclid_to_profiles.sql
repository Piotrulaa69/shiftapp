-- 061_add_gclid_to_profiles.sql
-- Przechowuje Google Click ID z reklam Google Ads
-- Zapisywany podczas rejestracji jeżeli użytkownik przyszedł z reklamy
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gclid TEXT;
