-- FIX PERMISSIONS FOR NOTIFICATIONS AND ACTIVITIES TABLES
-- This grants permissions to authenticated and anon roles

-- Grant permissions on notifications table
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;

-- Grant permissions on activities table
GRANT ALL ON activities TO authenticated;
GRANT ALL ON activities TO anon;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verify the grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('notifications', 'activities')
ORDER BY table_name, grantee;
