-- COMPLETE SOLUTION: Use Database Trigger to Auto-Create Agent Profile
-- This bypasses RLS issues by creating the profile automatically when user signs up

-- Step 1: Create a function that will be triggered when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new agent profile when a user signs up
  -- Use NEW.id (the user's UUID from auth.users)
  -- Note: Metadata from signup options is stored in raw_user_meta_data
  INSERT INTO public.agents (
    id,
    email,
    name,
    airtel_phone,
    safaricom_phone,
    town,
    area,
    status,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'airtel_phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'safaricom_phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'town', NULL),
    COALESCE(NEW.raw_user_meta_data->>'area', NULL),
    'pending',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Update with any new metadata if profile already exists
    name = COALESCE(EXCLUDED.name, agents.name),
    email = EXCLUDED.email;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error creating agent profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER allows bypassing RLS

-- Step 2: Create a trigger that fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Make sure RLS policies are correct (for manual updates later)
-- Drop and recreate INSERT policy (now it's optional since trigger handles creation)
DROP POLICY IF EXISTS "Users can insert own agent profile" ON agents;
CREATE POLICY "Users can insert own agent profile"
  ON agents
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 4: Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

