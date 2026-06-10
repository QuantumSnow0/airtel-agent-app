-- Notification fixes (run after UPDATE_REGISTRATION_STATUSES.sql)
-- 1. Safaricom registration status → in-app + push notifications
-- 2. Earnings messages use dynamic amounts (not hardcoded 300/150)
-- 3. Airtel install: registration notice without amount (EARNINGS_UPDATE carries KSh detail)
-- 4. Safaricom install: commission amount on registration notice (no DB earnings trigger yet)

-- Safaricom commission helper (mirrors app getSafaricomCommissionKesForRegistration)
CREATE OR REPLACE FUNCTION safaricom_registration_commission_kes(
  p_service_package TEXT,
  p_fiber_deal_id TEXT,
  p_portable_deal_id TEXT,
  p_dedicated_wifi_deal_id TEXT
) RETURNS INTEGER AS $$
DECLARE
  deal_id TEXT;
  price INTEGER;
  pct INTEGER;
BEGIN
  deal_id := CASE trim(COALESCE(p_service_package, ''))
    WHEN 'home_business_fiber' THEN p_fiber_deal_id
    WHEN 'safaricom_portable_5g' THEN p_portable_deal_id
    WHEN 'safaricom_dedicated_wifi' THEN p_dedicated_wifi_deal_id
    ELSE NULL
  END;

  price := CASE deal_id
    WHEN 'fiber_40' THEN 2999
    WHEN 'fiber_60' THEN 4100
    WHEN 'fiber_150' THEN 6299
    WHEN 'fiber_500' THEN 12499
    WHEN 'fiber_1000' THEN 20000
    WHEN 'portable_15' THEN 2999
    WHEN 'portable_50' THEN 4000
    WHEN 'portable_100' THEN 5000
    WHEN 'portable_250' THEN 10000
    WHEN 'dedicated_100' THEN 26680
    WHEN 'dedicated_155' THEN 48024
    WHEN 'dedicated_200' THEN 61364
    WHEN 'dedicated_250' THEN 76305
    WHEN 'dedicated_300' THEN 90712
    WHEN 'dedicated_350' THEN 105386
    ELSE 0
  END;

  IF price <= 0 THEN
    RETURN 0;
  END IF;

  pct := ROUND(price * 0.3);
  RETURN GREATEST(1000, pct);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Registration status notifications (Airtel + Safaricom)
CREATE OR REPLACE FUNCTION create_registration_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  customer_name TEXT;
  commission_amount INTEGER;
  package_type TEXT;
  units INTEGER;
  cfg RECORD;
  is_safaricom BOOLEAN;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  is_safaricom := (TG_TABLE_NAME = 'safaricom_registrations');
  customer_name := NEW.customer_name;

  IF NEW.status = 'installed' THEN
    notification_title := 'Installation Completed';

    IF is_safaricom THEN
      commission_amount := safaricom_registration_commission_kes(
        NEW.service_package,
        NEW.fiber_deal_id,
        NEW.portable_deal_id,
        NEW.dedicated_wifi_deal_id
      );

      IF commission_amount > 0 THEN
        notification_message := format(
          'Customer ''%s'' Safaricom installation has been completed. You earned KSh %s.',
          customer_name,
          commission_amount
        );
      ELSE
        notification_message := format(
          'Customer ''%s'' Safaricom installation has been completed.',
          customer_name
        );
      END IF;

      INSERT INTO public.notifications (agent_id, type, title, message, related_id, metadata)
      VALUES (
        NEW.agent_id,
        'REGISTRATION_STATUS_CHANGE',
        notification_title,
        notification_message,
        NEW.id,
        jsonb_build_object(
          'status', NEW.status,
          'customerName', customer_name,
          'amount', NULLIF(commission_amount, 0),
          'carrier', 'safaricom'
        )
      );
    ELSE
      -- Airtel: amount is announced via EARNINGS_UPDATE when balance changes
      notification_message := format(
        'Customer ''%s'' installation has been completed.',
        customer_name
      );

      INSERT INTO public.notifications (agent_id, type, title, message, related_id, metadata)
      VALUES (
        NEW.agent_id,
        'REGISTRATION_STATUS_CHANGE',
        notification_title,
        notification_message,
        NEW.id,
        jsonb_build_object(
          'status', NEW.status,
          'customerName', customer_name,
          'carrier', 'airtel'
        )
      );
    END IF;

  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Registration Rejected';
    notification_message := format(
      'Customer ''%s'' registration was rejected and will not be installed.',
      customer_name
    );

    INSERT INTO public.notifications (agent_id, type, title, message, related_id, metadata)
    VALUES (
      NEW.agent_id,
      'REGISTRATION_STATUS_CHANGE',
      notification_title,
      notification_message,
      NEW.id,
      jsonb_build_object(
        'status', NEW.status,
        'customerName', customer_name,
        'carrier', CASE WHEN is_safaricom THEN 'safaricom' ELSE 'airtel' END
      )
    );

  ELSIF NEW.status = 'duplicate' THEN
    notification_title := 'Duplicate Registration';
    notification_message := format(
      'Customer ''%s'' was marked as a duplicate — no installation or commission.',
      customer_name
    );

    INSERT INTO public.notifications (agent_id, type, title, message, related_id, metadata)
    VALUES (
      NEW.agent_id,
      'REGISTRATION_STATUS_CHANGE',
      notification_title,
      notification_message,
      NEW.id,
      jsonb_build_object(
        'status', NEW.status,
        'customerName', customer_name,
        'carrier', CASE WHEN is_safaricom THEN 'safaricom' ELSE 'airtel' END
      )
    );

  ELSIF NEW.status = 'cancelled' THEN
    notification_title := 'Registration Cancelled';
    notification_message := format(
      'Customer ''%s'' registration was cancelled before installation.',
      customer_name
    );

    INSERT INTO public.notifications (agent_id, type, title, message, related_id, metadata)
    VALUES (
      NEW.agent_id,
      'REGISTRATION_STATUS_CHANGE',
      notification_title,
      notification_message,
      NEW.id,
      jsonb_build_object(
        'status', NEW.status,
        'customerName', customer_name,
        'carrier', CASE WHEN is_safaricom THEN 'safaricom' ELSE 'airtel' END
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Airtel triggers (recreate)
DROP TRIGGER IF EXISTS trigger_registration_status_notification ON public.customer_registrations;
DROP TRIGGER IF EXISTS trigger_registration_status_notification_insert ON public.customer_registrations;

CREATE TRIGGER trigger_registration_status_notification
  AFTER UPDATE OF status ON public.customer_registrations
  FOR EACH ROW
  WHEN (NEW.status IN ('installed', 'rejected', 'duplicate', 'cancelled'))
  EXECUTE FUNCTION create_registration_status_notification();

CREATE TRIGGER trigger_registration_status_notification_insert
  AFTER INSERT ON public.customer_registrations
  FOR EACH ROW
  WHEN (NEW.status IN ('installed', 'rejected', 'duplicate', 'cancelled'))
  EXECUTE FUNCTION create_registration_status_notification();

-- Safaricom triggers (new)
DROP TRIGGER IF EXISTS trigger_safaricom_registration_status_notification ON public.safaricom_registrations;
DROP TRIGGER IF EXISTS trigger_safaricom_registration_status_notification_insert ON public.safaricom_registrations;

CREATE TRIGGER trigger_safaricom_registration_status_notification
  AFTER UPDATE OF status ON public.safaricom_registrations
  FOR EACH ROW
  WHEN (NEW.status IN ('installed', 'rejected', 'duplicate', 'cancelled'))
  EXECUTE FUNCTION create_registration_status_notification();

CREATE TRIGGER trigger_safaricom_registration_status_notification_insert
  AFTER INSERT ON public.safaricom_registrations
  FOR EACH ROW
  WHEN (NEW.status IN ('installed', 'rejected', 'duplicate', 'cancelled'))
  EXECUTE FUNCTION create_registration_status_notification();

-- Earnings notifications: dynamic amounts from commission_rates_config
CREATE OR REPLACE FUNCTION create_earnings_update_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  earnings_increase INTEGER;
  old_total INTEGER;
  new_total INTEGER;
  cfg RECORD;
BEGIN
  old_total := COALESCE(OLD.total_earnings, 0);
  new_total := COALESCE(NEW.total_earnings, 0);
  earnings_increase := new_total - old_total;

  IF earnings_increase <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT standard_commission, premium_commission INTO cfg
  FROM public.commission_rates_config LIMIT 1;

  notification_title := 'Earnings Updated';

  IF earnings_increase = cfg.premium_commission THEN
    notification_message := format(
      'KSh %s has been added to your balance from a premium installation.',
      earnings_increase
    );
  ELSIF earnings_increase = cfg.standard_commission THEN
    notification_message := format(
      'KSh %s has been added to your balance from a standard installation.',
      earnings_increase
    );
  ELSE
    notification_message := format(
      'KSh %s has been added to your balance. Your total earnings are now KSh %s.',
      earnings_increase,
      new_total
    );
  END IF;

  INSERT INTO public.notifications (agent_id, type, title, message, metadata)
  VALUES (
    NEW.id,
    'EARNINGS_UPDATE',
    notification_title,
    notification_message,
    jsonb_build_object(
      'amount', earnings_increase,
      'totalEarnings', new_total,
      'previousEarnings', old_total
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_earnings_update_notification ON public.agents;

CREATE TRIGGER trigger_earnings_update_notification
  AFTER UPDATE OF total_earnings, available_balance ON public.agents
  FOR EACH ROW
  WHEN (NEW.total_earnings IS DISTINCT FROM OLD.total_earnings)
  EXECUTE FUNCTION create_earnings_update_notification();

-- Account status notifications: ensure definer for reliable inserts
CREATE OR REPLACE FUNCTION create_account_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    notification_title := 'Account Approved';
    notification_message := 'Your agent account has been approved. You can now start registering customers and earning commissions.';
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Application Rejected';
    notification_message := 'Unfortunately, your agent application has been rejected. Please contact support at 0700776994 if you believe this is an error.';
  ELSIF NEW.status = 'banned' THEN
    notification_title := 'Account Suspended';
    notification_message := 'Your agent account has been suspended. Please contact support at 0700776994 for more information.';
  ELSIF NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending' THEN
    notification_title := 'Account Status Changed';
    notification_message := 'Your account status has been changed to pending. Please wait for approval.';
  ELSE
    notification_title := 'Account Status Updated';
    notification_message := format('Your account status has been updated to: %s', NEW.status);
  END IF;

  IF NEW.status IN ('approved', 'rejected', 'banned')
     OR (NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending') THEN
    INSERT INTO public.notifications (agent_id, type, title, message, metadata)
    VALUES (
      NEW.id,
      'ACCOUNT_STATUS_CHANGE',
      notification_title,
      notification_message,
      jsonb_build_object('status', NEW.status, 'previousStatus', OLD.status)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION create_registration_status_notification() IS
  'Notifies agents on Airtel/Safaricom registration installed or closed (rejected, duplicate, cancelled)';
COMMENT ON FUNCTION create_earnings_update_notification() IS
  'Notifies agents when Airtel balance increases (rates from commission_rates_config)';
COMMENT ON FUNCTION safaricom_registration_commission_kes(TEXT, TEXT, TEXT, TEXT) IS
  'Agent commission KSh for one installed Safaricom registration';
