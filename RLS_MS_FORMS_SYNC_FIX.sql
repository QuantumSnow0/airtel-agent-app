-- Fix RLS Policy to Allow MS Forms Sync Updates
-- This allows agents to update ms_forms_response_id and ms_forms_submitted_at
-- regardless of registration status (pending, approved, or installed)
-- Run this SQL in your Supabase SQL Editor

-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Agents can update own pending registrations" ON customer_registrations;

-- Create a simpler policy: Allow agents to update their own registrations
-- This allows updating MS Forms sync fields (ms_forms_response_id, ms_forms_submitted_at)
-- regardless of registration status (pending, approved, or installed)
-- Agents can only update their own registrations (auth.uid() = agent_id)
CREATE POLICY "Agents can update own registrations"
  ON customer_registrations
  FOR UPDATE
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

-- Verify the policy was created
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
WHERE tablename = 'customer_registrations' AND cmd = 'UPDATE';

