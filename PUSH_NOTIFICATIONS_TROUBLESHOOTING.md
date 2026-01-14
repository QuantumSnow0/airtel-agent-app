# Push Notifications Troubleshooting Guide

## Issue: No Push Notifications Received

Based on your logs, notifications are being created in the database, but push notifications are not being sent. Here's how to diagnose and fix:

## Step 1: Check Device Token Registration

**Problem**: No logs show device token registration (`📱 Device token obtained`, `✅ Device token registered`)

**Diagnosis**:
1. Run this SQL in Supabase SQL Editor:
```sql
-- Check if device tokens exist for your agent
SELECT 
  dt.id,
  dt.agent_id,
  dt.token,
  dt.device_type,
  dt.is_active,
  dt.last_used_at,
  a.name as agent_name
FROM device_tokens dt
LEFT JOIN agents a ON dt.agent_id = a.id
WHERE dt.agent_id = 'YOUR_AGENT_ID'  -- Replace with your agent ID
ORDER BY dt.created_at DESC;
```

2. Check your app logs for:
   - `🔔 Starting push notification setup...`
   - `✅ Notification permissions granted`
   - `📱 Device token obtained:`
   - `✅ Device token registered successfully`

**If no device tokens exist:**
- The app might not be requesting permissions
- The user might not be logged in when `setupPushNotifications()` runs
- There might be an error during token registration

**Fix**: 
- Restart the app and check logs
- Make sure you're logged in
- Grant notification permissions when prompted

## Step 2: Check Webhook Configuration

**Problem**: Webhook not configured to trigger Edge Function

**Diagnosis**:
1. Go to Supabase Dashboard → Database → Webhooks
2. Check if there's a webhook for the `notifications` table
3. It should:
   - **Table**: `notifications`
   - **Events**: `INSERT`
   - **HTTP Request**: `POST`
   - **URL**: `https://olaounggwgxpbenmuvnl.supabase.co/functions/v1/send-push-notification`
   - **HTTP Headers**: 
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```

**If webhook doesn't exist:**
1. Create a new webhook
2. Set table to `notifications`
3. Set event to `INSERT`
4. Set URL to your Edge Function URL
5. Add Authorization header with service role key

## Step 3: Check Edge Function Deployment

**Problem**: Edge Function not deployed or has errors

**Diagnosis**:
1. Go to Supabase Dashboard → Edge Functions
2. Check if `send-push-notification` exists
3. Check the logs for errors

**Deploy Edge Function**:
```bash
# Make sure you're in the project root
cd supabase/functions/send-push-notification

# Deploy the function
npx supabase functions deploy send-push-notification
```

## Step 4: Check Edge Function Logs

**Problem**: Edge Function is being called but failing

**Diagnosis**:
1. Go to Supabase Dashboard → Edge Functions → `send-push-notification` → Logs
2. Look for errors when a notification is created

**Common Errors**:
- `No device tokens found`: Device token not registered (see Step 1)
- `Failed to fetch device tokens`: RLS policy issue
- `Expo Push API error`: Invalid token format or Expo project ID

## Step 5: Test Manually

**Test Edge Function directly**:
1. Get your device token from the database
2. Create a test notification manually
3. Check Edge Function logs

**Test SQL**:
```sql
-- Create a test notification
INSERT INTO notifications (
  agent_id,
  type,
  title,
  message,
  metadata
) VALUES (
  'YOUR_AGENT_ID',  -- Replace with your agent ID
  'SYSTEM_ANNOUNCEMENT',
  'Test Notification',
  'This is a test push notification',
  '{}'::jsonb
);
```

Then check:
- Edge Function logs for the call
- Device for the push notification

## Step 6: Verify Expo Push Token Format

**Problem**: Invalid token format

**Check**:
- Token should start with `ExponentPushToken[`
- Token should be registered in `device_tokens` table
- Token should be active (`is_active = true`)

## Common Issues and Solutions

### Issue 1: "No device tokens found"
**Solution**: 
- Make sure device token is registered (Step 1)
- Check that `is_active = true` in database

### Issue 2: "Edge Function not called"
**Solution**:
- Check webhook configuration (Step 2)
- Verify webhook is enabled
- Check webhook logs in Supabase Dashboard

### Issue 3: "Permission denied"
**Solution**:
- Check RLS policies on `device_tokens` table
- Make sure service role key is set in Edge Function secrets

### Issue 4: "Expo Push API error"
**Solution**:
- Verify Expo project ID in `app.json`
- Check token format is correct
- Make sure Expo project is configured correctly

## Next Steps

1. **Add more logging**: The updated `_layout.tsx` now has more detailed logs
2. **Restart app**: Restart the app and check logs for device token registration
3. **Check database**: Run the diagnostic SQL queries
4. **Check webhook**: Verify webhook is configured correctly
5. **Check Edge Function**: Verify it's deployed and check logs

## Expected Log Flow

When everything works correctly, you should see:

1. **App startup**:
   ```
   🔔 Starting push notification setup...
   ✅ Notification permissions granted
   📱 Device token obtained: ExponentPushToken[...]
   👤 User found: [agent-id]
   ✅ Device token registered successfully
   ```

2. **When notification is created**:
   - Database trigger creates notification
   - Webhook calls Edge Function
   - Edge Function logs: `📤 Sending push notification for: [notification-id]`
   - Edge Function logs: `✅ Push notifications sent successfully`
   - Device receives push notification

If any step is missing, that's where the issue is!

