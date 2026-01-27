-- Commission Rates Configuration
-- Run this SQL in your Supabase SQL Editor
--
-- HOW TO CHANGE RATES LATER:
--   UPDATE commission_rates_config
--   SET standard_commission = 300, premium_commission = 500
--   WHERE id = (SELECT id FROM commission_rates_config LIMIT 1);
-- Then run the "Recalculate all agents' balances" block below (Step 4) if you
-- want existing balances updated to the new rates.

-- Step 1: Create commission_rates_config table (single row, like app_version_config)
CREATE TABLE IF NOT EXISTS public.commission_rates_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_commission INTEGER NOT NULL,
  premium_commission INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_rates_config_single ON commission_rates_config((1));

-- Insert default rates: 300 (standard), 500 (premium) if table is empty
INSERT INTO public.commission_rates_config (standard_commission, premium_commission)
SELECT 300, 500 WHERE NOT EXISTS (SELECT 1 FROM public.commission_rates_config);

-- RLS
ALTER TABLE public.commission_rates_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view commission rates" ON public.commission_rates_config;
DROP POLICY IF EXISTS "Service role can update commission rates" ON public.commission_rates_config;

CREATE POLICY "Anyone can view commission rates"
  ON public.commission_rates_config FOR SELECT USING (TRUE);

CREATE POLICY "Service role can update commission rates"
  ON public.commission_rates_config FOR UPDATE TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_commission_rates_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_commission_rates_config_updated_at ON public.commission_rates_config;
CREATE TRIGGER update_commission_rates_config_updated_at
  BEFORE UPDATE ON public.commission_rates_config
  FOR EACH ROW EXECUTE FUNCTION update_commission_rates_config_updated_at();

COMMENT ON TABLE public.commission_rates_config IS 'Single source of truth for commission rates. Update via SQL to change rates.';
COMMENT ON COLUMN public.commission_rates_config.standard_commission IS 'Commission in KSh per standard package installation';
COMMENT ON COLUMN public.commission_rates_config.premium_commission IS 'Commission in KSh per premium package installation';

-- Step 2: Update notification trigger to use config
CREATE OR REPLACE FUNCTION create_registration_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  customer_name TEXT;
  commission_amount INTEGER;
  package_type TEXT;
  cfg RECORD;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  customer_name := NEW.customer_name;

  IF NEW.status = 'approved' THEN
    notification_title := 'Registration Approved';
    notification_message := format('Customer ''%s'' registration has been approved and is scheduled for installation.', customer_name);

    INSERT INTO public.notifications (agent_id, type, title, message, related_id, metadata)
    VALUES (
      NEW.agent_id,
      'REGISTRATION_STATUS_CHANGE',
      notification_title,
      notification_message,
      NEW.id,
      jsonb_build_object('status', NEW.status, 'customerName', customer_name)
    );

  ELSIF NEW.status = 'installed' THEN
    package_type := NEW.preferred_package;

    SELECT standard_commission, premium_commission INTO cfg
    FROM public.commission_rates_config LIMIT 1;

    IF package_type = 'premium' THEN
      commission_amount := cfg.premium_commission;
    ELSE
      commission_amount := cfg.standard_commission;
    END IF;

    notification_title := 'Installation Completed';
    notification_message := format('Customer ''%s'' installation has been completed. You earned KSh %s.', customer_name, commission_amount);

    INSERT INTO public.notifications (agent_id, type, title, message, related_id, metadata)
    VALUES (
      NEW.agent_id,
      'REGISTRATION_STATUS_CHANGE',
      notification_title,
      notification_message,
      NEW.id,
      jsonb_build_object('status', NEW.status, 'customerName', customer_name, 'amount', commission_amount)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update balance trigger to use config
CREATE OR REPLACE FUNCTION update_agent_balance()
RETURNS TRIGGER AS $$
DECLARE
  cfg RECORD;
  agent_total_earnings INTEGER;
  premium_installed_count INTEGER;
  standard_installed_count INTEGER;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  SELECT standard_commission, premium_commission INTO cfg
  FROM public.commission_rates_config LIMIT 1;

  SELECT
    COUNT(*) FILTER (WHERE preferred_package = 'premium' AND status = 'installed'),
    COUNT(*) FILTER (WHERE preferred_package = 'standard' AND status = 'installed')
  INTO premium_installed_count, standard_installed_count
  FROM customer_registrations
  WHERE agent_id = COALESCE(NEW.agent_id, OLD.agent_id) AND status = 'installed';

  agent_total_earnings := (premium_installed_count * cfg.premium_commission) + (standard_installed_count * cfg.standard_commission);

  UPDATE agents
  SET total_earnings = agent_total_earnings,
      available_balance = agent_total_earnings,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.agent_id, OLD.agent_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recalculate all agents' balances using current config rates
DO $$
DECLARE
  agent_record RECORD;
  premium_installed_count INTEGER;
  standard_installed_count INTEGER;
  cfg RECORD;
  agent_total_earnings INTEGER;
BEGIN
  SELECT standard_commission, premium_commission INTO cfg FROM public.commission_rates_config LIMIT 1;

  FOR agent_record IN SELECT id FROM agents LOOP
    SELECT
      COUNT(*) FILTER (WHERE preferred_package = 'premium' AND status = 'installed'),
      COUNT(*) FILTER (WHERE preferred_package = 'standard' AND status = 'installed')
    INTO premium_installed_count, standard_installed_count
    FROM customer_registrations
    WHERE agent_id = agent_record.id AND status = 'installed';

    agent_total_earnings := (premium_installed_count * cfg.premium_commission) + (standard_installed_count * cfg.standard_commission);

    UPDATE agents
    SET total_earnings = agent_total_earnings,
        available_balance = agent_total_earnings,
        updated_at = NOW()
    WHERE id = agent_record.id;
  END LOOP;
END $$;

-- Update column comments
COMMENT ON COLUMN public.agents.total_earnings IS 'Total commission from installed devices; rates from commission_rates_config (standard/premium KSh)';
COMMENT ON COLUMN public.agents.available_balance IS 'Current withdrawable balance (may differ from total_earnings if payments pending/withdrawn)';
