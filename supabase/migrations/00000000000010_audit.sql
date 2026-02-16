-- ============================================================
-- Audit trail: generic change-tracking for key tables
-- Squashed from: 00000000000020_ride_audit
--
-- Single table for all entities, BRIN-indexed timestamps, auto-cleanup.
-- Stores full record + old_record as JSONB for complete change history.
-- ============================================================

-- ============================================================
-- 1. Audit schema and table
-- ============================================================

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit.record_version (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  op          TEXT NOT NULL,       -- INSERT, UPDATE, DELETE
  record      JSONB,              -- new row state (NULL for DELETE)
  old_record  JSONB,              -- previous row state (NULL for INSERT)
  ts          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BRIN index: ideal for append-only audit data (hundreds of times smaller than btree)
CREATE INDEX idx_audit_ts     ON audit.record_version USING BRIN (ts);
CREATE INDEX idx_audit_entity ON audit.record_version (table_name, record_id);

-- ============================================================
-- 2. Generic audit trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION audit.fn_record_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_record_id UUID;
  v_record JSONB;
  v_old_record JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_record := to_jsonb(NEW);
    v_record_id := (v_record->>'id')::uuid;
    INSERT INTO audit.record_version (table_name, record_id, op, record)
    VALUES (TG_TABLE_NAME, v_record_id, 'INSERT', v_record);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_record := to_jsonb(NEW);
    v_old_record := to_jsonb(OLD);
    v_record_id := (v_record->>'id')::uuid;
    -- Only log if something besides updated_at actually changed
    IF v_record - 'updated_at' IS DISTINCT FROM v_old_record - 'updated_at' THEN
      INSERT INTO audit.record_version (table_name, record_id, op, record, old_record)
      VALUES (TG_TABLE_NAME, v_record_id, 'UPDATE', v_record, v_old_record);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_old_record := to_jsonb(OLD);
    v_record_id := (v_old_record->>'id')::uuid;
    INSERT INTO audit.record_version (table_name, record_id, op, old_record)
    VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', v_old_record);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- ============================================================
-- 3. Enable tracking on key tables
-- ============================================================

CREATE TRIGGER trg_audit_rides
  AFTER INSERT OR UPDATE OR DELETE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION audit.fn_record_version();

CREATE TRIGGER trg_audit_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION audit.fn_record_version();

CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION audit.fn_record_version();

CREATE TRIGGER trg_audit_vehicles
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION audit.fn_record_version();

-- ============================================================
-- 4. RLS: users see audit entries for entities they are involved with
-- ============================================================

ALTER TABLE audit.record_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_driver_rides"
  ON audit.record_version FOR SELECT TO authenticated
  USING (
    table_name = 'rides' AND
    (record->>'driver_id')::uuid = (SELECT auth.uid())
  );

CREATE POLICY "audit_passenger_bookings"
  ON audit.record_version FOR SELECT TO authenticated
  USING (
    table_name = 'bookings' AND
    (record->>'passenger_id')::uuid = (SELECT auth.uid())
  );

CREATE POLICY "audit_own_profile"
  ON audit.record_version FOR SELECT TO authenticated
  USING (
    table_name = 'profiles' AND
    (record->>'id')::uuid = (SELECT auth.uid())
  );

CREATE POLICY "audit_own_vehicles"
  ON audit.record_version FOR SELECT TO authenticated
  USING (
    table_name = 'vehicles' AND
    (record->>'owner_id')::uuid = (SELECT auth.uid())
  );

-- ============================================================
-- 5. Auto-cleanup: remove audit entries older than 1 year (monthly)
-- ============================================================

SELECT cron.schedule(
  'cleanup-old-audit-logs',
  '0 3 1 * *',
  $$DELETE FROM audit.record_version WHERE ts < now() - interval '1 year'$$
);
