-- GRANT PERMISSIONS TO ANON ROLE
-- This is the missing piece! The anon role needs explicit GRANT permissions

-- Grant all permissions on the table to authenticated and anon roles
GRANT ALL ON subtask_time_logs TO authenticated;
GRANT ALL ON subtask_time_logs TO anon;

-- Grant usage on the sequence (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verify the grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'subtask_time_logs';
