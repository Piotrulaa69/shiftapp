-- 033_recurring_tasks.sql
-- Zadania cykliczne i powtarzalne

-- Dodanie kolumn dla zadań cyklicznych
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT; -- 'daily', 'weekly', 'monthly', 'custom'
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[]; -- [1,3,5] dla pon, śr, pt
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_week_day INTEGER; -- 1-7 dla tygodniowych (pon-nd)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_month_day INTEGER; -- 1-31 dla miesięcznych
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE; -- dla kopii cyklicznych
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0; -- punkty za wykonanie

-- Tabela instancji zadań cyklicznych (dla konkretnych dat)
CREATE TABLE IF NOT EXISTS task_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  group_id UUID REFERENCES employee_groups(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS dla instancji zadań
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_instances_select"
  ON task_instances FOR SELECT
  USING (
    employee_id = auth.uid() OR
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.restaurant_id IN (
        SELECT restaurant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "task_instances_insert"
  ON task_instances FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.restaurant_id IN (
        SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
      )
    )
  );

CREATE POLICY "task_instances_update"
  ON task_instances FOR UPDATE
  USING (
    employee_id = auth.uid() OR
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.restaurant_id IN (
        SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
      )
    )
  );

CREATE POLICY "task_instances_delete"
  ON task_instances FOR DELETE
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.restaurant_id IN (
        SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
      )
    )
  );
