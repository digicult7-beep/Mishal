-- Create subtasks table
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- View: Users can view subtasks of tasks assigned to them or if they are admin/CC
CREATE POLICY "Users can view subtasks of assigned tasks" ON public.subtasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = subtasks.task_id
            AND (t.assigned_to = auth.uid() OR public.is_admin())
        )
    );

-- Manage: Users can manage subtasks of tasks assigned to them
CREATE POLICY "Users can manage subtasks of assigned tasks" ON public.subtasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = subtasks.task_id
            AND (t.assigned_to = auth.uid() OR public.is_admin())
        )
    );

-- Grant permissions
GRANT ALL ON public.subtasks TO authenticated;
GRANT ALL ON public.subtasks TO service_role;
