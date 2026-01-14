-- Diagnostic SQL: Check Push Notification Setup
-- Run this in Supabase SQL Editor to diagnose push notification issues

-- 1. Check if device tokens exist for your agent
SELECT 
  dt.id,
  dt.agent_id,
  dt.token,
  dt.device_type,
  dt.is_active,
  dt.last_used_at,
  dt.created_at,
  a.name as agent_name,
  a.email as agent_email
FROM device_tokens dt
LEFT JOIN agents a ON dt.agent_id = a.id
ORDER BY dt.created_at DESC
LIMIT 10;

-- 2. Check recent notifications (should have been sent push)
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.agent_id,
  n.created_at,
  n.is_read,
  a.name as agent_name
FROM notifications n
LEFT JOIN agents a ON n.agent_id = a.id
ORDER BY n.created_at DESC
LIMIT 10;

-- 3. Check if webhook exists (you'll need to check Supabase Dashboard > Database > Webhooks)
-- This query won't work, but you should manually check:
-- - Go to Supabase Dashboard
-- - Database > Webhooks
-- - Look for a webhook on 'notifications' table with INSERT event
-- - It should point to: https://olaounggwgxpbenmuvnl.supabase.co/functions/v1/send-push-notification

-- 4. Count active device tokens per agent
SELECT 
  a.id,
  a.name,
  a.email,
  COUNT(dt.id) as active_token_count
FROM agents a
LEFT JOIN device_tokens dt ON a.id = dt.agent_id AND dt.is_active = TRUE
GROUP BY a.id, a.name, a.email
ORDER BY active_token_count DESC;

