-- Add subtasks column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN tasks.subtasks IS 'Structured storage for subtasks: [{ id, text, completed }]';
