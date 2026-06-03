-- 043: Employee leave quota with type assignments + subscription trial system

-- Add vacation period columns to employee_leave_type_settings
ALTER TABLE employee_leave_type_settings
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS days_allocated INTEGER DEFAULT 0;

-- Add trial/subscription columns to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Backfill trial_started_at for existing restaurants
UPDATE restaurants SET trial_started_at = created_at WHERE trial_started_at IS NULL;

-- Restaurant settings table for scheduling rules
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE,
  -- Min staffing per group per day (JSON: { group_name: { mon: 2, tue: 2, ... } })
  min_staffing JSONB DEFAULT '{}',
  -- Availability rules
  availability_contract_all_available BOOLEAN DEFAULT TRUE,
  availability_freelance_all_available BOOLEAN DEFAULT FALSE,
  availability_require_unavailability_reason BOOLEAN DEFAULT TRUE,
  availability_require_manager_approval BOOLEAN DEFAULT TRUE,
  availability_freelance_self_report BOOLEAN DEFAULT TRUE,
  availability_freelance_no_approval BOOLEAN DEFAULT TRUE,
  -- Schedule rules
  max_consecutive_days INTEGER DEFAULT 5,
  min_rest_day_after INTEGER DEFAULT 1,
  min_hours_between_shifts INTEGER DEFAULT 11,
  max_hours_weekly INTEGER DEFAULT 48,
  max_hours_monthly INTEGER DEFAULT 200,
  prevent_opening_closing BOOLEAN DEFAULT TRUE,
  -- AI priorities (0-100)
  ai_priority_full_staffing INTEGER DEFAULT 80,
  ai_priority_preferences INTEGER DEFAULT 60,
  ai_priority_equal_hours INTEGER DEFAULT 60,
  ai_priority_fixed_shifts INTEGER DEFAULT 40,
  ai_priority_min_hours INTEGER DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurant_settings_select" ON restaurant_settings;
CREATE POLICY "restaurant_settings_select" ON restaurant_settings
  FOR SELECT USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "restaurant_settings_upsert" ON restaurant_settings;
CREATE POLICY "restaurant_settings_upsert" ON restaurant_settings
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner','manager')
    )
  ) WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner','manager')
    )
  );

-- Shift types table
CREATE TABLE IF NOT EXISTS shift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563EB',
  start_time TEXT NOT NULL DEFAULT '08:00',
  end_time TEXT NOT NULL DEFAULT '16:00',
  hours NUMERIC(4,1) DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shift_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_types_select" ON shift_types
  FOR SELECT USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "shift_types_manage" ON shift_types
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner','manager')
    )
  ) WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner','manager')
    )
  );
