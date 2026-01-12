-- RLS Policy to allow admins to update agent status (approve/ban)
-- Run this SQL in your Supabase SQL Editor
-- 
-- Note: This assumes you have an admin role or admin email list.
-- You can modify the policy to check for admin status in your agents table
-- or use a separate admin_users table.

-- Step 1: Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Agents can update own profile before approval" ON agents;
DROP POLICY IF EXISTS "Admins can update agent status" ON agents;

-- Step 2: Recreate the policy for agents to update their own profile (only if pending)
CREATE POLICY "Agents can update own profile before approval"
  ON agents
  FOR UPDATE
  USING (auth.uid() = id AND status = 'pending')
  WITH CHECK (auth.uid() = id AND status = 'pending');

-- Step 3: Create policy for admins to update agent status
-- Option 1: If you have an admin_users table or admin flag in agents table
-- Uncomment and modify this based on your admin structure:
/*
CREATE POLICY "Admins can update agent status"
  ON agents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE id = auth.uid() 
      AND (is_admin = true OR email IN ('admin@example.com', 'admin2@example.com'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE id = auth.uid() 
      AND (is_admin = true OR email IN ('admin@example.com', 'admin2@example.com'))
    )
  );
*/

-- Option 2: If you want to use service role key (recommended for admin operations)
-- Admins should use the service role key when making updates via API
-- This policy allows service role to do everything:
CREATE POLICY "Service role can update agents"
  ON agents
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Note: Service role key bypasses RLS, so this policy is mainly for documentation.
-- In practice, admin operations should be done via:
-- 1. Supabase Dashboard (uses service role)
-- 2. Edge Functions with service role key
-- 3. Direct API calls with service role key

-- Step 4: Verify RLS is enabled
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

