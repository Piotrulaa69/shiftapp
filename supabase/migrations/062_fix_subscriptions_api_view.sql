-- 062_fix_subscriptions_api_view.sql
-- Add missing columns to subscriptions_api view:
-- trial_ends_at, last_payment_date, next_payment_date, billing_period, currency, notes

DROP VIEW IF EXISTS public.subscriptions_api;

CREATE VIEW public.subscriptions_api AS
SELECT
  id,
  restaurant_id,
  status,
  plan,
  billing_period,
  amount,
  currency,
  trial_ends_at,
  last_payment_date,
  next_payment_date,
  notes,
  current_period_start,
  current_period_end,
  base_price,
  extra_employee_price,
  employee_count,
  total_amount,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_payment_intent_id,
  stripe_checkout_session_id,
  created_at,
  updated_at
FROM public.subscriptions;

GRANT SELECT ON public.subscriptions_api TO anon;
GRANT SELECT ON public.subscriptions_api TO authenticated;
