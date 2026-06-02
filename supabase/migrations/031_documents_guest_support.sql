-- 031_documents_guest_support.sql
-- Allow documents to be created for people not yet in the system.
-- employee_id becomes nullable; guest_name stores manually-entered name.

ALTER TABLE documents ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS guest_name TEXT;
