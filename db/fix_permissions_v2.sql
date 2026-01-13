-- Fix 403 Forbidden on Activities and Notifications
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert activities (logs)
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
CREATE POLICY "Authenticated users can insert activities" ON public.activities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to view their own activities (optional but good)
DROP POLICY IF EXISTS "Users can view own activities" ON public.activities;
CREATE POLICY "Users can view own activities" ON public.activities
    FOR SELECT USING (user_id = auth.uid());

-- Allow authenticated users to insert notifications
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());


-- Fix 500 Internal Server Error on Departments
-- The previous policy might have caused recursion or performance issues.
-- Let's try a cleaner approach.

-- First, ensure CCs can view departments in their workspaces
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

-- Second, for Employees, let's try to avoid joining tasks directly if it causes issues.
-- But we need to know which departments they are in.
-- Let's try to redefine the employee policy to be very specific.
DROP POLICY IF EXISTS "Employees can view assigned departments" ON public.departments;
CREATE POLICY "Employees can view assigned departments" ON public.departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.task_assignments ta
            JOIN public.tasks t ON t.id = ta.task_id
            WHERE t.department_id = departments.id
            AND ta.user_id = auth.uid()
        )
    );
-- Note: If 'tasks' has RLS that checks 'departments', this will loop.
-- Ensure 'tasks' policy does NOT check 'departments'.
-- My previous script did not add such a policy to 'tasks', so it should be safe unless one exists from before.

-- Just in case, let's verify 'tasks' policy again (re-apply it to be sure it's clean)
DROP POLICY IF EXISTS "Employees can view assigned tasks" ON public.tasks;
CREATE POLICY "Employees can view assigned tasks" ON public.tasks
    FOR SELECT USING (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.task_assignments
            WHERE task_id = tasks.id
            AND user_id = auth.uid()
        )
    );
