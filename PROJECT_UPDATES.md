# Airtel Agents App - Project Updates

This document tracks the latest features and improvements to the Airtel Agents mobile application.

## Latest Updates (January 2026)

### ✅ 5. Offline Registration & Auto-Sync

**Status**: ✅ Complete and Working

**Problem Solved**:
- Agents work in areas with poor connectivity
- Need to register customers even when offline
- Data must sync to both Supabase and Microsoft Forms when online

**Solution**:
- Local SQLite storage for offline registrations
- Automatic background sync when device comes online
- Retry logic for failed syncs (up to 3 attempts)
- Network detection and graceful fallback

**Features**:
- ✅ Register customers offline - saved to local SQLite
- ✅ Automatic sync when device comes online
- ✅ Syncs to both Supabase database and Microsoft Forms
- ✅ Retry failed syncs automatically
- ✅ Network status detection
- ✅ Background sync every 30 seconds when online

**Files**:
- `lib/services/offlineStorage.ts` - Local SQLite storage management
- `lib/services/syncService.ts` - Sync logic and auto-sync
- `app/register-customer.tsx` - Updated with offline support
- `app/dashboard.tsx` - Auto-sync setup
- `OFFLINE_SYNC_IMPLEMENTATION.md` - Complete documentation

**How It Works**:
1. Agent registers customer (online or offline)
2. If offline or save fails → Save to local SQLite
3. When device comes online → Auto-sync service detects
4. Syncs each pending registration:
   - Save to Supabase database
   - Submit to Microsoft Forms
   - Delete from local storage if successful
5. Retries failed syncs up to 3 times

**Database**:
- Local SQLite table: `pending_registrations`
- Tracks status: `pending`, `syncing`, `synced`, `failed`
- Stores retry count and error messages

---

### ✅ 1. Microsoft Forms Integration with Supabase Edge Functions

**Status**: ✅ Complete and Working

**Problem Solved**:
- React Native cannot extract `Set-Cookie` headers from HTTP responses
- Microsoft Forms requires cookies (`FormsWebSessionId`, `__RequestVerificationToken`) for authentication
- Request body format mismatch (`answers` must be a stringified JSON string, not an array)

**Solution**:
- Created Supabase Edge Function (`submit-ms-forms`) that runs server-side
- Edge Function can properly extract cookies using Deno's fetch API
- Handles entire Microsoft Forms submission flow server-side
- Returns result to React Native client

**Files**:
- `supabase/functions/submit-ms-forms/index.ts` - Edge Function implementation
- `lib/services/msFormsService.ts` - Updated to call Edge Function
- `SUPABASE_EDGE_FUNCTION_SETUP.md` - Setup guide

**Key Features**:
- ✅ Proper cookie extraction and management
- ✅ Correct request body format (stringified `answers`)
- ✅ Date format conversion (M/d/yyyy → YYYY-MM-DD)
- ✅ 18 answer fields including optional field
- ✅ Comprehensive error handling and logging

**Commission Rate**: 150 KSh per installed device

---

### ✅ 2. Database-Backed Balance and Earnings Tracking

**Status**: ✅ Complete and Working

**Implementation**:
- Added `total_earnings` and `available_balance` columns to `agents` table
- Created database triggers that automatically update balances when registration status changes to `installed`
- Commission calculation: `total_earnings = installed_count * 150`

**Database Changes**:
- `AGENT_BALANCE_MIGRATION.sql` - Migration script
- Automatic trigger updates on status changes
- Initializes balances for existing agents

**UI Display**:
- **Available Balance** (blue) - Current withdrawable amount
- **Total Earnings** (green) - All-time earnings from installed devices

**Files**:
- `app/dashboard.tsx` - Updated to fetch and display balances
- `lib/cache/agentCache.ts` - Updated type definitions

**Benefits**:
- ✅ No UI calculation needed (better performance)
- ✅ Single source of truth in database
- ✅ Scalable for thousands of registrations
- ✅ Ready for future features (withdrawals, payment history)

---

### ✅ 3. Real-Time Updates

**Status**: ✅ Complete and Working

**Features Implemented**:

#### 3.1 Real-Time Balance Updates
- Subscribes to `agents` table changes for the current user
- Automatically updates balance and total earnings when admin changes registration status
- Updates UI instantly without manual refresh

#### 3.2 Real-Time Registration Status Updates
- Subscribes to `customer_registrations` table changes
- Automatically updates registration list when status changes (pending → approved → installed)
- Updates counts (Total Registered, Total Installed) in real-time
- Shows updated status badges immediately

**Implementation**:
- Two separate Supabase real-time subscriptions:
  - `agent-balance-{userId}` - For balance/earnings updates
  - `agent-registrations-{userId}` - For registration status updates
- Uses Supabase `postgres_changes` event listener
- Properly unsubscribes on component unmount

**Files**:
- `app/dashboard.tsx` - Real-time subscription setup

**Console Logs**:
- `🔴 Setting up real-time subscription for agent: [id]`
- `📡 Real-time subscription status: SUBSCRIBED`
- `🟢 Real-time update received: [payload]`
- `💰 Balance updated: [amount]`

---

### ✅ 4. Pull-to-Refresh Functionality

**Status**: ✅ Complete and Working

**Feature**:
- Pull down on dashboard to manually refresh all data
- Shows loading indicator while refreshing
- Refreshes:
  - User data
  - Agent data (including balance)
  - Customer registrations
  - Statistics (Total Registered, Total Installed)

**Implementation**:
- Uses React Native `RefreshControl` component
- Integrated with `ScrollView` in dashboard
- Calls `loadUserData()` on refresh

**Files**:
- `app/dashboard.tsx` - RefreshControl implementation

---

## Technical Architecture

### Data Flow

```
Admin Updates Registration Status
  ↓
Database Trigger Updates Agent Balance
  ↓
Real-Time Subscription Detects Change
  ↓
UI Updates Automatically (Balance + Status)
```

### Microsoft Forms Submission Flow

```
React Native App
  ↓
registerCustomerToMSForms()
  ↓
Supabase Edge Function (submit-ms-forms)
  ↓
  ├─ Fetch tokens from MS Forms (with cookies) ✅
  ├─ Build payload (answers as string) ✅
  └─ Submit to MS Forms API (with cookies) ✅
  ↓
Return result to client
```

---

## Database Schema Updates

### Agents Table
```sql
ALTER TABLE agents
ADD COLUMN total_earnings INTEGER NOT NULL DEFAULT 0,
ADD COLUMN available_balance INTEGER NOT NULL DEFAULT 0;
```

### Triggers
- `update_agent_balance_on_insert` - Updates balance when new registration is inserted with status 'installed'
- `update_agent_balance_on_update` - Updates balance when registration status changes to/from 'installed'

---

## Setup Requirements

### 1. Supabase Edge Function
- Deploy `submit-ms-forms` function
- Set environment variables:
  - `MS_FORMS_FORM_ID`
  - `MS_FORMS_TENANT_ID`
  - `MS_FORMS_USER_ID`
  - `MS_FORMS_RESPONSE_PAGE_URL` (optional)

### 2. Database Migration
- Run `AGENT_BALANCE_MIGRATION.sql` in Supabase SQL Editor
- Enables real-time on `agents` and `customer_registrations` tables in Supabase dashboard

### 3. Real-Time Configuration
- Enable real-time on `agents` table
- Enable real-time on `customer_registrations` table
- Configure RLS policies for real-time subscriptions

---

## Testing Checklist

### Microsoft Forms Integration
- [x] Customer registration submits to Microsoft Forms successfully
- [x] Response ID is returned and stored
- [x] Error handling works correctly
- [x] Date format conversion works (M/d/yyyy → YYYY-MM-DD)

### Balance System
- [x] Balance updates when registration status changes to 'installed'
- [x] Total earnings calculated correctly (installed_count * 150)
- [x] UI displays both available balance and total earnings
- [x] Database trigger works correctly

### Real-Time Updates
- [x] Balance updates automatically when admin changes status
- [x] Registration status updates automatically
- [x] Counts (Total Registered, Total Installed) update automatically
- [x] No manual refresh needed

### Pull-to-Refresh
- [x] Pull down refreshes all data
- [x] Loading indicator shows during refresh
- [x] Data updates correctly after refresh

---

## Known Issues / Future Enhancements

### Potential Improvements
1. **Withdrawals System**
   - Add `withdrawals` table
   - Deduct from `available_balance` when agent withdraws
   - Track withdrawal history

2. **Payment History**
   - Track when commissions were paid
   - Show payment timeline
   - Export payment reports

3. **Pending Balance**
   - Separate `pending_balance` for approved but not yet installed
   - Show both pending and available balances

4. **Commission Adjustments**
   - Allow admins to manually adjust balances
   - Track adjustment history
   - Add adjustment reasons

5. **Notifications**
   - Push notifications when balance updates
   - Notify when registration status changes
   - Email notifications for large balance changes

---

## Related Documentation

- `MS_FORMS_FIX_SUMMARY.md` - Microsoft Forms integration details
- `BALANCE_IMPLEMENTATION_SUMMARY.md` - Balance system details
- `SUPABASE_EDGE_FUNCTION_SETUP.md` - Edge Function setup guide
- `AGENT_BALANCE_MIGRATION.sql` - Database migration script
- `OFFLINE_SYNC_IMPLEMENTATION.md` - Offline registration and sync details

---

## Version History

### v1.3.0 (January 2026)
- ✅ Offline registration capability
- ✅ Automatic background sync
- ✅ Local SQLite storage for offline data
- ✅ Network detection and graceful fallback

### v1.2.0 (January 2026)
- ✅ Real-time updates for balance and registration status
- ✅ Pull-to-refresh functionality
- ✅ Improved error handling and logging

### v1.1.0 (January 2026)
- ✅ Database-backed balance and earnings tracking
- ✅ Automatic balance updates via database triggers

### v1.0.0 (January 2026)
- ✅ Microsoft Forms integration via Supabase Edge Functions
- ✅ Cookie handling for Microsoft Forms API
- ✅ Customer registration flow

---

## Support

For issues or questions:
1. Check console logs for real-time subscription status
2. Verify Supabase real-time is enabled on tables
3. Check database triggers are active
4. Review Edge Function logs in Supabase dashboard

