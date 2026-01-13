-- Add content_type and start_date to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS content_type text CHECK (content_type IN ('Static', 'Video', 'Reel', 'Shooting')),
ADD COLUMN IF NOT EXISTS start_date timestamp with time zone;

-- Comment: The Creative Statuses (Not Started, On Going, Editing, CG, Completed) should be managed via the Task Statuses management UI 
-- or inserted specifically for the Creative department if it exists. 
-- For now, we only modify the schema to support the dashboard view types.
