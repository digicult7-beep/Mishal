-- Fix Recursion on Departments using a SECURITY DEFINER function
-- This function runs with the privileges of the creator (admin), bypassing RLS on 'tasks'
-- This breaks the loop: departments -> tasks -> departments
CREATE OR REPLACE FUNCTION public.get_employee_department_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT DISTINCT t.department_id
    FROM tasks t
    JOIN task_assignments ta ON ta.task_id = t.id
    WHERE ta.user_id = user_uuid;
$$;

-- Update Departments Policy for Employees
DROP POLICY IF EXISTS "Employees can view assigned departments" ON public.departments;
CREATE POLICY "Employees can view assigned departments" ON public.departments
    FOR SELECT USING (
        id IN (SELECT get_employee_department_ids(auth.uid()))
    );

-- Ensure CCs can view departments (Standard check, no recursion)
DROP POLICY IF EXISTS "CCs can view departments" ON public.departments;
CREATE POLICY "CCs can view departments" ON public.departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            JOIN public.clients c ON c.id = w.client_id
            WHERE w.id = departments.workspace_id
            AND c.cc_id = auth.uid()
        )
    );

-- Fix Activities Permissions (Fix 403 Forbidden)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Allow INSERT for all authenticated users
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
CREATE POLICY "Authenticated users can insert activities" ON public.activities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow SELECT for own activities
DROP POLICY IF EXISTS "Users can view own activities" ON public.activities;
CREATE POLICY "Users can view own activities" ON public.activities
    FOR SELECT USING (user_id = auth.uid());

-- Allow CCs to view activities of their employees (if needed)
DROP POLICY IF EXISTS "CC can view activities of their employees" ON public.activities;
CREATE POLICY "CC can view activities of their employees" ON public.activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = activities.user_id
            AND p.created_by = auth.uid()
        )
    );

-- Fix Notifications Permissions (Fix 403 Forbidden)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());
