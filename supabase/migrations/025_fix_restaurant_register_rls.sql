-- ══════════════════════════════════════════════════════
-- 025: Allow authenticated users to INSERT restaurants
-- Without this policy, self-registration fails with 403
-- because no profile exists yet when the restaurant row
-- is being created (chicken-and-egg problem).
-- ══════════════════════════════════════════════════════

CREATE POLICY "authenticated_create_restaurant" ON public.restaurants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
