# Environment Variables Setup

## Required Environment Variables

The app needs these environment variables for Supabase connection:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 1: Create `.env` File

1. **Create a file named `.env`** in the project root (same directory as `package.json`)

2. **Add your Supabase credentials:**
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 2: Get Your Supabase Credentials

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Select your project** (or create a new one)
3. **Navigate to Settings** → **API**
4. **Copy these values:**
   - **Project URL** → Use for `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public key** → Use for `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Example `.env` File

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIxOTAyMiwiZXhwIjoxOTMxNzk1MDIyfQ.example-key
```

## Important Notes

- ⚠️ **Never commit `.env` file to git!** It should be in `.gitignore` (already configured)
- ✅ **Always use `EXPO_PUBLIC_` prefix** for Expo environment variables
- ✅ **Restart Expo** after creating/updating `.env`: `npx expo start -c`
- ✅ **For EAS builds**, set environment variables using EAS secrets (see BUILD_GUIDE.md)

## For EAS Builds (Cloud Builds)

If using EAS Build, set environment variables as secrets:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key-here"
```

Or add them to `eas.json` (see BUILD_GUIDE.md for details).

## Verify Setup

After creating `.env`, verify it works:

1. **Restart Expo**: `npx expo start -c`
2. **Check console logs** - Should not show empty Supabase URL errors
3. **Test app** - Try to register/login, should connect to Supabase

## Troubleshooting

### Issue: "Supabase URL is empty" or connection errors

**Solution:**
- Check `.env` file exists in project root
- Verify variable names start with `EXPO_PUBLIC_`
- Check for typos in variable names
- Restart Expo with cache clear: `npx expo start -c`

### Issue: Environment variables not loading in EAS build

**Solution:**
- Use EAS secrets (recommended): `eas secret:create`
- Or add to `eas.json` build profile
- Never commit actual credentials to git

---

**Next Step:** See `BUILD_GUIDE.md` for instructions on building the APK.


