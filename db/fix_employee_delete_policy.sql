-- Fix Employee Deletion Policy
-- The 'profiles' table was missing a DELETE policy for Client Coordinators.
-- This prevented CCs from deleting employees they created.

-- 1. Add DELETE policy for Client Coordinators
DROP POLICY IF EXISTS "CC can delete created employees" ON public.profiles;

CREATE POLICY "CC can delete created employees" ON public.profiles
    FOR DELETE USING (
        -- Allow deletion if the user is a CC AND they created the profile
        (public.is_cc() AND created_by = auth.uid())
        OR
        -- OR if the user is a CC AND they are deleting themselves (unlikely but safe)
        (public.is_cc() AND id = auth.uid())
    );

-- 2. Ensure Activities and Notifications don't block deletion
-- (Optional: Add cascades if not present, but usually these are set to CASCADE or SET NULL)
-- We rely on standard Supabase behavior or previous schemas here.
