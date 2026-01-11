# Delayed Agent Profile Creation

## Problem
Currently, users and agent profiles are created immediately when `supabase.auth.signUp()` is called, even before OTP verification. This happens because:

1. `supabase.auth.signUp()` creates a user in `auth.users` immediately (with `email_confirmed_at = null`)
2. The database trigger `handle_new_user()` fires `AFTER INSERT ON auth.users` and immediately creates the agent profile

## Solution
Delay agent profile creation until AFTER successful OTP verification.

## Implementation Steps

### Step 1: Remove the existing trigger
Run this SQL in your Supabase SQL Editor:

```sql
-- Drop the trigger that creates profile immediately on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

### Step 2: Update the registration code
The registration code in `register.tsx` has already been updated to remove the manual agent profile insertion. The agent profile will now be created in `verify-email.tsx` after successful OTP verification.

### Step 3: Agent profile creation happens in verify-email.tsx
After successful OTP verification, the agent profile is created using the user metadata stored during signup (in `raw_user_meta_data`).

## Important Notes

1. **User creation**: Users are still created in `auth.users` immediately on signup (this is how Supabase works), but with `email_confirmed_at = null` until OTP is verified.

2. **Agent profile**: The agent profile in the `agents` table is only created AFTER successful OTP verification.

3. **User metadata**: The agent information (name, phone numbers, town, area) is stored in `raw_user_meta_data` during signup and retrieved after verification to create the profile.

4. **Existing unverified users**: If you have existing users that signed up but never verified their email, they will NOT have agent profiles until they verify.

## Verification

After implementing these changes:

1. A user should appear in `auth.users` immediately after clicking "Register"
2. The user should NOT appear in the `agents` table until after OTP verification
3. After successful OTP verification, the user should appear in the `agents` table with status "pending"


