-- 048_tasks_recurrence_end_date.sql
-- Dodanie brakującej kolumny recurrence_end_date do tabeli tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
