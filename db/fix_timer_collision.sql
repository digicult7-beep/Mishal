-- Add a partial unique index to prevent multiple active timers (end_time IS NULL) for the same task and user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_timer_per_task_user 
ON subtask_time_logs (task_id, user_id) 
WHERE end_time IS NULL;
