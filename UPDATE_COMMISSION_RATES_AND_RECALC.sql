-- Update commission rates and recalculate all agents' balances
-- Edit the values below, then run this in Supabase SQL Editor.
--
-- This script will:
--   1. Update commission_rates_config with new rates
--   2. Recalculate every agent's balance
--   3. Send a SYSTEM_ANNOUNCEMENT push notification to all agents about the increase

-- 1. Update rates (edit these numbers)
UPDATE public.commission_rates_config
SET standard_commission = 300,
    premium_commission = 500
WHERE id = (SELECT id FROM public.commission_rates_config LIMIT 1);

-- 2. Recalculate every agent's balance using the new rates
DO $$
DECLARE
  agent_record RECORD;
  premium_installed_count INTEGER;
  standard_installed_count INTEGER;
  cfg RECORD;
  agent_total_earnings INTEGER;
BEGIN
  SELECT standard_commission, premium_commission INTO cfg
  FROM public.commission_rates_config LIMIT 1;

  FOR agent_record IN SELECT id FROM agents LOOP
    SELECT
      COUNT(*) FILTER (WHERE preferred_package = 'premium' AND status = 'installed'),
      COUNT(*) FILTER (WHERE preferred_package = 'standard' AND status = 'installed')
    INTO premium_installed_count, standard_installed_count
    FROM customer_registrations
    WHERE agent_id = agent_record.id AND status = 'installed';

    agent_total_earnings := (premium_installed_count * cfg.premium_commission)
      + (standard_installed_count * cfg.standard_commission);

    UPDATE agents
    SET total_earnings = agent_total_earnings,
        available_balance = agent_total_earnings,
        updated_at = NOW()
    WHERE id = agent_record.id;
  END LOOP;
END $$;

-- 3. Send system notification (push) to all agents about the commission increase
DO $$
DECLARE
  agent_record RECORD;
  cfg RECORD;
  msg TEXT;
BEGIN
  SELECT standard_commission, premium_commission INTO cfg
  FROM public.commission_rates_config LIMIT 1;

  msg := format(
    'Commission rates have been updated! New rates: Standard KSh %s, Premium KSh %s per installation.',
    cfg.standard_commission,
    cfg.premium_commission
  );

  FOR agent_record IN SELECT id FROM agents LOOP
    INSERT INTO public.notifications (agent_id, type, title, message, metadata)
    VALUES (
      agent_record.id,
      'SYSTEM_ANNOUNCEMENT',
      'Commission rates updated',
      msg,
      jsonb_build_object(
        'standard_commission', cfg.standard_commission,
        'premium_commission', cfg.premium_commission
      )
    );
  END LOOP;
END $$;
