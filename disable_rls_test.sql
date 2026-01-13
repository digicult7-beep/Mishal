-- EMERGENCY FIX - DISABLE RLS COMPLETELY
-- This is for testing only - run this to see if RLS is the issue

-- Disable RLS on the table
ALTER TABLE subtask_time_logs DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'subtask_time_logs';

-- This should show rowsecurity = false
