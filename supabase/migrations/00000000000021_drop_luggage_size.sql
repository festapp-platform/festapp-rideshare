-- Drop luggage_size column from rides table.
-- Luggage info was moved to free-text notes field.
ALTER TABLE public.rides DROP COLUMN IF EXISTS luggage_size;
