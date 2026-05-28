-- Add rejection_comment column to tasks so rejection reason is stored separately from proof_comment
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS rejection_comment text;
