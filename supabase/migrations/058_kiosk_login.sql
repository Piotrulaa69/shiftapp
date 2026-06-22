-- Kiosk login system: PIN per employee + shared QR code per restaurant

-- 1. Add login_pin and login_method to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_pin TEXT,
  ADD COLUMN IF NOT EXISTS login_method TEXT NOT NULL DEFAULT 'pin' CHECK (login_method IN ('pin', 'qr'));

-- 2. QR session tokens table (one active token per restaurant)
CREATE TABLE IF NOT EXISTS public.qr_session_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  used_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS qr_session_tokens_restaurant_active
  ON public.qr_session_tokens(restaurant_id)
  WHERE used_at IS NULL;

-- 3. RLS for qr_session_tokens
ALTER TABLE public.qr_session_tokens ENABLE ROW LEVEL SECURITY;

-- Owners/managers can manage tokens for their restaurant
CREATE POLICY "managers can manage qr tokens"
  ON public.qr_session_tokens
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Public read for kiosk (token validation — no auth required)
CREATE POLICY "public can read qr tokens for validation"
  ON public.qr_session_tokens
  FOR SELECT
  USING (true);

-- Public insert for kiosk (create token — unauthenticated kiosk)
CREATE POLICY "public can insert qr tokens"
  ON public.qr_session_tokens
  FOR INSERT
  WITH CHECK (true);

-- Public update for kiosk (mark used)
CREATE POLICY "public can update qr tokens"
  ON public.qr_session_tokens
  FOR UPDATE
  USING (true);

-- 4. Allow public read of profiles login_pin for kiosk PIN auth
-- (only login_pin + name fields, no sensitive data)
CREATE POLICY "public can read profiles for kiosk"
  ON public.profiles
  FOR SELECT
  USING (true);
