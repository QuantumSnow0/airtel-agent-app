-- Enable Realtime for notifications table
-- This allows real-time subscriptions to work for the notifications table

-- Enable Realtime publication for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Verify Realtime is enabled (this query should return the table)
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';




