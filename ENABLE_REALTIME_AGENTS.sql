-- Enable Realtime for the agents table
-- This allows Supabase Realtime to broadcast changes to connected clients.
-- This is needed for real-time updates of agent status, balance, and earnings.

-- Add the 'agents' table to the 'supabase_realtime' publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;

-- Optional: If you want to remove it later
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.agents;




