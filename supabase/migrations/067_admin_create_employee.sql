-- 067_admin_create_employee.sql
-- Lets an owner/manager create an employee's profile row for a freshly signed-up
-- auth user. RLS on profiles only allows inserting your OWN profile (id = auth.uid()),
-- so the admin cannot insert a row for someone else — this SECURITY DEFINER RPC does it
-- after verifying the caller is an owner/manager, and always uses the caller's restaurant.

CREATE OR REPLACE FUNCTION public.admin_create_employee(
  p_user_id    UUID,
  p_first_name TEXT,
  p_last_name  TEXT,
  p_job_title  TEXT,
  p_role       TEXT DEFAULT 'employee',
  p_phone      TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role  TEXT;
  v_restaurant   UUID;
  v_role         TEXT;
  v_colors       TEXT[] := ARRAY['#2196C9','#22C55E','#F97316','#A855F7','#EAB308','#EF4444','#0F172A'];
  v_color        TEXT;
BEGIN
  SELECT role, restaurant_id INTO v_caller_role, v_restaurant
  FROM profiles WHERE id = auth.uid() LIMIT 1;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner','manager') THEN
    RETURN json_build_object('success', false, 'error', 'Brak uprawnień do dodawania pracowników.');
  END IF;
  IF v_restaurant IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Brak przypisanej restauracji.');
  END IF;

  -- Only owners may create managers; managers can create employees only.
  v_role := CASE
    WHEN p_role = 'manager' AND v_caller_role = 'owner' THEN 'manager'
    ELSE 'employee'
  END;

  v_color := v_colors[1 + floor(random() * array_length(v_colors, 1))::int];

  INSERT INTO profiles (id, restaurant_id, first_name, last_name, role, job_title, phone, avatar_color, is_active)
  VALUES (p_user_id, v_restaurant, p_first_name, p_last_name, v_role, p_job_title, COALESCE(p_phone, ''), v_color, true)
  ON CONFLICT (id) DO UPDATE
    SET restaurant_id = EXCLUDED.restaurant_id,
        first_name    = EXCLUDED.first_name,
        last_name     = EXCLUDED.last_name,
        role          = EXCLUDED.role,
        job_title     = EXCLUDED.job_title,
        phone         = EXCLUDED.phone;

  RETURN json_build_object('success', true, 'restaurant_id', v_restaurant, 'role', v_role);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_employee(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
