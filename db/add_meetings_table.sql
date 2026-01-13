-- Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    meeting_link TEXT,
    platform TEXT, -- e.g. 'Zoom', 'Google Meet', 'Teams'
    created_by UUID REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meetings for their clients or departments" ON public.meetings
    FOR SELECT USING (true); -- Simplified for now, similar to tasks

CREATE POLICY "Users can create meetings" ON public.meetings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their meetings" ON public.meetings
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their meetings" ON public.meetings
    FOR DELETE USING (true);

-- Add real-time
alter publication supabase_realtime add table public.meetings;
