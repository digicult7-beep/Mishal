-- Enable RLS (idempotent)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 1. Allow users to delete their own activities
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.activities;
CREATE POLICY "Users can delete their own activities" ON public.activities
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Allow CCs to delete activities of their employees
DROP POLICY IF EXISTS "CC can delete activities of their employees" ON public.activities;
CREATE POLICY "CC can delete activities of their employees" ON public.activities
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = activities.user_id
        AND p.created_by = auth.uid()
    )
);

-- 3. Allow Admins to delete all activities
DROP POLICY IF EXISTS "Admins can delete all activities" ON public.activities;
CREATE POLICY "Admins can delete all activities" ON public.activities
FOR DELETE
TO authenticated
USING (public.is_admin());
