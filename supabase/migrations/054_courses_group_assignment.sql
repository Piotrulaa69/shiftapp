-- Add group-based access control to courses
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE courses ADD COLUMN IF NOT EXISTS assigned_group_ids UUID[] NOT NULL DEFAULT '{}';
