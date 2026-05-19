-- ============================================================
-- 016 – Add assigned_roles (text[]) to trainings
-- Replaces the single assigned_role text field with a proper array
-- ============================================================

alter table public.trainings
  add column if not exists assigned_roles text[] not null default '{}';
