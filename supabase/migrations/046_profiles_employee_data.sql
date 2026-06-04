-- Employee personal & payroll data fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date          date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address             text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pesel               text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS id_series_number    text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS citizenship         text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfz_branch          text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_office          text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pit_electronic      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_account_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_name           text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS id_card_number      text DEFAULT NULL;
