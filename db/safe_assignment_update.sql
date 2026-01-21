-- Create a function to update task assignments atomically
-- This prevents the race condition/data loss where we delete all assignments
-- checking for an error, and then insert new ones.

CREATE OR REPLACE FUNCTION update_task_assignments(
  p_task_id UUID,
  p_assignee_ids UUID[]
)
RETURNS VOID AS $$
BEGIN
  -- Delete all existing assignments for this task
  DELETE FROM task_assignments WHERE task_id = p_task_id;
  
  -- Insert new assignments if any are provided
  IF array_length(p_assignee_ids, 1) > 0 THEN
    INSERT INTO task_assignments (task_id, user_id)
    SELECT p_task_id, unnest(p_assignee_ids);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_task_assignments(UUID, UUID[]) TO authenticated;
