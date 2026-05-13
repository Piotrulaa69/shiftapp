-- ============================================================
-- 009 – Add veganic.restaurant owner profile
-- Fixes login issue for biuro@veganic.restaurant user
-- ============================================================

-- Get the auth user ID for biuro@veganic.restaurant
-- This needs to be run after verifying the user exists in auth.users
-- Replace the UUID below with the actual user ID from auth.users

-- First, let's check if veganic restaurant exists - if not, create it
insert into public.restaurants (id, name, address, phone, plan, logo_color, created_at)
values
  ('aaaaaaaa-0003-0000-0000-000000000003', 'Veganic', 'ul. Dobra 12, 00-312 Warszawa', '+48 123 456 789', 'premium', '#22C55E', now())
on conflict (id) do nothing;

-- NOTE: The auth user ID for biuro@veganic.restaurant needs to be looked up
-- in Supabase Dashboard > Authentication > Users
-- Replace the placeholder below with the actual UUID

-- After getting the UUID from auth.users, run:
-- insert into public.profiles (id, restaurant_id, first_name, last_name, role, job_title, avatar_color, is_active, created_at)
-- values
--   ('<ACTUAL_AUTH_USER_UUID_HERE>', 'aaaaaaaa-0003-0000-0000-000000000003', 'Admin', 'Veganic', 'owner', 'Właściciel', '#22C55E', true, now())
-- on conflict (id) do nothing;

-- Update restaurant owner_id
-- update public.restaurants set owner_id = '<ACTUAL_AUTH_USER_UUID_HERE>' where id = 'aaaaaaaa-0003-0000-0000-000000000003';
