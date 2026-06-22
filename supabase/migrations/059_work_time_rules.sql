-- 059: work time rules + clock_out reason

-- 1. Add clock_out_reason to clock_ins
ALTER TABLE public.clock_ins
  ADD COLUMN IF NOT EXISTS clock_out_reason TEXT;

-- 2. Work time rules per restaurant
CREATE TABLE IF NOT EXISTS public.work_time_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- Early arrival
  early_arrival_mode TEXT NOT NULL DEFAULT 'actual'
    CHECK (early_arrival_mode IN ('actual', 'scheduled', 'round_up', 'round_down')),
  early_arrival_round_minutes INT NOT NULL DEFAULT 5,

  -- Late arrival
  late_arrival_mode TEXT NOT NULL DEFAULT 'actual'
    CHECK (late_arrival_mode IN ('actual', 'scheduled', 'round_up', 'round_down')),
  late_arrival_round_minutes INT NOT NULL DEFAULT 5,
  late_arrival_ask_reason BOOLEAN NOT NULL DEFAULT false,

  -- Early departure
  early_departure_mode TEXT NOT NULL DEFAULT 'actual'
    CHECK (early_departure_mode IN ('actual', 'scheduled', 'round_up', 'round_down')),
  early_departure_round_minutes INT NOT NULL DEFAULT 5,
  early_departure_ask_reason BOOLEAN NOT NULL DEFAULT true,

  -- Late departure
  late_departure_mode TEXT NOT NULL DEFAULT 'actual'
    CHECK (late_departure_mode IN ('actual', 'scheduled', 'round_up', 'round_down')),
  late_departure_round_minutes INT NOT NULL DEFAULT 5,
  late_departure_ask_reason BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.work_time_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers can manage work_time_rules"
  ON public.work_time_rules FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );
