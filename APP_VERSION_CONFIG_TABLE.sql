-- App Version Configuration Table
-- Stores the minimum required app version for forced updates
-- Run this SQL in your Supabase SQL Editor

-- Create app_version_config table
CREATE TABLE IF NOT EXISTS public.app_version_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Version information
  minimum_required_version TEXT NOT NULL, -- e.g., "1.0.0"
  minimum_required_version_code INTEGER, -- For Android (versionCode)
  current_latest_version TEXT NOT NULL, -- Latest available version
  current_latest_version_code INTEGER, -- For Android
  
  -- Update settings
  force_update BOOLEAN NOT NULL DEFAULT FALSE, -- If true, blocks old versions
  update_message TEXT, -- Custom message shown to users
  update_url_android TEXT, -- Play Store URL
  update_url_ios TEXT, -- App Store URL
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a single-row constraint using a constant value
-- This ensures only one row can exist in the table
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_version_config_single ON app_version_config((1));

-- Insert default configuration (you'll update this when you want to force updates)
INSERT INTO public.app_version_config (
  minimum_required_version,
  minimum_required_version_code,
  current_latest_version,
  current_latest_version_code,
  force_update,
  update_message,
  update_url_android,
  update_url_ios
) VALUES (
  '1.0.0', -- Minimum required version
  1, -- Minimum version code (Android)
  '1.0.0', -- Current latest version
  1, -- Current version code
  FALSE, -- Don't force update yet (set to TRUE when you want to force)
  'A new version of the app is available. Please update to continue using the app.',
  'https://play.google.com/store/apps/details?id=com.airtel.agents', -- Update when published
  'https://apps.apple.com/app/airtel-agents' -- Update when published
) ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.app_version_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_version_config

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view version config" ON public.app_version_config;
DROP POLICY IF EXISTS "Service role can update version config" ON public.app_version_config;

-- Policy: Anyone (authenticated or not) can view version config
-- This is needed so the app can check version before login
CREATE POLICY "Anyone can view version config"
  ON public.app_version_config
  FOR SELECT
  USING (TRUE);

-- Policy: Only service role can update version config (for admin)
CREATE POLICY "Service role can update version config"
  ON public.app_version_config
  FOR UPDATE
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_version_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_app_version_config_updated_at
  BEFORE UPDATE ON public.app_version_config
  FOR EACH ROW
  EXECUTE FUNCTION update_app_version_config_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.app_version_config IS 'Stores minimum required app version for forced updates';
COMMENT ON COLUMN public.app_version_config.force_update IS 'If TRUE, users with older versions cannot use the app';
COMMENT ON COLUMN public.app_version_config.minimum_required_version IS 'Minimum version required (semantic versioning: major.minor.patch)';
COMMENT ON COLUMN public.app_version_config.minimum_required_version_code IS 'Minimum version code required (Android versionCode)';

