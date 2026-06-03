-- 032_employee_groups.sql
-- Employee groups system - grupy pracownicze i przypisywanie do nich

-- Tabela grup pracowniczych
CREATE TABLE IF NOT EXISTS employee_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#2563EB', -- kolor grupy
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela przypisań pracowników do grup (many-to-many)
CREATE TABLE IF NOT EXISTS employee_group_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES employee_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, group_id)
);

-- Dodanie grupy do zadań
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_group_id UUID REFERENCES employee_groups(id) ON DELETE SET NULL;

-- RLS dla grup
ALTER TABLE employee_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_group_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_groups_select"
  ON employee_groups FOR SELECT
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "employee_groups_insert"
  ON employee_groups FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));

CREATE POLICY "employee_groups_update"
  ON employee_groups FOR UPDATE
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));

CREATE POLICY "employee_groups_delete"
  ON employee_groups FOR DELETE
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));

-- RLS dla przypisań
CREATE POLICY "employee_group_assignments_select"
  ON employee_group_assignments FOR SELECT
  USING (group_id IN (
    SELECT g.id FROM employee_groups g
    WHERE g.restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "employee_group_assignments_insert"
  ON employee_group_assignments FOR INSERT
  WITH CHECK (group_id IN (
    SELECT g.id FROM employee_groups g
    WHERE g.restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  ));

CREATE POLICY "employee_group_assignments_delete"
  ON employee_group_assignments FOR DELETE
  USING (group_id IN (
    SELECT g.id FROM employee_groups g
    WHERE g.restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  ));
