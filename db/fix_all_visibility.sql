-- Enable RLS on tables (just in case)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- TASKS: Allow employees to view tasks assigned to them
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

-- TASK ASSIGNMENTS: Allow users to view their own assignments
DROP POLICY IF EXISTS "Users can view own assignments" ON public.task_assignments;
CREATE POLICY "Users can view own assignments" ON public.task_assignments
    FOR SELECT USING (user_id = auth.uid());

-- DEPARTMENTS: Allow employees to view departments they have tasks in
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

-- TASK STATUSES: Allow authenticated users to view all statuses
DROP POLICY IF EXISTS "Authenticated users can view statuses" ON public.task_statuses;
CREATE POLICY "Authenticated users can view statuses" ON public.task_statuses
    FOR SELECT TO authenticated USING (true);

-- PROFILES: Allow authenticated users to view all profiles (needed for assignee names)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);
