# Push Notification Diagnostic Checklist

Use this checklist to diagnose why push notifications aren't working on your development build.

## ✅ Step 1: Check Device Token is Saved

**Run this SQL in Supabase SQL Editor:**

```sql
-- Check if your device token exists in the database
SELECT 
  dt.id,
  dt.agent_id,
  dt.token,
  dt.device_type,
  dt.is_active,
  dt.created_at,
  a.email as agent_email,
  a.name as agent_name
FROM device_tokens dt
LEFT JOIN agents a ON dt.agent_id = a.id
ORDER BY dt.created_at DESC
LIMIT 10;
```

**Expected Result:**
- ✅ You should see at least one row with your token
- ✅ `is_active` should be `true`
- ✅ `agent_id` should match your logged-in user ID
- ✅ `token` should start with `ExponentPushToken[`

**If no tokens found:**
- The token registration might have failed
- Check app logs for: `✅ Device token registered successfully`
- Make sure you're logged in when the app starts
- Restart the app and log in again

---

## ✅ Step 2: Check Webhook Configuration

**Go to Supabase Dashboard → Database → Webhooks**

**Check if webhook exists:**
- ✅ Webhook name: `Send Push Notification` (or similar)
- ✅ **Table**: `notifications` (just the table name, no backticks)
- ✅ **Events**: `INSERT` only (not UPDATE)
- ✅ **URL**: `https://olaounggwgxpbenmuvnl.supabase.co/functions/v1/send-push-notification`
- ✅ **HTTP Headers**: 
  ```
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  Content-Type: application/json
  ```
- ✅ Webhook is **Active/Enabled**

**If webhook doesn't exist:**
- Create a new webhook following `PUSH_NOTIFICATIONS_SETUP.md`
- Make sure to use your actual service role key in the Authorization header

**Get your Service Role Key:**
- Supabase Dashboard → Settings → API
- Copy the `service_role` key (secret, not the anon key)

---

## ✅ Step 3: Check Edge Function Deployment

**Go to Supabase Dashboard → Edge Functions**

**Check:**
- ✅ Function `send-push-notification` exists
- ✅ Function is deployed (shows deployment date)
- ✅ No deployment errors

**If function doesn't exist or has errors:**
- Deploy the function:
  ```bash
  npx supabase functions deploy send-push-notification
  ```

**Check Edge Function Secrets:**
- Go to Edge Functions → `send-push-notification` → Secrets
- Verify `SUPABASE_URL` is set
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set

---

## ✅ Step 4: Check Edge Function Logs

**Go to Supabase Dashboard → Edge Functions → `send-push-notification` → Logs**

**What to check:**
1. **Create a test notification** (see Step 5)
2. **Check logs immediately after** - you should see:
   - `📤 Sending push notification for: [notification-id]`
   - `📱 Sending X push notification(s)`
   - `✅ Push notifications sent successfully`

**If you see errors:**
- `No device tokens found`: Token not registered (go back to Step 1)
- `Failed to fetch device tokens`: RLS policy issue or missing service role key
- `Expo Push API error`: Invalid token format or Expo project ID issue
- `Invalid webhook payload`: Webhook configuration issue (go back to Step 2)

**If no logs appear:**
- Webhook is not triggering (check Step 2)
- Webhook might not be active
- Check webhook logs in Supabase Dashboard → Database → Webhooks

---

## ✅ Step 5: Test Manually - Create Test Notification

**Run this SQL in Supabase SQL Editor (replace `YOUR_AGENT_ID` with your actual agent ID):**

```sql
-- Get your agent ID first
SELECT id, email, name FROM agents WHERE email = 'your-email@example.com';

-- Then create a test notification (replace with your agent_id)
INSERT INTO notifications (
  agent_id,
  type,
  title,
  message,
  metadata
) VALUES (
  'YOUR_AGENT_ID',  -- Replace with your agent ID from above
  'SYSTEM_ANNOUNCEMENT',
  'Test Push Notification',
  'This is a test to verify push notifications are working',
  '{}'::jsonb
) RETURNING id, created_at;
```

**What happens:**
1. Notification should be created in database
2. Webhook should fire
3. Edge Function should be called (check logs)
4. Push notification should be sent to your device

**Check immediately:**
- Edge Function logs (Step 4)
- Your device for the notification
- App logs for notification received

---

## ✅ Step 6: Check App Logs (Development Build)

**If using development build, check logs:**

```bash
# View Android logs
adb logcat | grep ReactNativeJS
```

**Look for:**
- `🔔 Starting push notification setup...`
- `✅ Notification permissions granted`
- `📱 Device token obtained: ExponentPushToken[...]`
- `👤 User found: [agent-id]`
- `✅ Device token registered successfully`
- `📬 Foreground notification received:` (when notification arrives)

**If logs show errors:**
- Note the error message
- Check the corresponding step above

---

## ✅ Step 7: Check Notification Permissions

**On your device:**
- Settings → Apps → Your App → Notifications
- Make sure notifications are **Enabled**
- Check notification categories are enabled

**In the app:**
- The app should request permissions on first launch
- You should see: `✅ Permission granted: true` in logs

**If permissions denied:**
- Go to device settings and enable manually
- Or uninstall/reinstall the app to trigger permission request again

---

## ✅ Step 8: Verify Complete Flow

**Complete test flow:**

1. **Open the app** → Check logs for token registration
2. **Verify token in database** → Run Step 1 SQL query
3. **Create test notification** → Run Step 5 SQL query
4. **Check Edge Function logs** → Should show push sent
5. **Check device** → Should receive notification

**Expected timeline:**
- Notification created → Instant
- Webhook fires → < 1 second
- Edge Function called → < 2 seconds
- Push notification sent → < 5 seconds
- Device receives notification → < 10 seconds

---

## 🐛 Common Issues and Solutions

### Issue 1: Token not in database
**Symptoms:** Step 1 query returns no results

**Solutions:**
- Make sure you're logged in when app starts
- Check app logs for registration errors
- Verify RLS policies allow token insertion
- Restart app and log in again

### Issue 2: Webhook not configured
**Symptoms:** Step 2 shows no webhook, or webhook logs show no activity

**Solutions:**
- Create webhook following setup guide
- Verify webhook is active/enabled
- Check webhook URL is correct
- Verify Authorization header has correct service role key

### Issue 3: Edge Function not deployed
**Symptoms:** Step 3 shows function doesn't exist

**Solutions:**
- Deploy function: `npx supabase functions deploy send-push-notification`
- Check for deployment errors
- Verify secrets are set

### Issue 4: Edge Function errors
**Symptoms:** Step 4 logs show errors

**Solutions:**
- `No device tokens found` → Check Step 1
- `Failed to fetch device tokens` → Check RLS policies and service role key
- `Expo Push API error` → Check token format and Expo project ID
- `Invalid webhook payload` → Check webhook configuration

### Issue 5: No logs in Edge Function
**Symptoms:** Step 4 shows no logs after creating notification

**Solutions:**
- Webhook not triggering (check Step 2)
- Webhook might be disabled
- Check webhook logs in Dashboard

### Issue 6: Notifications not received on device
**Symptoms:** Everything works but no notification appears

**Solutions:**
- Check notification permissions (Step 7)
- Verify app is not in Do Not Disturb mode
- Check if app is in battery optimization (disable it)
- For development builds: Make sure app is connected to dev server
- Try closing and reopening the app
- Check device notification settings

---

## 📋 Quick Diagnostic Commands

```sql
-- Quick check: Device tokens
SELECT COUNT(*) as token_count, agent_id 
FROM device_tokens 
WHERE is_active = true 
GROUP BY agent_id;

-- Quick check: Recent notifications
SELECT id, type, title, agent_id, created_at 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 5;

-- Quick check: Webhook activity (if webhook logging is enabled)
-- Check Supabase Dashboard → Database → Webhooks → Your Webhook → Logs
```

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Device token exists in database (Step 1)
2. ✅ Webhook is configured and active (Step 2)
3. ✅ Edge Function is deployed (Step 3)
4. ✅ Edge Function logs show push sent (Step 4)
5. ✅ Test notification triggers push (Step 5)
6. ✅ Device receives notification (Step 7)
7. ✅ App logs show notification received (Step 6)

---

## 🔄 Next Steps After Diagnosis

Once you identify the issue:

1. **Fix the specific problem** (refer to Common Issues above)
2. **Re-run the diagnostic steps** to verify fix
3. **Test with a real notification** (change registration status, etc.)
4. **Monitor logs** to ensure everything continues working

---

## 📞 Still Not Working?

If you've gone through all steps and still no push notifications:

1. **Check Supabase Status**: Make sure Supabase is up and running
2. **Check Expo Status**: Make sure Expo Push API is working
3. **Check Device**: Try on a different device or emulator
4. **Check Network**: Make sure device has internet connection
5. **Review All Logs**: Check app logs, Edge Function logs, and webhook logs together
6. **Test Manually**: Use Expo's push notification tool to test token directly

**Expo Push Notification Tool:**
- Go to: https://expo.dev/notifications
- Enter your Expo push token
- Send a test notification
- If this works, the issue is in your backend setup
- If this doesn't work, the issue is with Expo/device configuration

