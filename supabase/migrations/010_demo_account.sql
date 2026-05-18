-- ============================================================
-- 010 – Demo account with full owner permissions
-- Email: demo@shiftapp.test
-- Password: Demo123!
-- ============================================================

-- 1. Create auth user
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  'de000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@shiftapp.test',
  crypt('Demo123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  now(),
  now(),
  '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('Demo123!', gen_salt('bf')),
  email_confirmed_at = now();

-- 2. Create identity
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  'de000000-0000-0000-0000-000000000001',
  'de000000-0000-0000-0000-000000000001',
  'demo@shiftapp.test',
  format('{"sub":"%s","email":"%s"}', 'de000000-0000-0000-0000-000000000001', 'demo@shiftapp.test')::jsonb,
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 3. Create demo restaurant
INSERT INTO public.restaurants (id, name, address, phone, owner_id, plan, logo_color, created_at)
VALUES (
  'de000000-0001-0000-0000-000000000001',
  'Demo Restaurant',
  'ul. Testowa 1, 00-001 Warszawa',
  '+48 000 000 000',
  'de000000-0000-0000-0000-000000000001',
  'premium',
  '#2563EB',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 4. Create profile with owner role
INSERT INTO public.profiles (
  id, restaurant_id, first_name, last_name,
  role, job_title, avatar_color, is_active,
  onboarding_done, created_at
)
VALUES (
  'de000000-0000-0000-0000-000000000001',
  'de000000-0001-0000-0000-000000000001',
  'Demo',
  'Admin',
  'owner',
  'Administrator',
  '#2563EB',
  true,
  true,
  now()
)
ON CONFLICT (id) DO NOTHING;
