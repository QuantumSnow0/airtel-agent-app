# Push Notifications Testing Checklist

## ✅ Pre-Testing Checklist

Before testing push notifications, make sure you've completed:

### 1. Database Setup ✅
- [ ] Run `DEVICE_TOKENS_TABLE_MIGRATION.sql` in Supabase SQL Editor
- [ ] Verify `device_tokens` table exists

### 2. Edge Function Setup ✅
- [ ] Deploy Edge Function:
  ```bash
  npx supabase functions deploy send-push-notification
  ```
- [ ] Set service role key:
  ```bash
  npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```
- [ ] Verify Edge Function is deployed (check Supabase Dashboard → Edge Functions)

### 3. Webhook Setup ✅
- [ ] Create webhook in Supabase Dashboard → Database → Webhooks
- [ ] Configure:
  - Table: `notifications`
  - Events: `INSERT` only
  - URL: `https://olaounggwgxpbenmuvnl.supabase.co/functions/v1/send-push-notification`
  - Headers: `Authorization` and `Content-Type`
- [ ] Verify webhook is active

### 4. App Setup ✅
- [ ] App has `expo-notifications` installed (already done)
- [ ] App.json has expo-notifications plugin (already done)
- [ ] App code has push notification setup (already done)

## 🧪 Testing Steps

### Step 1: Register Device Token
1. Open the app on your device/emulator
2. Grant notification permissions when prompted
3. Log in to the app
4. Check logs for: "✅ Device token registered"
5. Verify in Supabase: Check `device_tokens` table has your token

### Step 2: Trigger a Notification
You can trigger notifications in several ways:

**Option A: Registration Status Change**
- Update a customer registration status to "approved" or "installed"
- This should create a `REGISTRATION_STATUS_CHANGE` notification

**Option B: Account Status Change**
- Update an agent's status (pending → approved/rejected/banned)
- This should create an `ACCOUNT_STATUS_CHANGE` notification

**Option C: Earnings Update**
- Complete an installation (status → installed)
- This should create an `EARNINGS_UPDATE` notification

**Option D: Sync Failure**
- Force a sync failure (disconnect internet during sync)
- This should create a `SYNC_FAILURE` notification

### Step 3: Verify Push Notification
1. **Check Edge Function logs**:
   - Go to Supabase Dashboard → Edge Functions → send-push-notification → Logs
   - Look for: "📤 Sending push notification for: [id]"
   - Look for: "✅ Push notifications sent successfully"

2. **Check device**:
   - **Foreground**: Notification banner should appear
   - **Background**: System notification should appear
   - **Closed**: System notification should appear

3. **Check webhook logs**:
   - Go to Supabase Dashboard → Database → Webhooks
   - Click on your webhook → View logs
   - Should show successful HTTP requests

### Step 4: Test Notification Tap
1. Tap on the push notification
2. App should open (if closed)
3. Should navigate to relevant screen:
   - Registration status → `/registrations`
   - Earnings → `/dashboard`
   - Account status → `/dashboard`
   - Sync failure → `/registrations`

## 🔍 Troubleshooting

### No Push Notification Received?

1. **Check device token**:
   ```sql
   SELECT * FROM device_tokens WHERE agent_id = 'your-agent-id';
   ```
   - Should have at least one active token

2. **Check notification was created**:
   ```sql
   SELECT * FROM notifications WHERE agent_id = 'your-agent-id' ORDER BY created_at DESC LIMIT 1;
   ```
   - Should show the notification

3. **Check webhook logs**:
   - Supabase Dashboard → Database → Webhooks → Your webhook → Logs
   - Look for errors or failed requests

4. **Check Edge Function logs**:
   - Supabase Dashboard → Edge Functions → send-push-notification → Logs
   - Look for errors

5. **Check permissions**:
   - Ensure notification permissions are granted in device settings
   - Try uninstalling and reinstalling the app

### Common Issues

- **"No device tokens found"**: Agent hasn't opened app yet or permissions denied
- **"Edge Function error"**: Check service role key is set correctly
- **"Webhook not firing"**: Verify webhook is active and table/events are correct
- **"Expo Push API error"**: Check token format and Expo project ID

## ✅ Success Criteria

You'll know it's working when:
- ✅ Device token is saved in database
- ✅ Notification is created in database
- ✅ Webhook fires (check logs)
- ✅ Edge Function receives request (check logs)
- ✅ Push notification appears on device
- ✅ Tapping notification navigates correctly

