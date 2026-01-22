-- Delete duplicate notifications, keeping only the most recent one
DELETE FROM notifications
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY user_id, title, message 
                ORDER BY created_at DESC
            ) as rn
        FROM notifications
    ) t
    WHERE rn > 1
);
