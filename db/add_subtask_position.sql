-- Add position column to subtasks table for ordering
ALTER TABLE public.subtasks 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Update existing subtasks to have a default position based on creation time
WITH ranked_subtasks AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY created_at) - 1 as new_position
  FROM public.subtasks
)
UPDATE public.subtasks
SET position = ranked_subtasks.new_position
FROM ranked_subtasks
WHERE subtasks.id = ranked_subtasks.id;
