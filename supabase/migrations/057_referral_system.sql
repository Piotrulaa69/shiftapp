-- Referral system: each restaurant gets a unique ref_code on creation
-- When a new restaurant registers with a ref_code, we track the referral

-- 1. Add ref_code to restaurants table
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS ref_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL;

-- 2. Generate ref_code for all existing restaurants (REF- + first 8 chars of id uppercased)
UPDATE public.restaurants
SET ref_code = 'REF-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE ref_code IS NULL;

-- 3. Table to track referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  referred_restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  referred_at TIMESTAMPTZ DEFAULT NOW(),
  discount_applied_referrer BOOLEAN DEFAULT FALSE,
  discount_applied_referred BOOLEAN DEFAULT FALSE,
  notes TEXT,
  UNIQUE(referred_restaurant_id)
);

-- 4. RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "super_admin_manage_referrals" ON public.referrals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  );

-- Owners can view their own referrals (as referrer)
CREATE POLICY "owner_view_own_referrals" ON public.referrals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.restaurants r ON r.id = p.restaurant_id
      WHERE p.id = auth.uid()
        AND r.id = referrer_restaurant_id
        AND p.role = 'owner'
    )
  );

-- 5. Function to generate a unique ref_code for new restaurants
CREATE OR REPLACE FUNCTION public.generate_ref_code(restaurant_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'REF-' || UPPER(SUBSTRING(restaurant_id::text, 1, 8));
  RETURN code;
END;
$$;
