-- 049_subscriptions.sql
-- Tabela subskrypcji dla Stripe

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, cancelled, failed, past_due
  base_price INTEGER NOT NULL DEFAULT 9900, -- 99 zł w groszach
  extra_employee_price INTEGER NOT NULL DEFAULT 1900, -- 19 zł w groszach
  employee_count INTEGER NOT NULL DEFAULT 5,
  total_amount INTEGER NOT NULL, -- w groszach
  currency TEXT NOT NULL DEFAULT 'pln',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant_id ON public.subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Właściciele i managerowie restauracji mogą widzieć swoje subskrypcje
CREATE POLICY "Owners and managers can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Właściciele mogą tworzyć subskrypcje
CREATE POLICY "Owners can create subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

-- Właściciele mogą aktualizować subskrypcje
CREATE POLICY "Owners can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

-- Funkcja do aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();
