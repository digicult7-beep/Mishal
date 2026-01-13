# Enable Realtime for task_comments

To enable real-time updates for comments, you need to enable Realtime in Supabase:

## Steps:

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Find the `task_comments` table in the list
4. Toggle **ON** the switch next to `task_comments`
5. The table should now show "Realtime enabled"

## Verify:

After enabling, check the browser console. You should see:
- `Subscription status: SUBSCRIBED` (not CLOSED or CHANNEL_ERROR)
- `Comment change detected:` when comments are added/edited/deleted

If you still see issues, you may need to:
- Refresh the Supabase schema cache
- Check RLS policies allow SELECT on task_comments
- Verify the Supabase project has Realtime enabled globally

## Alternative: Manual Polling

If Realtime cannot be enabled, we can implement polling as a fallback (refresh comments every few seconds).
