-- ============================================================
-- ShiftApp – Demo Seed Data
-- Run AFTER 001_initial_schema.sql
-- NOTE: Auth users must be created separately via Supabase Auth
-- (supabase auth admin create-user or dashboard).
-- This file seeds restaurants, invitations, shifts, tasks,
-- trainings using KNOWN auth user UUIDs from the demo accounts.
--
-- Demo auth accounts to create in Supabase Auth dashboard:
--   anna@cafe.pl       / demo1234   → owner, Cafe Centrum
--   marek@cafe.pl      / demo1234   → employee, Cafe Centrum
--   karolina@cafe.pl   / demo1234   → employee, Cafe Centrum
--   piotr@cafe.pl      / demo1234   → employee, Cafe Centrum
--   ola@cafe.pl        / demo1234   → employee, Cafe Centrum
--   tomasz@roma.pl     / demo1234   → owner, Pizzeria Roma
--   michal@roma.pl     / demo1234   → employee, Pizzeria Roma
--   kasia@roma.pl      / demo1234   → employee, Pizzeria Roma
--   jan@roma.pl        / demo1234   → employee, Pizzeria Roma
--
-- After creating the auth users, paste their UUIDs below.
-- ============================================================

-- ─── STEP 1: Insert restaurants ───────────────────────────
insert into public.restaurants (id, name, address, phone, plan, logo_color, created_at) values
  ('00000000-0000-0000-0000-000000000001', 'Cafe Centrum',   'ul. Marszałkowska 12, Warszawa', '+48 22 123 4567', 'premium', '#2196C9', '2025-01-01'),
  ('00000000-0000-0000-0000-000000000002', 'Pizzeria Roma',  'ul. Nowy Świat 44, Warszawa',   '+48 22 987 6543', 'basic',   '#EF4444', '2025-03-01')
on conflict (id) do nothing;

-- ─── STEP 2: Insert profiles ──────────────────────────────
-- REPLACE the UUIDs below with real auth.users UUIDs after creating accounts!
-- Format: (auth_user_uuid, restaurant_id, first_name, last_name, role, job_title, avatar_color)

insert into public.profiles (id, restaurant_id, first_name, last_name, role, job_title, avatar_color, created_at) values
  -- Cafe Centrum
  ('00000000-1000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Anna',       'Kowalska',     'owner',    'Właściciel',       '#2196C9', '2025-01-01'),
  ('00000000-1000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Marek',      'Nowak',        'employee', 'Kelner',            '#22C55E', '2025-01-10'),
  ('00000000-1000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Karolina',   'Wiśniewska',   'employee', 'Kucharz',           '#F97316', '2025-01-15'),
  ('00000000-1000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Piotr',      'Dąbrowski',    'employee', 'Kelner',            '#A855F7', '2025-02-10'),
  ('00000000-1000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Aleksandra', 'Lewandowska',  'employee', 'Barista',           '#EAB308', '2025-02-15'),
  -- Pizzeria Roma
  ('00000000-1000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'Tomasz',     'Zieliński',    'owner',    'Właściciel',        '#EF4444', '2025-03-01'),
  ('00000000-1000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'Michał',     'Nowicki',      'employee', 'Pizzaiolo',         '#0F172A', '2025-03-05'),
  ('00000000-1000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'Katarzyna',  'Maj',          'employee', 'Kelnerka',          '#A855F7', '2025-03-10'),
  ('00000000-1000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000002', 'Jan',        'Kowalczyk',    'employee', 'Kucharz',           '#22C55E', '2025-03-12')
on conflict (id) do nothing;

-- Update owner_id
update public.restaurants set owner_id = '00000000-1000-0000-0000-000000000001' where id = '00000000-0000-0000-0000-000000000001';
update public.restaurants set owner_id = '00000000-1000-0000-0000-000000000010' where id = '00000000-0000-0000-0000-000000000002';

-- ─── STEP 3: Demo invitation codes ────────────────────────
insert into public.invitations (id, restaurant_id, code, created_by, job_title, expires_at) values
  ('00000000-2000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'CAFE01', '00000000-1000-0000-0000-000000000001', 'Kelner',    now() + interval '180 days'),
  ('00000000-2000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'CAFE02', '00000000-1000-0000-0000-000000000001', 'Barista',   now() + interval '180 days'),
  ('00000000-2000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'ROMA01', '00000000-1000-0000-0000-000000000010', 'Pizzaiolo', now() + interval '180 days'),
  ('00000000-2000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'ROMA02', '00000000-1000-0000-0000-000000000010', 'Kelner',    now() + interval '180 days')
on conflict (id) do nothing;

-- ─── STEP 4: Shifts (using today's week) ──────────────────
-- We use current_date arithmetic so shifts always appear in current week
insert into public.shifts (restaurant_id, employee_id, employee_name, job_title, start_time, end_time, day, location, status) values
  -- Cafe Centrum – today (Monday offset 0)
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000001', 'Anna Kowalska',        'Kierownik zmiany', '14:00', '22:00', date_trunc('week', current_date)::date,       'Cafe Centrum',   'zaplanowana'),
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000002', 'Marek Nowak',          'Kelner',           '10:00', '18:00', date_trunc('week', current_date)::date,       'Cafe Centrum',   'potwierdzona'),
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000003', 'Karolina Wiśniewska', 'Kucharz',          '08:00', '16:00', date_trunc('week', current_date)::date,       'Kuchnia Główna', 'potwierdzona'),
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000004', 'Piotr Dąbrowski',     'Kelner',           '12:00', '20:00', date_trunc('week', current_date)::date,       'Cafe Centrum',   'do_potwierdzenia'),
  -- Tuesday
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000001', 'Anna Kowalska',        'Kierownik zmiany', '08:00', '16:00', date_trunc('week', current_date)::date + 1,  'Cafe Centrum',   'do_potwierdzenia'),
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000005', 'Aleksandra Lewandowska','Barista',         '06:00', '14:00', date_trunc('week', current_date)::date + 1,  'Bar Kawowy',     'zaplanowana'),
  -- Wednesday
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000002', 'Marek Nowak',          'Kelner',           '10:00', '18:00', date_trunc('week', current_date)::date + 2,  'Cafe Centrum',   'zaplanowana'),
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000005', 'Aleksandra Lewandowska','Barista',         'URLOP', '',      date_trunc('week', current_date)::date + 4,  '',               'urlop'),
  -- Pizzeria Roma
  ('00000000-0000-0000-0000-000000000002', '00000000-1000-0000-0000-000000000010', 'Tomasz Zieliński',    'Właściciel',       '10:00', '22:00', date_trunc('week', current_date)::date,       'Pizzeria Roma',  'potwierdzona'),
  ('00000000-0000-0000-0000-000000000002', '00000000-1000-0000-0000-000000000011', 'Michał Nowicki',      'Pizzaiolo',        '11:00', '19:00', date_trunc('week', current_date)::date,       'Kuchnia',        'potwierdzona'),
  ('00000000-0000-0000-0000-000000000002', '00000000-1000-0000-0000-000000000012', 'Katarzyna Maj',       'Kelnerka',         '12:00', '20:00', date_trunc('week', current_date)::date,       'Sala główna',    'zaplanowana'),
  ('00000000-0000-0000-0000-000000000002', '00000000-1000-0000-0000-000000000013', 'Jan Kowalczyk',       'Kucharz',          '10:00', '18:00', date_trunc('week', current_date)::date,       'Kuchnia',        'do_potwierdzenia');

-- ─── STEP 5: Tasks ────────────────────────────────────────
insert into public.tasks (restaurant_id, assigned_to, title, description, assigned_time, completed, priority, status, duration_min, confirmation_type) values
  -- Cafe Centrum
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000001', 'Przygotowanie ekspresu',        'Uruchom i skalibruj ekspres do kawy przed otwarciem. Wykonaj zdjęcie gotowej stacji kawowej.',                                      '08:00', false, 'wysoki',  'w_trakcie',  15, 'photo'),
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000002', 'Inwentaryzacja Sektora B2',     'Sprawdzenie stanów magazynowych na regałach od 10 do 25. Wymagane zdjęcia.',                                                       '15:30', false, 'wysoki',  'do_zrobienia',60, 'photo'),
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000003', 'Kontrola temperatur w lodówkach','Codzienna kontrola temperatur wszystkich urządzeń chłodniczych zgodnie z procedurą HACCP.',                                       '07:00', false, 'wysoki',  'w_trakcie',  20, 'values'),
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000004', 'Przygotowanie palet do wysyłki','Zabezpieczenie folią stretch 5 palet dla klienta XYZ.',                                                                            '17:00', false, 'normalny','do_zrobienia',45, null),
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000002', 'Kontakt z dostawcą warzyw',     'Potwierdzenie zamówienia na poniedziałek. Opisz ustalenia z rozmowy.',                                                             '14:00', false, 'normalny','do_zrobienia',15, 'description'),
  ('00000000-0000-0000-0000-000000000001', '00000000-1000-0000-0000-000000000005', 'Uzupełnienie witryny',          'Uzupełnij witrynę chłodniczą o produkty z zaplecza.',                                                                              '09:30', true,  'normalny','zamkniete',  20, null),
  -- Pizzeria Roma
  ('00000000-0000-0000-0000-000000000002', '00000000-1000-0000-0000-000000000011', 'Przygotowanie ciasta',          'Wyrobić i podzielić ciasto na 40 porcji. Pozostawić do wyrośnięcia.',                                                              '09:00', false, 'wysoki',  'w_trakcie',  45, 'photo'),
  ('00000000-0000-0000-0000-000000000002', '00000000-1000-0000-0000-000000000013', 'Kontrola temperatur',           'Sprawdzenie temperatur w lodówkach i zamrażarce.',                                                                                 '08:00', false, 'wysoki',  'do_zrobienia',15, 'values'),
  ('00000000-0000-0000-0000-000000000002', '00000000-1000-0000-0000-000000000012', 'Przygotowanie sali',            'Rozstawienie stolików, czyszczenie menu, zapalenie świec.',                                                                        '11:00', false, 'normalny','do_zrobienia',30, 'description'),
  ('00000000-0000-0000-0000-000000000002', '00000000-1000-0000-0000-000000000010', 'Zamówienie mozzarelli',         'Zamówienie 10kg mozzarelli di bufala u dostawcy.',                                                                                 '10:00', true,  'normalny','zamkniete',  10, null);

-- ─── STEP 6: Trainings ────────────────────────────────────
insert into public.trainings (restaurant_id, title, category, duration_min, progress_percent, required, status) values
  -- Cafe Centrum
  ('00000000-0000-0000-0000-000000000001', 'Podstawowe zasady BHP',         'BHP',       45, 60,  true,  'w_toku'),
  ('00000000-0000-0000-0000-000000000001', 'Obsługa kasy fiskalnej',        'Procedury', 30, 100, true,  'ukonczone'),
  ('00000000-0000-0000-0000-000000000001', 'Standardy obsługi klienta',     'Obsługa',   60, 0,   true,  'nierozpoczete'),
  ('00000000-0000-0000-0000-000000000001', 'Przygotowanie kawy espresso',   'Barista',   45, 0,   false, 'nierozpoczete'),
  ('00000000-0000-0000-0000-000000000001', 'HACCP – higiena żywności',      'BHP',       90, 30,  true,  'w_toku'),
  -- Pizzeria Roma
  ('00000000-0000-0000-0000-000000000002', 'Obsługa pieca do pizzy',        'Kuchnia',   60, 100, true,  'ukonczone'),
  ('00000000-0000-0000-0000-000000000002', 'HACCP – higiena żywności',      'BHP',       90, 40,  true,  'w_toku'),
  ('00000000-0000-0000-0000-000000000002', 'Standardy serwisu włoskiego',   'Obsługa',   45, 0,   false, 'nierozpoczete');
