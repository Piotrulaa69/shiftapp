-- 066_subscriptions_plan_id_nullable.sql
-- The live `subscriptions` table has an out-of-band `plan_id` column (NOT NULL)
-- that was never defined in any migration. The app uses the text `plan` column
-- ('basic'/'premium'), never plan_id, and the super_admin_mark_paid /
-- super_admin_extend_trial INSERTs don't set it — causing:
--   null value in column "plan_id" of relation "subscriptions" violates not-null
-- Make plan_id nullable so admin inserts succeed. No-op if the column is absent.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'subscriptions'
      AND column_name = 'plan_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.subscriptions ALTER COLUMN plan_id DROP NOT NULL';
  END IF;
END $$;
