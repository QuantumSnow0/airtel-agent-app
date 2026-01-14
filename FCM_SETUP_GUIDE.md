# Firebase Cloud Messaging (FCM) Setup Guide

## Problem

You're seeing this error:
```
Default FirebaseApp is not initialized in this process com.airtel.agents. 
Make sure to call FirebaseApp.initializeApp(Context) first.
```

This means **Firebase Cloud Messaging (FCM) is not configured** for Android push notifications.

## Solution: Configure FCM for Android

Expo push notifications on Android require Firebase Cloud Messaging (FCM). Here's how to set it up:

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select an existing project
3. Follow the setup wizard:
   - Enter project name (e.g., "Airtel Agents App")
   - Enable Google Analytics (optional)
   - Create project

---

## Step 2: Add Android App to Firebase

1. In Firebase Console, click **"Add app"** → Select **Android**
2. Enter your Android package name: `com.airtel.agents`
   - This matches your `app.json` → `android.package`
3. Enter app nickname (optional): "Airtel Agents"
4. **Click "Register app"** button (DO NOT skip this step!)
5. You'll be taken to Step 2: "Download config file"

---

## Step 3: Download Google Services JSON

**After clicking "Register app" in Step 2:**

1. You'll see Step 2: "Download config file"
2. Click **"Download google-services.json"** button
3. **Save this file** to your computer - you'll need it for EAS
4. **Click "Next"** to continue (you can skip the SDK steps since EAS handles that)

---

## Step 4: Verify FCM Setup (Optional)

**Note**: Since you're using **Expo Push API** (not FCM directly in your Edge Function), you only need `google-services.json` for the client app. The FCM V1 API being enabled is fine, but you don't need service account credentials.

1. **FCM V1 API Status** (optional check):
   - In Firebase Console → Project Settings → Cloud Messaging tab
   - "Firebase Cloud Messaging API (V1)" should show **"Enabled"** ✓ (you already did this)

2. **What you need for EAS**:
   - ✅ `google-services.json` file (from Step 3) - **This is all you need!**
   - ❌ Service Account JSON - **NOT needed** (Edge Function uses Expo Push API)
   - ❌ Server Key - **NOT needed** (Legacy API deprecated)

**Why only google-services.json?**
- Your Edge Function sends notifications via **Expo Push API** (not FCM directly)
- Expo's service handles FCM communication on their servers
- You only need `google-services.json` configured in EAS so the Android app can get FCM tokens

---

## Step 5: Configure EAS with google-services.json

Since you're using Expo Push API, you only need to upload `google-services.json` to EAS.

### Using EAS CLI (Recommended)

```bash
eas credentials
```

1. Select your project
2. Select **Android**
3. Select **Push Notifications** (or **FCM Credentials**)
4. Choose **"Upload a new Google Services JSON file"**
5. Select your `google-services.json` file (from Step 3)
6. Save

### Using EAS Dashboard (Alternative)

1. Go to [Expo Dashboard](https://expo.dev/)
2. Select your project
3. Go to **Credentials** → **Android** → **Push Notifications**
4. Upload **`google-services.json`** file (from Step 3)
5. Save

**That's it!** No service account JSON or Server Key needed - Expo Push API handles FCM communication.

---

## Step 6: Rebuild Your App

After configuring FCM, you **must rebuild** your app:

```bash
# For development build
eas build --platform android --profile development

# For preview build
eas build --platform android --profile preview
```

**Important**: The FCM configuration is baked into the app during build time, so you need to rebuild.

---

## Step 7: Verify Setup

After rebuilding and installing:

1. **Open the app**
2. **Grant notification permissions**
3. **Check logs** - you should see:
   - `✅ Notification permissions granted`
   - `📱 Device token obtained: ExponentPushToken[...]`
   - `✅ Device token registered successfully`

4. **Check database** - device token should be in `device_tokens` table

---

## Troubleshooting

### Issue: "FCM Server Key not found"

**Solution:**
- Make sure you enabled "Cloud Messaging API (Legacy)" in Firebase Console
- Check that you copied the entire key (starts with `AAAA...`)
- Verify the key is set in EAS credentials

### Issue: "Google Services JSON not found"

**Solution:**
- Make sure you downloaded `google-services.json` from Firebase Console
- Verify the package name matches: `com.airtel.agents`
- Check that the file is uploaded to EAS credentials

### Issue: "Still getting Firebase error after rebuild"

**Solution:**
- Make sure you **rebuilt** the app (not just restarted)
- Clear app data and reinstall
- Verify FCM credentials are set in EAS dashboard
- Check that `google-services.json` has correct package name

### Issue: "Can't find Cloud Messaging API (Legacy)"

**Solution:**
1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. If you see "Cloud Messaging API (V1)", that's fine - use that
3. Or enable "Cloud Messaging API (Legacy)" in Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your Firebase project
   - Go to **APIs & Services** → **Library**
   - Search for "Cloud Messaging API"
   - Enable it

---

## Quick Checklist

- [ ] Firebase project created
- [ ] Android app added to Firebase (package: `com.airtel.agents`)
- [ ] `google-services.json` downloaded
- [ ] FCM Server Key obtained
- [ ] FCM credentials configured in EAS
- [ ] App rebuilt with new credentials
- [ ] App installed and tested
- [ ] Device token registered successfully

---

## Alternative: Use Expo's Push Notification Service (No FCM Setup)

If you want to skip FCM setup for now, you can use Expo's managed push notification service, but it has limitations:

- Only works when app is open or in background
- Not as reliable as FCM
- Still requires some configuration

**For production, FCM setup is recommended.**

---

## Next Steps

After FCM is configured:

1. ✅ Rebuild your app
2. ✅ Test push notification setup
3. ✅ Verify device token registration
4. ✅ Test receiving push notifications
5. ✅ Check Edge Function logs
6. ✅ Verify webhook is configured

---

## Resources

- [Expo FCM Setup Guide](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Firebase Console](https://console.firebase.google.com/)
- [EAS Credentials](https://docs.expo.dev/app-signing/managed-credentials/)

---

## Summary

The error occurs because Android push notifications require Firebase Cloud Messaging (FCM). You need to:

1. Create Firebase project
2. Add Android app
3. Get FCM Server Key and Google Services JSON
4. Configure in EAS
5. Rebuild app

Once configured, push notifications will work! 🎉

