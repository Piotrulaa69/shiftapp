-- 047_super_admin_impersonation.sql
-- Przywrócenie active_restaurant_id dla trybu wsparcia super admina

-- 1. Dodaj kolumnę active_restaurant_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

-- 2. Zaktualizuj funkcję my_restaurant_id() — super admin z aktywną restauracją działa jak owner tej restauracji
CREATE OR REPLACE FUNCTION public.my_restaurant_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true 
        AND (SELECT active_restaurant_id FROM profiles WHERE id = auth.uid() LIMIT 1) IS NOT NULL
      THEN (SELECT active_restaurant_id FROM profiles WHERE id = auth.uid() LIMIT 1)
      ELSE restaurant_id
    END
  FROM profiles WHERE id = auth.uid();
$$;

-- 3. Zaktualizuj funkcję my_role() — super admin z aktywną restauracją działa jak 'owner'
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true 
        AND (SELECT active_restaurant_id FROM profiles WHERE id = auth.uid() LIMIT 1) IS NOT NULL
      THEN 'owner'
      ELSE COALESCE(role, 'employee')
    END
  FROM profiles WHERE id = auth.uid();
$$;
