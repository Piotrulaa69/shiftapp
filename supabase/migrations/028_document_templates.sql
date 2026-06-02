-- 028_document_templates.sql
-- Document template system: admin creates templates with {{variable}} placeholders,
-- AI fills them with employee data to generate final documents.

CREATE TABLE IF NOT EXISTS document_templates (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID      NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  content     TEXT        NOT NULL DEFAULT '',
  doc_type    TEXT        NOT NULL DEFAULT 'contract',
  created_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add text content column to documents for AI-generated (no file) documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT;

-- RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_templates_select"
  ON document_templates FOR SELECT
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "doc_templates_insert"
  ON document_templates FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));

CREATE POLICY "doc_templates_update"
  ON document_templates FOR UPDATE
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));

CREATE POLICY "doc_templates_delete"
  ON document_templates FOR DELETE
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));
