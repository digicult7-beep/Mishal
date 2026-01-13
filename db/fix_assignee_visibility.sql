-- Allow reading all assignments for a task IF the user is also assigned to that task
DROP POLICY IF EXISTS "Users can view own assignments" ON public.task_assignments;

CREATE POLICY "Users can view task assignments if assigned to task" ON public.task_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.task_assignments ta_check
            WHERE ta_check.task_id = task_assignments.task_id
            AND ta_check.user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_assignments.task_id
            AND t.assigned_to = auth.uid() 
        )
         -- Also allow if user is a client coordinator or admin (assuming role checks or if they have created the task)
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.role = 'client_coordinator' OR p.role = 'admin')
        )
    );
