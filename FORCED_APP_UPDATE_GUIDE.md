# Forced App Update Guide

## Overview

This feature allows you to force users to update the app when a new version is released. Users with outdated versions will be blocked from using the app until they update.

## How It Works

1. **Version Check**: App checks version on startup (before login)
2. **Database Config**: Minimum required version stored in `app_version_config` table
3. **Comparison**: Compares current app version with minimum required version
4. **Blocking**: If version is outdated AND `force_update = TRUE`, user is blocked
5. **Update Screen**: Shows update screen with link to app store

## Setup

### 1. Run Database Migration

Run `APP_VERSION_CONFIG_TABLE.sql` in your Supabase SQL Editor.

This creates:
- `app_version_config` table
- Default configuration (force_update = FALSE initially)
- RLS policies (anyone can read, only service role can update)

### 2. Configure App Store URLs

Update the default URLs in the database:

```sql
UPDATE app_version_config
SET 
  update_url_android = 'https://play.google.com/store/apps/details?id=com.airtel.agents',
  update_url_ios = 'https://apps.apple.com/app/airtel-agents'
WHERE id = (SELECT id FROM app_version_config LIMIT 1);
```

Replace with your actual app store URLs when published.

## How to Force an Update

### Step 1: Update App Version

When you release a new version:

1. Update `app.json`:
   ```json
   {
     "version": "1.1.0",  // New version
     "android": {
       "versionCode": 2   // Increment for Android
     }
   }
   ```

2. Build and publish the new version to app stores

### Step 2: Update Database Config

Update the minimum required version in Supabase:

```sql
UPDATE app_version_config
SET 
  minimum_required_version = '1.1.0',        -- New minimum version
  minimum_required_version_code = 2,         -- New minimum version code (Android)
  current_latest_version = '1.1.0',          -- Current latest version
  current_latest_version_code = 2,           -- Current version code
  force_update = TRUE,                       -- Enable forced update
  update_message = 'A new version is available with important updates. Please update to continue.'
WHERE id = (SELECT id FROM app_version_config LIMIT 1);
```

### Step 3: Test

1. Keep an old version of the app installed
2. Open the app
3. Should see "Update Required" screen
4. Cannot proceed until updated

## Version Comparison Logic

- **Semantic Versioning**: Compares `major.minor.patch` (e.g., "1.0.0" vs "1.1.0")
- **Android versionCode**: Also checks `versionCode` for Android builds
- **Comparison**: `currentVersion < minimumVersion` = needs update

## User Experience

### When Update is Required:

1. **App Opens** → Version check runs
2. **Version Outdated** → Redirected to `/update-required` screen
3. **Update Screen Shows**:
   - "Update Required" title
   - Message explaining update needed
   - Current version displayed
   - "Update from Play Store/App Store" button
   - Support contact number
4. **User Taps Update** → Opens app store
5. **User Updates** → Can use app again

### When Update is NOT Required:

- App continues normally
- No blocking screen
- User can use app as usual

## Disabling Forced Updates

To temporarily disable forced updates (e.g., during testing):

```sql
UPDATE app_version_config
SET force_update = FALSE
WHERE id = (SELECT id FROM app_version_config LIMIT 1);
```

## Best Practices

1. **Test First**: Always test with `force_update = FALSE` before enabling
2. **Gradual Rollout**: Consider gradual rollout (force update after 24-48 hours)
3. **Clear Messages**: Update the `update_message` to explain why update is needed
4. **Version Strategy**: Use semantic versioning consistently
5. **Version Codes**: Always increment `versionCode` for Android builds

## Example Scenarios

### Scenario 1: Critical Security Update
```sql
-- Force immediate update for security fix
UPDATE app_version_config
SET 
  minimum_required_version = '1.0.1',
  minimum_required_version_code = 2,
  force_update = TRUE,
  update_message = 'A critical security update is available. Please update immediately to continue using the app securely.'
```

### Scenario 2: Major Feature Update
```sql
-- Force update for major version
UPDATE app_version_config
SET 
  minimum_required_version = '2.0.0',
  minimum_required_version_code = 10,
  force_update = TRUE,
  update_message = 'A major update with new features is available. Please update to access the latest features.'
```

### Scenario 3: Optional Update (Not Forced)
```sql
-- Update available but not forced
UPDATE app_version_config
SET 
  current_latest_version = '1.1.0',
  current_latest_version_code = 3,
  force_update = FALSE  -- Users can still use old version
```

## Troubleshooting

### Users Can't Access App After Update

1. **Check version config**: Verify `minimum_required_version` is correct
2. **Check force_update**: Ensure it's set to `TRUE` if you want to block
3. **Check version comparison**: Verify app version vs minimum version
4. **Check app store URLs**: Ensure URLs are correct and app is published

### Update Screen Not Showing

1. **Check version check**: Look for logs "🚫 App version blocked"
2. **Check database**: Verify config exists and `force_update = TRUE`
3. **Check network**: Version check requires internet connection
4. **Check version format**: Ensure versions are in `major.minor.patch` format

## Security Notes

- Version config is readable by anyone (needed for version check before login)
- Only service role can update config (admin only)
- Version check happens before authentication (prevents bypass)

