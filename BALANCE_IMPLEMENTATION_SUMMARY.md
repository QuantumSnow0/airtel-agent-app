# Balance and Earnings Implementation Summary

## Overview
We've implemented database-backed balance and earnings tracking for agents. This is more efficient and scalable than calculating in the UI.

## What Was Changed

### 1. Database Schema (`AGENT_BALANCE_MIGRATION.sql`)
- **Added columns to `agents` table:**
  - `total_earnings` (INTEGER): Total commission earned from all installed devices
  - `available_balance` (INTEGER): Current withdrawable balance

- **Created database trigger:**
  - Automatically updates `total_earnings` and `available_balance` when a customer registration status changes to `installed`
  - Commission rate: **150 KSh per installed device**

- **Initialization:**
  - Migration script calculates and sets balances for all existing agents

### 2. Frontend Changes

#### `app/dashboard.tsx`
- Now fetches `total_earnings` and `available_balance` from the `agents` table
- Displays both values in the balance card:
  - **Available Balance** (blue) - Current withdrawable amount
  - **Total Earnings** (green) - All-time earnings from installed devices

#### `lib/cache/agentCache.ts`
- Updated `CachedAgentData` interface to include:
  - `total_earnings?: number | null`
  - `available_balance?: number | null`

## How It Works

1. **When a registration status changes to `installed`:**
   - Database trigger fires automatically
   - Recalculates total installed count for that agent
   - Updates `total_earnings = installed_count * 150`
   - Updates `available_balance = total_earnings` (for now)

2. **UI Display:**
   - Fetches balance from `agents` table (fast, no calculation needed)
   - Falls back to UI calculation if database value is missing (backward compatibility)

## Benefits

✅ **Performance**: No need to count/aggregate on every page load  
✅ **Accuracy**: Single source of truth in database  
✅ **Scalability**: Works efficiently even with thousands of registrations  
✅ **Future-ready**: Easy to add features like:
   - Withdrawals (deduct from `available_balance`)
   - Pending payments
   - Payment history
   - Commission adjustments

## Next Steps (Optional Future Enhancements)

1. **Withdrawals**: Add a `withdrawals` table and deduct from `available_balance`
2. **Payment History**: Track when commissions were paid
3. **Pending Balance**: Separate `pending_balance` for approved but not yet installed
4. **Commission Adjustments**: Allow admins to manually adjust balances

## Migration Instructions

1. Run `AGENT_BALANCE_MIGRATION.sql` in your Supabase SQL Editor
2. The migration will:
   - Add the new columns
   - Create the trigger function
   - Initialize balances for existing agents
3. No code changes needed - the frontend already supports this!

## Testing

After migration, verify:
- Balance updates automatically when a registration status changes to `installed`
- Dashboard shows correct `total_earnings` and `available_balance`
- Values match: `total_earnings = installed_count * 150`

