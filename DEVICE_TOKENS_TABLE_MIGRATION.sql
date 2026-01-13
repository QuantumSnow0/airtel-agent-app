-- Device Tokens Table Migration
-- Stores push notification device tokens for each agent
-- Run this SQL in your Supabase SQL Editor

-- Create device_tokens table
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  
  -- Device token from Expo Push Notifications
  token TEXT NOT NULL UNIQUE,
  
  -- Device information
  device_type TEXT, -- 'ios' or 'android'
  device_name TEXT, -- Optional device name
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Soft delete (tokens can be invalidated without deleting)
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_device_tokens_agent_id ON public.device_tokens(agent_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON public.device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_agent_active ON public.device_tokens(agent_id, is_active) WHERE is_active = TRUE;

-- Enable Row Level Security (RLS)
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_tokens

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can view own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Agents can insert own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Agents can update own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Agents can delete own device tokens" ON public.device_tokens;

-- Policy: Agents can view their own device tokens
CREATE POLICY "Agents can view own device tokens"
  ON public.device_tokens
  FOR SELECT
  USING (auth.uid() = agent_id);

-- Policy: Agents can insert their own device tokens
CREATE POLICY "Agents can insert own device tokens"
  ON public.device_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- Policy: Agents can update their own device tokens
CREATE POLICY "Agents can update own device tokens"
  ON public.device_tokens
  FOR UPDATE
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

-- Policy: Agents can delete their own device tokens
CREATE POLICY "Agents can delete own device tokens"
  ON public.device_tokens
  FOR DELETE
  USING (auth.uid() = agent_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_used_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at and last_used_at
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_tokens_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.device_tokens IS 'Stores push notification device tokens for agents';
COMMENT ON COLUMN public.device_tokens.token IS 'Expo push notification token (ExponentPushToken[...])';
COMMENT ON COLUMN public.device_tokens.is_active IS 'Whether the token is currently active (can be set to false if token becomes invalid)';

