-- Add deduplication_key column to notifications table
DO $$ BEGIN
    ALTER TABLE public.notifications ADD COLUMN deduplication_key TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create a unique index on user_id and deduplication_key to enforce uniqueness
-- This allows multiple identical notifications for DIFFERENT users, but unique per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe 
ON public.notifications (user_id, deduplication_key) 
WHERE deduplication_key IS NOT NULL;
