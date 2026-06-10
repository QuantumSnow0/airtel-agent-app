-- Safaricom customer registrations (agent app → Supabase).
-- Run this in the Supabase SQL Editor for the same project as `customer_registrations`.

CREATE TABLE IF NOT EXISTS safaricom_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  service_package TEXT NOT NULL,
  fiber_deal_id TEXT,
  portable_deal_id TEXT,
  dedicated_wifi_deal_id TEXT,

  fiber_region_name TEXT,
  fiber_cluster_name TEXT,
  fiber_estate_id TEXT,
  fiber_estate_name TEXT,

  install_county TEXT,
  install_town TEXT,
  install_landmark TEXT,

  customer_name TEXT NOT NULL,
  safaricom_number TEXT NOT NULL,
  alternate_number TEXT,
  email TEXT NOT NULL,
  identification_number TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'installed', 'rejected', 'duplicate', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT safaricom_registrations_email_format CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_safaricom_registrations_agent_id
  ON safaricom_registrations(agent_id);
CREATE INDEX IF NOT EXISTS idx_safaricom_registrations_status
  ON safaricom_registrations(status);
CREATE INDEX IF NOT EXISTS idx_safaricom_registrations_created_at
  ON safaricom_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safaricom_registrations_service_package
  ON safaricom_registrations(service_package);

ALTER TABLE safaricom_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own safaricom registrations"
  ON safaricom_registrations
  FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert own safaricom registrations"
  ON safaricom_registrations
  FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update own pending safaricom registrations"
  ON safaricom_registrations
  FOR UPDATE
  USING (auth.uid() = agent_id AND status = 'pending')
  WITH CHECK (auth.uid() = agent_id);

CREATE OR REPLACE FUNCTION update_safaricom_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_safaricom_registrations_updated_at ON safaricom_registrations;
CREATE TRIGGER update_safaricom_registrations_updated_at
  BEFORE UPDATE ON safaricom_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_safaricom_registrations_updated_at();

COMMENT ON TABLE safaricom_registrations IS 'Safaricom product registrations captured by agents (fibre, portable 5G, dedicated Wi-Fi).';
