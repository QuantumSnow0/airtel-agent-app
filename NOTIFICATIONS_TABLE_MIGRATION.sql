-- Notifications Table Migration
-- Step 1: Create the notifications table
-- This will handle REGISTRATION_STATUS_CHANGE notifications first

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  
  -- Notification details
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Optional reference to related entity
  related_id UUID, -- Can reference customer_registrations.id, etc.
  
  -- Flexible metadata storage (JSON)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Drop constraint if it exists, then add it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

-- Add the check constraint
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'REGISTRATION_STATUS_CHANGE',
  'EARNINGS_UPDATE',
  'ACCOUNT_STATUS_CHANGE',
  'SYNC_FAILURE',
  'SYSTEM_ANNOUNCEMENT'
));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_agent_id ON public.notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_agent_unread ON public.notifications(agent_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON public.notifications(related_id) WHERE related_id IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Drop policies if they exist, then recreate them

DROP POLICY IF EXISTS "Agents can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Agents can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Policy: Agents can view their own notifications
CREATE POLICY "Agents can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = agent_id);

-- Policy: Agents can update their own notifications (mark as read)
CREATE POLICY "Agents can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

-- Policy: System (service role) can insert notifications
-- Note: This will be done via database triggers or Edge Functions
-- For now, we'll allow service role to insert
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- Comments for documentation
COMMENT ON TABLE public.notifications IS 'Stores notifications for agents about status changes, earnings, and system announcements';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: REGISTRATION_STATUS_CHANGE, EARNINGS_UPDATE, ACCOUNT_STATUS_CHANGE, SYNC_FAILURE, SYSTEM_ANNOUNCEMENT';
COMMENT ON COLUMN public.notifications.related_id IS 'Optional reference to related entity (e.g., customer_registrations.id)';
COMMENT ON COLUMN public.notifications.metadata IS 'JSON object storing type-specific data (status, amount, customerName, etc.)';

