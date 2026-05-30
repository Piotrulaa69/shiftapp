-- Add confirmation_config to tasks so admins can define custom confirmation fields
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS confirmation_config jsonb;
