-- Remove Immediate Agent Profile Creation Trigger
-- This script removes the trigger that creates agent profiles immediately on user signup
-- Agent profiles will now be created only after email verification (OTP confirmation)

-- Step 1: Drop the trigger that creates profile immediately on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Optionally drop the function (or keep it for reference/documentation)
-- Uncomment the line below if you want to remove the function entirely:
-- DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 3: Verify the trigger was removed
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';
-- This query should return 0 rows if the trigger was successfully removed

-- Note: After running this script:
-- 1. Users will still be created in auth.users immediately on signup (this is Supabase behavior)
-- 2. Agent profiles will ONLY be created in the agents table AFTER successful OTP verification
-- 3. The agent profile creation now happens in the app code (verify-email.tsx) after OTP verification
-- 4. Agent data (name, phone numbers, town, area) is stored in raw_user_meta_data during signup
--    and used to create the profile after verification

