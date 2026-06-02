-- ══════════════════════════════════════════════════════
-- 027: Leave system improvements
-- - Add payment_rate to leave_types (0-100%)
-- - Add expected_hours to leave_requests
-- - Add parental leave types (maternity, paternity, caregiver)
-- - Add has_children flag to profiles (unlocks parental section)
-- ══════════════════════════════════════════════════════

-- 1. Add payment_rate to leave_types
ALTER TABLE public.leave_types
  ADD COLUMN IF NOT EXISTS payment_rate integer NOT NULL DEFAULT 100
    CHECK (payment_rate >= 0 AND payment_rate <= 100),
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'standard'
    CHECK (category IN ('standard', 'parental', 'special')),
  ADD COLUMN IF NOT EXISTS requires_children boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leave_types.payment_rate IS 'Percentage of pay: 0=unpaid, 80=80% pay, 100=fully paid';
COMMENT ON COLUMN public.leave_types.category IS 'standard | parental | special';
COMMENT ON COLUMN public.leave_types.requires_children IS 'If true, only visible to employees with has_children=true';

-- 2. Add expected_hours to leave_requests (hours deducted from work balance)
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS expected_hours numeric(5,2);

COMMENT ON COLUMN public.leave_requests.expected_hours IS 'Hours deducted from employee work balance for this leave';

-- 3. Add has_children flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_children boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.has_children IS 'Unlocks parental leave section for this employee';

-- 4. Insert parental leave types (per restaurant will be seeded separately)
-- These are global templates — actual rows are per-restaurant in leave_types
-- We update the existing default seeding logic by adjusting payment_rate on common types

-- Update standard leave types with sensible payment_rate defaults
-- (only if they already exist with the default name)
UPDATE public.leave_types SET payment_rate = 100, category = 'standard' WHERE name IN ('Urlop wypoczynkowy', 'Zwolnienie lekarskie');
UPDATE public.leave_types SET payment_rate = 0,   category = 'standard' WHERE name = 'Urlop bezpłatny';
UPDATE public.leave_types SET payment_rate = 80,  category = 'standard' WHERE name = 'Urlop na żądanie';
UPDATE public.leave_types SET payment_rate = 100, category = 'special'  WHERE name = 'Urlop okolicznościowy';

-- 5. RLS: employees can read leave_types for their restaurant
-- (already covered by existing policies — no change needed)

-- 6. expose has_children in existing RLS policies (covered by existing profile policies)
