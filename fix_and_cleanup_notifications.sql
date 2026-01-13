-- 1. Ensure Delete Policy Exists
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

CREATE POLICY "Users can delete their own notifications" ON notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Cleanup Duplicates (Keep latest)
DELETE FROM notifications
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (partition BY user_id, title ORDER BY created_at DESC) as rnum
    FROM notifications
  ) t
  WHERE t.rnum > 1
);
