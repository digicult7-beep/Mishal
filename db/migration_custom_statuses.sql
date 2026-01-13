-- Migration: Add Custom Task Statuses
-- Run this if you have already set up the previous schema.

-- 1. Create task_statuses table
CREATE TABLE public.task_statuses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#e2e8f0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on task_statuses
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS Policies for task_statuses
CREATE POLICY "Admins can manage all task statuses" ON public.task_statuses
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "CC can manage task statuses in own departments" ON public.task_statuses
    FOR ALL USING (
        department_id IN (
            SELECT id FROM public.departments WHERE workspace_id IN (
                SELECT id FROM public.workspaces WHERE client_id IN (
                    SELECT id FROM public.clients WHERE cc_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Employees can view task statuses in assigned departments" ON public.task_statuses
    FOR SELECT USING (
        department_id IN (
            SELECT department_id FROM public.department_employees WHERE employee_id = auth.uid()
        )
    );

-- 4. Modify tasks table
-- Add status_id column
ALTER TABLE public.tasks ADD COLUMN status_id UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL;

-- (Optional) Migrate existing data if you have any
-- This is tricky without default statuses. You might need to insert default statuses for each department first.
-- For now, we will just leave status_id null or you can manually update it.

-- Drop old status column
ALTER TABLE public.tasks DROP COLUMN status;

-- Drop old enum type
DROP TYPE task_status;
