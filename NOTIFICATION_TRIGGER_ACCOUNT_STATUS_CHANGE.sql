-- Notification Trigger: Account Status Change
-- Step 3: Create trigger for ACCOUNT_STATUS_CHANGE notifications
-- This trigger fires when an agent's status changes (pending → approved/rejected/banned)

-- Function to create notification when agent status changes
CREATE OR REPLACE FUNCTION create_account_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  status_changed BOOLEAN;
BEGIN
  -- Only create notification if status actually changed
  status_changed := (OLD.status IS DISTINCT FROM NEW.status);
  
  IF NOT status_changed THEN
    RETURN NEW;
  END IF;

  -- Determine notification title and message based on new status
  IF NEW.status = 'approved' THEN
    notification_title := 'Account Approved';
    notification_message := 'Your agent account has been approved. You can now start registering customers and earning commissions.';
    
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Application Rejected';
    notification_message := 'Unfortunately, your agent application has been rejected. Please contact support at 0700776994 if you believe this is an error.';
    
  ELSIF NEW.status = 'banned' THEN
    notification_title := 'Account Suspended';
    notification_message := 'Your agent account has been suspended. Please contact support at 0700776994 for more information.';
    
  ELSIF NEW.status = 'pending' AND OLD.status != 'pending' THEN
    -- Account was reset to pending (unlikely but possible)
    notification_title := 'Account Status Changed';
    notification_message := 'Your account status has been changed to pending. Please wait for approval.';
    
  ELSE
    -- For any other status change, create a generic notification
    notification_title := 'Account Status Updated';
    notification_message := format('Your account status has been updated to: %s', NEW.status);
  END IF;

  -- Only create notification if we have a valid status change
  IF NEW.status IN ('approved', 'rejected', 'banned') OR (NEW.status = 'pending' AND OLD.status != 'pending') THEN
    -- Insert notification
    INSERT INTO public.notifications (
      agent_id,
      type,
      title,
      message,
      metadata
    ) VALUES (
      NEW.id,
      'ACCOUNT_STATUS_CHANGE',
      notification_title,
      notification_message,
      jsonb_build_object(
        'status', NEW.status,
        'previousStatus', OLD.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_account_status_notification ON public.agents;

-- Create trigger that fires AFTER status update
CREATE TRIGGER trigger_account_status_notification
  AFTER UPDATE OF status ON public.agents
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION create_account_status_notification();

-- Comments
COMMENT ON FUNCTION create_account_status_notification() IS 'Creates a notification when an agent''s account status changes (approved, rejected, banned, or reset to pending)';

