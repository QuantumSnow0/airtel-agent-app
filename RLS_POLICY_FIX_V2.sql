-- COMPLETE RLS Policy Fix for agents table
-- Run this ENTIRE SQL script in your Supabase SQL Editor

-- Step 1: Drop all existing policies (in case they exist)
DROP POLICY IF EXISTS "Users can insert own agent profile" ON agents;
DROP POLICY IF EXISTS "Agents can view own profile" ON agents;
DROP POLICY IF EXISTS "Agents can update own profile before approval" ON agents;
DROP POLICY IF EXISTS "Service role can do everything" ON agents;

-- Step 2: Create the INSERT policy - THIS IS THE MISSING ONE!
-- This allows authenticated users to insert their own agent record during registration
CREATE POLICY "Users can insert own agent profile"
  ON agents
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 3: Create the SELECT policy
-- Agents can read their own data
CREATE POLICY "Agents can view own profile"
  ON agents
  FOR SELECT
  USING (auth.uid() = id);

-- Step 4: Create the UPDATE policy
-- Agents can update their own data (only if pending approval)
CREATE POLICY "Agents can update own profile before approval"
  ON agents
  FOR UPDATE
  USING (auth.uid() = id AND status = 'pending')
  WITH CHECK (auth.uid() = id AND status = 'pending');

-- Step 5: Verify RLS is enabled
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Step 6: Check if policies were created (optional verification query)
-- This should return 3 rows (INSERT, SELECT, UPDATE policies)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'agents';


