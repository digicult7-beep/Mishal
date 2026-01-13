-- FIX FOR SUBTASK TIMER RLS POLICIES
-- Run this script if you're getting "permission denied" errors

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own subtask time logs" ON subtask_time_logs;
DROP POLICY IF EXISTS "Users can create own subtask time logs" ON subtask_time_logs;
DROP POLICY IF EXISTS "Users can update own subtask time logs" ON subtask_time_logs;
DROP POLICY IF EXISTS "Users can delete own subtask time logs" ON subtask_time_logs;

-- Step 2: Disable RLS temporarily to test
ALTER TABLE subtask_time_logs DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE subtask_time_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, permissive policies
-- Allow authenticated users to do everything with their own records
CREATE POLICY "Enable all for users based on user_id"
  ON subtask_time_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'subtask_time_logs';
