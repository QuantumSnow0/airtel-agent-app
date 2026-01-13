-- Temporarily Enable Force Update (for testing)
-- This will block the app and show the update screen
-- Run this SQL in your Supabase SQL Editor

-- Enable force update with a version higher than current (1.0.0)
UPDATE app_version_config
SET 
  minimum_required_version = '1.0.1',  -- Higher than current 1.0.0
  minimum_required_version_code = 2,     -- Higher than current 1
  force_update = TRUE,                   -- Enable blocking
  update_message = 'A new version of the app is available. Please update to continue using the app.'
WHERE id = (SELECT id FROM app_version_config LIMIT 1);

-- Verify the update
SELECT 
  minimum_required_version,
  minimum_required_version_code,
  force_update,
  update_message
FROM app_version_config;

