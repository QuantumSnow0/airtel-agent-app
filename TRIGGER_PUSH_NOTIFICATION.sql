-- Trigger: Send Push Notification When Notification is Created
-- NOTE: This is an ALTERNATIVE approach using database triggers
-- RECOMMENDED: Use Supabase Database Webhooks instead (see PUSH_NOTIFICATIONS_SETUP.md)

-- This trigger uses pg_net extension to call the Edge Function
-- Enable pg_net extension first: CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to call Edge Function when notification is created
CREATE OR REPLACE FUNCTION send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  project_ref TEXT;
BEGIN
  -- Get project reference from Supabase URL
  project_ref := 'olaounggwgxpbenmuvnl';
  
  -- Construct Edge Function URL
  edge_function_url := format(
    'https://%s.supabase.co/functions/v1/send-push-notification',
    project_ref
  );

  -- Use pg_net to call Edge Function asynchronously
  -- This doesn't block the notification creation
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('notification', row_to_json(NEW))
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail notification creation if push fails
    RAISE WARNING 'Error sending push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;

-- Create trigger that fires AFTER notification is inserted
CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification();

-- Comments
COMMENT ON FUNCTION send_push_notification() IS 'Calls Edge Function to send push notification when a notification is created (uses pg_net)';

-- IMPORTANT: Replace 'olaounggwgxpbenmuvnl' with your actual Supabase project reference
-- IMPORTANT: Set service_role_key in Supabase settings or use webhook approach instead
