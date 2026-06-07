-- Quiz support for topics
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE topics ADD COLUMN IF NOT EXISTS quiz_data JSONB DEFAULT NULL;

ALTER TABLE topic_progress ADD COLUMN IF NOT EXISTS quiz_score INTEGER DEFAULT NULL;
ALTER TABLE topic_progress ADD COLUMN IF NOT EXISTS quiz_passed BOOLEAN NOT NULL DEFAULT FALSE;
