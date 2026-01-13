-- Update handle_new_user trigger to set created_by from metadata
-- This fixes the race condition where the profile update might run before the profile is created,
-- causing 'created_by' to remain NULL and the employee to be invisible in the dashboard.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_by, status)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'employee'),
    (new.raw_user_meta_data->>'created_by')::uuid, -- Cast to UUID
    COALESCE(new.raw_user_meta_data->>'status', 'active')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql;
