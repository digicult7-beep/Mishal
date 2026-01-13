-- Add new columns to subtasks table
ALTER TABLE public.subtasks 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS parent_subtask_id UUID REFERENCES public.subtasks(id) ON DELETE CASCADE;

-- Create subtask_comments table
CREATE TABLE IF NOT EXISTS public.subtask_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subtask_id UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for subtask_comments
ALTER TABLE public.subtask_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subtask_comments

-- View: Users can view comments if they can view the subtask
CREATE POLICY "Users can view subtask comments" ON public.subtask_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.subtasks s
            JOIN public.tasks t ON t.id = s.task_id
            WHERE s.id = subtask_comments.subtask_id
            AND (
                t.assigned_to = auth.uid() 
                OR public.is_admin()
                OR EXISTS (
                    SELECT 1 FROM public.task_assignments ta 
                    WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
                )
            )
        )
    );

-- Manage: Users can manage their own comments
CREATE POLICY "Users can manage their own subtask comments" ON public.subtask_comments
    FOR ALL USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.subtask_comments TO authenticated;
GRANT ALL ON public.subtask_comments TO service_role;
