-- Allow users to delete their own notifications
-- Run this in the Supabase SQL editor to fix the issue where notifications reappear after deletion

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete their own notifications" ON notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
