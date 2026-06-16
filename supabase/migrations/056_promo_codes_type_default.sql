-- 056: Add default value to promo_codes.type column
-- Fixes NOT NULL constraint issue when creating promo codes without explicit type

ALTER TABLE public.promo_codes
  ALTER COLUMN type SET DEFAULT 'referral';

-- Also ensure super-admin can manage promo codes
DROP POLICY IF EXISTS "super_admin_manage_promo_codes" ON public.promo_codes;
CREATE POLICY "super_admin_manage_promo_codes" ON public.promo_codes
  FOR ALL
  USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  )
  WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Allow authenticated users to read active promo codes (for applying them)
DROP POLICY IF EXISTS "promo_codes_select_authenticated" ON public.promo_codes;
CREATE POLICY "promo_codes_select_authenticated" ON public.promo_codes
  FOR SELECT
  USING (is_active = true OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true);
