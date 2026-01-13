-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments on tasks they're assigned to
CREATE POLICY "Users can view comments on assigned tasks"
  ON task_comments FOR SELECT
  USING (
    task_id IN (
      SELECT task_id FROM task_assignments WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create comments on tasks they're assigned to
CREATE POLICY "Users can create comments on assigned tasks"
  ON task_comments FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT task_id FROM task_assignments WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON task_comments FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON task_comments FOR DELETE
  USING (user_id = auth.uid());

-- Add subtasks_content column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks_content TEXT DEFAULT '';

-- Create index for faster comment queries
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);
