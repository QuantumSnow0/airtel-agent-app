# Supabase Tables Updated During Sync

## Overview
This document explains which Supabase tables get updated when syncing customer registrations.

## Tables Updated

### 1. `customer_registrations` Table

This is the **primary table** that gets updated during sync operations.

#### When Syncing Offline Registrations:
1. **INSERT** - Creates a new registration record with:
   - `agent_id`
   - `customer_name`
   - `airtel_number`
   - `alternate_number`
   - `email`
   - `preferred_package`
   - `installation_town`
   - `delivery_landmark`
   - `installation_location`
   - `visit_date`
   - `visit_time`
   - `status` (defaults to "pending")

2. **UPDATE** - After successful MS Forms submission, updates:
   - `ms_forms_response_id` - The response ID from Microsoft Forms
   - `ms_forms_submitted_at` - Timestamp of successful submission
   - `updated_at` - Automatically updated by database trigger

#### When Syncing from Supabase to MS Forms:
**UPDATE** - Updates the existing registration record with MS Forms sync data:
   - `ms_forms_response_id` - The response ID from Microsoft Forms (e.g., "29473")
   - `ms_forms_submitted_at` - Timestamp of successful submission (ISO format)
   - `updated_at` - Automatically updated by database trigger

**SQL Equivalent:**
```sql
UPDATE customer_registrations
SET 
  ms_forms_response_id = '29473',
  ms_forms_submitted_at = '2026-01-12T16:34:04.8216824Z',
  updated_at = NOW()
WHERE id = '3efa9031-af20-4cd4-9104-7ee6d250eb64';
```

**Note:** Only these 3 fields are updated. All other fields (customer_name, status, etc.) remain unchanged.

### 2. `agents` Table (Indirect Update)

The `agents` table is **NOT directly updated** during sync, but it can be **automatically updated** by database triggers:

#### Automatic Updates via Triggers:
When a registration's `status` changes to `'installed'`, database triggers automatically update:
- `total_earnings` - Calculated as: `COUNT(installed_registrations) * 150`
- `available_balance` - Same as `total_earnings` (can be modified separately for withdrawals)

**Note:** These updates happen automatically via PostgreSQL triggers defined in `AGENT_BALANCE_MIGRATION.sql`. The sync process itself does not directly update the `agents` table.

## Tables Read (Not Updated)

### `agents` Table
- **SELECT** - Read only to fetch agent data (name, phone numbers) needed for MS Forms submission
- No updates are made to this table during sync

## Local Storage (Not Supabase)

### SQLite `pending_registrations` Table
- **UPDATE** - Status changes to "syncing" during sync
- **DELETE** - Removed after successful sync
- **UPDATE** - Status changes to "failed" if sync fails

This is local device storage, not in Supabase.

## Summary

**Supabase Tables Updated:**
- ✅ `customer_registrations` - Direct updates (INSERT + UPDATE for offline, UPDATE only for existing)
- ✅ `agents` - Indirect updates via database triggers (only when status = 'installed')

**Supabase Tables Read:**
- 📖 `agents` - Read agent data for MS Forms submission

**Local Storage:**
- 💾 SQLite `pending_registrations` - Updated/deleted during offline sync

## Sync Flow

### Offline Registration Sync:
1. Read from local SQLite `pending_registrations`
2. INSERT into Supabase `customer_registrations`
3. Submit to Microsoft Forms
4. UPDATE Supabase `customer_registrations` with MS Forms response
5. DELETE from local SQLite `pending_registrations`

### Existing Registration Sync:
1. SELECT from Supabase `customer_registrations` (to get registration data)
2. SELECT from Supabase `agents` (to get agent data)
3. Submit to Microsoft Forms
4. UPDATE Supabase `customer_registrations` with MS Forms response

