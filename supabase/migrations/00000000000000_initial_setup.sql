-- Initial Setup: Extensions and shared utility functions
-- This migration enables required extensions and creates reusable trigger functions.

-- Enable uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auto-update updated_at column trigger function (from Festapp patterns)
-- Applied per table to automatically maintain updated_at timestamps.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
