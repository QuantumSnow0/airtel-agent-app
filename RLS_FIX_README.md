# Fixing RLS Error: "new row violates row-level security policy"

You're getting this error because when a user signs up, they don't have an active session yet (they haven't verified their email), so `auth.uid()` returns `null` and the RLS policy blocks the INSERT.

## Solution: Use a Database Trigger (RECOMMENDED)

The best solution is to use a database trigger that automatically creates the agent profile when a user signs up. This bypasses RLS because the trigger runs with elevated privileges.

### Steps:

1. **Run the trigger SQL** (`RLS_TRIGGER_FIX.sql`):
   - Go to Supabase Dashboard → SQL Editor
   - Copy and paste the entire contents of `RLS_TRIGGER_FIX.sql`
   - Click "Run" to execute
   - This creates a function and trigger that automatically creates agent profiles

2. **The trigger will:**
   - Fire automatically when a new user signs up
   - Extract user data from `auth.users` metadata
   - Create the agent profile with `status = 'pending'`
   - Bypass RLS because it uses `SECURITY DEFINER`

3. **Update your registration flow** (already done in `register.tsx`):
   - The code will still try to insert the profile manually
   - If the trigger already created it, the insert will do nothing (due to ON CONFLICT)
   - If RLS blocks it, that's OK because the trigger handled it

### Alternative: Fix RLS Policies Manually

If you don't want to use a trigger, you need to:

1. **Ensure the user has a session before inserting:**
   - Wait for email verification before creating profile
   - Or create profile after verification is complete

2. **Or use a stored procedure with SECURITY DEFINER** (similar to trigger approach)

## Verify the Fix:

1. Check if trigger exists:
   ```sql
   SELECT trigger_name FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```

2. Test registration:
   - Register a new agent
   - Check if agent profile was created in `agents` table
   - Should no longer see RLS error

## Which Approach to Use?

- **Trigger (Recommended)**: Automatically creates profile, bypasses RLS issues, cleaner code
- **Manual Insert**: More control, but requires proper RLS setup and active session


