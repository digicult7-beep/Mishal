-- Remove the check constraint on content_type to allow custom values
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_content_type_check;

-- Ensure content_type is just text (it already is, but just clarifying)
ALTER TABLE public.tasks
ALTER COLUMN content_type TYPE text;
