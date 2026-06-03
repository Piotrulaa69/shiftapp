-- 035_superadmin_features.sql
-- Funkcjonalności dla SuperAdmina

-- Dodanie flagi 2FA dla adminów
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT; -- dla TOTP
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_method TEXT; -- 'sms', 'email', 'totp'

-- Tabela dla kodów tymczasowych 2FA
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL, -- 'sms', 'email'
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela dla logów impersonacji (logowanie jako inny użytkownik)
CREATE TABLE IF NOT EXISTS impersonation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

-- Tabela dla zarządzania subskrypcjami (rabaty, kody)
CREATE TABLE IF NOT EXISTS subscription_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'discount', 'pause', 'extension', 'custom_price'
  value NUMERIC, -- procent rabatu lub kwota
  duration_months INTEGER, -- na ile miesięcy
  reason TEXT,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela kodów promocyjnych
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'referral', 'marketing', 'partner'
  discount_percent INTEGER NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  max_uses INTEGER, -- null = nieograniczone
  used_count INTEGER DEFAULT 0,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela przypisań kodów promocyjnych do restauracji
CREATE TABLE IF NOT EXISTS restaurant_promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, promo_code_id)
);

-- RLS
ALTER TABLE two_factor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_promo_codes ENABLE ROW LEVEL SECURITY;

-- Tylko super admin może widzieć i edytować te tabele
CREATE POLICY "superadmin_only_select"
  ON two_factor_codes FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE is_super_admin = TRUE));

CREATE POLICY "superadmin_only_insert"
  ON two_factor_codes FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE is_super_admin = TRUE));

CREATE POLICY "impersonation_logs_select"
  ON impersonation_logs FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE is_super_admin = TRUE) OR admin_id = auth.uid());

CREATE POLICY "subscription_adjustments_select"
  ON subscription_adjustments FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE is_super_admin = TRUE));

CREATE POLICY "subscription_adjustments_insert"
  ON subscription_adjustments FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE is_super_admin = TRUE));

CREATE POLICY "promo_codes_select"
  ON promo_codes FOR SELECT
  USING (TRUE);

CREATE POLICY "promo_codes_insert"
  ON promo_codes FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE is_super_admin = TRUE));

CREATE POLICY "promo_codes_update"
  ON promo_codes FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE is_super_admin = TRUE));
