-- Force App Update to Version 1.0.1 (versionCode 5)
-- Run this SQL in your Supabase SQL Editor to force all users to update

-- Update version configuration to force update
UPDATE app_version_config
SET 
  minimum_required_version = '1.0.1',        -- New minimum version (must match app.json)
  minimum_required_version_code = 5,          -- New minimum version code (must match app.json)
  current_latest_version = '1.0.1',           -- Current latest version
  current_latest_version_code = 5,            -- Current version code
  force_update = TRUE,                        -- Enable forced update (blocks old versions)
  update_message = 'A mandatory update is required to continue using the app. Please download and install the latest version.',
  update_url_android = 'https://drive.google.com/uc?export=download&id=1jso5K22ppo_8SAViDVqkQYQj7rgUrMlL',  -- Direct download link
  updated_at = NOW()
WHERE id = (SELECT id FROM app_version_config LIMIT 1);

-- Verify the update
SELECT 
  minimum_required_version,
  minimum_required_version_code,
  current_latest_version,
  current_latest_version_code,
  force_update,
  update_message,
  update_url_android,
  updated_at
FROM app_version_config;

-- Note: If the direct download link doesn't work, you can also try:
-- 'https://drive.google.com/file/d/1jso5K22ppo_8SAViDVqkQYQj7rgUrMlL/view?usp=drive_link'
-- However, direct download links (uc?export=download) work better for APK downloads
