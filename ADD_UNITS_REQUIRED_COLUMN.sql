-- Add quantity (units) per Airtel customer registration
-- Run in Supabase SQL Editor

ALTER TABLE public.customer_registrations
  ADD COLUMN IF NOT EXISTS units_required INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.customer_registrations
  DROP CONSTRAINT IF EXISTS customer_registrations_units_required_check;

ALTER TABLE public.customer_registrations
  ADD CONSTRAINT customer_registrations_units_required_check
  CHECK (units_required >= 1 AND units_required <= 99);

COMMENT ON COLUMN public.customer_registrations.units_required IS
  'Number of devices/units for this registration (sent to MS Forms totalUnitsRequired)';
