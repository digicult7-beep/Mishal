-- BACKFILL PROFILES SCRIPT
-- Run this to restore profiles for existing users

INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', ''), 
    COALESCE((raw_user_meta_data->>'role')::user_role, 'employee')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Verify the profile exists
SELECT * FROM public.profiles;
