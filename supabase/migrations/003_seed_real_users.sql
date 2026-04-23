-- ============================================================
-- ShiftApp – Real User Seed
-- Auth users already created in Supabase Dashboard:
--   admin@spektakulinarna.pl  → 83e77ab9-51da-45b2-88d5-c0eaed13bbdf
--   admin@donutspot.pl        → 05293379-2dfe-412e-bcd0-1cee2e5d803b
-- ============================================================

-- ── 1. Restaurants ───────────────────────────────────────────
insert into public.restaurants (id, name, address, phone, plan, logo_color, created_at)
values
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Spektakulinarna',  'ul. Smaczna 1, Warszawa',   '+48 500 100 200', 'premium', '#2196C9', now()),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'Donut Spot',       'ul. Słodka 12, Kraków',     '+48 500 300 400', 'basic',   '#F97316', now())
on conflict (id) do nothing;

-- ── 2. Profiles (owners) ─────────────────────────────────────
insert into public.profiles (id, restaurant_id, first_name, last_name, role, job_title, avatar_color, is_active, created_at)
values
  ('83e77ab9-51da-45b2-88d5-c0eaed13bbdf', 'aaaaaaaa-0001-0000-0000-000000000001', 'Admin', 'Spektakulinarna', 'owner', 'Właściciel', '#2196C9', true, now()),
  ('05293379-2dfe-412e-bcd0-1cee2e5d803b', 'aaaaaaaa-0002-0000-0000-000000000002', 'Admin', 'Donut Spot',      'owner', 'Właściciel', '#F97316', true, now())
on conflict (id) do nothing;

-- ── 3. Set owner_id on restaurants ───────────────────────────
update public.restaurants set owner_id = '83e77ab9-51da-45b2-88d5-c0eaed13bbdf' where id = 'aaaaaaaa-0001-0000-0000-000000000001';
update public.restaurants set owner_id = '05293379-2dfe-412e-bcd0-1cee2e5d803b' where id = 'aaaaaaaa-0002-0000-0000-000000000002';

-- ── 4. Demo invitation codes (always valid) ──────────────────
insert into public.invitations (restaurant_id, code, created_by, job_title, expires_at)
values
  ('aaaaaaaa-0001-0000-0000-000000000001', 'SPKT01', '83e77ab9-51da-45b2-88d5-c0eaed13bbdf', 'Kelner',    now() + interval '180 days'),
  ('aaaaaaaa-0001-0000-0000-000000000001', 'SPKT02', '83e77ab9-51da-45b2-88d5-c0eaed13bbdf', 'Kucharz',   now() + interval '180 days'),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'DNUT01', '05293379-2dfe-412e-bcd0-1cee2e5d803b', 'Barista',   now() + interval '180 days'),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'DNUT02', '05293379-2dfe-412e-bcd0-1cee2e5d803b', 'Sprzątanie',now() + interval '180 days')
on conflict do nothing;

-- ── 5. Sample shifts (current week) ──────────────────────────
insert into public.shifts (restaurant_id, employee_id, employee_name, job_title, start_time, end_time, day, location, status)
values
  ('aaaaaaaa-0001-0000-0000-000000000001', '83e77ab9-51da-45b2-88d5-c0eaed13bbdf', 'Admin Spektakulinarna', 'Właściciel', '10:00', '18:00', date_trunc('week', current_date)::date,      'Restauracja',   'potwierdzona'),
  ('aaaaaaaa-0001-0000-0000-000000000001', '83e77ab9-51da-45b2-88d5-c0eaed13bbdf', 'Admin Spektakulinarna', 'Właściciel', '12:00', '20:00', date_trunc('week', current_date)::date + 1,  'Restauracja',   'zaplanowana'),
  ('aaaaaaaa-0002-0000-0000-000000000002', '05293379-2dfe-412e-bcd0-1cee2e5d803b', 'Admin Donut Spot',      'Właściciel', '09:00', '17:00', date_trunc('week', current_date)::date,      'Donut Spot HQ', 'potwierdzona'),
  ('aaaaaaaa-0002-0000-0000-000000000002', '05293379-2dfe-412e-bcd0-1cee2e5d803b', 'Admin Donut Spot',      'Właściciel', '08:00', '16:00', date_trunc('week', current_date)::date + 2,  'Donut Spot HQ', 'zaplanowana');

-- ── 6. Sample tasks ───────────────────────────────────────────
insert into public.tasks (restaurant_id, assigned_to, title, description, assigned_time, completed, priority, status, duration_min, confirmation_type)
values
  ('aaaaaaaa-0001-0000-0000-000000000001', '83e77ab9-51da-45b2-88d5-c0eaed13bbdf', 'Przygotowanie sali',       'Przygotuj salę do otwarcia, ustaw stoły i krzesła.',         '08:00', false, 'wysoki',  'do_zrobienia', 30, 'photo'),
  ('aaaaaaaa-0001-0000-0000-000000000001', '83e77ab9-51da-45b2-88d5-c0eaed13bbdf', 'Kontrola temperatur',      'Sprawdź temperatury w lodówkach zgodnie z HACCP.',           '07:30', false, 'wysoki',  'w_trakcie',    20, 'values'),
  ('aaaaaaaa-0001-0000-0000-000000000001', '83e77ab9-51da-45b2-88d5-c0eaed13bbdf', 'Zamówienie u dostawcy',    'Potwierdź zamówienie warzyw na jutro.',                      '14:00', false, 'normalny','do_zrobienia', 15, 'description'),
  ('aaaaaaaa-0001-0000-0000-000000000001', '83e77ab9-51da-45b2-88d5-c0eaed13bbdf', 'Sprzątanie kuchni',        'Gruntowne sprzątanie kuchni po zamknięciu.',                 '22:00', true,  'normalny','zamkniete',    45, null),
  ('aaaaaaaa-0002-0000-0000-000000000002', '05293379-2dfe-412e-bcd0-1cee2e5d803b', 'Przygotowanie ciasta',     'Wyrobić ciasto na 50 porcji pączków.',                      '06:00', false, 'wysoki',  'w_trakcie',    60, 'photo'),
  ('aaaaaaaa-0002-0000-0000-000000000002', '05293379-2dfe-412e-bcd0-1cee2e5d803b', 'Kontrola jakości',         'Sprawdź jakość gotowych pączków przed otwarciem.',           '08:00', false, 'wysoki',  'do_zrobienia', 20, 'description'),
  ('aaaaaaaa-0002-0000-0000-000000000002', '05293379-2dfe-412e-bcd0-1cee2e5d803b', 'Uzupełnienie witryny',     'Uzupełnij witrynę chłodniczą świeżymi pączkami.',            '09:00', true,  'normalny','zamkniete',    15, null);

-- ── 7. Sample trainings ───────────────────────────────────────
insert into public.trainings (restaurant_id, title, category, duration_min, progress_percent, required, status)
values
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Podstawowe zasady BHP',       'BHP',       45, 60,  true,  'w_toku'),
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Standardy obsługi klienta',   'Obsługa',   60, 0,   true,  'nierozpoczete'),
  ('aaaaaaaa-0001-0000-0000-000000000001', 'HACCP – higiena żywności',    'BHP',       90, 30,  true,  'w_toku'),
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Obsługa kasy fiskalnej',      'Procedury', 30, 100, true,  'ukonczone'),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'Podstawy cukiernictwa',       'Kuchnia',   90, 80,  true,  'w_toku'),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'HACCP – higiena żywności',    'BHP',       90, 40,  true,  'w_toku'),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'Obsługa kasy i płatności',    'Procedury', 30, 100, true,  'ukonczone'),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'Standardy obsługi klienta',   'Obsługa',   45, 0,   false, 'nierozpoczete');
