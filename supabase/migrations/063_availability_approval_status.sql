-- 063_availability_approval_status.sql
-- Adds approval_status to availability table so managers can approve/reject
-- employee-submitted availability when availability_require_manager_approval is true.
-- Default 'approved' so all existing records remain valid.

ALTER TABLE public.availability
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.availability
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.availability
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
