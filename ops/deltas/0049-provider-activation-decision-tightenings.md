# Batch 49 - Provider Activation Decision Tightenings (Review Reconciliation)

## Summary

Tightens the Batch 48 provider-activation minimum decision packet so the valid runtime, persistence, and security concerns raised in the PR #12 stack review are recorded as explicit pre-code gates, without changing any runtime, contract, generated-type, dependency, package, or CI artifact.

This batch is docs/planning only. It adds a PR #12 disposition statement, a "Pre-Code Tightenings (Review Reconciliation)" section (T1-T9), and a verification-scope correction to the existing packet, and aligns the local `INTEL.md` baseline gate with the already-committed `db:check` step. No route is wired or activated, no Postgres connection reaches a runtime route, and no auth, RBAC, idempotency storage, audit storage, repository logic, tenant persistence, imports, exports, or production CSV generation is implemented. The exception-review PATCH remains fixture-only.

## Files Changed

- `.planning/phase-3-provider-activation-minimum-decisions.md`
- `INTEL.md` (local, untracked consultant intel; baseline-gate line aligned, not staged)
- `ops/deltas/0049-provider-activation-decision-tightenings.md`

## Decision Recorded

PR #12 is dispositioned ACCEPT-as-docs-with-tightenings, not REQUEST CHANGES: the review findings are factually accurate but are calibrated for the future route-wiring batch, not for a docs/planning packet whose `lib/db/client.ts` seam has no route caller and is never instantiated without `DATABASE_URL`. The packet now records the following tightenings as future code gates:

- **T1 Atomic transaction contract:** the tenant-scoped exception update, the `audit_events` insert, and the `idempotency_records` completion/replay snapshot must commit in one PostgreSQL transaction and roll back together (promoted from "preferably in the same transaction" to an explicit requirement).
- **T2 Idempotency concurrency protocol:** canonical request hash; `INSERT ... ON CONFLICT DO NOTHING` reservation; `SELECT ... FOR UPDATE` on conflict; replay on completed-same-hash; declared Problem Details (default `409`) on in-flight reserved-same-hash; `409` on hash mismatch; reclaim rule for expired reservations; row locks over advisory locks.
- **T3 Idempotency resource scope:** flags the seam-versus-table mismatch (resource-scoped `IdempotencyScope`/`scopeKey` in `lib/security/idempotency-audit.ts` versus `tenant_id + operation + idempotency_key` uniqueness in `idempotency_records`); future code must encode resource identity into `operation` or add `resource_type`/`resource_id` columns (gated DDL).
- **T4 Redaction and data minimization:** allowlist `replay_headers` and strip `Authorization`/`Cookie`/`Set-Cookie`/secrets; `replay_body` only the idempotent response; `audit_events.metadata` only enumerated structured fields; no raw documents, request bodies, `DATABASE_URL`, secrets, or unnecessary personal data.
- **T5 Auth mechanism and CSRF:** bearer-versus-Auth.js-cookie representation must be resolved in an OpenAPI-first contract batch; if cookie-backed, CSRF controls must be named before code.
- **T6 DB connection and defense-in-depth hardening:** TLS policy, bounded pool `max`/timeouts, session timeouts, pool error handler, Fluid Compute posture, least-privilege runtime role, DB-level append-only enforcement, optional RLS (never the sole tenant boundary).
- **T7 Rate/input/migration/observability:** fixed-window boundary-burst caveat; body-size cap, `review_notes` maxLength, unknown-field rejection as `422`; forward-only plus forward-repair migrations; structured logs without secrets/PII.
- **T8 First-slice persistence reconciliation:** "rate-limit state" and "prior/next state" are gated schema work, not existing first-slice persistence (no `rate_limit` table; prior/next state live only in `metadata` jsonb).
- **T9 Verification scope and scaffold non-enforcement:** `db:check` proves only migration-journal consistency plus client import safety, not live connectivity, schema drift, DB-level tenant isolation, or DB-level append-only; the current scaffold enforces append-only/tenant isolation only at the repository/app layer.

## Protected Surfaces (No Changes)

No changes were made to:

- `app/api`
- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `lib/db/schema.ts`
- `lib/db/migrations`
- `lib/security`
- `package.json`
- `package-lock.json`
- `.github`
- `tsconfig.json`
- runtime route files
- test files

## Contract And Runtime Impact

None. `api/openapi.yaml` remains the API source of truth. The current `PATCH /api/traceability/exceptions/{exceptionId}` remains fixture-only with local/test fixture auth, server-derived fixture tenant identity, fixture reviewer RBAC, in-memory fixture state, in-memory idempotency replay/conflict handling, and append-only in-memory audit evidence. The tightenings are planning constraints that bind the future code batch; they do not enable, wire, or alter any runtime behavior.

## Verification Commands And Results

- `npm run api:check` - passed (exit 0); Redocly validated `api/openapi.yaml` and `openapi-typescript --check` confirmed generated types match the contract.
- `npm run db:check` - passed (exit 0); `drizzle-kit check` reported "Everything's fine" and the DB client import-safety check passed without `DATABASE_URL`.
- `npm run typecheck` - passed (exit 0).
- `npm run build` - passed (exit 0); `next build` compiled and generated pages without `DATABASE_URL` (the client seam is never instantiated).
- `git --no-pager diff -- api/openapi.yaml app lib tests .github package.json package-lock.json tsconfig.json` - empty (exit 0); no forbidden surface touched.
- `git diff --check` - passed; no whitespace errors.

All markdown-only; none of these gate results can be affected by this batch's edits, and all remain green.

## Rollback Path

Revert the additive sections in `.planning/phase-3-provider-activation-minimum-decisions.md` (the "PR #12 Disposition" subsection, the "Pre-Code Tightenings (Review Reconciliation, Batch 49)" section T1-T9, and the appended `db:check` verification-scope paragraph), revert the `db:check` line added to the local `INTEL.md` baseline gate, and delete `ops/deltas/0049-provider-activation-decision-tightenings.md`.

No runtime route, OpenAPI, generated type, DB schema, migration, package, test, CI, dependency, auth, RBAC, idempotency, audit, or repository rollback is needed.

## Next Smallest Useful Batch

Add provider-backed repository/service tests for tenant membership lookup, tenant-scoped exception update, idempotency reserve/replay/conflict under the T2 protocol, append-only audit append, and rate limiting, without wiring the live exception-review route to the database, after Matt approves the exact code scope, dependency changes, migration scope (including the T3 resource-scope decision), validation commands, rollout path, and rollback path.
