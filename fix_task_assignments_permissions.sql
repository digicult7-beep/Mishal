-- Grant permissions on task_assignments table for CC to read assignments
GRANT SELECT ON task_assignments TO authenticated;
GRANT SELECT ON task_assignments TO anon;

-- Verify the grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'task_assignments'
ORDER BY grantee;
