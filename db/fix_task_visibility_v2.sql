-- Fix RLS for tasks to allow viewing if assigned via task_assignments
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

-- Fix RLS for task_assignments to allow users to see their own assignments
DROP POLICY IF EXISTS "Employees can view assignments in their departments" ON public.task_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.task_assignments;
CREATE POLICY "Users can view own assignments" ON public.task_assignments
    FOR SELECT USING (user_id = auth.uid());

-- Allow users to view departments if they have a task there
DROP POLICY IF EXISTS "Employees can view assigned departments" ON public.departments;
CREATE POLICY "Employees can view assigned departments" ON public.departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.task_assignments ta ON ta.task_id = t.id
            WHERE t.department_id = departments.id
            AND ta.user_id = auth.uid()
        )
    );
