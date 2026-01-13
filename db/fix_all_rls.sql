-- Fix RLS policies for Tasks, Assignments, and Subtasks to support multiple assignees

-- 1. Update Task Assignments Policy
-- Allow users to view their own assignments directly.
DROP POLICY IF EXISTS "Employees can view assignments in their departments" ON public.task_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.task_assignments;

CREATE POLICY "Users can view own assignments" ON public.task_assignments
    FOR SELECT USING (user_id = auth.uid());

-- 2. Update Tasks Policy
DROP POLICY IF EXISTS "Employees can view assigned tasks" ON public.tasks;

CREATE POLICY "Employees can view assigned tasks" ON public.tasks 
    FOR SELECT USING (
        assigned_to = auth.uid() 
        OR 
        EXISTS (
            SELECT 1 FROM public.task_assignments ta
            WHERE ta.task_id = id
            AND ta.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Employees can update assigned tasks" ON public.tasks;

CREATE POLICY "Employees can update assigned tasks" ON public.tasks 
    FOR UPDATE USING (
        assigned_to = auth.uid() 
        OR 
        EXISTS (
            SELECT 1 FROM public.task_assignments ta
            WHERE ta.task_id = id
            AND ta.user_id = auth.uid()
        )
    );

-- 3. Update Subtasks Policy
DROP POLICY IF EXISTS "Users can view subtasks of assigned tasks" ON public.subtasks;

CREATE POLICY "Users can view subtasks of assigned tasks" ON public.subtasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = subtasks.task_id
            AND (
                t.assigned_to = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.task_assignments ta
                    WHERE ta.task_id = t.id
                    AND ta.user_id = auth.uid()
                )
                OR public.is_admin()
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage subtasks of assigned tasks" ON public.subtasks;

CREATE POLICY "Users can manage subtasks of assigned tasks" ON public.subtasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = subtasks.task_id
            AND (
                t.assigned_to = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.task_assignments ta
                    WHERE ta.task_id = t.id
                    AND ta.user_id = auth.uid()
                )
                OR public.is_admin()
            )
        )
    );
