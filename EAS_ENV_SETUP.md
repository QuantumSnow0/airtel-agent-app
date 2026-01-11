# Setting Environment Variables for EAS Builds

## Important: EAS Builds Need Environment Variables

When you build with EAS (Expo Application Services), the build happens in the **cloud**, not on your local machine. This means your local `.env` file is **NOT available** during the build.

You have **two options** to provide environment variables for EAS builds:

---

## Option 1: EAS Secrets (Recommended - Secure)

This is the **recommended approach** for production builds. Secrets are stored securely in Expo's servers.

### Step 1: Login to EAS

```bash
eas login
```

### Step 2: Create Secrets

Create secrets for your Supabase credentials:

```bash
# Set your Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project-id.supabase.co"

# Set your Supabase anon key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key-here"
```

### Step 3: Verify Secrets

List all your secrets to verify:

```bash
eas secret:list
```

### Step 4: Build

Now when you build, EAS will automatically use these secrets:

```bash
eas build --platform android --profile preview
```

**✅ Pros:**
- Secure (encrypted storage)
- Not in your code repository
- Can have different secrets for different projects
- Easy to update: `eas secret:update`

**❌ Cons:**
- Requires EAS CLI commands
- Slightly more setup

---

## Option 2: Direct in `eas.json` (Simple - Testing Only)

You can add environment variables directly in `eas.json`. **Only use this for testing, not production!**

### Step 1: Edit `eas.json`

Open `eas.json` and update the build profiles:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project-id.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key-here"
      }
    }
  }
}
```

### Step 2: Build

```bash
eas build --platform android --profile preview
```

**✅ Pros:**
- Simple and quick
- All configuration in one file

**❌ Cons:**
- ⚠️ **Credentials are in your code!**
- Can accidentally commit to git
- Not secure for production
- Harder to manage different environments

---

## Which Option Should I Use?

### For Testing/Development:
- **Option 2** (eas.json) is fine if you're careful not to commit credentials
- Or use **Option 1** if you want to learn the proper way

### For Production:
- **Always use Option 1** (EAS Secrets)
- Never put production credentials in `eas.json`

---

## Quick Setup Guide (Recommended)

### Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **anon public key** (long JWT token)

### Step 2: Create EAS Secrets

```bash
# Login to EAS
eas login

# Create Supabase URL secret
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR-PROJECT-ID.supabase.co"

# When prompted, paste your Supabase URL and press Enter
# You'll see: "Successfully created secret EXPO_PUBLIC_SUPABASE_URL"

# Create Supabase anon key secret
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR-ANON-KEY-HERE"

# When prompted, paste your anon key and press Enter
# You'll see: "Successfully created secret EXPO_PUBLIC_SUPABASE_ANON_KEY"
```

### Step 3: Verify Secrets

```bash
eas secret:list
```

You should see both secrets listed.

### Step 4: Build

```bash
eas build --platform android --profile preview
```

The build will automatically use your secrets!

---

## Managing Secrets

### Update a Secret

```bash
eas secret:update --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "new-url"
```

### Delete a Secret

```bash
eas secret:delete --scope project --name EXPO_PUBLIC_SUPABASE_URL
```

### View Secrets

```bash
eas secret:list
```

---

## Troubleshooting

### Issue: "Environment variable not found during build"

**Solutions:**
1. Verify secrets exist: `eas secret:list`
2. Check secret names match exactly (case-sensitive): `EXPO_PUBLIC_SUPABASE_URL`
3. Make sure you're using the same project (EAS project scope)
4. Try updating the secret: `eas secret:update`

### Issue: "Build fails with Supabase connection error"

**Solutions:**
1. Verify your Supabase URL and key are correct
2. Check Supabase project is active
3. Test credentials work locally first (with `.env` file)
4. Re-create secrets with correct values

### Issue: "Secrets exist but build still fails"

**Solutions:**
1. Clear build cache: `eas build --platform android --profile preview --clear-cache`
2. Verify you're building the right profile (preview/production)
3. Check EAS dashboard for detailed build logs

---

## What About Local Development?

For **local development** (running `expo start`), you still use the `.env` file:

1. Create `.env` file in project root
2. Add your variables there
3. Restart Expo: `npx expo start -c`

The `.env` file works for:
- ✅ Local development (`expo start`)
- ✅ Expo Go app testing
- ❌ **NOT** for EAS builds (needs secrets or eas.json)

---

## Summary

| Method | Local Dev | EAS Build | Security | Recommended |
|--------|-----------|-----------|----------|-------------|
| `.env` file | ✅ Yes | ❌ No | ✅ Secure | For local only |
| EAS Secrets | ❌ No | ✅ Yes | ✅✅ Very Secure | ✅ **Yes** |
| `eas.json` | ❌ No | ✅ Yes | ⚠️ In code | Testing only |

**Best Practice:**
- Use `.env` file for local development
- Use **EAS Secrets** for EAS builds (production)
- Never commit credentials to git

---

## Quick Command Reference

```bash
# List all secrets
eas secret:list

# Create a secret
eas secret:create --scope project --name VARIABLE_NAME --value "value"

# Update a secret
eas secret:update --scope project --name VARIABLE_NAME --value "new-value"

# Delete a secret
eas secret:delete --scope project --name VARIABLE_NAME

# Build with secrets (automatic)
eas build --platform android --profile preview
```

---

**Next Step:** After setting up secrets, follow `BUILD_GUIDE.md` to build your APK!


