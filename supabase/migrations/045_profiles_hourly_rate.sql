-- Add hourly_rate column to profiles table for per-employee earnings calculation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2) DEFAULT NULL;
