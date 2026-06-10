-- Add Date of Birth to existing safaricom_registrations tables.
-- Run this once on environments that already created safaricom_registrations.

ALTER TABLE safaricom_registrations
ADD COLUMN IF NOT EXISTS date_of_birth TEXT;

