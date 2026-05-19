-- ============================================================
-- 011 – Demo employee account (limited permissions)
-- Email: pracownik@shiftapp.test
-- Password: Demo123!
-- Role: employee (linked to Demo Restaurant)
-- ============================================================

-- 1. Create auth user
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  'de000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'pracownik@shiftapp.test',
  crypt('Demo123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false, now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('Demo123!', gen_salt('bf')),
  email_confirmed_at = now();

-- 2. Create identity
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES (
  'de000000-0000-0000-0000-000000000002',
  'de000000-0000-0000-0000-000000000002',
  'pracownik@shiftapp.test',
  format('{"sub":"%s","email":"%s"}', 'de000000-0000-0000-0000-000000000002', 'pracownik@shiftapp.test')::jsonb,
  'email', now(), now(), now()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 3. Create employee profile (linked to Demo Restaurant)
INSERT INTO public.profiles (
  id, restaurant_id, first_name, last_name,
  role, job_title, avatar_color, is_active,
  onboarding_done, created_at
) VALUES (
  'de000000-0000-0000-0000-000000000002',
  'de000000-0001-0000-0000-000000000001',
  'Jan',
  'Kowalski',
  'employee',
  'Kelner',
  '#10B981',
  true,
  true,
  now()
)
ON CONFLICT (id) DO NOTHING;
