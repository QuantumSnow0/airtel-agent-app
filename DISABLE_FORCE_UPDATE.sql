-- Disable Force Update (to restore normal app access)
-- Run this SQL in your Supabase SQL Editor when done testing

-- Disable force update and set minimum version back to current
UPDATE app_version_config
SET 
  minimum_required_version = '1.0.0',  -- Back to current version
  minimum_required_version_code = 1,     -- Back to current version code
  force_update = FALSE                   -- Disable blocking
WHERE id = (SELECT id FROM app_version_config LIMIT 1);

-- Verify the update
SELECT 
  minimum_required_version,
  minimum_required_version_code,
  force_update
FROM app_version_config;

