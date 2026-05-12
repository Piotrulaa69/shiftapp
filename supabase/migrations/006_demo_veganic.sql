-- ============================================================
-- ShiftApp – Mock Data Seed v2  (Spektakulinarna)
-- Paste into: Supabase → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────
-- Demo logins:
--   admin@spektakulinarna.pl     / (existing owner account)
--   manager@spektakulinarna.pl   / Demo1234!
--   michal@spektakulinarna.pl    / Demo1234!
--   katarzyna@spektakulinarna.pl / Demo1234!
--   tomasz@spektakulinarna.pl    / Demo1234!
--   monika@spektakulinarna.pl    / Demo1234!
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- CONSTANTS used throughout:
--   REST  = aaaaaaaa-0001-0000-0000-000000000001
--   OWNER = 83e77ab9-51da-45b2-88d5-c0eaed13bbdf
--   MGR   = bbbbbbbb-0001-0000-0000-000000000001
--   EMP1  = bbbbbbbb-0001-0000-0000-000000000002  (Michał Wiśniewski,  Kelner)
--   EMP2  = bbbbbbbb-0001-0000-0000-000000000003  (Katarzyna Zając,    Barista)
--   EMP3  = bbbbbbbb-0001-0000-0000-000000000004  (Tomasz Wróbel,      Kucharz)
--   EMP4  = bbbbbbbb-0001-0000-0000-000000000005  (Monika Lewandowska, Lider)
-- ──────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════
-- 1. AUTH USERS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
   created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000','bbbbbbbb-0001-0000-0000-000000000001','authenticated','authenticated',
   'manager@spektakulinarna.pl', crypt('Demo1234!',gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}','{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000','bbbbbbbb-0001-0000-0000-000000000002','authenticated','authenticated',
   'michal@spektakulinarna.pl',  crypt('Demo1234!',gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}','{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000','bbbbbbbb-0001-0000-0000-000000000003','authenticated','authenticated',
   'katarzyna@spektakulinarna.pl', crypt('Demo1234!',gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}','{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000','bbbbbbbb-0001-0000-0000-000000000004','authenticated','authenticated',
   'tomasz@spektakulinarna.pl',  crypt('Demo1234!',gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}','{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000','bbbbbbbb-0001-0000-0000-000000000005','authenticated','authenticated',
   'monika@spektakulinarna.pl',  crypt('Demo1234!',gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}','{}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 2. AUTH IDENTITIES (required for email login to work)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('manager@spektakulinarna.pl',   'bbbbbbbb-0001-0000-0000-000000000001',
   '{"sub":"bbbbbbbb-0001-0000-0000-000000000001","email":"manager@spektakulinarna.pl"}','email',NOW(),NOW(),NOW()),
  ('michal@spektakulinarna.pl',    'bbbbbbbb-0001-0000-0000-000000000002',
   '{"sub":"bbbbbbbb-0001-0000-0000-000000000002","email":"michal@spektakulinarna.pl"}', 'email',NOW(),NOW(),NOW()),
  ('katarzyna@spektakulinarna.pl', 'bbbbbbbb-0001-0000-0000-000000000003',
   '{"sub":"bbbbbbbb-0001-0000-0000-000000000003","email":"katarzyna@spektakulinarna.pl"}','email',NOW(),NOW(),NOW()),
  ('tomasz@spektakulinarna.pl',    'bbbbbbbb-0001-0000-0000-000000000004',
   '{"sub":"bbbbbbbb-0001-0000-0000-000000000004","email":"tomasz@spektakulinarna.pl"}', 'email',NOW(),NOW(),NOW()),
  ('monika@spektakulinarna.pl',    'bbbbbbbb-0001-0000-0000-000000000005',
   '{"sub":"bbbbbbbb-0001-0000-0000-000000000005","email":"monika@spektakulinarna.pl"}', 'email',NOW(),NOW(),NOW())
ON CONFLICT (provider_id, provider) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 3. PROFILES
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.profiles
  (id, restaurant_id, first_name, last_name, role, job_title, avatar_color,
   is_active, onboarding_done, employment_type, max_hours_weekly, max_hours_monthly, phone)
VALUES
  ('bbbbbbbb-0001-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001',
   'Anna','Kowalska','manager','Manager zmiany','#7C3AED',true,true,'full_time',40,168,'+48 500 100 200'),
  ('bbbbbbbb-0001-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001',
   'Michał','Wiśniewski','employee','Kelner','#2563EB',true,true,'full_time',40,168,'+48 500 200 300'),
  ('bbbbbbbb-0001-0000-0000-000000000003','aaaaaaaa-0001-0000-0000-000000000001',
   'Katarzyna','Zając','employee','Barista','#F97316',true,true,'part_time',20,88,'+48 500 300 400'),
  ('bbbbbbbb-0001-0000-0000-000000000004','aaaaaaaa-0001-0000-0000-000000000001',
   'Tomasz','Wróbel','employee','Kucharz','#22C55E',true,true,'full_time',40,168,'+48 500 400 500'),
  ('bbbbbbbb-0001-0000-0000-000000000005','aaaaaaaa-0001-0000-0000-000000000001',
   'Monika','Lewandowska','employee','Lider zmiany','#EF4444',true,true,'contract',32,140,'+48 500 500 600')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 4. RESTAURANT UPDATE
-- ═══════════════════════════════════════════════════════════════
UPDATE public.restaurants
SET clock_in_method = 'pin', plan = 'premium', late_threshold_min = 5, clock_in_window_min = 15
WHERE id = 'aaaaaaaa-0001-0000-0000-000000000001';

UPDATE public.profiles
SET onboarding_done = true
WHERE id = '83e77ab9-51da-45b2-88d5-c0eaed13bbdf';


-- ═══════════════════════════════════════════════════════════════
-- 5. LEAVE TYPES (ensure exist)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.leave_types (restaurant_id, name, days_per_year, requires_attachment, requires_comment)
VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001','Urlop wypoczynkowy',26,false,false),
  ('aaaaaaaa-0001-0000-0000-000000000001','Urlop na żądanie',4,false,true),
  ('aaaaaaaa-0001-0000-0000-000000000001','L4 – zwolnienie lekarskie',0,true,false),
  ('aaaaaaaa-0001-0000-0000-000000000001','Opieka nad dzieckiem',2,false,true)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 6. SHIFTS  (-3 to +14 days)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.shifts
  (id, restaurant_id, employee_id, employee_name, job_title, start_time, end_time, day, location, status, pin_code)
VALUES
-- Michał Wiśniewski
  ('cccccccc-0001-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002','Michał Wiśniewski','Kelner','09:00','17:00',CURRENT_DATE-3,'Sala','potwierdzona','1234'),
  ('cccccccc-0001-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002','Michał Wiśniewski','Kelner','12:00','20:00',CURRENT_DATE-2,'Sala','potwierdzona','1234'),
  ('cccccccc-0001-0000-0000-000000000003','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002','Michał Wiśniewski','Kelner','08:00','16:00',CURRENT_DATE-1,'Sala','potwierdzona','1234'),
  ('cccccccc-0001-0000-0000-000000000004','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002','Michał Wiśniewski','Kelner','10:00','18:00',CURRENT_DATE,  'Sala','potwierdzona','1234'),
  ('cccccccc-0001-0000-0000-000000000005','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002','Michał Wiśniewski','Kelner','08:00','16:00',CURRENT_DATE+1,'Sala','zaplanowana','1234'),
  ('cccccccc-0001-0000-0000-000000000006','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002','Michał Wiśniewski','Kelner','12:00','20:00',CURRENT_DATE+2,'Sala','zaplanowana','1234'),
  ('cccccccc-0001-0000-0000-000000000007','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002','Michał Wiśniewski','Kelner','09:00','17:00',CURRENT_DATE+7,'Sala','do_potwierdzenia','1234'),
  ('cccccccc-0001-0000-0000-000000000008','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002','Michał Wiśniewski','Kelner','08:00','16:00',CURRENT_DATE+8,'Sala','do_potwierdzenia','1234'),
  ('cccccccc-0001-0000-0000-000000000009','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002','Michał Wiśniewski','Kelner','12:00','20:00',CURRENT_DATE+14,'Sala','zaplanowana','1234'),
-- Katarzyna Zając
  ('cccccccc-0001-0000-0000-000000000011','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003','Katarzyna Zając','Barista','07:00','15:00',CURRENT_DATE-2,'Bar','potwierdzona','5678'),
  ('cccccccc-0001-0000-0000-000000000012','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003','Katarzyna Zając','Barista','07:00','15:00',CURRENT_DATE-1,'Bar','potwierdzona','5678'),
  ('cccccccc-0001-0000-0000-000000000013','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003','Katarzyna Zając','Barista','07:00','15:00',CURRENT_DATE,  'Bar','potwierdzona','5678'),
  ('cccccccc-0001-0000-0000-000000000014','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003','Katarzyna Zając','Barista','07:00','15:00',CURRENT_DATE+1,'Bar','zaplanowana','5678'),
  ('cccccccc-0001-0000-0000-000000000015','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003','Katarzyna Zając','Barista','07:00','15:00',CURRENT_DATE+7,'Bar','zaplanowana','5678'),
  ('cccccccc-0001-0000-0000-000000000016','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003','Katarzyna Zając','Barista','07:00','15:00',CURRENT_DATE+8,'Bar','zaplanowana','5678'),
-- Tomasz Wróbel
  ('cccccccc-0001-0000-0000-000000000021','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004','Tomasz Wróbel','Kucharz','06:00','14:00',CURRENT_DATE-3,'Kuchnia','potwierdzona','9012'),
  ('cccccccc-0001-0000-0000-000000000022','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004','Tomasz Wróbel','Kucharz','06:00','14:00',CURRENT_DATE-2,'Kuchnia','potwierdzona','9012'),
  ('cccccccc-0001-0000-0000-000000000023','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004','Tomasz Wróbel','Kucharz','06:00','14:00',CURRENT_DATE-1,'Kuchnia','potwierdzona','9012'),
  ('cccccccc-0001-0000-0000-000000000024','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004','Tomasz Wróbel','Kucharz','06:00','14:00',CURRENT_DATE,  'Kuchnia','potwierdzona','9012'),
  ('cccccccc-0001-0000-0000-000000000025','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004','Tomasz Wróbel','Kucharz','06:00','14:00',CURRENT_DATE+1,'Kuchnia','zaplanowana','9012'),
  ('cccccccc-0001-0000-0000-000000000026','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004','Tomasz Wróbel','Kucharz','06:00','14:00',CURRENT_DATE+2,'Kuchnia','zaplanowana','9012'),
  ('cccccccc-0001-0000-0000-000000000027','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004','Tomasz Wróbel','Kucharz','14:00','22:00',CURRENT_DATE+7,'Kuchnia','do_potwierdzenia','9012'),
-- Monika Lewandowska
  ('cccccccc-0001-0000-0000-000000000031','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005','Monika Lewandowska','Lider zmiany','14:00','22:00',CURRENT_DATE-1,'Sala','potwierdzona','3456'),
  ('cccccccc-0001-0000-0000-000000000032','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005','Monika Lewandowska','Lider zmiany','14:00','22:00',CURRENT_DATE,  'Sala','potwierdzona','3456'),
  ('cccccccc-0001-0000-0000-000000000033','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005','Monika Lewandowska','Lider zmiany','14:00','22:00',CURRENT_DATE+1,'Sala','zaplanowana','3456'),
  ('cccccccc-0001-0000-0000-000000000034','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005','Monika Lewandowska','Lider zmiany','14:00','22:00',CURRENT_DATE+2,'Sala','zaplanowana','3456'),
  ('cccccccc-0001-0000-0000-000000000035','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005','Monika Lewandowska','Lider zmiany','14:00','22:00',CURRENT_DATE+7,'Sala','do_potwierdzenia','3456'),
  ('cccccccc-0001-0000-0000-000000000036','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005','Monika Lewandowska','Lider zmiany','08:00','16:00',CURRENT_DATE+10,'Sala','zaplanowana','3456'),
-- Anna Kowalska (Manager)
  ('cccccccc-0001-0000-0000-000000000041','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000001','Anna Kowalska','Manager zmiany','08:00','16:00',CURRENT_DATE-1,'Sala','potwierdzona','7890'),
  ('cccccccc-0001-0000-0000-000000000042','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000001','Anna Kowalska','Manager zmiany','08:00','16:00',CURRENT_DATE,  'Sala','potwierdzona','7890'),
  ('cccccccc-0001-0000-0000-000000000043','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000001','Anna Kowalska','Manager zmiany','08:00','16:00',CURRENT_DATE+1,'Sala','zaplanowana','7890'),
  ('cccccccc-0001-0000-0000-000000000044','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000001','Anna Kowalska','Manager zmiany','08:00','16:00',CURRENT_DATE+7,'Sala','zaplanowana','7890')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 7. CLOCK-INS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.clock_ins
  (id, restaurant_id, shift_id, employee_id, clock_in_at, clock_out_at, method, late_minutes, overtime_min, status)
VALUES
-- Michał – wczoraj (ukończone)
  ('dddddddd-0001-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000003','bbbbbbbb-0001-0000-0000-000000000002',
   (CURRENT_DATE-1)::timestamptz + interval '8:03', (CURRENT_DATE-1)::timestamptz + interval '16:05','pin',3,0,'completed'),
-- Michał – dziś (aktywny)
  ('dddddddd-0001-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000004','bbbbbbbb-0001-0000-0000-000000000002',
   CURRENT_DATE::timestamptz + interval '10:01',NULL,'pin',1,0,'active'),
-- Katarzyna – wczoraj (ukończone, na czas)
  ('dddddddd-0001-0000-0000-000000000011','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000012','bbbbbbbb-0001-0000-0000-000000000003',
   (CURRENT_DATE-1)::timestamptz + interval '7:00', (CURRENT_DATE-1)::timestamptz + interval '15:02','pin',0,0,'completed'),
-- Katarzyna – dziś (aktywny)
  ('dddddddd-0001-0000-0000-000000000012','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000013','bbbbbbbb-0001-0000-0000-000000000003',
   CURRENT_DATE::timestamptz + interval '7:00',NULL,'pin',0,0,'active'),
-- Tomasz – wczoraj (ukończone, spóźnienie)
  ('dddddddd-0001-0000-0000-000000000021','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000023','bbbbbbbb-0001-0000-0000-000000000004',
   (CURRENT_DATE-1)::timestamptz + interval '6:12', (CURRENT_DATE-1)::timestamptz + interval '14:00','pin',12,0,'completed'),
-- Tomasz – dziś (aktywny)
  ('dddddddd-0001-0000-0000-000000000022','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000024','bbbbbbbb-0001-0000-0000-000000000004',
   CURRENT_DATE::timestamptz + interval '6:00',NULL,'pin',0,0,'active'),
-- Monika – wczoraj (ukończone, nadgodziny)
  ('dddddddd-0001-0000-0000-000000000031','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000031','bbbbbbbb-0001-0000-0000-000000000005',
   (CURRENT_DATE-1)::timestamptz + interval '14:00', (CURRENT_DATE-1)::timestamptz + interval '22:45','pin',0,45,'completed'),
-- Monika – dziś (aktywny)
  ('dddddddd-0001-0000-0000-000000000032','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000032','bbbbbbbb-0001-0000-0000-000000000005',
   CURRENT_DATE::timestamptz + interval '14:00',NULL,'pin',0,0,'active'),
-- Anna – wczoraj + dziś
  ('dddddddd-0001-0000-0000-000000000041','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000041','bbbbbbbb-0001-0000-0000-000000000001',
   (CURRENT_DATE-1)::timestamptz + interval '8:00', (CURRENT_DATE-1)::timestamptz + interval '16:00','pin',0,0,'completed'),
  ('dddddddd-0001-0000-0000-000000000042','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000042','bbbbbbbb-0001-0000-0000-000000000001',
   CURRENT_DATE::timestamptz + interval '8:00',NULL,'pin',0,0,'active')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 8. TASKS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.tasks
  (id, restaurant_id, assigned_to, title, description, assigned_time, priority, status, duration_min, confirmation_type, points)
VALUES
  ('eeeeeeee-0001-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002',
   'Przygotuj stoły na imprezę','Nakryj 8 stolików w sali VIP dla grupy 24 osób','09:00','wysoki','do_zrobienia',30,'photo',20),
  ('eeeeeeee-0001-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002',
   'Uzupełnij menu degustacyjne','Wydrukuj i rozłóż nowe menu sezonowe','11:00','normalny','w_trakcie',15,NULL,10),
  ('eeeeeeee-0001-0000-0000-000000000003','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002',
   'Sprawdź stan serwetek','Policz serwetki i zgłoś zamówienie','14:00','niski','czeka_na_zatwierdzenie',10,'values',10),
  ('eeeeeeee-0001-0000-0000-000000000004','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003',
   'Wyczyszcz ekspres do kawy','Pełny cykl czyszczenia ekspresu La Marzocco','07:30','wysoki','zatwierdzone',20,'photo',20),
  ('eeeeeeee-0001-0000-0000-000000000005','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003',
   'Sprawdź datę ważności mleka','Skontroluj wszystkie dostawy w lodówce barowej','08:00','normalny','do_zrobienia',10,'description',10),
  ('eeeeeeee-0001-0000-0000-000000000006','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003',
   'Opisz specjały dnia','Przygotuj tabliczkę z ofertą dnia na bar','09:00','normalny','zamkniete',15,NULL,10),
  ('eeeeeeee-0001-0000-0000-000000000007','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004',
   'Przygotuj bulion na zupę','Ugotuj 10 litrów bulionu warzywnego','06:30','wysoki','w_trakcie',60,'photo',20),
  ('eeeeeeee-0001-0000-0000-000000000008','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004',
   'Umyj i osusz warzywa','Przygotuj dostarczony towar do kuchni','06:00','normalny','zamkniete',25,NULL,10),
  ('eeeeeeee-0001-0000-0000-000000000009','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004',
   'Sprawdź temperaturę chłodni','Zapisz odczyty z każdej chłodni','07:00','wysoki','czeka_na_zatwierdzenie',5,'values',20),
  ('eeeeeeee-0001-0000-0000-000000000010','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005',
   'Odprawienie zmiany','Zorganizuj krótkie spotkanie przed zmianą popołudniową','13:45','wysoki','do_zrobienia',15,NULL,10),
  ('eeeeeeee-0001-0000-0000-000000000011','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005',
   'Uzupełnij raport kasowy','Wypełnij dzienny raport utargu','22:00','normalny','odrzucone',20,'values',10),
  ('eeeeeeee-0001-0000-0000-000000000012','aaaaaaaa-0001-0000-0000-000000000001',NULL,
   'Zorganizuj szkolenie BHP','Zaplanuj szkolenie dla nowych pracowników','10:00','normalny','do_zrobienia',30,NULL,20)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 9. TRAININGS (dodatkowe dla pracowników)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.trainings
  (id, restaurant_id, title, category, duration_min, progress_percent, required, status, points, deadline)
VALUES
  ('ffffffff-0001-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001',
   'Techniki sprzedaży dodatkowej','Sprzedaż',45,0,false,'nierozpoczete',30,CURRENT_DATE+30),
  ('ffffffff-0001-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001',
   'Alergeny w menu','BHP',60,40,true,'w_toku',40,CURRENT_DATE+14),
  ('ffffffff-0001-0000-0000-000000000003','aaaaaaaa-0001-0000-0000-000000000001',
   'Barista Level 1 – Espresso','Barista',90,100,false,'ukonczone',50,NULL),
  ('ffffffff-0001-0000-0000-000000000004','aaaaaaaa-0001-0000-0000-000000000001',
   'Procedury otwierania lokalu','Procedury',30,60,true,'w_toku',30,CURRENT_DATE+7),
  ('ffffffff-0001-0000-0000-000000000005','aaaaaaaa-0001-0000-0000-000000000001',
   'Zarządzanie konfliktem','Obsługa',45,0,false,'nierozpoczete',25,NULL),
  ('ffffffff-0001-0000-0000-000000000006','aaaaaaaa-0001-0000-0000-000000000001',
   'Kuchnia molekularna – intro','Kuchnia',120,20,false,'w_toku',60,CURRENT_DATE+60)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 10. LEAVE REQUESTS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.leave_requests
  (id, restaurant_id, employee_id, leave_type_id, date_from, date_to, days_count, status, comment, reviewed_by, review_comment, reviewed_at)
VALUES
  -- Michał – oczekujący (urlop wakacyjny)
  ('11111111-beef-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000002',
   (SELECT id FROM public.leave_types WHERE restaurant_id='aaaaaaaa-0001-0000-0000-000000000001' AND name='Urlop wypoczynkowy' LIMIT 1),
   CURRENT_DATE+20, CURRENT_DATE+30, 10, 'pending','Planowane wakacje z rodziną',NULL,NULL,NULL),
  -- Katarzyna – zatwierdzony
  ('11111111-beef-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000003',
   (SELECT id FROM public.leave_types WHERE restaurant_id='aaaaaaaa-0001-0000-0000-000000000001' AND name='Urlop wypoczynkowy' LIMIT 1),
   CURRENT_DATE-14, CURRENT_DATE-10, 5, 'approved','Urlop zaplanowany wcześniej',
   '83e77ab9-51da-45b2-88d5-c0eaed13bbdf','Zatwierdzono, dobrej zabawy!',NOW()-interval '15 days'),
  -- Tomasz – odrzucony
  ('11111111-beef-0000-0000-000000000003','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000004',
   (SELECT id FROM public.leave_types WHERE restaurant_id='aaaaaaaa-0001-0000-0000-000000000001' AND name='Urlop na żądanie' LIMIT 1),
   CURRENT_DATE+3, CURRENT_DATE+3, 1, 'rejected','Pilna sprawa osobista',
   '83e77ab9-51da-45b2-88d5-c0eaed13bbdf','Zbyt mała obsada w tym terminie',NOW()-interval '2 days'),
  -- Monika – oczekujący (L4)
  ('11111111-beef-0000-0000-000000000004','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000005',
   (SELECT id FROM public.leave_types WHERE restaurant_id='aaaaaaaa-0001-0000-0000-000000000001' AND name='L4 – zwolnienie lekarskie' LIMIT 1),
   CURRENT_DATE+5, CURRENT_DATE+9, 5, 'pending','Planowany zabieg',NULL,NULL,NULL)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 11. ABSENCES
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.absences
  (id, restaurant_id, shift_id, employee_id, absence_type, description, status, reviewed_by)
VALUES
  -- Tomasz – nieobecność nieusprawiedliwiona (czeka)
  ('22222222-beef-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000022','bbbbbbbb-0001-0000-0000-000000000004',
   'other','Brak kontaktu z pracownikiem','pending',NULL),
  -- Michał – siła wyższa (zatwierdzona)
  ('22222222-beef-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002',
   'force_majeure','Awaria auta, spóźnienie','approved','83e77ab9-51da-45b2-88d5-c0eaed13bbdf')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 12. SHIFT SWAPS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.shift_swaps
  (id, restaurant_id, requester_id, responder_id, requester_shift, responder_shift, swap_type, status)
VALUES
  -- Michał prosi Monikę o zamianę (oczekuje odpowiedzi)
  ('33333333-beef-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000002','bbbbbbbb-0001-0000-0000-000000000005',
   'cccccccc-0001-0000-0000-000000000005','cccccccc-0001-0000-0000-000000000033','swap','pending_responder'),
  -- Katarzyna oddaje zmianę Tomaszowi (czeka na managera)
  ('33333333-beef-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000003','bbbbbbbb-0001-0000-0000-000000000004',
   'cccccccc-0001-0000-0000-000000000015',NULL,'give','pending_manager'),
  -- Zatwierdzona zamiana
  ('33333333-beef-0000-0000-000000000003','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000004','bbbbbbbb-0001-0000-0000-000000000002',
   'cccccccc-0001-0000-0000-000000000021','cccccccc-0001-0000-0000-000000000001','swap','approved')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 13. DOCUMENTS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.documents
  (id, restaurant_id, employee_id, name, doc_type, status, expires_at, uploaded_by)
VALUES
  ('44444444-beef-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000002','Umowa o pracę – Michał Wiśniewski','contract','active',
   CURRENT_DATE+365,'83e77ab9-51da-45b2-88d5-c0eaed13bbdf'),
  ('44444444-beef-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000002','Certyfikat BHP 2024','certificate','expiring',
   CURRENT_DATE+20,'83e77ab9-51da-45b2-88d5-c0eaed13bbdf'),
  ('44444444-beef-0000-0000-000000000003','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000003','Umowa zlecenie – Katarzyna Zając','contract','active',
   CURRENT_DATE+180,'83e77ab9-51da-45b2-88d5-c0eaed13bbdf'),
  ('44444444-beef-0000-0000-000000000004','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000004','Umowa o pracę – Tomasz Wróbel','contract','active',
   CURRENT_DATE+300,'83e77ab9-51da-45b2-88d5-c0eaed13bbdf'),
  ('44444444-beef-0000-0000-000000000005','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000004','Książeczka sanepidowska','certificate','expired',
   CURRENT_DATE-30,'83e77ab9-51da-45b2-88d5-c0eaed13bbdf'),
  ('44444444-beef-0000-0000-000000000006','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000005','Umowa o pracę – Monika Lewandowska','contract','active',
   CURRENT_DATE+200,'83e77ab9-51da-45b2-88d5-c0eaed13bbdf')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 14. POINTS LEDGER
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.points_ledger
  (id, restaurant_id, employee_id, points, event_type, description, period_start)
VALUES
  -- Michał
  ('55555555-beef-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002',10,'clock_in_on_time','Clock-in na czas',CURRENT_DATE-3),
  ('55555555-beef-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002',10,'clock_in_on_time','Clock-in na czas',CURRENT_DATE-2),
  ('55555555-beef-0000-0000-000000000003','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002',20,'task_completed','Zadanie: Wyczyszcz ekspres',CURRENT_DATE-1),
  ('55555555-beef-0000-0000-000000000004','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002',30,'training_completed','Szkolenie: Obsługa kasy',CURRENT_DATE-5),
  ('55555555-beef-0000-0000-000000000005','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002',25,'quiz_score','Quiz: BHP – 85%',CURRENT_DATE-4),
  -- Katarzyna
  ('55555555-beef-0000-0000-000000000011','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003',10,'clock_in_on_time','Clock-in na czas',CURRENT_DATE-2),
  ('55555555-beef-0000-0000-000000000012','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003',10,'clock_in_on_time','Clock-in na czas',CURRENT_DATE-1),
  ('55555555-beef-0000-0000-000000000013','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003',20,'task_completed','Zadanie: Wyczyszcz ekspres',CURRENT_DATE-1),
  ('55555555-beef-0000-0000-000000000014','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003',50,'training_completed','Szkolenie: Barista Level 1',CURRENT_DATE-7),
  -- Tomasz
  ('55555555-beef-0000-0000-000000000021','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004',10,'clock_in_on_time','Clock-in na czas',CURRENT_DATE-3),
  ('55555555-beef-0000-0000-000000000022','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004',20,'task_completed','Zadanie: Umyj warzywa',CURRENT_DATE-2),
  -- Monika
  ('55555555-beef-0000-0000-000000000031','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005',10,'clock_in_on_time','Clock-in na czas',CURRENT_DATE-1),
  ('55555555-beef-0000-0000-000000000032','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005',20,'task_completed','Zadanie ukończone',CURRENT_DATE-2),
  ('55555555-beef-0000-0000-000000000033','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005',30,'training_completed','Szkolenie: Procedury otwarcia',CURRENT_DATE-3),
  -- Anna (manager)
  ('55555555-beef-0000-0000-000000000041','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000001',10,'clock_in_on_time','Clock-in na czas',CURRENT_DATE-1),
  ('55555555-beef-0000-0000-000000000042','aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000001',30,'training_completed','Szkolenie: BHP',CURRENT_DATE-10)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 15. PAY RATES
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.pay_rates
  (restaurant_id, employee_id, job_title, hourly_rate, overtime_multiplier)
VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000001','Manager zmiany',32.00,1.5),
  ('aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000002','Kelner',25.00,1.5),
  ('aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000003','Barista',27.00,1.5),
  ('aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000004','Kucharz',28.00,1.5),
  ('aaaaaaaa-0001-0000-0000-000000000001','bbbbbbbb-0001-0000-0000-000000000005','Lider zmiany',30.00,1.5)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 16. CONVERSATIONS + MESSAGES
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.conversations
  (id, restaurant_id, participant_a, participant_b, last_message_at)
VALUES
  ('66666666-beef-0000-0000-000000000001','aaaaaaaa-0001-0000-0000-000000000001',
   '83e77ab9-51da-45b2-88d5-c0eaed13bbdf','bbbbbbbb-0001-0000-0000-000000000002', NOW()-interval '1 hour'),
  ('66666666-beef-0000-0000-000000000002','aaaaaaaa-0001-0000-0000-000000000001',
   '83e77ab9-51da-45b2-88d5-c0eaed13bbdf','bbbbbbbb-0001-0000-0000-000000000001', NOW()-interval '30 minutes'),
  ('66666666-beef-0000-0000-000000000003','aaaaaaaa-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000002','bbbbbbbb-0001-0000-0000-000000000005', NOW()-interval '2 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (id, conversation_id, sender_id, body, created_at) VALUES
  -- Właściciel ↔ Michał
  ('77777777-beef-0000-0000-000000000001','66666666-beef-0000-0000-000000000001',
   '83e77ab9-51da-45b2-88d5-c0eaed13bbdf','Cześć Michał, jak idzie dziś zmiana?',NOW()-interval '2 hours'),
  ('77777777-beef-0000-0000-000000000002','66666666-beef-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000002','Wszystko gra! Sala pełna, goście zadowoleni 😊',NOW()-interval '1 hour 45 min'),
  ('77777777-beef-0000-0000-000000000003','66666666-beef-0000-0000-000000000001',
   '83e77ab9-51da-45b2-88d5-c0eaed13bbdf','Super, pamiętaj o VIP o 19:00',NOW()-interval '1 hour'),
  -- Właściciel ↔ Anna
  ('77777777-beef-0000-0000-000000000011','66666666-beef-0000-0000-000000000002',
   '83e77ab9-51da-45b2-88d5-c0eaed13bbdf','Anno, potrzebuję raport z tygodnia do jutra',NOW()-interval '1 hour'),
  ('77777777-beef-0000-0000-000000000012','66666666-beef-0000-0000-000000000002',
   'bbbbbbbb-0001-0000-0000-000000000001','Jasne, przygotuję do końca dnia.',NOW()-interval '30 minutes'),
  -- Michał ↔ Monika
  ('77777777-beef-0000-0000-000000000021','66666666-beef-0000-0000-000000000003',
   'bbbbbbbb-0001-0000-0000-000000000002','Hej Monika, mogę zamienić się z tobą na piątek?',NOW()-interval '3 hours'),
  ('77777777-beef-0000-0000-000000000022','66666666-beef-0000-0000-000000000003',
   'bbbbbbbb-0001-0000-0000-000000000005','Cześć! Sprawdzę grafik i odezwę się.',NOW()-interval '2 hours 30 min'),
  ('77777777-beef-0000-0000-000000000023','66666666-beef-0000-0000-000000000003',
   'bbbbbbbb-0001-0000-0000-000000000002','Dzięki! Napisałem już wniosek w aplikacji.',NOW()-interval '2 hours')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 17. AVAILABILITY (bieżący + następny tydzień)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.availability (restaurant_id, employee_id, day, status)
SELECT 'aaaaaaaa-0001-0000-0000-000000000001'::uuid, emp::uuid, d::date, s
FROM (VALUES
  ('bbbbbbbb-0001-0000-0000-000000000002', CURRENT_DATE+1,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000002', CURRENT_DATE+2,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000002', CURRENT_DATE+3,  'unavailable'),
  ('bbbbbbbb-0001-0000-0000-000000000002', CURRENT_DATE+7,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000002', CURRENT_DATE+8,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000002', CURRENT_DATE+9,  'partial'),
  ('bbbbbbbb-0001-0000-0000-000000000003', CURRENT_DATE+1,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000003', CURRENT_DATE+2,  'unavailable'),
  ('bbbbbbbb-0001-0000-0000-000000000003', CURRENT_DATE+7,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000003', CURRENT_DATE+8,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000004', CURRENT_DATE+1,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000004', CURRENT_DATE+2,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000004', CURRENT_DATE+3,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000004', CURRENT_DATE+7,  'partial'),
  ('bbbbbbbb-0001-0000-0000-000000000004', CURRENT_DATE+8,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000005', CURRENT_DATE+1,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000005', CURRENT_DATE+2,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000005', CURRENT_DATE+3,  'unavailable'),
  ('bbbbbbbb-0001-0000-0000-000000000005', CURRENT_DATE+7,  'available'),
  ('bbbbbbbb-0001-0000-0000-000000000005', CURRENT_DATE+8,  'available')
) AS t(emp, d, s)
ON CONFLICT (employee_id, day) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- DONE ✓
-- Employees: manager, michal, katarzyna, tomasz, monika
-- All login with: Demo1234!
-- ═══════════════════════════════════════════════════════════════