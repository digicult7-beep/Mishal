-- Fix Circular Dependency and Update RLS for Multi-Assignee

-- 1. Update Task Assignments Policy
-- Allow users to view their own assignments directly. 
-- This is crucial to break the circular dependency where tasks checks assignments and assignments checks tasks.
DROP POLICY IF EXISTS "Employees can view assignments in their departments" ON public.task_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.task_assignments;

CREATE POLICY "Users can view own assignments" ON public.task_assignments
    FOR SELECT USING (user_id = auth.uid());

-- 2. Update Tasks Policy to check task_assignments
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

-- 3. Update Tasks Update Policy
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
