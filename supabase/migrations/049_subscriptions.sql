-- 049_subscriptions.sql
-- Dodanie brakujących kolumn do istniejącej tabeli subscriptions

-- Dodaj kolumny Stripe jeśli nie istnieją
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Dodaj kolumny wymagane przez frontend
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS base_price INTEGER DEFAULT 9900;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS extra_employee_price INTEGER DEFAULT 1900;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 5;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS total_amount INTEGER;

-- Stwórz prosty widok dla API (obejście problemu z constraintami)
DROP VIEW IF EXISTS public.subscriptions_api;
CREATE VIEW public.subscriptions_api AS
SELECT 
  id,
  restaurant_id,
  status,
  current_period_start,
  current_period_end,
  base_price,
  extra_employee_price,
  employee_count,
  total_amount,
  plan,
  amount,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_payment_intent_id,
  stripe_checkout_session_id,
  created_at,
  updated_at
FROM public.subscriptions;

-- Nadaj uprawnienia do widoku
GRANT SELECT ON public.subscriptions_api TO anon;
GRANT SELECT ON public.subscriptions_api TO authenticated;

-- Indexy
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_payment_intent_id ON public.subscriptions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_checkout_session_id ON public.subscriptions(stripe_checkout_session_id);

-- RLS Policies
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- Funkcja do aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_subscriptions_updated_at ON public.subscriptions;

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();
