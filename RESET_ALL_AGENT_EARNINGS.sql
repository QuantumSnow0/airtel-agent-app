-- Reset all agents' earnings and balance to zero
-- Run this in Supabase SQL Editor to start fresh
-- WARNING: This will clear all commission earnings and balances for all agents

UPDATE public.agents
SET 
  total_earnings = 0,
  available_balance = 0,
  updated_at = NOW();

-- Verify the reset (optional - uncomment to check)
-- SELECT id, name, email, total_earnings, available_balance FROM public.agents;
