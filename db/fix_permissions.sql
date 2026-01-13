-- 1. Create Helper Function for CC Permissions (Security Definer to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.cc_can_manage_task(p_task_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.departments d ON d.id = t.department_id
    JOIN public.workspaces w ON w.id = d.workspace_id
    JOIN public.clients c ON c.id = w.client_id
    WHERE t.id = p_task_id
    AND c.cc_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

-- CRITICAL: Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cc_can_manage_task TO authenticated;
GRANT EXECUTE ON FUNCTION public.cc_can_manage_task TO service_role;

-- 2. Ensure task_assignments table exists and has permissions
CREATE TABLE IF NOT EXISTS public.task_assignments (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id)
);

GRANT ALL ON public.task_assignments TO authenticated;
GRANT ALL ON public.task_assignments TO service_role;

-- 3. Enable RLS
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- 4. Update RLS Policies for task_assignments
DROP POLICY IF EXISTS "Admins can manage all task assignments" ON public.task_assignments;
CREATE POLICY "Admins can manage all task assignments" ON public.task_assignments
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "CC can manage task assignments in own departments" ON public.task_assignments;
CREATE POLICY "CC can manage task assignments in own departments" ON public.task_assignments
    FOR ALL USING (public.cc_can_manage_task(task_id));

DROP POLICY IF EXISTS "Employees can view assignments in their departments" ON public.task_assignments;
CREATE POLICY "Employees can view assignments in their departments" ON public.task_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.department_employees de ON de.department_id = t.department_id
            WHERE t.id = task_id
            AND de.employee_id = auth.uid()
        )
    );

-- 5. Allow CC to create their own client (Fix for initial setup)
DROP POLICY IF EXISTS "CC can insert own client" ON public.clients;
CREATE POLICY "CC can insert own client" ON public.clients 
    FOR INSERT WITH CHECK (cc_id = auth.uid());

-- 6. Insert Demo Data for your user (if not exists)
DO $$
DECLARE
    v_user_id UUID := 'fe4fc391-9b4e-4605-b302-78a774d8559c';
    v_client_id UUID;
    v_workspace_id UUID;
BEGIN
    -- Check if client exists
    SELECT id INTO v_client_id FROM public.clients WHERE cc_id = v_user_id LIMIT 1;
    
    IF v_client_id IS NULL THEN
        -- Create Client
        INSERT INTO public.clients (name, cc_id) VALUES ('Demo Client', v_user_id) RETURNING id INTO v_client_id;
        
        -- Create Workspace
        INSERT INTO public.workspaces (name, client_id) VALUES ('Demo Workspace', v_client_id) RETURNING id INTO v_workspace_id;
        
        -- Create Department
        INSERT INTO public.departments (name, workspace_id) VALUES ('Engineering', v_workspace_id);
    END IF;
END $$;
