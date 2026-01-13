-- Allow all authenticated users to view task statuses
-- This ensures employees can see statuses even if they are not explicitly added to the department_employees table
DROP POLICY IF EXISTS "Employees can view task statuses in assigned departments" ON public.task_statuses;

CREATE POLICY "Authenticated users can view task statuses" ON public.task_statuses
    FOR SELECT USING (auth.role() = 'authenticated');
