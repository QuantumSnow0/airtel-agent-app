# Critical Fixes Needed

## Issue 1: RLS Error (42501) - FIX THIS FIRST! 🔴

You're still getting: `"new row violates row-level security policy for table 'agents'"`

**Solution**: You MUST run the database trigger SQL to fix this!

### Steps:

1. **Go to Supabase Dashboard** → **SQL Editor**
2. **Copy and paste the ENTIRE contents of `RLS_TRIGGER_FIX.sql`**
3. **Click "Run"** to execute
4. **Verify it worked**: Check that no errors appeared
5. **Test registration again**

The trigger will automatically create agent profiles when users sign up, bypassing RLS issues.

---

## Issue 2: Rate Limiting (60 Second Cooldown) ✅ FIXED

**Problem**: "For security purposes, you can only request this after X seconds"

**What I fixed**:
- Removed duplicate OTP requests (was requesting in both registration AND verify-email screen)
- Added better rate limit error handling
- Now only requests OTP when user clicks "Resend Code" (not automatically)
- signUp() already sends an email, so we don't need to request again immediately

**Result**: No more rate limiting errors from duplicate requests.

---

## Issue 3: Not Receiving OTP Codes

### Check These:

1. **Check Email**: 
   - Check spam folder
   - Check if email was received at all (might be confirmation link, not OTP)

2. **Check Supabase Logs**:
   - Go to **Authentication** → **Logs**
   - See if emails are being sent successfully
   - Check for any errors

3. **Check Email Template**:
   - Go to **Authentication** → **Email Templates** → **"Confirm signup"**
   - Make sure it shows the token/code
   - Template should include: `{{ .Token }}` or similar

4. **Check SMTP Configuration**:
   - Supabase default email has limitations
   - Consider configuring custom SMTP for reliable delivery
   - Go to **Authentication** → **Settings** → **SMTP Configuration**

### Alternative: Extract Token from Confirmation Link

If you receive a confirmation link instead of OTP code:

1. Check your email for the confirmation link
2. The link format is: `https://xxx.supabase.co/auth/v1/verify?token=ABC123...&type=signup`
3. The `token` parameter is your verification code
4. Copy it and enter in the app (might be longer than 6 digits - that's OK, it will still work)

---

## Priority Order:

1. **FIRST**: Run `RLS_TRIGGER_FIX.sql` to fix the RLS error
2. **SECOND**: Test registration - should work now (RLS error fixed)
3. **THIRD**: Check email for verification code/link
4. **FOURTH**: If still not receiving emails, check Supabase logs and SMTP config

---

## Testing Checklist:

- [ ] Run `RLS_TRIGGER_FIX.sql` in Supabase SQL Editor
- [ ] Register a new agent (should not get RLS error)
- [ ] Check email for verification code/link
- [ ] Enter code in app OR extract token from link
- [ ] Should successfully verify and go to pending approval screen


