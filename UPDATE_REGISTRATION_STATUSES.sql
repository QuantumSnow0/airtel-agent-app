-- Registration status model: pending → installed OR terminal (rejected / duplicate / cancelled)
-- Removes confusing "approved" (agents mistook it for installed).

-- 1. Migrate legacy approved rows back to in-review
UPDATE public.customer_registrations SET status = 'pending' WHERE status = 'approved';
UPDATE public.safaricom_registrations SET status = 'pending' WHERE status = 'approved';

-- 2. Expand allowed statuses (both registration tables)
ALTER TABLE public.customer_registrations
  DROP CONSTRAINT IF EXISTS customer_registrations_status_check;

ALTER TABLE public.customer_registrations
  ADD CONSTRAINT customer_registrations_status_check
  CHECK (status IN ('pending', 'installed', 'rejected', 'duplicate', 'cancelled'));

ALTER TABLE public.safaricom_registrations
  DROP CONSTRAINT IF EXISTS safaricom_registrations_status_check;

ALTER TABLE public.safaricom_registrations
  ADD CONSTRAINT safaricom_registrations_status_check
  CHECK (status IN ('pending', 'installed', 'rejected', 'duplicate', 'cancelled'));

COMMENT ON COLUMN public.customer_registrations.status IS
  'pending = submitted awaiting outcome; installed = commission earned; rejected/duplicate/cancelled = closed without install';

COMMENT ON COLUMN public.safaricom_registrations.status IS
  'pending = submitted awaiting outcome; installed = commission earned; rejected/duplicate/cancelled = closed without install';

-- 3. Notifications: installed + terminal outcomes (no more "approved")
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
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  customer_name := NEW.customer_name;

  IF NEW.status = 'installed' THEN
    package_type := NEW.preferred_package;
    units := COALESCE(NEW.units_required, 1);

    SELECT standard_commission, premium_commission INTO cfg
    FROM public.commission_rates_config LIMIT 1;

    IF package_type = 'premium' THEN
      commission_amount := cfg.premium_commission * units;
    ELSE
      commission_amount := cfg.standard_commission * units;
    END IF;

    notification_title := 'Installation Completed';
    notification_message := format(
      'Customer ''%s'' installation has been completed. You earned KSh %s.',
      customer_name,
      commission_amount
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
        'amount', commission_amount
      )
    );

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
      jsonb_build_object('status', NEW.status, 'customerName', customer_name)
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
      jsonb_build_object('status', NEW.status, 'customerName', customer_name)
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
      jsonb_build_object('status', NEW.status, 'customerName', customer_name)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

COMMENT ON FUNCTION create_registration_status_notification() IS
  'Notifies agents when a registration is installed or closed without install (rejected, duplicate, cancelled)';

-- Run FIX_NOTIFICATIONS.sql next for Safaricom triggers, earnings rate fixes, and SECURITY DEFINER.
