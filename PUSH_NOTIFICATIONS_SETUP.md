# Push Notifications Setup Guide

## Overview

This guide explains how to set up push notifications for the Airtel Agents app. Push notifications work when the app is:
- **Foreground**: App is open and active
- **Background**: App is minimized but running
- **Closed**: App is not running

## Architecture

1. **App requests permission** → Gets device token → Saves to database
2. **Notification created** (via trigger) → Database webhook → Edge Function
3. **Edge Function** → Fetches device tokens → Sends push via Expo Push API
4. **Device receives push** → Shows notification → User taps → Navigates

## Setup Steps

### 1. Install Dependencies ✅
```bash
npm install expo-notifications
```
Already done!

### 2. Run Database Migrations

Run these SQL files in your Supabase SQL Editor (in order):

```sql
-- 1. Create device_tokens table
DEVICE_TOKENS_TABLE_MIGRATION.sql

-- 2. Enable Realtime for notifications (if not already done)
ENABLE_REALTIME_NOTIFICATIONS.sql
```

### 3. Deploy Edge Function

Deploy the push notification Edge Function:

```bash
# Make sure you're in the project root
cd supabase/functions/send-push-notification

# Deploy the function
npx supabase functions deploy send-push-notification
```

**Important**: The Edge Function needs access to:
- `SUPABASE_URL` (automatically available)
- `SUPABASE_SERVICE_ROLE_KEY` (set as secret)

Set the service role key:
```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Set Up Database Webhook (Recommended)

Instead of using a database trigger with HTTP extension, use Supabase Database Webhooks:

1. Go to Supabase Dashboard → Database → Webhooks
2. Click "Create a new webhook"
3. Configure:
   - **Name**: Send Push Notification
   - **Table**: `notifications` (no backticks needed - just the table name)
   - **Events**: `INSERT` only (no backticks needed - just the event name)
     - **Important**: Only enable INSERT, NOT UPDATE
     - UPDATE events would trigger when notifications are marked as read, causing spam
     - We only want push notifications for NEW notifications, not status changes
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://olaounggwgxpbenmuvnl.supabase.co/functions/v1/send-push-notification`
   - **HTTP Headers**:
     ```
     Authorization: Bearer [your-service-role-key]
     Content-Type: application/json
     ```
     - Replace `[your-service-role-key]` with your actual service role key
   - **HTTP Parameters**: Leave empty (not needed)
   - **HTTP Request Body**: 
     - **You don't need to configure this!** 
     - Supabase automatically sends the row data in this format:
     ```json
     {
       "type": "INSERT",
       "table": "notifications",
       "schema": "public",
       "record": {
         "id": "...",
         "agent_id": "...",
         "type": "...",
         "title": "...",
         "message": "...",
         "related_id": "...",
         "metadata": {...}
       }
     }
     ```
     - The Edge Function automatically extracts the `record` field

**Important Notes:**
- **Table name**: Just type `notifications` (no backticks, no quotes)
- **Events**: Just type `INSERT` (no backticks, no quotes)
- The `{{ $1.field }}` syntax is for template variables in the request body

### 5. Alternative: Database Trigger (If Webhooks Not Available)

If you prefer using a database trigger, run:

```sql
TRIGGER_PUSH_NOTIFICATION.sql
```

**Note**: This requires the `http` or `pg_net` extension to be enabled in Supabase.

## How It Works

### When App Opens:
1. App requests notification permissions
2. Gets device token from Expo
3. Registers token in `device_tokens` table
4. Sets up notification listeners

### When Notification is Created:
1. Database trigger/webhook fires
2. Calls Edge Function `send-push-notification`
3. Edge Function fetches device tokens for the agent
4. Sends push notification via Expo Push API
5. Device receives and displays notification

### When User Receives Notification:

**Foreground (App Open)**:
- Notification appears as banner
- Sound/vibration plays
- App UI updates in real-time

**Background (App Minimized)**:
- System notification appears
- Sound/vibration plays
- Badge count updates

**Closed (App Not Running)**:
- System notification appears
- Sound/vibration plays
- When tapped, app opens and navigates to relevant screen

### When User Taps Notification:
- App opens (if closed)
- Navigates based on notification type:
  - `REGISTRATION_STATUS_CHANGE` → `/registrations`
  - `EARNINGS_UPDATE` → `/dashboard`
  - `ACCOUNT_STATUS_CHANGE` → `/dashboard`
  - `SYNC_FAILURE` → `/registrations`
  - `SYSTEM_ANNOUNCEMENT` → `/notifications`

## Testing

### Test Push Notifications:

1. **Register a device token**:
   - Open the app
   - Grant notification permissions
   - Check logs for "Device token registered"

2. **Trigger a notification**:
   - Update a registration status to "approved" or "installed"
   - Or update agent status
   - Or trigger a sync failure

3. **Verify push received**:
   - Check device for notification
   - Check Edge Function logs in Supabase Dashboard

### Test Scenarios:

- ✅ App open → Notification appears as banner
- ✅ App minimized → System notification appears
- ✅ App closed → System notification appears
- ✅ Tap notification → App opens and navigates correctly

## Troubleshooting

### No Push Notifications Received:

1. **Check permissions**: Ensure notification permissions are granted
2. **Check device token**: Verify token is saved in `device_tokens` table
3. **Check Edge Function logs**: Look for errors in Supabase Dashboard
4. **Check Expo Push API**: Verify token format is correct
5. **Check webhook/trigger**: Ensure it's firing correctly

### Common Issues:

- **"No device tokens found"**: Agent hasn't opened app yet or permissions denied
- **"Edge Function error"**: Check service role key is set correctly
- **"Expo Push API error"**: Check token format and Expo project ID

## Security Notes

- Device tokens are stored per agent
- Only active tokens are used
- Service role key is required for Edge Function (keep secret!)
- RLS policies protect device_tokens table

## Next Steps

After setup:
1. Test with real notifications
2. Monitor Edge Function logs
3. Adjust notification content/format as needed
4. Consider adding notification sounds/customization

