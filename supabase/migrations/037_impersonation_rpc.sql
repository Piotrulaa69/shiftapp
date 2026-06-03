-- 037_impersonation_rpc.sql
-- RPC function do impersonacji jako restauracja

-- RPC function do generowania access tokena dla właściciela restauracji
CREATE OR REPLACE FUNCTION impersonate_restaurant_owner(
  p_restaurant_id UUID,
  p_admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_owner_email TEXT;
  v_token_expires TIMESTAMPTZ;
BEGIN
  -- Sprawdź czy admin jest super adminem
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_admin_id AND is_super_admin = TRUE
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Nie jesteś super adminem');
  END IF;

  -- Znajdź właściciela restauracji
  SELECT p.id, u.email INTO v_owner_id, v_owner_email
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.restaurant_id = p_restaurant_id 
    AND p.role = 'owner'
    AND p.is_super_admin = FALSE
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nie znaleziono właściciela restauracji');
  END IF;

  -- Ustaw czas wygaśnięcia (1 godzina)
  v_token_expires := NOW() + INTERVAL '1 hour';

  -- Zapisz log w tabeli impersonation_logs
  UPDATE impersonation_logs
  SET 
    target_user_id = v_owner_id,
    ended_at = v_token_expires
  WHERE admin_id = p_admin_id 
    AND restaurant_id = p_restaurant_id 
    AND ended_at IS NULL;

  -- Jeśli nie ma aktywnego logu, utwórz nowy
  IF NOT FOUND THEN
    INSERT INTO impersonation_logs (
      admin_id, 
      target_user_id, 
      restaurant_id, 
      started_at, 
      ended_at
    ) VALUES (
      p_admin_id, 
      v_owner_id, 
      p_restaurant_id, 
      NOW(), 
      v_token_expires
    );
  END IF;

  -- Zwróć informacje potrzebne do logowania
  RETURN json_build_object(
    'success', true,
    'owner_id', v_owner_id::text,
    'owner_email', v_owner_email,
    'expires_at', v_token_expires
  );
END;
$$;

-- Grant execute dla super adminów
GRANT EXECUTE ON FUNCTION impersonate_restaurant_owner TO authenticated;
