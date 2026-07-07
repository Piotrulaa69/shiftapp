-- 063_superadmin_owner_emails.sql
-- SECURITY DEFINER function that lets super-admins read owner emails from auth.users.
-- Regular authenticated users cannot query auth.users directly.

CREATE OR REPLACE FUNCTION public.super_admin_get_owner_emails()
RETURNS TABLE(restaurant_id UUID, owner_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1),
    false
  ) THEN
    RAISE EXCEPTION 'Brak uprawnień super-admina';
  END IF;

  RETURN QUERY
  SELECT p.restaurant_id, u.email::TEXT
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'owner'
    AND p.is_super_admin = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_get_owner_emails() TO authenticated;
