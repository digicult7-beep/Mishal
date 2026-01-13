-- FUNCTION: Check if a user matches criteria to view a task's assignments
-- We use SECURITY DEFINER to bypass RLS recursion issues
CREATE OR REPLACE FUNCTION public.check_can_view_task_assignments(target_task_id UUID, current_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 
    -- 1. User is explicitly assigned in task_assignments
    EXISTS (SELECT 1 FROM task_assignments WHERE task_id = target_task_id AND user_id = current_user_id)
    OR
    -- 2. User is the primary assignee or creator in the tasks table
    EXISTS (SELECT 1 FROM tasks WHERE id = target_task_id AND (assigned_to = current_user_id OR created_by = current_user_id))
    OR
    -- 3. User is an admin or client coordinator (optional, assuming profiles table has role)
    EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id AND role IN ('admin', 'client_coordinator'));
END;
$$;

-- POLICY: Update task_assignments to use the function
DROP POLICY IF EXISTS "Users can view own assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Users can view task assignments if participant" ON public.task_assignments;

CREATE POLICY "Users can view related task assignments" ON public.task_assignments
    FOR SELECT USING (
        check_can_view_task_assignments(task_id, auth.uid())
    );

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_can_view_task_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_can_view_task_assignments TO service_role;
