-- Create meeting_participants table
CREATE TABLE IF NOT EXISTS public.meeting_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(meeting_id, user_id)
);

-- RLS Policies
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants for accessible meetings" ON public.meeting_participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_participants.meeting_id
        )
    );

CREATE POLICY "Users can add participants to accessible meetings" ON public.meeting_participants
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_participants.meeting_id
        )
    );

CREATE POLICY "Users can remove participants from accessible meetings" ON public.meeting_participants
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_participants.meeting_id
        )
    );

-- Realtime
alter publication supabase_realtime add table public.meeting_participants;

-- Grant permissions (Fixes 403 error)
GRANT ALL ON TABLE public.meeting_participants TO authenticated;
GRANT ALL ON TABLE public.meeting_participants TO service_role;
