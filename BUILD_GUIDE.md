# Android APK Build Guide

Complete guide to build a standalone Android APK for testing the Airtel Agents app.

## Prerequisites

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **Expo CLI** - Install globally: `npm install -g expo-cli`
3. **EAS CLI** - Install globally: `npm install -g eas-cli`
4. **Expo Account** (free) - Sign up at [expo.dev](https://expo.dev)
5. **Supabase Project** - With environment variables configured

## Step 1: Environment Variables Setup

### Create `.env` file

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your Supabase credentials:**
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Get your Supabase credentials:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to **Settings** → **API**
   - Copy:
     - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
     - **anon public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

4. **Verify `.env` file is in `.gitignore`** (it should be automatically)

## Step 2: Install Dependencies

```bash
cd airtel-agents-app
npm install
```

## Step 3: Verify Configuration

### Check `app.json`:

```json
{
  "expo": {
    "name": "airtel-agents-app",
    "slug": "airtel-agents-app",
    "version": "1.0.0",
    "scheme": "airtelagentsapp",
    "android": {
      "package": "com.airtel.agents",
      "versionCode": 1,
      ...
    }
  }
}
```

### Verify assets exist:

Check that these files exist in `assets/images/`:
- ✅ `icon.png` (1024x1024)
- ✅ `android-icon-foreground.png` (1024x1024)
- ✅ `android-icon-background.png` (1024x1024)
- ✅ `android-icon-monochrome.png` (1024x1024)
- ✅ `splash-icon.png`
- ✅ `welcome-image.jpg`

## Step 4: Login to Expo

```bash
eas login
```

Enter your Expo account credentials (create account at [expo.dev](https://expo.dev) if needed).

## Step 5: Configure EAS Build (First Time Only)

```bash
eas build:configure
```

This will create/update `eas.json` file. We've already created it, but this command ensures it's properly configured.

## Step 6: Build APK

### Option A: Build APK for Testing (Recommended)

```bash
eas build --platform android --profile preview
```

This will:
- Build an APK file (not AAB)
- Allow installation on any Android device
- Perfect for testing
- Free on Expo's servers

**Build Process:**
1. EAS will ask you to confirm build configuration
2. Upload your project to Expo's build servers
3. Build happens in the cloud (no local setup needed!)
4. You'll get a link to download the APK when done (usually 10-20 minutes)

### Option B: Build Production APK

```bash
eas build --platform android --profile production
```

This builds a production-ready APK with optimizations.

## Step 7: Download and Install APK

1. **After build completes**, you'll get a download link
2. **Download the APK** to your computer
3. **Transfer to Android device** (via USB, email, or cloud storage)
4. **Enable "Install from Unknown Sources"** on your Android device:
   - Go to **Settings** → **Security** → **Unknown Sources** (or **Install unknown apps**)
   - Enable for your file manager/email app
5. **Install the APK** by tapping on it
6. **Open the app** and test!

## Step 8: Test Everything

After installing the APK, test:

- [ ] **Welcome Screen** - Should display correctly
- [ ] **Registration Flow** - Can create new account
- [ ] **Email Verification** - Receives and can verify email
- [ ] **Login** - Can sign in with credentials
- [ ] **Forgot Password** - Can request and reset password
- [ ] **Deep Links** - Email links open the app
- [ ] **Navigation** - All screens work correctly
- [ ] **Form Validation** - Errors display properly
- [ ] **Keyboard Handling** - Buttons visible when keyboard is open

## Build Options

### Local Build (Advanced)

If you want to build locally (requires Android Studio):

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

**Note:** Local builds require more setup (Android Studio, JDK, etc.). EAS Build is recommended.

### Development Build

For development with debugging:

```bash
eas build --platform android --profile development
```

This creates a development client that connects to your dev server.

## Troubleshooting

### Issue: "Environment variables not found"

**Solution:**
- Make sure `.env` file exists in project root
- Check that variables start with `EXPO_PUBLIC_`
- Restart Expo CLI: `npx expo start -c`
- For EAS builds, set environment variables in EAS dashboard or `eas.json`

### Issue: "Build fails with asset errors"

**Solution:**
- Verify all image assets exist in `assets/images/`
- Check image sizes are correct (1024x1024 for icons)
- Ensure image formats are supported (PNG for icons, JPG/PNG for others)

### Issue: "Deep links not working in APK"

**Solution:**
- Verify `scheme: "airtelagentsapp"` in `app.json`
- Check `intentFilters` are configured in `app.json` (already done)
- Test deep links after installing APK on device
- May need to uninstall and reinstall app for deep links to register

### Issue: "APK too large"

**Solution:**
- Use `eas build --platform android --profile preview --clear-cache`
- Check if all dependencies are necessary
- Consider using ProGuard/R8 for code shrinking (advanced)

### Issue: "Build takes too long"

**Solution:**
- First build always takes longer (15-30 minutes)
- Subsequent builds are faster (cached dependencies)
- Use `--clear-cache` flag if build seems stuck

## Environment Variables in EAS Build

For EAS builds, you can set environment variables in two ways:

### Option 1: EAS Secrets (Recommended)

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key-here"
```

### Option 2: In `eas.json`

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-key-here"
      }
    }
  }
}
```

**Note:** Never commit actual credentials to git! Use EAS secrets for production.

## Build Profiles Explained

### `preview` (Testing)
- Builds APK file (easy to install)
- Includes development tools
- Faster build times
- Perfect for testing

### `production` (Release)
- Optimized APK
- Production-ready
- Smaller file size
- Use for distribution

### `development` (Debugging)
- Development client
- Connects to dev server
- Hot reload enabled
- For active development

## Quick Build Commands

```bash
# Build APK for testing (recommended for first build)
eas build --platform android --profile preview

# Build production APK
eas build --platform android --profile production

# Build for both platforms
eas build --platform all --profile preview

# View build status
eas build:list

# Cancel a build
eas build:cancel [build-id]
```

## Next Steps After First Build

1. ✅ Test the APK on your device
2. ✅ Share with team members for testing
3. ✅ Fix any issues found
4. ✅ Rebuild as needed
5. ✅ When ready, build production APK for distribution

## Publishing to Google Play Store (Future)

When ready for Play Store:

1. Build AAB instead of APK:
   ```bash
   eas build --platform android --profile production
   ```
   (Update `eas.json` to build AAB instead of APK)

2. Create Google Play Console account
3. Upload AAB to Play Console
4. Complete store listing
5. Submit for review

But for now, APK is perfect for testing!

## Need Help?

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Expo Forums**: https://forums.expo.dev/
- **EAS Build Status**: https://status.expo.dev/

---

**Ready to build?** Start with:

```bash
eas login
eas build --platform android --profile preview
```

Happy building! 🚀


