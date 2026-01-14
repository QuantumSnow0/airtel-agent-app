# Development Build Guide

## What is a Development Build?

A **development build** is a custom version of your app that:
- ✅ Connects to your local development server (Metro bundler)
- ✅ Supports hot reload and fast refresh
- ✅ Has better debugging and logging capabilities
- ✅ Allows you to test native features (like push notifications)
- ✅ Can be installed on physical devices

**Difference from APK:**
- **APK (preview/production)**: Standalone app, no dev server connection
- **Development Build**: Connects to your dev server, requires `expo start` to be running

## Prerequisites

1. **EAS CLI installed**:
   ```bash
   npm install -g eas-cli
   ```

2. **Logged into EAS**:
   ```bash
   eas login
   ```

3. **Development profile configured** (already done in `eas.json`)

## Step 1: Build Development Build

Run this command:

```bash
eas build --platform android --profile development
```

**What happens:**
1. EAS will ask you to confirm the build configuration
2. Your project is uploaded to Expo's build servers
3. Build happens in the cloud (usually 10-20 minutes)
4. You'll get a download link when done

## Step 2: Install Development Build

1. **Download the APK** from the link provided
2. **Transfer to your Android device** (USB, email, or cloud storage)
3. **Enable "Install from Unknown Sources"**:
   - Settings → Security → Unknown Sources (or Install unknown apps)
   - Enable for your file manager/email app
4. **Install the APK** by tapping on it

## Step 3: Start Development Server

After installing the development build, you need to start your development server:

```bash
# In your project directory
npx expo start --dev-client
```

**Or use the npm script:**
```bash
npm start
```

**What you'll see:**
- A QR code in the terminal
- A Metro bundler URL (e.g., `exp://192.168.1.100:8081`)

## Step 4: Connect Development Build to Server

### Option A: Scan QR Code (if on same network)
1. Open the development build app on your device
2. Scan the QR code from the terminal
3. The app will connect to your dev server

### Option B: Manual Connection
1. Open the development build app
2. Enter the Metro bundler URL manually
3. The app will connect and load your code

## Step 5: Test Push Notifications

Now with the development build:

1. **Check logs**: You'll see all the detailed logs we added:
   - `🚀 Calling setupPushNotifications...`
   - `🔔 Starting push notification setup...`
   - `🔐 Requesting notification permissions...`
   - `📱 Device token obtained:`
   - `✅ Device token registered successfully`

2. **View logs in real-time**:
   ```bash
   # On your computer, view device logs
   adb logcat | grep ReactNativeJS
   ```

3. **Test push notifications**:
   - Grant notification permissions
   - Check if token is registered in database
   - Trigger a notification (change registration status)
   - Verify push notification is received

## Advantages of Development Build

✅ **Better Debugging**: Full console logs visible
✅ **Hot Reload**: Changes reflect immediately
✅ **Native Features**: Test push notifications, camera, etc.
✅ **Real Device Testing**: Test on actual hardware
✅ **Fast Iteration**: No need to rebuild for code changes

## Troubleshooting

### Issue: "Development build won't connect to server"

**Solution:**
- Make sure your device and computer are on the same Wi-Fi network
- Check firewall settings (port 8081 should be open)
- Try using the IP address instead of localhost
- Restart the development server: `npx expo start --dev-client --clear`

### Issue: "Build fails"

**Solution:**
- Check `eas.json` has correct configuration
- Verify environment variables are set
- Check EAS build logs for specific errors
- Try: `eas build --platform android --profile development --clear-cache`

### Issue: "Can't see logs"

**Solution:**
- Use `adb logcat` to view Android logs
- Filter by: `adb logcat | grep ReactNativeJS`
- Check Metro bundler terminal for JavaScript errors
- Enable remote debugging in the app

### Issue: "Push notifications not working"

**Solution:**
- Check logs for device token registration
- Verify webhook is configured in Supabase
- Check Edge Function is deployed
- Verify device token exists in database

## Quick Commands

```bash
# Build development client
eas build --platform android --profile development

# Start development server
npx expo start --dev-client

# View logs
adb logcat | grep ReactNativeJS

# Clear cache and restart
npx expo start --dev-client --clear
```

## Next Steps

After building and installing the development build:

1. ✅ Start the development server
2. ✅ Connect the app to the server
3. ✅ Test push notification setup (check logs)
4. ✅ Verify device token is registered
5. ✅ Test receiving push notifications
6. ✅ Debug any issues using the detailed logs

## When to Use Each Build Type

- **Development Build**: Active development, debugging, testing features
- **Preview Build**: Testing final app, sharing with testers, QA
- **Production Build**: Release to app stores, end users

For push notification debugging, **development build is recommended** because you get full logging and can see exactly what's happening!

