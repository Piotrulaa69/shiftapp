-- 051_subscriptions_currency.sql
-- Dodaj brakującą kolumnę currency do tabeli subscriptions

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'pln';
