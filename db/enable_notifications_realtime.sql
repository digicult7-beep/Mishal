-- Enable realtime for notifications table
begin;
  -- Add notifications table to the supabase_realtime publication
  alter publication supabase_realtime add table notifications;
commit;
