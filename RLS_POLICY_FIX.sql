-- Fix for RLS Policy Error: "new row violates row-level security policy"
-- Run this SQL in your Supabase SQL Editor to fix the registration error

-- First, drop the existing policies if they exist (in case you need to recreate)
DROP POLICY IF EXISTS "Users can insert own agent profile" ON agents;
DROP POLICY IF EXISTS "Agents can view own profile" ON agents;
DROP POLICY IF EXISTS "Agents can update own profile before approval" ON agents;

-- Create policy: Authenticated users can insert their own agent record during registration
-- This is the missing policy that was causing the error!
CREATE POLICY "Users can insert own agent profile"
  ON agents
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create policy: Agents can read their own data
CREATE POLICY "Agents can view own profile"
  ON agents
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Agents can update their own data (before approval)
CREATE POLICY "Agents can update own profile before approval"
  ON agents
  FOR UPDATE
  USING (auth.uid() = id AND status = 'pending');


