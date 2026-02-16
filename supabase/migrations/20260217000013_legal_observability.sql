-- ============================================================
-- Phase 13-01: Legal & Observability enhancements
--
-- 1. Make log_emails.user_id nullable (auth email logging for signup)
-- 2. Add changed_fields & actor_id to audit.record_version
-- 3. Enhanced audit trigger with JSON diff computation
-- 4. Audit triggers for moderation tables (reports, user_blocks)
-- 5. Admin RLS policy for audit entries
-- ============================================================

-- ============================================================
-- 1. Make log_emails.user_id nullable
-- ============================================================
-- Auth email hook fires for signup confirmations before profile row exists.
-- user_id must be nullable to allow logging these auth emails.

ALTER TABLE public.log_emails ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================
-- 2. Add changed_fields and actor_id to audit.record_version
-- ============================================================

ALTER TABLE audit.record_version ADD COLUMN changed_fields JSONB;
ALTER TABLE audit.record_version ADD COLUMN actor_id UUID;

-- ============================================================
-- 3. Enhanced audit trigger function with JSON diff
-- ============================================================
-- Replaces existing fn_record_version. Existing triggers automatically
-- use the new version since they reference the function by name.

CREATE OR REPLACE FUNCTION audit.fn_record_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_record_id UUID;
  v_record JSONB;
  v_old_record JSONB;
  v_changed JSONB;
  v_key TEXT;
  v_actor UUID;
BEGIN
  -- Try to get the acting user (NULL for system/service_role operations)
  BEGIN
    v_actor := (SELECT auth.uid());
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    v_record := to_jsonb(NEW);
    v_old_record := to_jsonb(OLD);
    v_record_id := (v_record->>'id')::uuid;

    -- Only log if something besides updated_at changed
    IF v_record - 'updated_at' IS DISTINCT FROM v_old_record - 'updated_at' THEN
      -- Compute diff: only fields that changed
      v_changed := '{}'::jsonb;
      FOR v_key IN SELECT jsonb_object_keys(v_record)
      LOOP
        IF v_key != 'updated_at' AND
           (v_record->v_key) IS DISTINCT FROM (v_old_record->v_key) THEN
          v_changed := v_changed || jsonb_build_object(
            v_key, jsonb_build_object(
              'old', v_old_record->v_key,
              'new', v_record->v_key
            )
          );
        END IF;
      END LOOP;

      INSERT INTO audit.record_version
        (table_name, record_id, op, record, old_record, changed_fields, actor_id)
      VALUES
        (TG_TABLE_NAME, v_record_id, 'UPDATE', v_record, v_old_record, v_changed, v_actor);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    v_record := to_jsonb(NEW);
    v_record_id := (v_record->>'id')::uuid;
    INSERT INTO audit.record_version (table_name, record_id, op, record, actor_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'INSERT', v_record, v_actor);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_old_record := to_jsonb(OLD);
    v_record_id := (v_old_record->>'id')::uuid;
    INSERT INTO audit.record_version (table_name, record_id, op, old_record, actor_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', v_old_record, v_actor);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- ============================================================
-- 4. Audit triggers for moderation tables
-- ============================================================

CREATE TRIGGER trg_audit_reports
  AFTER INSERT OR UPDATE OR DELETE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION audit.fn_record_version();

CREATE TRIGGER trg_audit_user_blocks
  AFTER INSERT OR UPDATE OR DELETE ON public.user_blocks
  FOR EACH ROW EXECUTE FUNCTION audit.fn_record_version();

-- ============================================================
-- 5. Admin RLS policy for audit entries
-- ============================================================
-- Admins can see all audit entries across all tables.

CREATE POLICY "audit_admin_all"
  ON audit.record_version FOR SELECT TO authenticated
  USING (public.is_admin());
