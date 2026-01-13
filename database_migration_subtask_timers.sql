-- IMPORTANT: Run this entire script in Supabase SQL Editor
-- This will create the subtask_time_logs table with proper RLS policies

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS subtask_time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subtask_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE subtask_time_logs ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Users can view own subtask time logs" ON subtask_time_logs;
DROP POLICY IF EXISTS "Users can create own subtask time logs" ON subtask_time_logs;
DROP POLICY IF EXISTS "Users can update own subtask time logs" ON subtask_time_logs;
DROP POLICY IF EXISTS "Users can delete own subtask time logs" ON subtask_time_logs;

-- Step 4: Create RLS policies
-- Allow users to SELECT their own time logs
CREATE POLICY "Users can view own subtask time logs"
  ON subtask_time_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to INSERT their own time logs
CREATE POLICY "Users can create own subtask time logs"
  ON subtask_time_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own time logs
CREATE POLICY "Users can update own subtask time logs"
  ON subtask_time_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own time logs
CREATE POLICY "Users can delete own subtask time logs"
  ON subtask_time_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subtask_time_logs_task_id ON subtask_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_subtask_time_logs_user_id ON subtask_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_subtask_time_logs_created_at ON subtask_time_logs(created_at DESC);

-- Step 6: Verify the table was created
-- You should see the table listed in the output
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subtask_time_logs';
