-- 050_restaurants_stripe_customer_id.sql
-- Dodanie kolumny stripe_customer_id do tabeli restaurants

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
