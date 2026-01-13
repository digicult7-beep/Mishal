-- SQL script to clean up duplicate task statuses
-- It keeps the first status for each (department_id, label) pair and deletes the rest,
-- while updating any tasks that referenced the deleted statuses.

DO $$
DECLARE
    r RECORD;
    keep_id UUID;
    duplicate_id UUID;
BEGIN
    -- Iterate over groups of duplicates
    FOR r IN 
        SELECT department_id, label, array_agg(id ORDER BY created_at) as ids, count(*) 
        FROM public.task_statuses 
        GROUP BY department_id, label 
        HAVING count(*) > 1
    LOOP
        -- Keep the first one (oldest)
        keep_id := r.ids[1];
        
        RAISE NOTICE 'Processing duplicate status: % (Department: %) - Keeping ID: %', r.label, r.department_id, keep_id;

        -- Iterate over the duplicates (skipping the first one)
        FOR i IN 2..array_length(r.ids, 1) LOOP
            duplicate_id := r.ids[i];
            
            -- Update tasks to use the kept status
            UPDATE public.tasks 
            SET status_id = keep_id 
            WHERE status_id = duplicate_id;
            
            -- Delete the duplicate status
            DELETE FROM public.task_statuses 
            WHERE id = duplicate_id;
            
            RAISE NOTICE '  - Merged and deleted duplicate ID: %', duplicate_id;
        END LOOP;
    END LOOP;
END $$;
