# Unverified User Behavior

## Current State If User Doesn't Verify OTP

When a user signs up but doesn't verify their OTP, here's what happens:

### 1. **User Created in `auth.users`**
- ✅ User record exists in Supabase `auth.users` table
- ❌ `email_confirmed_at` is `null` (email not verified)
- ✅ User metadata (name, phone numbers, town, area) is stored in `user_metadata`

### 2. **No Agent Profile Created**
- ❌ NO record exists in `agents` table
- This is by design - agent profiles are only created AFTER email verification

### 3. **Cannot Sign In**
- ❌ User cannot sign in with their email/password
- ✅ Login will show error: "Email not confirmed"
- ✅ Login screen checks for `email_confirmed_at` and redirects unverified users

### 4. **Can Resend OTP**
- ✅ User can resend OTP from the verify-email screen
- ✅ Uses `supabase.auth.resend({ type: "signup", email: emailToUse })`
- ✅ Has rate limiting (usually 60 seconds between requests)

### 5. **Cannot Register Again**
- ❌ If user tries to register again with the same email
- ✅ Supabase will return error: "Email already registered"
- ✅ Registration shows: "This email is already registered. Please sign in instead."
- ⚠️ But they can't sign in because email isn't confirmed (catch-22!)

### 6. **User is in "Limbo" State**
- User exists but is incomplete
- Cannot proceed with registration
- Cannot sign in
- Can only resend OTP to complete verification

## What Happens When User Eventually Verifies

1. User enters correct OTP
2. `email_confirmed_at` is set in `auth.users`
3. Agent profile is created in `agents` table with status "pending"
4. User can now sign in
5. User is redirected to pending approval screen

## Potential Issues & Solutions

### Issue 1: User Can't Register Again With Same Email
**Problem**: User signs up but doesn't verify. Later tries to register again → "Email already exists" but can't sign in.

**Current Solution**: User must resend OTP and verify

**Alternative Solution** (Not Implemented):
- Allow users to request a new OTP from login screen
- Show message: "Email not verified. Would you like to resend verification code?"
- This would require modifying the login screen

### Issue 2: Orphaned Unverified Users
**Problem**: Users who never verify accumulate in `auth.users` table

**Current State**: No cleanup mechanism

**Optional Solutions** (Not Implemented):
1. **Database Cleanup Job**: Periodically delete users where:
   - `email_confirmed_at IS NULL`
   - `created_at < NOW() - INTERVAL '7 days'`
2. **Supabase Dashboard**: Manually clean up unverified users
3. **Accept as Normal**: Some users don't complete registration (common in apps)

### Issue 3: User Forgot Which Email They Used
**Problem**: User signs up but forgets which email address they used

**Current Solution**: None (user must remember email)

**Alternative Solution** (Not Implemented):
- Add "Find my email" functionality
- Require phone number during registration
- Send OTP to phone number as backup

## Recommendations

### Current Implementation is OK For:
- ✅ Most users will verify immediately
- ✅ Resend OTP is available
- ✅ Prevents duplicate registrations
- ✅ Security: Only verified emails can sign in

### Consider Adding (Optional):
1. **"Resend OTP" on Login Screen**: If email not confirmed, show option to resend
2. **Cleanup Job**: Remove unverified users after 7-30 days (optional)
3. **Better Error Messages**: Guide users who try to register again with unverified email

## Code References

### Where Verification Check Happens:
- `app/login.tsx`: Checks `email_confirmed_at` before allowing login
- `app/verify-email.tsx`: Creates agent profile after successful OTP verification
- `app/_layout.tsx`: Redirects unverified users to verify-email screen

### Resend OTP:
- `app/verify-email.tsx`: `handleResendOtp()` function
- Uses `supabase.auth.resend({ type: "signup", email })`


