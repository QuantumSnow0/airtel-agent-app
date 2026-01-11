# Quick Build Checklist

## ✅ Pre-Build Checklist

Before building your APK, verify everything is configured:

### 1. Environment Variables
- [ ] Created `.env` file in project root
- [ ] Added `EXPO_PUBLIC_SUPABASE_URL` with your Supabase URL
- [ ] Added `EXPO_PUBLIC_SUPABASE_ANON_KEY` with your Supabase anon key
- [ ] Verified `.env` is in `.gitignore` (not committed to git)

### 2. App Configuration (`app.json`)
- [x] App name: "airtel-agents-app"
- [x] Package name: "com.airtel.agents"
- [x] Version: "1.0.0"
- [x] Deep link scheme: "airtelagentsapp"
- [x] Android intent filters configured

### 3. Assets
- [ ] `assets/images/icon.png` exists (1024x1024)
- [ ] `assets/images/android-icon-foreground.png` exists
- [ ] `assets/images/android-icon-background.png` exists
- [ ] `assets/images/android-icon-monochrome.png` exists
- [ ] `assets/images/splash-icon.png` exists
- [ ] `assets/images/welcome-image.jpg` exists

### 4. Dependencies
- [ ] All dependencies installed: `npm install`
- [ ] No dependency errors

### 5. EAS Build Setup
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Expo account created: https://expo.dev
- [ ] Logged in: `eas login`
- [ ] `eas.json` exists and configured

## 🚀 Quick Build Steps

1. **Install EAS CLI** (if not installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Set Environment Variables for Build** (if not using .env):
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key-here"
   ```

4. **Build APK**:
   ```bash
   npm run build:android
   ```
   OR
   ```bash
   eas build --platform android --profile preview
   ```

5. **Wait for build** (10-20 minutes)

6. **Download APK** from the link provided

7. **Install on device**:
   - Transfer APK to Android device
   - Enable "Install from Unknown Sources"
   - Install and test!

## ⚠️ Common Issues

- **Missing .env file** → See `ENV_SETUP.md`
- **Build fails** → Check error logs in EAS dashboard
- **Deep links not working** → Verify `scheme` in `app.json`
- **Assets missing** → Check all images exist in `assets/images/`

## 📖 Full Documentation

- **Build Guide**: See `BUILD_GUIDE.md` for detailed instructions
- **Environment Setup**: See `ENV_SETUP.md` for .env configuration
- **Supabase Setup**: See `SUPABASE_SETUP.md` for backend configuration

## ✅ After Build

Test these features in your APK:
- [ ] Welcome screen displays
- [ ] Registration flow works
- [ ] Email verification works
- [ ] Login works
- [ ] Forgot password works
- [ ] Deep links from emails work
- [ ] All navigation works
- [ ] Forms validate correctly
- [ ] Keyboard handling works

---

**Ready?** Start with:
```bash
eas login
npm run build:android
```


