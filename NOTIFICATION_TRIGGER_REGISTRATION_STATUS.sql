-- Notification Trigger: Registration Status Change
-- Step 1: Create trigger for REGISTRATION_STATUS_CHANGE notifications
-- This trigger fires when a customer_registrations.status changes

-- Function to create notification when registration status changes
CREATE OR REPLACE FUNCTION create_registration_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  customer_name TEXT;
  commission_amount INTEGER;
  package_type TEXT;
BEGIN
  -- Only create notification if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  -- Get customer name directly from NEW (the row being updated/inserted)
  customer_name := NEW.customer_name;

  -- Determine notification title and message based on new status
  IF NEW.status = 'approved' THEN
    notification_title := 'Registration Approved';
    notification_message := format('Customer ''%s'' registration has been approved and is scheduled for installation.', customer_name);
    
    -- Insert notification
    INSERT INTO public.notifications (
      agent_id,
      type,
      title,
      message,
      related_id,
      metadata
    ) VALUES (
      NEW.agent_id,
      'REGISTRATION_STATUS_CHANGE',
      notification_title,
      notification_message,
      NEW.id,
      jsonb_build_object(
        'status', NEW.status,
        'customerName', customer_name
      )
    );

  ELSIF NEW.status = 'installed' THEN
    -- Get package type directly from NEW (the row being updated/inserted)
    package_type := NEW.preferred_package;

    -- Calculate commission based on package type
    IF package_type = 'premium' THEN
      commission_amount := 300;
    ELSE
      commission_amount := 150;
    END IF;

    notification_title := 'Installation Completed';
    notification_message := format('Customer ''%s'' installation has been completed. You earned KSh %s.', customer_name, commission_amount);
    
    -- Insert notification
    INSERT INTO public.notifications (
      agent_id,
      type,
      title,
      message,
      related_id,
      metadata
    ) VALUES (
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist, then recreate them
DROP TRIGGER IF EXISTS trigger_registration_status_notification ON public.customer_registrations;
DROP TRIGGER IF EXISTS trigger_registration_status_notification_insert ON public.customer_registrations;

-- Create trigger that fires AFTER status update
CREATE TRIGGER trigger_registration_status_notification
  AFTER UPDATE OF status ON public.customer_registrations
  FOR EACH ROW
  WHEN (NEW.status IN ('approved', 'installed'))
  EXECUTE FUNCTION create_registration_status_notification();

-- Also create trigger for INSERT (in case status is set to approved/installed on creation)
CREATE TRIGGER trigger_registration_status_notification_insert
  AFTER INSERT ON public.customer_registrations
  FOR EACH ROW
  WHEN (NEW.status IN ('approved', 'installed'))
  EXECUTE FUNCTION create_registration_status_notification();

-- Comments
COMMENT ON FUNCTION create_registration_status_notification() IS 'Creates a notification when a customer registration status changes to approved or installed';

