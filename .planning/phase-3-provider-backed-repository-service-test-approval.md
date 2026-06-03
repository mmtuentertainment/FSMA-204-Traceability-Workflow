# Phase 3 Provider-Backed Repository/Service Test Approval Packet

**Date:** 2026-06-02
**Batch:** 50
**Scope:** Docs/planning only. This packet approves and scopes the *next code-bearing batch* ("Batch A"): provider-backed repository/service tests for the exception-review path, run against a real PostgreSQL test database, **without wiring the live route**. It implements nothing in this batch: no route wiring, no OpenAPI edit, no generated-type edit, no schema or migration change, no dependency change, no package-script or CI change, no auth/RBAC/idempotency/audit/repository/service code, and no route activation.
**Applies to:** Future provider-backed test coverage and the single gated migration for `PATCH /api/traceability/exceptions/{exceptionId}` only.

## Purpose

The Batch 48 minimum-decision packet (`.planning/phase-3-provider-activation-minimum-decisions.md`) settled the nine pre-code decisions, and Batch 49 added the T1–T9 review-reconciliation tightenings — including **T3**, the only one of those tightenings that was left as an explicitly *gated schema decision* rather than a settled position. This packet:

1. **Resolves the T3 resource-scope decision** (Decision A below).
2. **Fixes the exact migration scope** the next code batch may touch (Decision B).
3. **Fixes the test infrastructure** for provider-backed tests (Decision C).
4. **Fixes the rate-limit test scope** (Decision D).
5. **Specifies the repository/service tests** for tenant membership lookup, tenant-scoped exception update, idempotency reserve/replay/conflict, append-only audit append, and rate-limit posture (Test Scope below), with explicit acceptance criteria.

It establishes a two-step sequence and a hard gate:

- **Batch A** — the provider-backed repository/service test slice plus the single T3 migration, with **no route wiring**.
- **Batch B** — runtime hardening: route wiring, a live `DATABASE_URL`, T6 connection hardening, persistent rate-limit enforcement, and PATCH success activation.

**Batch B must not start until Batch A's test slice is implemented, green, and accepted.**

This packet does not grant Batch A. It records exactly what Matt would approve before Batch A code starts (allowed files, dependency changes, migration scope, validation commands, rollout path, and rollback path), per the established pre-code gate.

## Non-Activation Statement

The current `PATCH /api/traceability/exceptions/{exceptionId}` remains fixture-only. It still uses local/test fixture bearer auth (production-fenced), server-derived fixture tenant identity, same-tenant reviewer RBAC, an in-memory fixture exception repository, in-memory idempotency replay/conflict handling, and append-only in-memory audit evidence. This packet does not change that behavior, does not open any database connection, does not enable any non-public resolver or policy, and does not activate the route. The lazy client seam `lib/db/client.ts` (Batch 46) remains import-safe and is called by no route.

## Conservative Product Posture

This product provides FSMA 204 traceability **readiness support** only. Nothing in this packet or in Batch A may claim compliance certification, guaranteed FSMA 204 compliance, FDA approval or endorsement, legal advice, or automated exemption/regulatory determination. Audit evidence supplements — it does not replace — source-document references and human review. No regulatory-retention sufficiency is claimed.

---

## Decision A — T3 Idempotency Resource-Scope Resolution

**Question.** The runtime seam `lib/security/idempotency-audit.ts` is resource-scoped (`IdempotencyScope.resourceRef`, and `FixtureIdempotencyStore.scopeKey()` includes `resourceRef`), but the persisted `idempotency_records` table scopes uniqueness only on `(tenant_id, operation, idempotency_key)` and has **no** `resource_type`/`resource_id` columns. With a bare action `operation` (e.g. `exception.review.update`), the same `Idempotency-Key` reused across two exception IDs would collide at the persistence layer even though the seam treats them as distinct. Meanwhile `audit_events` *already* carries first-class `resource_type` + `resource_id`.

**Options considered.**

- **Option (a) — encode resource identity into `operation`** (e.g. `operation = "exception.review.update:{exceptionId}"`); no DDL. *Pros:* zero schema change. *Cons:* drifts from `audit_events`' first-class resource columns; overloads `operation` with two concerns and dilutes the `(tenant_id, operation, lifecycle_status)` index; fragile string packing with delimiter/parse risk; makes the T2 canonical request-hash "operation context" implicit; contradicts the Batch 49 T3 stated preference.
- **Option (b) — add `resource_type` + `resource_id` columns and rescope uniqueness** to `(tenant_id, operation, resource_type, resource_id, idempotency_key)`; one forward-only migration. *Pros:* naming parity with `audit_events.resource_type`/`resource_id` so idempotency and audit rows describe the same resource identically and join cleanly; resource identity becomes first-class, queryable, NOT NULL; keeps `operation` a pure action verb and the lifecycle index selective; gives T2's request-hash an explicit column context; matches the already-resource-scoped seam. *Cons:* requires one forward-only DDL migration plus a regenerated Drizzle meta snapshot/journal entry; the two new NOT NULL columns rely on the empty-table/forward-repair posture.

**Resolution: adopt Option (b).** It aligns the persisted table with the already-resource-scoped seam and mirrors `audit_events` exactly. It is realized as **exactly one forward-only migration** in Batch A. This is the single migration Batch A is permitted to introduce.

**Approved target — `lib/db/schema.ts` change (specification only; applied in Batch A, not in Batch 50).** In `idempotencyRecords`, Batch A will add the two columns immediately after `operation` (in the column block) and replace the unique constraint (in the existing `(table) => [...]` extras array, replacing the current `idempotency_records_tenant_operation_key_unique` entry):

```ts
// SPECIFICATION ONLY — NOT APPLIED IN BATCH 50 (Batch A artifact).
// Only resource_type / resource_id are new; operation / idempotency_key shown for placement.
// columns: add immediately after operation
operation: text("operation").notNull(),
resourceType: text("resource_type").notNull(),
resourceId: text("resource_id").notNull(),
idempotencyKey: text("idempotency_key").notNull(),

// table extras: replace the existing unique(...) with
unique("idempotency_records_tenant_operation_resource_key_unique").on(
  table.tenantId,
  table.operation,
  table.resourceType,
  table.resourceId,
  table.idempotencyKey,
),
```

`idempotency_records_tenant_lifecycle_idx`, `idempotency_records_expires_idx`, the lifecycle-status CHECK, and the `audit_event_id` FK are left unchanged. Column names `resource_type`/`resource_id` match `auditEvents` exactly.

**Approved target — new forward-only migration `lib/db/migrations/0001_idempotency_resource_scope.sql` (specification only; generated in Batch A, not in Batch 50).**

```sql
-- SPECIFICATION ONLY — NOT APPLIED IN BATCH 50. Generated in Batch A via drizzle-kit generate.
ALTER TABLE "idempotency_records" ADD COLUMN "resource_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD COLUMN "resource_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_records" DROP CONSTRAINT "idempotency_records_tenant_operation_key_unique";--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_tenant_operation_resource_key_unique" UNIQUE("tenant_id","operation","resource_type","resource_id","idempotency_key");
```

Migration posture:

- **Forward-only with forward-repair (T7):** no down/rollback SQL; any future fix is another forward migration, never a destructive revert.
- **Empty-table safety:** `idempotency_records` is brand-new scaffold from migration `0000` and is never instantiated at runtime (no route imports `lib/db/client.ts`), so it holds no live rows; `ADD COLUMN ... NOT NULL` needs no `DEFAULT`/backfill. In Batch A the migration is applied by `drizzle-kit migrate` to a freshly-migrated disposable test database (Decision C), so no rows exist at apply time — a clean/migrated-from-empty `TEST_DATABASE_URL` is a Batch A precondition. If any environment ever held pre-existing rows, the forward-repair shape is: add nullable → backfill → `SET NOT NULL` — not needed here.
- **Journal consistency (T9):** the migration must be produced via `drizzle-kit generate` so `lib/db/migrations/meta/0001_snapshot.json` is written and `meta/_journal.json` gains the idx-1 entry; otherwise `npm run db:check` (`drizzle-kit check`) fails journal/snapshot consistency. The hand-authored SQL above is the expected *semantic* content; `drizzle-kit generate` is authoritative for exact statement ordering/formatting, and the generated `0001` SQL + meta snapshot must be reviewed against this intent. `drizzle.config.ts` is unchanged.

---

## Decision B — Exact Migration Scope for Batch A

The T3 migration `0001_idempotency_resource_scope.sql` (Decision A) is the **only** schema or migration change permitted in Batch A. Explicitly **deferred to Batch B** (per T8):

- **No `rate_limit` table.** None exists today; the fixed-window limiter's persistence is Batch B (see Decision D).
- **No dedicated prior-state/next-state columns** on `audit_events`. Prior/next state live only inside `audit_events.metadata` jsonb in the first slice.

Batch A is otherwise **tests-only**: provider-backed repository/service tests for the exception-review path, run against a real PostgreSQL test database, with no live route wired.

---

## Decision C — Test Infrastructure for Batch A

**Resolution: zero-new-dependency, provider-backed stack.**

- **Test database provisioning:** a GitHub Actions `services: postgres` container in a **new CI job** (so the existing fixture/contract job stays untouched and green), plus a documented local convention — a developer-supplied disposable Postgres reached via a `TEST_DATABASE_URL` env var (e.g. a one-line `docker run ... postgres:16`). No compose file is committed for Batch A.
- **Schema application:** `drizzle-kit migrate` applies the existing forward-only journal (migration `0000` plus the Batch A `0001`) to `TEST_DATABASE_URL`. The migration tool is the same one `db:check` already uses. The test DB must be freshly migrated from empty (drop/recreate or a disposable container per run) so the `0001` `ADD COLUMN ... NOT NULL` applies without backfill.
- **Isolation/teardown:** default to per-test `BEGIN ... ROLLBACK` on a single checked-out `pg` client (fastest, residue-free). Multi-connection cases that BEGIN/ROLLBACK cannot express — the T2 competing-reservation and expired-reservation-reclaim cases, and the T1 cross-transaction rollback verification — explicitly opt out of the single-tx wrapper and clean up with `TRUNCATE`. `TRUNCATE` must respect the `idempotency_records → audit_events` FK (truncate child before parent, or `TRUNCATE ... CASCADE RESTART IDENTITY`) and reset identity sequences between cases. This opt-out is documented per test, not assumed.
- **Harness:** reuse the existing no-framework pattern — `node --experimental-strip-types tests/<x>.test.ts` with `node:assert/strict`, matching `tests/exception-review-patch.test.ts` and `tests/db-client-import.test.ts`. **Do not** add `node:test`, Vitest, Jest, Playwright, or testcontainers in Batch A.
- **Safety fence:** the shared test helper hard-fails if `TEST_DATABASE_URL` is unset and refuses any URL that is not an explicit test database, mirroring the production fixture-auth fence (`NODE_ENV === "production"`). Provider tests must never point at a production/live database.

**New dependencies required: none.** `pg` and `drizzle-orm` are runtime deps; `drizzle-kit`, `@types/pg`, `@types/node`, `typescript` are devDeps; `node --experimental-strip-types` + `node:assert/strict` are already the proven harness.

**Gated Batch A changes (Matt approves these as part of Batch A; this docs packet adds none of them):**

- New `package.json` scripts (proposed names): `test:db:setup` (drizzle-kit migrate against the test DB), `test:db:repo`, `test:db:idempotency`, `test:db:audit`, `test:db:service`, and an aggregate `test:db`.
- New test files under `tests/db/` (repository/service only; **no** `app/api/.../route.ts` import), e.g. `tests/db/_helpers.ts`, `tests/db/exception-review.repo.test.ts`, `tests/db/idempotency.repo.test.ts`, `tests/db/audit.repo.test.ts`, `tests/db/exception-review.service.test.ts`, plus the rate-limit posture test file (Decision D).
- A new `db-provider-tests` CI job in `.github/workflows/contract-gate.yml` with the `services: postgres` block and a job-scoped `TEST_DATABASE_URL`/`DATABASE_URL` consumed only by `drizzle-kit migrate` and the test client — never by a route (no route imports `lib/db/client.ts` in Batch A).

---

## Decision D — Rate-Limit Test Scope for Batch A

**Resolution: posture-only at the service level; defer the persistent table and live enforcement to Batch B.**

Batch A tests the fixed-window limiter as a **behavioral contract** through an **injected in-memory window store plus an injected deterministic clock** (mirroring the `FixtureIdempotencyStore`/`FixtureAuditSink` pattern). This honors T8 (no `rate_limit` table is added — that is gated schema work), T7 (the limiter is already framed as a posture: scoped by tenant/actor/operation/window, returning `429` + `Retry-After`, with a documented boundary-burst caveat), and Decision 8's own open items (whether the first slice wires limiting, and threshold/window tuning, remain gated). The contract already declares `RateLimited` with `Retry-After`, so **no OpenAPI edit** is needed.

**Posture contract to prove (no persistence, no route wiring):** a tenant-scoped fixed-window limiter keyed by `(tenant_id, actor_auth_subject_id, operation, window_start)` with an injected clock; window key components are server-derived (never client-supplied); the limiter runs **before** the transition so a limited request performs no exception mutation, no audit append, and no idempotency reserve/completion; a limited request maps to `429` RFC 9457 `application/problem+json` with a `Retry-After` integer ≥ 1 equal to whole seconds remaining in the window; windows are independent per scope tuple and reset after expiry; the ~2× boundary-burst weakness is documented and demonstrated, **not** asserted away.

**Flagged minimal in-scope code for Batch A:** `lib/api/problem.ts` currently has no `rateLimited` catalog entry or `Retry-After` response builder. The service tests assert the `429` Problem shape + `Retry-After` header, so adding that catalog entry/builder is the minimal in-scope Problem-layer code Batch A (not this docs batch) may include. It is **not** route wiring and **not** an OpenAPI/generated-types edit (the contract already declares `RateLimited`). It must be listed in Batch A's allowed files for approval.

**Deferred to Batch B:** the persistent `rate_limit` table and its migration; live enforcement on the wired route against a real `DATABASE_URL` (atomic window-counter upsert, `SELECT ... FOR UPDATE`, expiry reclaim/retention); authoritative threshold/window tuning; an edge/gateway supplemental limiter for the boundary burst.

---

## Test Scope — Provider-Backed Repository/Service Tests (Batch A)

All five areas run against a real PostgreSQL test DB via `node --experimental-strip-types` + `node:assert/strict`, exercise the service/repository **directly** (never the live PATCH route), seed and assert via independent tenant-scoped `SELECT`, and reset state between cases. Each area below lists the minimum behaviors Batch A must prove; the bracketed IDs are the reference case set. The acceptance denominator is **107 cases total** — Area 1 (TM-01..TM-17, 17), Area 2 (A2-01..A2-22, 22), Area 3 (A3-01..A3-24, 24), Area 4 (A4-01..A4-27, 27), Area 5 (A5-01..A5-17, 17) — and every referenced ID must pass (see Batch A Acceptance Criteria).

### Implementation Progress After This Approval Packet

- **Batch 51 / A1 complete:** added the T3 resource-scope migration, repaired stale Drizzle snapshot metadata for `audit_events.reason`, added the first non-route provider-backed exception-review service/repository spine, and added 12 focused provider-backed tests for membership lookup, tenant-scoped update, idempotency reserve/replay/conflict/in-flight/reclaim, accepted audit append, and no route/rate-limit-table proof.
- **Batch 52 / A2 complete:** extends the provider-backed slice for request-hash mismatch Problem Details, stored replay-body introspection on conflicts, cross-resource and cross-tenant idempotency isolation, repeated conflict determinism, and conflict/error audit events. This A2 slice updates the earlier audit expectation for hash-mismatch conflicts: mismatched idempotency requests now append structured error audit evidence, while replay, in-flight duplicates, and rejected non-transition paths remain non-appending until separately approved.
- **Still remaining:** the full 107-case Batch A matrix is not complete. Remaining inventory includes the broader membership role/check-constraint matrix, full exception update enum/partial-patch matrix, multi-connection competing reservation proof, forced-fault atomic rollback proof, append-only surface/non-enforcement tests, full T4 redaction matrix, and service-level fixed-window rate-limit posture tests. Batch B route wiring, live `DATABASE_URL`, persistent rate limiting, and runtime hardening remain gated.

### Area 1 — Tenant membership lookup (`tenant_memberships`)

Repository read consumed by Decision 2 (tenant identity) and Decision 3 (RBAC). Minimum behaviors:

- Active membership returns its role for `tenant_admin`, `quality_reviewer`, and `read_only`; the repository surfaces the role faithfully and does **not** itself deny (denial is the service/RBAC layer). [TM-01..TM-03]
- `disabled_at` non-null ⇒ inactive / no authority, whether the timestamp is past or future (no scheduled/windowed grant); re-clearing `disabled_at` to NULL makes the row active again. [TM-04, TM-05, TM-17]
- Unknown `(tenant, subject)` ⇒ no membership (normal, not an error). [TM-06]
- Cross-tenant: a subject active in tenant A is **not** a member of tenant B; the same subject may hold different roles per tenant, each resolved strictly within the server-resolved tenant. [TM-07, TM-08, TM-16]
- Write-guard fixtures: `UNIQUE(tenant_id, auth_subject_id)` rejects duplicates; the role CHECK rejects unknown/empty/wrong-case roles; NOT NULL on `tenant_id`/`auth_subject_id`/`role` is enforced. [TM-09..TM-12]
- The lookup is keyed by the **server-resolved** tenant; the repository API offers no path for a client-claimed tenant to reach the `WHERE` clause. [TM-13]
- Activeness keys on `disabled_at`, independent of `created_at`/`updated_at` recency; the `(tenant_id, role)` index is incidental and correctness must not assert a specific plan. [TM-14, TM-15]

Out of scope here (Batch B / other areas): final `401` vs leak-safe `404` HTTP mapping; actual RBAC deny enforcement; DB-level isolation/RLS.

### Area 2 — Tenant-scoped exception update (`traceability_exceptions`)

Provider-backed analog of `FixtureExceptionReviewRepository.applyReview(tenantId, exceptionId, patch)` ⇒ `{status:'applied', before, record} | {status:'not_found'}`. Minimum behaviors:

- An update scoped to `(tenant_id, id)` mutates **exactly** the four `ExceptionPatch` fields (`status`, `review_reason`, `review_notes`, `human_review_required`) plus server attribution (`reviewed_by_auth_subject_id`, `reviewed_at`, `updated_at`); all immutable columns are byte-unchanged. [A2-01]
- Server attribution and `updated_at` are set by the repository from server inputs, never from client patch content; client-supplied `reviewed_by_auth_subject_id`/`reviewed_at`/`tenant_id`/`updated_at` in a polluted patch are never persisted. [A2-02, A2-03, A2-14, A2-15]
- Cross-tenant update of an id owned by tenant B while scoped to tenant A affects **0 rows**, returns `not_found`, and does not mutate B's row; when the same id exists under both tenants, only the caller-tenant row changes. (Load-bearing: PK is `id` alone, so every predicate must include `tenant_id`.) [A2-04, A2-05, A2-19]
- The repository exposes **no** global-by-id (untenanted) update path; every update method requires a `tenantId` argument. [A2-06]
- `status` and `review_reason` CHECK constraints reject out-of-enum values and accept every enumerated value (and `review_reason` accepts NULL); the repository surfaces DB errors rather than swallowing them. [A2-07..A2-11]
- The repository returns the pre-update `before` snapshot (feeds audit `beforeState`); a cross-tenant/unknown miss yields no `before` and therefore no upstream audit append. [A2-12, A2-13, A2-20]
- Partial patches update only present fields; `human_review_required` toggles both directions and stays NOT NULL; `review_notes` length is stored verbatim at the DB layer (length limits are a gated `422` contract concern per T7, **documented, not asserted** as a DB rejection). [A2-16, A2-17, A2-18]
- Server attribution columns are persisted but are **not** part of the `ExceptionRecord` response projection. [A2-22]

### Area 3 — Idempotency reserve / replay / conflict (`idempotency_records`) under T2 + T3 + T1 + T4

Service idempotency-lifecycle coordinator + repository, depending on the Decision A migration. Minimum behaviors:

- **Reserve (fresh):** `INSERT ... ON CONFLICT DO NOTHING` creates one `reserved` row with `request_hash`, future `expires_at`, NULL completion fields, `replay_headers='{}'`; treated as fresh. A key outside the OpenAPI bounds (shorter than 8 or longer than 200 chars, per the `Idempotency-Key` `minLength: 8`/`maxLength: 200`) is rejected as `422` before any reserve. [A3-01, A3-02]
- **Replay (completed + same hash):** returns the stored snapshot (status, content-type, body, allowlisted headers, `audit_event_id`) and does **not** re-apply; no new audit row, no new idempotency row. Replayed status/content-type come from the row verbatim. [A3-03, A3-21]
- **Conflict (different hash):** `409` Problem Details in any lifecycle state (`completed`, `reserved`, `failed`); no mutation, no append. [A3-04, A3-05, A3-06]
- **In-flight (reserved + same hash):** declared Problem Details, default `409` (no wait/425 unless the contract later adds it); no double-apply; reserved row unchanged. [A3-07]
- **Concurrency:** two concurrent identical reserves ⇒ exactly one wins the INSERT, the loser takes `ON CONFLICT` + `SELECT ... FOR UPDATE` and branches; exactly one transition applies and one audit row appends; row reservation + row locks, **not** advisory locks. [A3-08]
- **T3 proof:** the same `Idempotency-Key` reused across two different exception IDs, and across two tenants, does **not** collide after the new composite uniqueness; a different `operation` is also independently scoped. These cases are the acceptance proof that the T3 drift is closed and **cannot pass** before the Decision A migration lands. [A3-09, A3-10, A3-24]
- **Expiry/reclaim:** an expired `reserved` row is reclaimed/re-reserved in a single transaction (in place, no duplicate); a `completed` row past `expires_at` is still replayed (not reclaimed) until retention cleanup; cleanup deletes expired `reserved`/`failed` rows but never `completed` snapshots or rows referencing `audit_events` before retention. The expiry/retention windows used here are injected/parameterized fixture values, not authoritative production tuning (which stays gated to Batch B per Decision 5/8 and T7). [A3-11, A3-12, A3-13]
- **T1 atomicity:** the exception UPDATE + the audit INSERT + the idempotency completion/snapshot commit in **one** transaction; a forced fault during completion, or during the exception UPDATE, rolls back **all three** (no partial mutation, no orphan audit row, no orphan completion); a `not_found` outcome never writes a completion or success snapshot. [A3-14, A3-15, A3-16, A3-17]
- **T4 redaction:** `replay_headers` exclude `Authorization`/`Cookie`/`Set-Cookie` (case-insensitive) and any secret; `replay_body` is only the idempotent response (no request body, raw documents, `DATABASE_URL`, or secrets); `audit_events.metadata` carries only enumerated structured fields. [A3-18, A3-19, A3-20]
- **Defensive DB invariants:** the lifecycle-status CHECK rejects unknown values; the `audit_event_id` FK rejects a completion that references a non-existent audit row (reinforcing audit-before-completion ordering in one tx). [A3-22, A3-23]

### Area 4 — Append-only audit append (`audit_events`) under T4 + T8

Tenant-scoped append-only repository, coordinated with the transition only where the one-transaction/FK invariants require. Minimum behaviors:

- An accepted transition appends **exactly one** row carrying server-derived `tenant_id`, authenticated `actor_auth_subject_id`, `action = 'exception.review.update'`, `resource_type = 'traceability_exception'`, `resource_id = exceptionId`, non-empty enumerated `source`, server-generated `created_at` (DB `now()`), and a DB identity `id`; client-supplied tenant/actor/timestamp/id are ignored. The seam `resourceRef` maps onto the two columns, not a blob. [A4-01..A4-06, A4-08, A4-09]
- `reason` is nullable and holds a sanitized reason code, never raw notes. [A4-07]
- Prior/next state live **inside** `metadata` jsonb (no dedicated columns — T8); `metadata` is a populated, valid JSON object distinguishable from the `'{}'` default for a recorded transition. [A4-10, A4-11]
- The completed idempotency snapshot references the new `audit_event_id` via FK (and a dangling reference fails the FK). [A4-12]
- No extra append on non-transitions: a replay, an in-flight duplicate, and any rejected path (`401`/`403`/`404`/`422`) append **zero** new rows; a transaction rollback leaves no orphan audit row. Hash-mismatch `409` conflicts are handled by Batch 52 / A2 as explicit structured error audit events. [A4-13..A4-17]
- The repository exposes an append-only surface with **no** update and **no** delete method. [A4-18, A4-19]
- DB-level append-only is **not** enforced by the scaffold: a privileged raw `UPDATE`/`DELETE` on `audit_events` still succeeds; Batch A documents this as expected non-enforcement and defers DB-level enforcement (trigger/role) to Batch B (T6/T9). [A4-20]
- T4 redaction: `metadata` keys are a subset of the enumerated allowlist; it never stores secrets, raw bodies, `DATABASE_URL`, raw documents, or unnecessary PII (only `source_document_ref`-style references); the idempotency key is recorded as an identifier without displacing the structured evidence. [A4-21..A4-24]
- Audit rows are tenant-scoped (no cross-tenant leakage in a tenant-scoped read); two distinct accepted transitions on the same resource append two ordered rows (append-only, not upsert). [A4-25, A4-26]
- Conservative-language assertion: nothing in the repository surface or stored data asserts compliance/retention sufficiency or FDA/legal claims; evidence is framed as supplementing source docs + human review; no WORM/long-term retention is implemented. [A4-27]

### Area 5 — Rate-limit posture (service level; persistent table deferred to Batch B)

Service tests against an injected in-memory fixed-window store + injected clock; `audit_events`/`idempotency_records`/`traceability_exceptions` appear only as read-only assertion targets (a limited request touches none of them). Minimum behaviors:

- Under-limit requests within a window all pass; the `(N+1)`th request is limited and maps to `429` `application/problem+json` with a body that validates against the RFC 9457 Problem schema (`type`/`title`/`status == 429`/`detail`/`instance`, matching the existing `problem.ts` builder shape) and a `Retry-After` integer ≥ 1. [A5-01, A5-02, A5-16]
- `Retry-After` equals whole seconds remaining in the window under the injected clock (exact, deterministic; `ceil`, never 0/float/negative), conforming to the OpenAPI `RateLimited` `Retry-After` (`type: integer, minimum: 1`). [A5-03, A5-14]
- A limited request runs **before** the transition: no exception mutation, no audit append, no idempotency reserve/completion — asserted independently and in one combined fully-valid-input scenario. [A5-04, A5-05, A5-06, A5-13]
- Independent windows per tenant, per actor, per operation, and per window bucket; a window resets after expiry so a previously-limited tuple passes once the clock crosses the edge (Retry-After is an honest, actionable wait). [A5-07..A5-11]
- The ~2× boundary-burst weakness is demonstrated and **accepted as documented** (the test must not assert the limiter prevents it); an edge/gateway supplement is noted as future. [A5-12]
- The limiter charges budget only at its checkpoint; the pipeline order (auth → RBAC → input validation → limiter → transition) is pinned and asserted, not assumed. [A5-15]
- Limiter state never touches Postgres in Batch A; the test imports no `lib/db/client.ts`, preserving the import-safety invariant. [A5-17]

---

## Batch A Acceptance Criteria ("test slice accepted")

Batch A is accepted when **all** of the following hold:

1. The Decision A migration `0001_idempotency_resource_scope.sql` is generated via `drizzle-kit generate` (with its meta snapshot + journal entry) and applies cleanly to the test DB; `npm run db:check` stays green (journal/snapshot consistency + client import safety).
2. Every referenced case ID across all five areas passes against a real PostgreSQL test database (the 107-case denominator above). The load-bearing proofs that must not be waived are the T3 proofs (A3-09/A3-10/A3-24), the T1 atomicity rollback proofs (A3-15/A3-16/A4-17), the append-only surface proofs (A4-18/A4-19) with the documented A4-20 non-enforcement, the T4 redaction proofs, and the rate-limit posture proofs (A5-02..A5-06, A5-12).
3. The existing baseline gate remains green and unchanged: `npm ci`, `npm run api:check`, `npm run db:check`, `npm run typecheck`, `npm run build`, `npm run test:mock-recall:contract`, `npm run test:exception-review:patch`.
4. No route imports `lib/db/client.ts`; the PATCH route remains fixture-only; `api/openapi.yaml` and `lib/api/generated/openapi-types.ts` are unchanged; no new runtime dependency is added.
5. Batch A is recorded with an `ops/deltas/` evidence report and a named rollback.

## Batch A / Batch B Gating

**Batch B (runtime hardening) must not start until Batch A is implemented, green, and accepted.** Batch B is everything deliberately deferred above:

- Wiring `PATCH /api/traceability/exceptions/{exceptionId}` to the live service/repository against `lib/db/client.ts`; a live runtime `DATABASE_URL`.
- T6 connection hardening: TLS policy (no blanket `rejectUnauthorized:false`), bounded pool `max` + `connectionTimeoutMillis` + `idleTimeoutMillis` + max lifetime, `statement_timeout`/`lock_timeout`/`idle_in_transaction_session_timeout`, a pool error handler, Fluid Compute/pooler posture, a least-privilege runtime role distinct from the migration owner.
- DB-level append-only enforcement for `audit_events` (trigger or INSERT/SELECT-only role) and optional RLS as defense-in-depth (never the sole tenant boundary).
- Persistent `rate_limit` table + live `429` enforcement before the transition; threshold/window tuning; expired-window cleanup/retention.
- T5 auth-mechanism + CSRF resolution (bearer vs Auth.js cookie) in an OpenAPI-first contract batch; T7 input-limit contract edits (body-size cap, `review_notes` maxLength, `additionalProperties` ⇒ `422`).
- A CI schema-drift step (e.g. `drizzle-kit generate --check`) and any DB-level isolation/append-only proof beyond `db:check`'s journal/snapshot + import-safety scope (T9).
- PATCH success activation under production-like conditions.

## Allowed and Forbidden Files for Batch A (gated — Matt approves before code)

**Allowed (Batch A):** `lib/db/schema.ts` (Decision A columns/unique); new `lib/db/migrations/0001_idempotency_resource_scope.sql` + regenerated `lib/db/migrations/meta/*`; new repository/service modules for tenant membership, tenant-scoped exception update, idempotency lifecycle, and audit append (e.g. under `lib/db/` and/or `lib/api/`, service-only, no route import); the injected fixed-window limiter seam; `lib/api/problem.ts` (`rateLimited` entry + `Retry-After` builder, Decision D); new `tests/db/*` files; new `package.json` test scripts; a new `db-provider-tests` CI job in `.github/workflows/contract-gate.yml`.

**Forbidden (Batch A — deferred to Batch B or other gated batches):** any change to `app/api/**` route handlers; any route import of `lib/db/client.ts`; `api/openapi.yaml`; `lib/api/generated/openapi-types.ts`; any migration other than `0001`; any `rate_limit` table or prior/next-state columns; new runtime dependencies; T6 connection hardening; DB-level append-only/RLS enforcement; auth-mechanism/CSRF or input-limit contract edits.

## What This Packet Does NOT Do

- No runtime route implementation or activation; the exception-review PATCH stays fixture-only.
- No edit to `app/api`, `api/openapi.yaml`, `lib/api/generated/openapi-types.ts`, `lib/db/schema.ts`, `lib/db/migrations`, `lib/security`, `lib/api/problem.ts`, `package.json`, `package-lock.json`, `.github`, `tsconfig.json`, runtime route files, or test files.
- No schema, migration, or Postgres wiring into runtime routes (including no creation of `lib/db/migrations/0001*` or its meta entries in this batch — that is a Batch A artifact); no dependency, package, lockfile, CI, or `tsconfig` change.
- No auth, RBAC, idempotency storage, audit storage, repository/service logic, tenant persistence, rate-limit code, imports, exports, or production CSV generation.
- No supplier KDE workflow, lot/event workflow, mock recall computation, dashboards, supplier portal, UI, file upload, source-document storage, ERP, OCR, or mobile scanning.
- No compliance certification, legal advice, FDA approval/endorsement, or automated exemption/regulatory determination; readiness support only.

## Verification Gate For This Packet

This is a docs/planning-only batch; the docs-only baseline gate must continue to pass unchanged: `npm ci`, `npm run api:check`, `npm run db:check`, `npm run typecheck`, `npm run build`, `npm run test:mock-recall:contract`, `npm run test:exception-review:patch`, `git diff --check`, and `git diff --cached --check`. `npm run db:check` here verifies only Drizzle migration journal/snapshot consistency plus `lib/db/client.ts` import safety (T9); the markdown-only edits in this batch cannot affect any gate result.

## Rollback Path

For this docs-only packet, rollback is to delete `.planning/phase-3-provider-backed-repository-service-test-approval.md` and `ops/deltas/0050-provider-backed-repository-service-test-approval.md`, then remove the additive Batch 50 wording/pointers from `README.md`, `.planning/HANDOFF.json`, `ops/memory/product.md`, and the local `INTEL.md`. No runtime route, OpenAPI, generated type, DB schema, migration, package, test, CI, dependency, auth, RBAC, idempotency, audit, or repository rollback is needed.

For Batch A (the later code batch), rollback must be named before code starts. The expected reversible shape is to delete the new `tests/db/*` files, the new `package.json` scripts, the `db-provider-tests` CI job, the rate-limit limiter seam and the `rateLimited` Problem entry/builder, and the `0001` migration plus the matching `schema.ts` columns/unique (a forward-repair migration if it has already been applied anywhere), returning to the current scaffold with no route wired and `api/openapi.yaml` preserved as the source of truth.

## Next Step

After Matt approves the exact Batch A code scope (allowed files above, the single `0001` migration, the new scripts/CI job, and validation commands), implement Batch A: the T3 migration plus provider-backed repository/service tests for the five areas, with **no route wiring**. Batch B (runtime hardening and PATCH success activation) waits until Batch A's test slice is green and accepted.
