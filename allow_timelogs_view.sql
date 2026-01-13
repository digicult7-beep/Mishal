-- Allow all authenticated users to view all time logs (needed for CC to see Employee logs)
-- Also ensures employees can insert their logs.
-- Run this in Supabase SQL Editor.

ALTER TABLE subtask_time_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow viewing all logs
CREATE POLICY "Allow view all time logs" ON subtask_time_logs
FOR SELECT
TO authenticated
USING (true);

-- Policy to allow inserting own logs
CREATE POLICY "Users can insert their own time logs" ON subtask_time_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
