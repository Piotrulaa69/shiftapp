-- ══════════════════════════════════════════════════════
-- 023: Super-admin restaurant creation + subscriptions
-- ══════════════════════════════════════════════════════

-- 1. Super-admin can INSERT and UPDATE restaurants
DROP POLICY IF EXISTS "sa_insert_restaurants" ON public.restaurants;
CREATE POLICY "sa_insert_restaurants" ON public.restaurants
  FOR INSERT WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

DROP POLICY IF EXISTS "sa_update_restaurants" ON public.restaurants;
CREATE POLICY "sa_update_restaurants" ON public.restaurants
  FOR UPDATE USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- 2. Super-admin can manage all invitations (create owner invites for new restaurants)
DROP POLICY IF EXISTS "sa_manage_invitations" ON public.invitations;
CREATE POLICY "sa_manage_invitations" ON public.invitations
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  ) WITH CHECK (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- 3. Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id        uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan                 text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic','premium','enterprise')),
  status               text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','overdue','cancelled','paused')),
  billing_period       text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','annual')),
  amount               numeric(10,2) NOT NULL DEFAULT 0.00,
  currency             text NOT NULL DEFAULT 'PLN',
  trial_ends_at        date,
  current_period_start date,
  current_period_end   date,
  last_payment_date    date,
  next_payment_date    date,
  notes                text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  UNIQUE(restaurant_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- SA has full access
DROP POLICY IF EXISTS "sa_manage_subscriptions" ON public.subscriptions;
CREATE POLICY "sa_manage_subscriptions" ON public.subscriptions
  FOR ALL USING (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Owners can view their own subscription
DROP POLICY IF EXISTS "owners_read_own_subscription" ON public.subscriptions;
CREATE POLICY "owners_read_own_subscription" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND restaurant_id = subscriptions.restaurant_id
        AND role = 'owner'
    )
  );
