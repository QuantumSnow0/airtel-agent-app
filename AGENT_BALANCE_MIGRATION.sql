-- Agent Balance and Earnings Migration
-- Run this SQL in your Supabase SQL Editor
-- This adds balance tracking columns to the agents table and automatically updates them

-- Step 1: Add balance and earnings columns to agents table
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS total_earnings INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_balance INTEGER NOT NULL DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.agents.total_earnings IS 'Total commission earned from all installed devices (calculated as installed_count * 150)';
COMMENT ON COLUMN public.agents.available_balance IS 'Current withdrawable balance (may differ from total_earnings if some payments are pending or withdrawn)';

-- Step 2: Create function to calculate and update agent balance
CREATE OR REPLACE FUNCTION update_agent_balance()
RETURNS TRIGGER AS $$
DECLARE
  commission_per_device INTEGER := 150;
  agent_total_installed INTEGER;
  new_total_earnings INTEGER;
BEGIN
  -- Only update when status changes to 'installed' or from 'installed' to something else
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    -- Status didn't change, no need to update balance
    RETURN NEW;
  END IF;

  -- Calculate total installed count for this agent
  SELECT COUNT(*) INTO agent_total_installed
  FROM customer_registrations
  WHERE agent_id = COALESCE(NEW.agent_id, OLD.agent_id)
    AND status = 'installed';

  -- Calculate total earnings (installed_count * commission_per_device)
  new_total_earnings := agent_total_installed * commission_per_device;

  -- Update agent's total_earnings and available_balance
  -- For now, available_balance = total_earnings (can be modified later for withdrawals/payments)
  UPDATE agents
  SET 
    total_earnings = new_total_earnings,
    available_balance = new_total_earnings,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.agent_id, OLD.agent_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to automatically update balance when registration status changes
-- Note: We create separate triggers for INSERT and UPDATE because WHEN clause can't reference OLD on INSERT
CREATE TRIGGER update_agent_balance_on_insert
  AFTER INSERT ON customer_registrations
  FOR EACH ROW
  WHEN (NEW.status = 'installed')
  EXECUTE FUNCTION update_agent_balance();

CREATE TRIGGER update_agent_balance_on_update
  AFTER UPDATE OF status ON customer_registrations
  FOR EACH ROW
  WHEN (NEW.status = 'installed' OR OLD.status = 'installed')
  EXECUTE FUNCTION update_agent_balance();

-- Step 4: Initialize existing agents' balances
-- This calculates balances for all existing agents based on their current installed registrations
DO $$
DECLARE
  agent_record RECORD;
  agent_total_installed INTEGER;
  commission_per_device INTEGER := 150;
BEGIN
  FOR agent_record IN SELECT id FROM agents LOOP
    -- Count installed registrations for this agent
    SELECT COUNT(*) INTO agent_total_installed
    FROM customer_registrations
    WHERE agent_id = agent_record.id
      AND status = 'installed';

    -- Update agent's balance
    UPDATE agents
    SET 
      total_earnings = agent_total_installed * commission_per_device,
      available_balance = agent_total_installed * commission_per_device,
      updated_at = NOW()
    WHERE id = agent_record.id;
  END LOOP;
END $$;

-- Step 5: Create index for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_customer_registrations_agent_status 
ON customer_registrations(agent_id, status) 
WHERE status = 'installed';

-- Verification queries (optional - run these to verify the migration worked)
-- SELECT 
--   id, 
--   name, 
--   email, 
--   total_earnings, 
--   available_balance,
--   (SELECT COUNT(*) FROM customer_registrations WHERE agent_id = agents.id AND status = 'installed') as installed_count
-- FROM agents;

