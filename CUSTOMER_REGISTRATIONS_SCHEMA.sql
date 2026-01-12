-- Customer Registrations Table Schema
-- Run this SQL in your Supabase SQL Editor

-- Create customer_registrations table
CREATE TABLE IF NOT EXISTS customer_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Customer Information (collected from agent)
  customer_name TEXT NOT NULL,
  airtel_number TEXT NOT NULL,
  alternate_number TEXT NOT NULL,
  email TEXT NOT NULL,
  preferred_package TEXT NOT NULL CHECK (preferred_package IN ('standard', 'premium')),
  
  -- Installation Details
  installation_town TEXT NOT NULL,
  delivery_landmark TEXT NOT NULL,
  installation_location TEXT NOT NULL,
  
  -- Visit Details
  visit_date TEXT NOT NULL, -- Format: M/d/yyyy
  visit_time TEXT NOT NULL, -- Format: h:mm AM/PM (stored as user input)
  
  -- Microsoft Forms Integration
  ms_forms_response_id TEXT, -- Response ID from Microsoft Forms submission
  ms_forms_submitted_at TIMESTAMPTZ, -- When successfully submitted to MS Forms
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'installed')),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_registrations_agent_id ON customer_registrations(agent_id);
CREATE INDEX IF NOT EXISTS idx_customer_registrations_status ON customer_registrations(status);
CREATE INDEX IF NOT EXISTS idx_customer_registrations_created_at ON customer_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_registrations_email ON customer_registrations(email);
CREATE INDEX IF NOT EXISTS idx_customer_registrations_airtel_number ON customer_registrations(airtel_number);

-- Enable Row Level Security (RLS)
ALTER TABLE customer_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_registrations

-- Policy: Agents can view their own customer registrations
CREATE POLICY "Agents can view own customer registrations"
  ON customer_registrations
  FOR SELECT
  USING (auth.uid() = agent_id);

-- Policy: Agents can insert their own customer registrations
CREATE POLICY "Agents can insert own customer registrations"
  ON customer_registrations
  FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- Policy: Agents can update their own customer registrations (only if status is pending)
CREATE POLICY "Agents can update own pending registrations"
  ON customer_registrations
  FOR UPDATE
  USING (auth.uid() = agent_id AND status = 'pending')
  WITH CHECK (auth.uid() = agent_id AND status = 'pending');

-- Note: Admin users (service role) can do everything via service role key
-- Regular users (agents) can only see/modify their own registrations

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_customer_registrations_updated_at
  BEFORE UPDATE ON customer_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_registrations_updated_at();

-- Comments for documentation
COMMENT ON TABLE customer_registrations IS 'Stores customer registrations submitted by agents for Airtel SmartConnect services';
COMMENT ON COLUMN customer_registrations.agent_id IS 'Foreign key to agents table - identifies which agent registered this customer';
COMMENT ON COLUMN customer_registrations.ms_forms_response_id IS 'Response ID returned from Microsoft Forms API after successful submission';
COMMENT ON COLUMN customer_registrations.status IS 'Registration status: pending (default), approved, or installed. Agent gets commission when status is installed.';

