-- Create subtasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- View: Users can view subtasks of tasks assigned to them or if they are admin/CC/creator
CREATE POLICY "Users can view subtasks" ON public.subtasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = subtasks.task_id
            AND (
                t.assigned_to = auth.uid() 
                OR t.created_by = auth.uid()
                OR EXISTS (SELECT 1 FROM public.task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = auth.uid())
                OR public.is_admin()
                OR public.is_cc() -- CCs can generally view tasks in their scope, simplifying for now
            )
        )
    );

-- Manage: Users can manage subtasks of tasks assigned to them OR if they are the creator OR if they are CC
CREATE POLICY "Users can manage subtasks" ON public.subtasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = subtasks.task_id
            AND (
                t.assigned_to = auth.uid() 
                OR t.created_by = auth.uid()
                OR EXISTS (SELECT 1 FROM public.task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = auth.uid())
                OR public.is_admin()
                OR public.is_cc()
            )
        )
    );

-- Grant permissions
GRANT ALL ON public.subtasks TO authenticated;
GRANT ALL ON public.subtasks TO service_role;

-- Migration Function to backfill data from JSON
CREATE OR REPLACE FUNCTION migrate_json_subtasks() RETURNS void AS $$
DECLARE
    task_record RECORD;
    subtask_json JSONB;
    subtask_item JSONB;
BEGIN
    FOR task_record IN SELECT id, subtasks FROM public.tasks WHERE subtasks IS NOT NULL AND jsonb_array_length(subtasks::jsonb) > 0 LOOP
        subtask_json := task_record.subtasks::jsonb;
        
        FOR subtask_item IN SELECT * FROM jsonb_array_elements(subtask_json) LOOP
            INSERT INTO public.subtasks (task_id, title, is_completed, id)
            VALUES (
                task_record.id,
                subtask_item->>'text',
                (subtask_item->>'completed')::boolean,
                COALESCE((subtask_item->>'id')::uuid, gen_random_uuid())
            )
            ON CONFLICT (id) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_json_subtasks();

-- Drop the function after use
DROP FUNCTION migrate_json_subtasks();
