-- Aggressive cleanup of duplicate notifications
-- Keeps the latest notification for each (user, title, message) combination

DELETE FROM notifications
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, title, message) id
    FROM notifications
    ORDER BY user_id, title, message, created_at DESC
);
