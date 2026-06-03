-- 034_leave_management.sql
-- Zarządzanie dniami urlopowymi i notatkami do wniosków

-- Tabela dla normy urlopowej pracownika (ręczne wpisywanie)
CREATE TABLE IF NOT EXISTS employee_leave_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 26,
  used_days INTEGER NOT NULL DEFAULT 0,
  carried_over_days INTEGER NOT NULL DEFAULT 0, -- dni zaległe z poprzedniego roku
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year)
);

-- Tabela dla włączonych/wyłączonych typów urlopów dla pracownika
CREATE TABLE IF NOT EXISTS employee_leave_type_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  custom_days_per_year INTEGER, -- jeśli null, używa domyślnej wartości z leave_types
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, leave_type_id)
);

-- Dodanie notatki do wniosków urlopowych
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- RLS dla norm urlopowych
ALTER TABLE employee_leave_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leave_type_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_leave_quotas_select"
  ON employee_leave_quotas FOR SELECT
  USING (employee_id = auth.uid() OR employee_id IN (
    SELECT p.id FROM profiles p
    WHERE p.restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "employee_leave_quotas_insert"
  ON employee_leave_quotas FOR INSERT
  WITH CHECK (employee_id IN (
    SELECT p.id FROM profiles p
    WHERE p.restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  ));

CREATE POLICY "employee_leave_quotas_update"
  ON employee_leave_quotas FOR UPDATE
  USING (employee_id IN (
    SELECT p.id FROM profiles p
    WHERE p.restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  ));

-- RLS dla ustawień typów urlopów
CREATE POLICY "employee_leave_type_settings_select"
  ON employee_leave_type_settings FOR SELECT
  USING (employee_id = auth.uid() OR employee_id IN (
    SELECT p.id FROM profiles p
    WHERE p.restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "employee_leave_type_settings_insert"
  ON employee_leave_type_settings FOR INSERT
  WITH CHECK (employee_id IN (
    SELECT p.id FROM profiles p
    WHERE p.restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  ));

CREATE POLICY "employee_leave_type_settings_update"
  ON employee_leave_type_settings FOR UPDATE
  USING (employee_id IN (
    SELECT p.id FROM profiles p
    WHERE p.restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  ));
