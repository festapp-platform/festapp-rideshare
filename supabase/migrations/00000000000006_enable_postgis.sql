-- Enable PostGIS extension for geospatial operations
-- MUST be in extensions schema per Supabase requirements
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;
