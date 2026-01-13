-- Allow users to delete their own activities
-- Run this in the Supabase SQL editor

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete their own activities" ON activities
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
