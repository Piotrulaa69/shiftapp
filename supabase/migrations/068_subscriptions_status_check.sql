-- 068_subscriptions_status_check.sql
-- The live subscriptions table has a status CHECK constraint that rejects 'trial'
-- (the table was drifted toward Stripe statuses like 'trialing'), so
-- super_admin_extend_trial's INSERT with status='trial' fails:
--   new row for relation "subscriptions" violates check constraint "subscriptions_status_check"
--
-- The whole app reads status === 'trial' / 'active' (SubscriptionContext, TrialBanner),
-- so 'trial' MUST be a valid value. Recreate the constraint as a permissive superset
-- covering both the app's canonical values and common Stripe values. ADD ... NOT VALID
-- so the migration never fails on any pre-existing row with an unexpected status.

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'trial', 'active', 'overdue', 'cancelled', 'paused',           -- app canonical
    'trialing', 'past_due', 'canceled', 'unpaid',                  -- Stripe
    'incomplete', 'incomplete_expired', 'expired'
  ))
  NOT VALID;
