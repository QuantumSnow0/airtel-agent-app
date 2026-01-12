# Supabase Edge Function Setup for Microsoft Forms

This guide explains how to set up and deploy the Supabase Edge Function that handles Microsoft Forms submissions with proper cookie extraction.

## Why Use Edge Functions?

React Native's `fetch` API cannot extract `Set-Cookie` headers, which Microsoft Forms requires for authentication. The Edge Function runs server-side (Deno runtime) and can properly handle cookies.

## Setup Steps

### 1. Install Supabase CLI

**⚠️ Note**: Supabase CLI cannot be installed via `npm install -g`. Use one of these methods:

#### Option A: Using Scoop (Recommended for Windows)

```powershell
# Install Scoop if you don't have it
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### Option B: Using Chocolatey

```powershell
choco install supabase
```

#### Option C: Using npx (No Installation Required)

You can use `npx` to run Supabase CLI without installing it globally:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref olaounggwgxpbenmuvnl
npx supabase@latest functions deploy submit-ms-forms
```

#### Option D: Download Binary

Download the latest Windows binary from: https://github.com/supabase/cli/releases

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
supabase link --project-ref your-project-ref
```

You can find your project ref in the Supabase dashboard URL: `https://app.supabase.com/project/your-project-ref`

### 4. Deploy the Edge Function

**⚠️ Important**: Deploy with `--no-verify-jwt` to allow unauthenticated calls (or ensure your app sends auth tokens):

```powershell
npx supabase@latest functions deploy submit-ms-forms --no-verify-jwt
```

**Alternative**: If you want to require authentication, deploy without the flag and ensure your app sends the user's JWT token (the Supabase client should do this automatically if the user is logged in).

### 5. Set Environment Variables

Set these in your Supabase project dashboard under **Settings** → **Edge Functions** → **Secrets**:

```bash
supabase secrets set MS_FORMS_FORM_ID="JzfHFpyXgk2zp-tqL93-V1fdJne7SIlMnh7yZpkW8f5UQjc4M0wwWU9HRTJPRjMxWlc5QjRLOUhaMC4u"
supabase secrets set MS_FORMS_TENANT_ID="16c73727-979c-4d82-b3a7-eb6a2fddfe57"
supabase secrets set MS_FORMS_USER_ID="7726dd57-48bb-4c89-9e1e-f2669916f1fe"
```

Or set them via the Supabase dashboard:
- Go to **Project Settings** → **Edge Functions** → **Secrets**
- Add each secret

### 6. Test the Function

You can test the function locally:

```bash
supabase functions serve submit-ms-forms
```

Then test with:

```bash
curl -X POST http://localhost:54321/functions/v1/submit-ms-forms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "customerData": {
      "customerName": "Test Customer",
      "airtelNumber": "0724832555",
      "alternateNumber": "0724832555",
      "email": "test@example.com",
      "preferredPackage": "premium",
      "installationTown": "Nairobi",
      "deliveryLandmark": "Test Landmark",
      "installationLocation": "Kangemi",
      "visitDate": "1/13/2026",
      "visitTime": "10:00 AM"
    },
    "agentData": {
      "name": "Test Agent",
      "mobile": "0724832555"
    }
  }'
```

## How It Works

1. **Client (React Native)** calls `registerCustomerToMSForms()`
2. **Client** invokes Supabase Edge Function `submit-ms-forms`
3. **Edge Function** (server-side):
   - Fetches tokens from Microsoft Forms (with proper cookie extraction)
   - Builds the payload
   - Submits to Microsoft Forms API (with cookies)
   - Returns result to client

## Benefits

✅ **Proper Cookie Handling**: Edge Functions can extract `Set-Cookie` headers  
✅ **Secure**: Secrets stored in Supabase, not exposed to client  
✅ **Reliable**: Server-side execution ensures consistent behavior  
✅ **Same Logic**: Uses same payload building logic as client code

## Troubleshooting

### "Edge Function returned a non-2xx status code"

This error means the Edge Function is either:
1. **Not deployed yet** - Deploy it first:
   ```powershell
   npx supabase@latest functions deploy submit-ms-forms
   ```

2. **Has an error** - Check the logs:
   ```powershell
   npx supabase@latest functions logs submit-ms-forms
   ```

3. **Missing environment variables** - Set the secrets:
   ```powershell
   npx supabase@latest secrets set MS_FORMS_FORM_ID="your-form-id"
   npx supabase@latest secrets set MS_FORMS_TENANT_ID="your-tenant-id"
   npx supabase@latest secrets set MS_FORMS_USER_ID="your-user-id"
   ```

### Function Not Found

Make sure you've deployed the function:
```powershell
npx supabase@latest functions deploy submit-ms-forms
```

### Check if Function is Deployed

List all deployed functions:
```powershell
npx supabase@latest functions list
```

### View Real-Time Logs

Watch logs in real-time:
```powershell
npx supabase@latest functions logs submit-ms-forms --follow
```

### Authentication Error

Make sure your Supabase client is properly configured with:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Cookie Still Not Working

Verify the Edge Function is actually being called by checking Supabase logs:
```powershell
npx supabase@latest functions logs submit-ms-forms
```

### Debug Edge Function Locally

Test the function locally before deploying:
```powershell
npx supabase@latest functions serve submit-ms-forms
```

Then test with:
```powershell
curl -X POST http://localhost:54321/functions/v1/submit-ms-forms `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_ANON_KEY" `
  -d '{\"customerData\":{\"customerName\":\"Test\"},\"agentData\":{\"name\":\"Test Agent\"}}'
```

## File Structure

```
supabase/
  functions/
    submit-ms-forms/
      index.ts          # Edge Function code
```

## Next Steps

After deploying:
1. Test the function with a sample request
2. Update your app to use the new Edge Function (already done in code)
3. Monitor logs for any issues

