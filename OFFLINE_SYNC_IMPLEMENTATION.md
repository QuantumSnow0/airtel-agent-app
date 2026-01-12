# Offline Registration & Sync Implementation

## Overview
Implemented offline registration capability that allows agents to register customers even when offline. Registrations are stored locally and automatically synced to Supabase and Microsoft Forms when the device comes back online.

## Features

### ✅ Offline Registration
- Agents can register customers even when offline
- Data is stored locally in SQLite database
- No data loss if registration fails due to network issues

### ✅ Automatic Sync
- Automatically syncs pending registrations when device comes online
- Syncs to both Supabase database and Microsoft Forms
- Retries failed syncs up to 3 times
- Background sync runs every 30 seconds when online

### ✅ Network Detection
- Detects online/offline status
- Shows offline indicator in UI
- Handles network failures gracefully

## Architecture

### Data Flow

```
Agent Registers Customer (Offline)
  ↓
Save to Local SQLite (pending_registrations table)
  ↓
Device Comes Online
  ↓
Auto-Sync Service Detects Online Status
  ↓
For Each Pending Registration:
  ├─ Save to Supabase (customer_registrations table)
  ├─ Submit to Microsoft Forms (via Edge Function)
  └─ Delete from Local Storage (if successful)
```

### Components

1. **Offline Storage** (`lib/services/offlineStorage.ts`)
   - SQLite database for local storage
   - Stores pending registrations with status tracking
   - Manages retry counts and error messages

2. **Sync Service** (`lib/services/syncService.ts`)
   - Handles synchronization logic
   - Network detection
   - Auto-sync setup and management
   - Retry logic for failed syncs

3. **Registration Flow** (`app/register-customer.tsx`)
   - Detects online/offline status
   - Saves to local storage if offline
   - Attempts direct save if online
   - Falls back to offline storage on failure

4. **Dashboard** (`app/dashboard.tsx`)
   - Sets up auto-sync on mount
   - Shows pending sync count
   - Manages sync lifecycle

## Database Schema

### Local SQLite Table: `pending_registrations`

```sql
CREATE TABLE pending_registrations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  customer_data TEXT NOT NULL,  -- JSON string
  agent_data TEXT NOT NULL,      -- JSON string
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, syncing, synced, failed
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Status Values
- `pending` - Waiting to be synced
- `syncing` - Currently being synced
- `synced` - Successfully synced (will be deleted)
- `failed` - Sync failed (will retry up to 3 times)

## Implementation Details

### Offline Storage Service

**Functions:**
- `initOfflineStorage()` - Initialize SQLite database
- `savePendingRegistration()` - Save registration to local storage
- `getPendingRegistrations()` - Get all pending registrations
- `updatePendingRegistrationStatus()` - Update status and retry count
- `deletePendingRegistration()` - Remove after successful sync
- `getPendingCount()` - Get count of pending registrations

### Sync Service

**Functions:**
- `isOnline()` - Check if device is online (tests Supabase connection)
- `syncSingleRegistration()` - Sync one registration
- `syncPendingRegistrations()` - Sync all pending registrations
- `setupAutoSync()` - Set up automatic background sync

**Sync Process:**
1. Check if online
2. Get all pending registrations
3. For each registration:
   - Update status to `syncing`
   - Save to Supabase database
   - Submit to Microsoft Forms
   - Update database with MS Forms response ID
   - Delete from local storage if successful
   - Update status to `failed` if error (with retry count)

**Retry Logic:**
- Failed registrations are retried automatically
- Maximum 3 retry attempts
- After 3 failures, registration remains in `failed` status
- Can be manually retried later

### Auto-Sync

- Runs immediately when app starts (if online)
- Then runs every 30 seconds when online
- Only syncs when device is online
- Prevents multiple simultaneous syncs

## Usage

### Registration Flow

1. **Online Registration:**
   - Attempts to save to Supabase immediately
   - Submits to Microsoft Forms
   - If either fails, falls back to offline storage

2. **Offline Registration:**
   - Saves directly to local SQLite storage
   - Shows success message to agent
   - Will sync automatically when online

### Manual Sync

Agents can manually trigger sync by:
- Pull-to-refresh on dashboard (triggers sync)
- App automatically syncs when coming back online

## Error Handling

### Network Errors
- Detected and handled gracefully
- Registration saved to offline storage
- Will retry when online

### Database Errors
- If Supabase save fails, falls back to offline storage
- Retries on next sync attempt

### Microsoft Forms Errors
- If MS Forms submission fails, registration remains in database
- Will retry MS Forms submission on next sync
- Database record is created first (ensures data is saved)

## Testing

### Test Offline Registration
1. Turn off device network (airplane mode)
2. Register a customer
3. Should see "Registration Saved Offline" message
4. Turn network back on
5. Wait up to 30 seconds (or pull to refresh)
6. Registration should sync automatically

### Test Sync
1. Create pending registrations while offline
2. Turn network on
3. Check console logs for sync activity
4. Verify registrations appear in Supabase
5. Verify MS Forms submissions succeeded

## Console Logs

**Offline Storage:**
- `✅ Offline storage initialized`
- `💾 Saved pending registration to offline storage: [id]`
- `📝 Updated pending registration [id] to status: [status]`
- `🗑️ Deleted pending registration: [id]`

**Sync Service:**
- `🔄 Syncing registration: [id]`
- `✅ Successfully synced registration: [id]`
- `❌ Failed to sync registration [id]: [error]`
- `📴 Device is offline, skipping sync`
- `🔄 Found [count] pending registrations to sync`
- `✅ Sync complete: [synced] synced, [failed] failed`

## Future Enhancements

1. **Sync Status UI**
   - Show pending count badge
   - Show sync progress indicator
   - Show failed syncs with retry button

2. **Conflict Resolution**
   - Handle duplicate registrations
   - Merge conflicts if same customer registered twice

3. **Batch Sync**
   - Sync multiple registrations in parallel
   - Optimize for large backlogs

4. **Sync History**
   - Track sync attempts
   - Show sync timeline
   - Export sync logs

## Related Files

- `lib/services/offlineStorage.ts` - Local storage management
- `lib/services/syncService.ts` - Sync logic and auto-sync
- `app/register-customer.tsx` - Registration flow with offline support
- `app/dashboard.tsx` - Auto-sync setup

## Dependencies

- `expo-sqlite` - Local SQLite database
- `@react-native-async-storage/async-storage` - Already in use for caching

