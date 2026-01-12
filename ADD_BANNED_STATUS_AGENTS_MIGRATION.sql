-- Add 'banned' status to agents table
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Drop the existing CHECK constraint (if it exists)
ALTER TABLE agents 
DROP CONSTRAINT IF EXISTS agents_status_check;

-- Step 2: Add new CHECK constraint that includes 'banned'
-- Note: The original schema had 'rejected', we're adding 'banned' as an alternative
ALTER TABLE agents
ADD CONSTRAINT agents_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'banned'));

-- Step 3: Update the comment to reflect the new status
COMMENT ON COLUMN agents.status IS 'Agent status: pending (default), approved, rejected, or banned. Only approved agents can use the system.';

-- Step 4: Verify the constraint was updated
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'agents'::regclass
  AND conname = 'agents_status_check';

