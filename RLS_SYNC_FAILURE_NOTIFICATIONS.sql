-- RLS Policy: Allow agents to insert SYNC_FAILURE notifications
-- This allows agents to create notifications when sync fails
-- Run this SQL in your Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Agents can insert sync failure notifications" ON public.notifications;

-- Policy: Agents can insert SYNC_FAILURE notifications for themselves
-- Note: For INSERT policies, only WITH CHECK is allowed (not USING)
CREATE POLICY "Agents can insert sync failure notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() = agent_id 
    AND type = 'SYNC_FAILURE'
  );

-- Comments
COMMENT ON POLICY "Agents can insert sync failure notifications" ON public.notifications IS 
'Allows agents to create SYNC_FAILURE notifications when registration sync to Microsoft Forms fails';

