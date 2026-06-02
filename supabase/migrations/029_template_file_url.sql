-- 029_template_file_url.sql
-- Add file_url to document_templates so admins can upload an actual file
-- (PDF, DOCX, XLSX) as the template. Generated documents reference this file.

ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS file_url TEXT;
