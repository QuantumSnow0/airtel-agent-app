-- Agent Balance and Earnings Migration V2
-- Run this SQL in your Supabase SQL Editor
-- This updates the balance calculation to use different rates for premium (300) and standard (150)

-- Step 1: Drop the old function and triggers
DROP TRIGGER IF EXISTS update_agent_balance_on_insert ON customer_registrations;
DROP TRIGGER IF EXISTS update_agent_balance_on_update ON customer_registrations;
DROP FUNCTION IF EXISTS update_agent_balance();

-- Step 2: Create updated function to calculate earnings based on package type
CREATE OR REPLACE FUNCTION update_agent_balance()
RETURNS TRIGGER AS $$
DECLARE
  premium_commission INTEGER := 300;
  standard_commission INTEGER := 150;
  agent_total_earnings INTEGER;
  premium_installed_count INTEGER;
  standard_installed_count INTEGER;
BEGIN
  -- Only update when status changes to 'installed' or from 'installed' to something else
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    -- Status didn't change, no need to update balance
    RETURN NEW;
  END IF;

  -- Count installed registrations by package type for this agent
  SELECT 
    COUNT(*) FILTER (WHERE preferred_package = 'premium' AND status = 'installed'),
    COUNT(*) FILTER (WHERE preferred_package = 'standard' AND status = 'installed')
  INTO premium_installed_count, standard_installed_count
  FROM customer_registrations
  WHERE agent_id = COALESCE(NEW.agent_id, OLD.agent_id)
    AND status = 'installed';

  -- Calculate total earnings: (premium_count * 300) + (standard_count * 150)
  agent_total_earnings := (premium_installed_count * premium_commission) + (standard_installed_count * standard_commission);

  -- Update agent's total_earnings and available_balance
  -- For now, available_balance = total_earnings (can be modified later for withdrawals/payments)
  UPDATE agents
  SET 
    total_earnings = agent_total_earnings,
    available_balance = agent_total_earnings,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.agent_id, OLD.agent_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate triggers
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

-- Step 4: Recalculate existing agents' balances with new rates
DO $$
DECLARE
  agent_record RECORD;
  premium_installed_count INTEGER;
  standard_installed_count INTEGER;
  premium_commission INTEGER := 300;
  standard_commission INTEGER := 150;
  agent_total_earnings INTEGER;
BEGIN
  FOR agent_record IN SELECT id FROM agents LOOP
    -- Count installed registrations by package type for this agent
    SELECT 
      COUNT(*) FILTER (WHERE preferred_package = 'premium' AND status = 'installed'),
      COUNT(*) FILTER (WHERE preferred_package = 'standard' AND status = 'installed')
    INTO premium_installed_count, standard_installed_count
    FROM customer_registrations
    WHERE agent_id = agent_record.id
      AND status = 'installed';

    -- Calculate total earnings with new rates
    agent_total_earnings := (premium_installed_count * premium_commission) + (standard_installed_count * standard_commission);

    -- Update agent's balance
    UPDATE agents
    SET 
      total_earnings = agent_total_earnings,
      available_balance = agent_total_earnings,
      updated_at = NOW()
    WHERE id = agent_record.id;
  END LOOP;
END $$;

-- Update comments for documentation
COMMENT ON COLUMN public.agents.total_earnings IS 'Total commission earned from installed devices: 300 KSh per premium, 150 KSh per standard';
COMMENT ON COLUMN public.agents.available_balance IS 'Current withdrawable balance (may differ from total_earnings if some payments are pending or withdrawn)';

-- Verification queries (optional - run these to verify the migration worked)
-- SELECT 
--   id, 
--   name, 
--   email, 
--   total_earnings, 
--   available_balance,
--   (SELECT COUNT(*) FILTER (WHERE preferred_package = 'premium' AND status = 'installed') FROM customer_registrations WHERE agent_id = agents.id) as premium_installed,
--   (SELECT COUNT(*) FILTER (WHERE preferred_package = 'standard' AND status = 'installed') FROM customer_registrations WHERE agent_id = agents.id) as standard_installed
-- FROM agents;





