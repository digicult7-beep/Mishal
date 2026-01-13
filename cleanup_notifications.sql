-- Clean up duplicate notifications
-- Keep only the most recent notification for each (user_id, title) pair

DELETE FROM notifications
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, title 
             ORDER BY created_at DESC
           ) as row_num
    FROM notifications
  ) t
  WHERE t.row_num > 1
);
