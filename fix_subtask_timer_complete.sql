-- COMPLETE FIX FOR SUBTASK TIMER
-- This will drop and recreate the table without foreign key constraints

-- Step 1: Drop the existing table (this will delete all data!)
DROP TABLE IF EXISTS subtask_time_logs CASCADE;

-- Step 2: Create the table WITHOUT foreign key to profiles
CREATE TABLE subtask_time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,  -- No foreign key constraint
  subtask_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable RLS
ALTER TABLE subtask_time_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a single permissive policy
CREATE POLICY "Allow all operations for authenticated users"
  ON subtask_time_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 5: Create indexes
CREATE INDEX idx_subtask_time_logs_task_id ON subtask_time_logs(task_id);
CREATE INDEX idx_subtask_time_logs_user_id ON subtask_time_logs(user_id);
CREATE INDEX idx_subtask_time_logs_created_at ON subtask_time_logs(created_at DESC);

-- Step 6: Verify
SELECT * FROM subtask_time_logs LIMIT 1;
