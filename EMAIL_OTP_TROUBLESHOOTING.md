# Email OTP Troubleshooting Guide

If you're not receiving OTP codes from Supabase, follow these steps:

## Issue: Not Receiving OTP Codes

### 1. Check Supabase Email Settings

Go to **Supabase Dashboard** → **Authentication** → **Settings**:

- **Enable email provider**: Should be ON
- **Enable Email OTP**: Should be ON (if available)
- **Email confirmation required**: Can be ON or OFF (we handle verification manually)

### 2. Configure Email Templates

Go to **Authentication** → **Email Templates** → **"Confirm signup"**:

Make sure the template includes the OTP code. The template should have something like:

```
Your verification code is: {{ .Token }}
```

Or if using magic links:
```
Click here to verify: {{ .ConfirmationURL }}
```

### 3. Check SMTP Configuration (IMPORTANT!)

**Supabase's default email service has limitations:**
- Limited emails per hour
- May go to spam
- Not suitable for production

**To fix email delivery:**

1. **Option A: Configure Custom SMTP (Recommended)**
   - Go to **Authentication** → **Settings** → **SMTP Configuration**
   - Enter your SMTP server details (Gmail, SendGrid, Mailgun, etc.)
   - This ensures reliable email delivery

2. **Option B: Use Supabase's Default (For Testing)**
   - Check **Authentication** → **Logs** for email sending errors
   - Make sure you haven't exceeded rate limits
   - Check spam folder

### 4. Verify Auth Logs

Go to **Authentication** → **Logs** and check:
- Are there any errors when sending emails?
- Is the email being sent successfully?
- Any rate limit warnings?

### 5. Test Email Configuration

In Supabase Dashboard:
1. Go to **Authentication** → **Users**
2. Click **"Send verification email"** on a test user
3. Check if email is received

### 6. Check Rate Limits

Supabase has rate limits for emails:
- Default: 1 email per 60 seconds per user
- OTP expires after 1 hour
- Free tier has lower limits

If you hit rate limits:
- Wait 60 seconds between requests
- Or upgrade your Supabase plan

### 7. Alternative: Extract Token from Confirmation Link

If OTP codes aren't working, you can extract the token from the confirmation link:

1. Check your email for the confirmation link
2. The link format is: `https://your-project.supabase.co/auth/v1/verify?token=xxx&type=signup`
3. Extract the `token` parameter (this is your 6-digit code or longer token)
4. Enter it in the app

### 8. Temporary Workaround: Disable Email Confirmation

For testing only (NOT for production):

1. Go to **Authentication** → **Settings**
2. **Disable** "Enable email confirmations"
3. Users will be automatically verified after signup
4. You can verify later manually or re-enable confirmation

### 9. Update Email Template for OTP

Make sure your email template clearly shows the OTP code:

**Template body:**
```
Hello,

Your verification code is: {{ .Token }}

Enter this 6-digit code in the app to verify your email.

This code expires in 1 hour.

If you didn't request this, please ignore this email.
```

### 10. Check App Console Logs

In your app console, check for:
- `OTP send error:` - Shows if there's an error sending OTP
- `Error requesting OTP:` - Shows if the request failed

## Quick Fix: Use signInWithOtp Instead

The app now uses `signInWithOtp()` which is better for sending OTP codes. This should work better than `resend()` with type "signup".

## Still Not Working?

1. **Check your Supabase project status** - Is it active?
2. **Verify environment variables** - Are `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set correctly?
3. **Try a different email address** - Some email providers block automated emails
4. **Contact Supabase Support** - They can check your project's email logs

## Production Solution

For production, you MUST:
1. Configure custom SMTP (Gmail, SendGrid, AWS SES, etc.)
2. Customize email templates with your branding
3. Set up email monitoring and alerts
4. Handle email delivery failures gracefully


