-- ============================================================
-- ShiftApp – Demo Account: Veganic Restaurant
-- biuro@veganic.restaurant / Demo123!
-- ============================================================

-- Fixed UUIDs
-- Restaurant  : dddddddd-0000-0000-0000-000000000001
-- Owner       : dddddddd-0001-0000-0000-000000000001  (biuro@veganic.restaurant)
-- Employee 1  : dddddddd-0002-0000-0000-000000000001  (anna@veganic.restaurant)
-- Employee 2  : dddddddd-0003-0000-0000-000000000001  (tomasz@veganic.restaurant)
-- Employee 3  : dddddddd-0004-0000-0000-000000000001  (karolina@veganic.restaurant)
-- Employee 4  : dddddddd-0005-0000-0000-000000000001  (michal@veganic.restaurant)

-- ── 1. Auth users ─────────────────────────────────────────────
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) values
  (
    'dddddddd-0001-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'biuro@veganic.restaurant',
    crypt('Demo123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    'dddddddd-0002-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'anna@veganic.restaurant',
    crypt('Demo123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    'dddddddd-0003-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'tomasz@veganic.restaurant',
    crypt('Demo123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    'dddddddd-0004-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'karolina@veganic.restaurant',
    crypt('Demo123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    'dddddddd-0005-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'michal@veganic.restaurant',
    crypt('Demo123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

-- ── 2. Auth identities ────────────────────────────────────────
insert into auth.identities (provider_id, user_id, provider, identity_data, created_at, updated_at)
values
  ('biuro@veganic.restaurant',   'dddddddd-0001-0000-0000-000000000001', 'email', jsonb_build_object('sub','dddddddd-0001-0000-0000-000000000001','email','biuro@veganic.restaurant'),    now(), now()),
  ('anna@veganic.restaurant',    'dddddddd-0002-0000-0000-000000000001', 'email', jsonb_build_object('sub','dddddddd-0002-0000-0000-000000000001','email','anna@veganic.restaurant'),     now(), now()),
  ('tomasz@veganic.restaurant',  'dddddddd-0003-0000-0000-000000000001', 'email', jsonb_build_object('sub','dddddddd-0003-0000-0000-000000000001','email','tomasz@veganic.restaurant'),   now(), now()),
  ('karolina@veganic.restaurant','dddddddd-0004-0000-0000-000000000001', 'email', jsonb_build_object('sub','dddddddd-0004-0000-0000-000000000001','email','karolina@veganic.restaurant'), now(), now()),
  ('michal@veganic.restaurant',  'dddddddd-0005-0000-0000-000000000001', 'email', jsonb_build_object('sub','dddddddd-0005-0000-0000-000000000001','email','michal@veganic.restaurant'),   now(), now())
on conflict (provider, provider_id) do nothing;

-- ── 3. Restaurant ─────────────────────────────────────────────
insert into public.restaurants (id, name, address, phone, plan, logo_color, created_at)
values (
  'dddddddd-0000-0000-0000-000000000001',
  'Veganic',
  'ul. Krucza 16, 00-526 Warszawa',
  '+48 22 123 45 67',
  'premium',
  '#22C55E',
  now()
)
on conflict (id) do nothing;

-- ── 4. Profiles ───────────────────────────────────────────────
insert into public.profiles (id, restaurant_id, first_name, last_name, role, job_title, avatar_color, is_active, created_at)
values
  ('dddddddd-0001-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Marta',    'Kowalska',   'owner',    'Właścicielka',  '#22C55E', true, now()),
  ('dddddddd-0002-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Anna',     'Wiśniewska', 'employee', 'Kelner',         '#2196C9', true, now()),
  ('dddddddd-0003-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Tomasz',   'Nowak',      'employee', 'Kucharz',        '#F97316', true, now()),
  ('dddddddd-0004-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Karolina', 'Zając',      'employee', 'Barista',        '#A855F7', true, now()),
  ('dddddddd-0005-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Michał',   'Piotrowski', 'employee', 'Kelner',         '#EAB308', true, now())
on conflict (id) do nothing;

-- owner_id backfill
update public.restaurants
set owner_id = 'dddddddd-0001-0000-0000-000000000001'
where id = 'dddddddd-0000-0000-0000-000000000001' and owner_id is null;

-- ── 5. Invitation codes ───────────────────────────────────────
insert into public.invitations (restaurant_id, code, created_by, job_title, expires_at)
values
  ('dddddddd-0000-0000-0000-000000000001', 'VGKL01', 'dddddddd-0001-0000-0000-000000000001', 'Kelner',   now() + interval '180 days'),
  ('dddddddd-0000-0000-0000-000000000001', 'VGKL02', 'dddddddd-0001-0000-0000-000000000001', 'Kelner',   now() + interval '180 days'),
  ('dddddddd-0000-0000-0000-000000000001', 'VGKCH01','dddddddd-0001-0000-0000-000000000001', 'Kucharz',  now() + interval '180 days'),
  ('dddddddd-0000-0000-0000-000000000001', 'VGBR01', 'dddddddd-0001-0000-0000-000000000001', 'Barista',  now() + interval '180 days')
on conflict do nothing;

-- ── 6. Shifts (current week + next week) ─────────────────────
insert into public.shifts (restaurant_id, employee_id, employee_name, job_title, start_time, end_time, day, location, status)
values
  -- Bieżący tydzień – Anna Wiśniewska (Kelner)
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','Anna Wiśniewska',  'Kelner',  '10:00','18:00', date_trunc('week',current_date)::date,     'Veganic – Krucza',  'potwierdzona'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','Anna Wiśniewska',  'Kelner',  '12:00','20:00', date_trunc('week',current_date)::date + 1, 'Veganic – Krucza',  'potwierdzona'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','Anna Wiśniewska',  'Kelner',  '10:00','18:00', date_trunc('week',current_date)::date + 3, 'Veganic – Krucza',  'zaplanowana'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','Anna Wiśniewska',  'Kelner',  '10:00','18:00', date_trunc('week',current_date)::date + 4, 'Veganic – Krucza',  'zaplanowana'),
  -- Tomasz Nowak (Kucharz)
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','Tomasz Nowak',     'Kucharz', '07:00','15:00', date_trunc('week',current_date)::date,     'Veganic – Krucza',  'potwierdzona'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','Tomasz Nowak',     'Kucharz', '07:00','15:00', date_trunc('week',current_date)::date + 1, 'Veganic – Krucza',  'potwierdzona'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','Tomasz Nowak',     'Kucharz', '14:00','22:00', date_trunc('week',current_date)::date + 2, 'Veganic – Krucza',  'do_potwierdzenia'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','Tomasz Nowak',     'Kucharz', '07:00','15:00', date_trunc('week',current_date)::date + 3, 'Veganic – Krucza',  'zaplanowana'),
  -- Karolina Zając (Barista)
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0004-0000-0000-000000000001','Karolina Zając',   'Barista', '08:00','16:00', date_trunc('week',current_date)::date,     'Veganic – Krucza',  'potwierdzona'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0004-0000-0000-000000000001','Karolina Zając',   'Barista', '08:00','16:00', date_trunc('week',current_date)::date + 2, 'Veganic – Krucza',  'potwierdzona'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0004-0000-0000-000000000001','Karolina Zając',   'Barista', '08:00','16:00', date_trunc('week',current_date)::date + 4, 'Veganic – Krucza',  'zaplanowana'),
  -- Michał Piotrowski (Kelner)
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0005-0000-0000-000000000001','Michał Piotrowski','Kelner',  '14:00','22:00', date_trunc('week',current_date)::date,     'Veganic – Krucza',  'potwierdzona'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0005-0000-0000-000000000001','Michał Piotrowski','Kelner',  '14:00','22:00', date_trunc('week',current_date)::date + 1, 'Veganic – Krucza',  'zaplanowana'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0005-0000-0000-000000000001','Michał Piotrowski','Kelner',  '14:00','22:00', date_trunc('week',current_date)::date + 3, 'Veganic – Krucza',  'zaplanowana'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0005-0000-0000-000000000001','Michał Piotrowski','Kelner',  '14:00','22:00', date_trunc('week',current_date)::date + 4, 'Veganic – Krucza',  'do_potwierdzenia'),
  -- Marta (właścicielka)
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','Marta Kowalska',   'Właścicielka','09:00','17:00', date_trunc('week',current_date)::date, 'Veganic – Krucza',  'potwierdzona'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','Marta Kowalska',   'Właścicielka','09:00','17:00', date_trunc('week',current_date)::date + 2,'Veganic – Krucza','potwierdzona'),
  -- Następny tydzień
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','Anna Wiśniewska',  'Kelner',  '10:00','18:00', date_trunc('week',current_date)::date + 7, 'Veganic – Krucza',  'zaplanowana'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','Tomasz Nowak',     'Kucharz', '07:00','15:00', date_trunc('week',current_date)::date + 7, 'Veganic – Krucza',  'zaplanowana'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0004-0000-0000-000000000001','Karolina Zając',   'Barista', '08:00','16:00', date_trunc('week',current_date)::date + 8, 'Veganic – Krucza',  'zaplanowana'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0005-0000-0000-000000000001','Michał Piotrowski','Kelner',  '14:00','22:00', date_trunc('week',current_date)::date + 8, 'Veganic – Krucza',  'zaplanowana');

-- ── 7. Tasks ──────────────────────────────────────────────────
insert into public.tasks (restaurant_id, assigned_to, title, description, assigned_time, completed, priority, status, duration_min, confirmation_type)
values
  -- Otwieranie
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','Otwarcie sali',            'Odblokuj drzwi, włącz oświetlenie i klimatyzację.',           '09:00', true,  'wysoki',  'zamkniete',    15, null),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','Kontrola temp. lodówek',   'Sprawdź temperatury wszystkich urządzeń chłodniczych HACCP.',  '07:15', true,  'wysoki',  'zamkniete',    10, 'values'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0004-0000-0000-000000000001','Przygotowanie kawy',       'Uruchom ekspres, zmiel kawę, sprawdź mleko roślinne.',        '07:45', true,  'wysoki',  'zamkniete',    20, null),
  -- W trakcie
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','Przygotowanie zupy dnia',  'Ugotuj zupę dnia wg receptury – dziś krem z dyni.',           '08:00', false, 'wysoki',  'w_trakcie',    45, 'photo'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','Nakrycie stolików',        'Nakryj wszystkie stoliki: sztućce, serwetki, menu.',          '09:15', false, 'wysoki',  'w_trakcie',    25, 'photo'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','Zamówienie tygodniowe',    'Złóż zamówienie u dostawcy warzyw i produktów roślinnych.',   '10:00', false, 'normalny','w_trakcie',    30, 'description'),
  -- Do zrobienia
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0005-0000-0000-000000000001','Obsługa rezerwacji',       'Potwierdź rezerwacje telefoniczne na weekend.',               '11:00', false, 'normalny','do_zrobienia', 20, null),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','Przygotowanie deserów',    'Przygotuj 20 porcji tiramisu wegańskiego na wieczór.',        '14:00', false, 'normalny','do_zrobienia', 60, 'photo'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','Sprzedaż wynos',           'Obsługa zamówień online – sprawdź aplikację Glovo.',          '12:00', false, 'normalny','do_zrobienia', 15, null),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0004-0000-0000-000000000001','Czyszczenie ekspresu',     'Wykonaj pełny cykl czyszczenia ekspresu ciśnieniowego.',      '15:00', false, 'wysoki',  'do_zrobienia', 30, 'photo'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0005-0000-0000-000000000001','Uzupełnienie kart menu',   'Wymień karty menu na nową wersję wiosenną.',                  '10:30', false, 'niski',   'do_zrobienia', 20, null),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','Przegląd kasy',            'Sprawdź raporty dobowe z kasy fiskalnej.',                    '21:00', false, 'normalny','do_zrobienia', 15, 'values'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','Sprzątanie kuchni',        'Gruntowne sprzątanie i dezynfekcja po zamknięciu.',           '22:00', false, 'wysoki',  'do_zrobienia', 60, 'description'),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','Zamknięcie sali',          'Posprzątaj salę, wyłącz urządzenia, zamknij drzwi.',          '22:30', false, 'wysoki',  'do_zrobienia', 20, null),
  ('dddddddd-0000-0000-0000-000000000001','dddddddd-0004-0000-0000-000000000001','Dostawa produktów',        'Odbierz i skontroluj dostawę produktów roślinnych.',          '08:30', false, 'wysoki',  'do_zrobienia', 20, 'photo');

-- ── 8. Trainings ─────────────────────────────────────────────
insert into public.trainings (restaurant_id, title, category, duration_min, progress_percent, required, status)
values
  ('dddddddd-0000-0000-0000-000000000001', 'Podstawowe zasady BHP',           'BHP',       45,  100, true,  'ukonczone'),
  ('dddddddd-0000-0000-0000-000000000001', 'HACCP – higiena żywności',        'BHP',       90,  75,  true,  'w_toku'),
  ('dddddddd-0000-0000-0000-000000000001', 'Alergie i dieta roślinna',        'BHP',       60,  50,  true,  'w_toku'),
  ('dddddddd-0000-0000-0000-000000000001', 'Standardy obsługi klienta',       'Obsługa',   60,  100, true,  'ukonczone'),
  ('dddddddd-0000-0000-0000-000000000001', 'Upselling w restauracji',         'Obsługa',   45,  30,  false, 'w_toku'),
  ('dddddddd-0000-0000-0000-000000000001', 'Obsługa kasy fiskalnej',          'Procedury', 30,  100, true,  'ukonczone'),
  ('dddddddd-0000-0000-0000-000000000001', 'Procedury zamknięcia lokalu',     'Procedury', 30,  60,  true,  'w_toku'),
  ('dddddddd-0000-0000-0000-000000000001', 'Kuchnia roślinna – podstawy',     'Kuchnia',   90,  80,  true,  'w_toku'),
  ('dddddddd-0000-0000-0000-000000000001', 'Fermentacja i kiszonki',          'Kuchnia',   60,  0,   false, 'nierozpoczete'),
  ('dddddddd-0000-0000-0000-000000000001', 'Zarządzanie konfliktem',          'Obsługa',   45,  0,   false, 'nierozpoczete');
