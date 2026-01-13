-- Allow authenticated users to manage task statuses (Insert, Update, Delete)

-- Policy for INSERT
DROP POLICY IF EXISTS "Authenticated users can insert task statuses" ON public.task_statuses;
CREATE POLICY "Authenticated users can insert task statuses" ON public.task_statuses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for UPDATE
DROP POLICY IF EXISTS "Authenticated users can update task statuses" ON public.task_statuses;
CREATE POLICY "Authenticated users can update task statuses" ON public.task_statuses
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for DELETE
DROP POLICY IF EXISTS "Authenticated users can delete task statuses" ON public.task_statuses;
CREATE POLICY "Authenticated users can delete task statuses" ON public.task_statuses
    FOR DELETE USING (auth.role() = 'authenticated');
