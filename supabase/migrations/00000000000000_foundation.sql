-- ============================================================
-- Foundation: Extensions and shared utility functions
-- Squashed from: 00000000000000_initial_setup, 00000000000006_enable_postgis
-- ============================================================

-- ============================================================
-- 1. Extensions
-- ============================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Geospatial operations (must be in extensions schema per Supabase requirements)
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- Scheduled jobs (used by audit cleanup, review reveal, etc.)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Async HTTP requests from SQL (used by edge function invocations)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- 2. Shared trigger function: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
