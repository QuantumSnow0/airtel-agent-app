-- Send Push Notification
-- Run this SQL in your Supabase SQL Editor
-- When you insert a notification, the database trigger/webhook will automatically send a push notification

-- ============================================
-- OPTION 1: Send to a Specific Agent
-- ============================================
-- Replace 'AGENT_ID_HERE' with the actual agent's UUID
-- Replace the title, message, and type as needed

INSERT INTO public.notifications (
  agent_id,
  type,
  title,
  message,
  metadata
) VALUES (
  'AGENT_ID_HERE'::UUID,  -- Replace with actual agent ID
  'SYSTEM_ANNOUNCEMENT',  -- Notification type
  'Update Required',      -- Title shown in notification
  'A mandatory app update is available. Please update to version 1.0.1 to continue using the app.',  -- Message
  '{"action": "update", "version": "1.0.1"}'::jsonb  -- Optional metadata
);

-- ============================================
-- OPTION 2: Send to ALL Agents (Broadcast)
-- ============================================
-- This sends a notification to every agent in the system

INSERT INTO public.notifications (
  agent_id,
  type,
  title,
  message,
  metadata
)
SELECT 
  id,  -- Each agent's ID
  'SYSTEM_ANNOUNCEMENT',
  'Update Required',
  'A mandatory app update is available. Please update to version 1.0.1 to continue using the app. Download: https://drive.google.com/uc?export=download&id=1jso5K22ppo_8SAViDVqkQYQj7rgUrMlL',
  '{"action": "update", "version": "1.0.1", "downloadUrl": "https://drive.google.com/uc?export=download&id=1jso5K22ppo_8SAViDVqkQYQj7rgUrMlL"}'::jsonb
FROM public.agents
WHERE status = 'approved';  -- Only send to approved agents

-- ============================================
-- OPTION 3: Send Update Notification to All Agents
-- ============================================
-- Pre-configured for the app update scenario

INSERT INTO public.notifications (
  agent_id,
  type,
  title,
  message,
  metadata
)
SELECT 
  id,
  'SYSTEM_ANNOUNCEMENT',
  'Mandatory App Update Required',
  'A mandatory update (v1.0.1) is required to continue using the app. Please download and install the latest version.',
  jsonb_build_object(
    'action', 'update',
    'version', '1.0.1',
    'versionCode', 5,
    'downloadUrl', 'https://drive.google.com/uc?export=download&id=1jso5K22ppo_8SAViDVqkQYQj7rgUrMlL',
    'forceUpdate', true
  )
FROM public.agents
WHERE status = 'approved';

-- ============================================
-- Notification Types Available:
-- ============================================
-- 'REGISTRATION_STATUS_CHANGE' - For registration status updates
-- 'EARNINGS_UPDATE' - For balance/earnings changes
-- 'ACCOUNT_STATUS_CHANGE' - For account status changes
-- 'SYNC_FAILURE' - For sync errors
-- 'SYSTEM_ANNOUNCEMENT' - For system-wide announcements (best for updates)

-- ============================================
-- Verify Notification Was Created:
-- ============================================
SELECT 
  id,
  agent_id,
  type,
  title,
  message,
  created_at
FROM public.notifications
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- Check if Push Was Sent (Edge Function Logs):
-- ============================================
-- Go to Supabase Dashboard → Edge Functions → send-push-notification → Logs
-- Look for: "📤 Sending push notification for: [notification-id]"
-- Look for: "✅ Push notifications sent successfully"
