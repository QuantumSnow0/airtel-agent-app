# Delete User Account Edge Function Setup

This guide explains how to set up the Edge Function that allows users to delete their own accounts.

## Quick deploy (npx supabase)

```bash
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest functions deploy delete-user-account --no-verify-jwt
npx supabase@latest secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npx supabase@latest secrets set SUPABASE_ANON_KEY="your-anon-key"
```

Use `--no-verify-jwt` to avoid "Invalid JWT" errors; the function verifies the user itself.

Replace `YOUR_PROJECT_REF` and the secret values. Get them from **Supabase Dashboard → Settings → API**.

## Problem

Previously, the delete account feature only deleted the `agents` record and signed the user out, but the `auth.users` record remained. This meant users could log back in and their account would be recreated.

## Solution

An Edge Function (`delete-user-account`) uses admin privileges to delete both:
1. The `agents` record (which cascades to related data)
2. The `auth.users` record (permanently deleting the account)

## Setup Steps

### Option A: Deploy with `npx supabase` (CLI)

From your project root (`airtel-agent-app/`):

**1. Log in to Supabase** (if not already):

```bash
npx supabase@latest login
```

**2. Link your project** (use your project ref from the dashboard URL):

```bash
npx supabase@latest link --project-ref YOUR_PROJECT_REF
```

Example: `npx supabase@latest link --project-ref olaounggwgxpbenmuvnl`

**3. Deploy the function** (use `--no-verify-jwt` to avoid "Invalid JWT" from platform verification; we verify the user inside the function):

```bash
npx supabase@latest functions deploy delete-user-account --no-verify-jwt
```

We verify the user inside the function (auth header + `getUser()`), so security is unchanged. The platform's JWT check can fail with React Native/Expo tokens.

**4. Set secrets** (Dashboard → Settings → API):

```bash
npx supabase@latest secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npx supabase@latest secrets set SUPABASE_ANON_KEY="your-anon-key"
```

`SUPABASE_URL` is usually injected automatically. If the function logs "Server configuration error", set it too:

```bash
npx supabase@latest secrets set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
```

**5. Verify deployment:**

```bash
npx supabase@latest functions list
npx supabase@latest functions logs delete-user-account --follow
```

---

### Option B: Deploy via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click **Create a new function**
4. Name it: `delete-user-account`
5. Copy the contents of `supabase/functions/delete-user-account/index.ts` into the function
6. Click **Deploy**

### Set Environment Variables (Secrets)

The Edge Function needs the service role key to delete auth users:

1. In the Edge Function settings, go to **Secrets**
2. Add/verify these secrets:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Settings → API)
   - `SUPABASE_ANON_KEY` - Your anon key (from Settings → API)

### Verify the Function Works

After deployment, test it:
1. The app will automatically call this function when a user clicks "Delete Account"
2. Check the Edge Function logs in Supabase Dashboard (or `npx supabase@latest functions logs delete-user-account`) to verify it's working

## How It Works

1. **User clicks "Delete Account"** in the app
2. **App calls Edge Function** via `supabase.functions.invoke("delete-user-account")`
3. **Edge Function**:
   - Verifies the user is authenticated (using their auth token)
   - Deletes the `agents` record (cascades to related data)
   - Uses admin API to delete the `auth.users` record
   - Returns success/error
4. **App signs out** and navigates to login

## Security

- Only authenticated users can call this function
- The function verifies the user's identity before deletion
- Uses service role key only in the secure Edge Function environment
- Users can only delete their own account (verified by auth token)

## Troubleshooting

### Error: "Missing authorization header"
- Make sure the user is logged in
- Check that the Supabase client is properly configured

### Error: "Server configuration error"
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Function secrets
- Make sure the service role key is correct

### Error: "Failed to delete account"
- Check Edge Function logs in Supabase Dashboard
- Verify RLS policies allow deletion (or use service role)
- Ensure the user exists in both `agents` and `auth.users` tables

## Notes

- The Edge Function must be deployed before the delete account feature will work
- The function uses `SECURITY DEFINER` equivalent (service role) to bypass RLS
- All related data (customer_registrations, notifications, device_tokens) is automatically deleted via CASCADE
