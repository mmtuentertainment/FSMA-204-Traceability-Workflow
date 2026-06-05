CREATE FUNCTION audit_events_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP
    USING ERRCODE = '99001';  -- distinctive custom SQLSTATE; tests assert on code + message
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_reject_mutation();
--> statement-breakpoint
ALTER TABLE audit_events ENABLE ALWAYS TRIGGER audit_events_append_only;
