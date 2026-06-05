-- lib/db/roles/runtime-roles.sql — Batch B0 (FSMA-03)
--
-- Idempotent bootstrap of the two TEST-ONLY runtime roles for the append-only
-- enforcement suite (tests/db/audit-append-only-enforcement.test.ts):
--
--   fsma204_app_runtime   — the LEAST-PRIVILEGE runtime role. Its grants are the
--                           durable security artifact: exactly what the provider
--                           (lib/db/exception-review-provider.ts) needs, and NOTHING
--                           on audit_events beyond INSERT + column-scoped SELECT(id).
--                           B1 repoints DATABASE_URL to this role.
--   fsma204_audit_mutator — a TEST-ONLY OVER-GRANTED role (UPDATE/DELETE on
--                           audit_events) that exists only to prove the append-only
--                           TRIGGER backstops the grant layer.
--
-- LOGIN PASSWORDs here are TEST-ONLY placeholders at parity with the existing
-- hard-coded postgres:postgres CI service creds (contract-gate.yml). They guard a
-- disposable 127.0.0.1-only container and protect nothing. PROD password
-- provisioning is B1 (secret-managed ALTER ROLE). See ops/deltas/0062.
--
-- Apply as the owner/superuser AFTER `drizzle-kit migrate`:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/roles/runtime-roles.sql
-- Idempotent: safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fsma204_app_runtime') THEN
    CREATE ROLE fsma204_app_runtime LOGIN PASSWORD 'fsma204_app_runtime';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fsma204_audit_mutator') THEN
    CREATE ROLE fsma204_audit_mutator LOGIN PASSWORD 'fsma204_audit_mutator';
  END IF;
END
$$;

-- Enforce role ATTRIBUTES on every run. The schema-wide REVOKE below converges the
-- table/column PRIVILEGES, but not attributes — so a role that pre-existed with
-- SUPERUSER/CREATEDB/etc. is tightened back here. These flags are exactly what the
-- P6 role-shape proof asserts (NOSUPERUSER/NOBYPASSRLS/NOCREATEROLE) plus NOCREATEDB
-- hygiene; together with the REVOKE this makes the script convergent, not merely
-- non-erroring, on re-run.
ALTER ROLE fsma204_app_runtime   NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS LOGIN;
ALTER ROLE fsma204_audit_mutator NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS LOGIN;

-- Schema access (PUBLIC keeps USAGE on schema public by default in PG16; explicit
-- here for robustness — idempotent).
GRANT USAGE ON SCHEMA public TO fsma204_app_runtime, fsma204_audit_mutator;

-- Convergence: strip every table/column privilege a pre-existing role may have
-- accumulated so a re-run yields EXACTLY the least-privilege matrix below — never a
-- superset. Verified against PG16: a table-level REVOKE ALL also clears column-scoped
-- grants (e.g. SELECT(id)), which the per-table GRANTs below then re-establish.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
  FROM fsma204_app_runtime, fsma204_audit_mutator;

-- ── fsma204_app_runtime — least-privilege, derived from the provider's queries ──
-- tenant_memberships: RBAC membership lookup (SELECT only).
GRANT SELECT ON tenant_memberships TO fsma204_app_runtime;
-- traceability_exceptions: SELECT … FOR UPDATE (needs UPDATE priv) + status UPDATE;
-- the SELECT grant also satisfies the UPDATE … RETURNING projection.
GRANT SELECT, UPDATE ON traceability_exceptions TO fsma204_app_runtime;
-- idempotency_records: reserve INSERT, SELECT … FOR UPDATE, reclaim/complete UPDATE,
-- Batch-59 orphan-cleanup DELETE.
GRANT SELECT, INSERT, UPDATE, DELETE ON idempotency_records TO fsma204_app_runtime;
-- audit_events: APPEND-ONLY for the runtime role. INSERT + column-scoped SELECT(id)
-- (the only reason SELECT is needed is `INSERT … RETURNING id`; RI checks bypass the
-- caller's SELECT, so the idempotency FK does not force a grant). NO UPDATE/DELETE.
GRANT INSERT ON audit_events TO fsma204_app_runtime;
GRANT SELECT (id) ON audit_events TO fsma204_app_runtime;
-- Defense-in-depth: TRUNCATE is a SEPARATE privilege and a SEPARATE trigger event
-- (the BEFORE UPDATE/DELETE trigger does NOT cover it). Revoke explicitly so the
-- restricted role can never TRUNCATE audit_events even if a future grant slips.
REVOKE TRUNCATE ON audit_events FROM fsma204_app_runtime;

-- ── fsma204_audit_mutator — TEST-ONLY over-grant to prove the trigger backstop ──
-- Deliberately OVER-granted UPDATE/DELETE on audit_events: the suite proves the
-- trigger rejects this role (99001) even though its grants would allow the DML.
GRANT INSERT, SELECT, UPDATE, DELETE ON audit_events TO fsma204_audit_mutator;
REVOKE TRUNCATE ON audit_events FROM fsma204_audit_mutator;
