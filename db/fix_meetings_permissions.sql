-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view meetings for their clients or departments" ON public.meetings;
DROP POLICY IF EXISTS "Users can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can update their meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can delete their meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.meetings;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.meetings;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.meetings;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.meetings;

-- Create policies

-- Allow read access for all authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.meetings
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert access for authenticated users
CREATE POLICY "Enable insert access for authenticated users" ON public.meetings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow update for created_by or general access (permissive for now)
CREATE POLICY "Enable update access for authenticated users" ON public.meetings
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow delete for created_by or general access (permissive for now)
CREATE POLICY "Enable delete access for authenticated users" ON public.meetings
    FOR DELETE
    TO authenticated
    USING (true);

-- Set default for created_by to be the current user
ALTER TABLE public.meetings ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Grant permissions to authenticated users (Crucial for tables created via SQL)
GRANT ALL ON TABLE public.meetings TO authenticated;
GRANT ALL ON TABLE public.meetings TO service_role;
