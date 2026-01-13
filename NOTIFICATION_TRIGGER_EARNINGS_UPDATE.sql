-- Notification Trigger: Earnings Update
-- Step 2: Create trigger for EARNINGS_UPDATE notifications
-- This trigger fires when an agent's total_earnings or available_balance changes

-- Function to create notification when earnings/balance changes
CREATE OR REPLACE FUNCTION create_earnings_update_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  earnings_increase INTEGER;
  old_total INTEGER;
  new_total INTEGER;
BEGIN
  -- Only create notification if earnings actually increased
  -- (We don't want notifications for decreases or no change)
  old_total := COALESCE(OLD.total_earnings, 0);
  new_total := COALESCE(NEW.total_earnings, 0);
  earnings_increase := new_total - old_total;

  -- Only notify if earnings increased (positive change)
  IF earnings_increase <= 0 THEN
    RETURN NEW;
  END IF;

  -- Determine notification title and message
  notification_title := 'Earnings Updated';
  
  -- Format message based on the amount
  IF earnings_increase = 300 THEN
    notification_message := format('KSh %s has been added to your balance from a premium installation.', earnings_increase);
  ELSIF earnings_increase = 150 THEN
    notification_message := format('KSh %s has been added to your balance from a standard installation.', earnings_increase);
  ELSE
    -- For other amounts (could be multiple installations at once)
    notification_message := format('KSh %s has been added to your balance. Your total earnings are now KSh %s.', earnings_increase, new_total);
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (
    agent_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
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
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_earnings_update_notification ON public.agents;

-- Create trigger that fires AFTER earnings/balance update
CREATE TRIGGER trigger_earnings_update_notification
  AFTER UPDATE OF total_earnings, available_balance ON public.agents
  FOR EACH ROW
  WHEN (NEW.total_earnings IS DISTINCT FROM OLD.total_earnings)
  EXECUTE FUNCTION create_earnings_update_notification();

-- Comments
COMMENT ON FUNCTION create_earnings_update_notification() IS 'Creates a notification when an agent''s earnings or balance increases';

