-- 055: Add scheduled_date to tasks table for one-time task scheduling
-- Also ensures target_group_id exists

-- Add scheduled_date for planning when one-time tasks should be executed
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Add target_group_id if not exists (for group assignment)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_group_id UUID REFERENCES employee_groups(id) ON DELETE SET NULL;

-- Create index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_target_group ON tasks(target_group_id);

-- Update RLS policies to allow filtering by group
DROP POLICY IF EXISTS "tasks_select_employee" ON tasks;
CREATE POLICY "tasks_select_employee" ON tasks
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR target_group_id IN (
      SELECT group_id FROM employee_group_assignments WHERE employee_id = auth.uid()
    )
    OR restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );
