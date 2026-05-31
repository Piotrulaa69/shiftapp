-- ══════════════════════════════════════════════════════
-- 026: SECURITY DEFINER RPC for restaurant creation
-- Bypasses RLS entirely for the registration flow.
-- The INSERT policy approach was unreliable because
-- the authenticated role may lack INSERT grants at
-- table level when using anon key during sign-up.
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_restaurant_for_owner(
  p_name    text,
  p_address text,
  p_phone   text,
  p_owner_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.restaurants (name, address, phone, owner_id)
  VALUES (p_name, p_address, p_phone, p_owner_id)
  RETURNING id INTO v_id;

  RETURN json_build_object('id', v_id);
END;
$$;

-- Allow authenticated and anon roles to call this function
GRANT EXECUTE ON FUNCTION public.create_restaurant_for_owner(text, text, text, uuid)
  TO authenticated, anon;
