# Phase 3 Provider Activation Minimum Decisions

**Date:** 2026-06-02
**Batch:** 48
**Scope:** Docs/planning only. This packet consolidates the *minimum* provider-activation decisions that must be settled before any code-bearing implementation of `PATCH /api/traceability/exceptions/{exceptionId}`. It records no runtime behavior and implements nothing: no route wiring, no OpenAPI edit, no generated-type edit, no schema or migration, no dependency, no auth/RBAC/idempotency/audit/persistence/repository code, no tenant persistence, no imports/exports/production CSV, and no route activation.
**Applies to:** Future production-like activation of `PATCH /api/traceability/exceptions/{exceptionId}` only.

## Purpose

This is the single smallest-safe decision gate for the exception-review PATCH. It does not re-derive the detailed rationale already recorded in the prior decision documents; it lists the minimum settled position for each required decision and points to its source of record so a later code batch does not re-decide architecture during runtime edits.

Source decision documents this packet consolidates:

- `.planning/phase-3-production-provider-selection.md` (Batch 35) — production provider direction.
- `.planning/phase-3-provider-decision-gap-audit.md` (Batch 40) — decided versus still-undecided audit.
- `.planning/phase-3-provider-activation-decisions.md` (Batch 41) — default provider choices.
- `.planning/phase-3-exception-review-patch-activation-scope.md` (Batch 42) — the one-write Phase 4-8 non-goal lift.
- `.planning/phase-3-exception-review-patch-activation.md` (Batch 45) — the consolidated activation approval packet.

Anything not settled below stays gated until Matt approves a concrete code-bearing micro-batch with exact allowed files, dependency changes, migration scope, validation commands, rollout path, and rollback path.

## Non-Activation Statement

The current `PATCH /api/traceability/exceptions/{exceptionId}` remains fixture-only. It still uses local/test fixture bearer auth, server-derived fixture tenant identity, same-tenant reviewer RBAC, an in-memory fixture exception repository, in-memory idempotency replay/conflict handling, and append-only in-memory audit evidence. This packet does not change that behavior, does not enable any non-public resolver or policy, and does not activate the route.

## PR #12 Disposition

PR #12 (Batches 44-48) is accepted as a docs/planning foundation, not as route-wiring or runtime-activation approval. An external review of the stack raised valid runtime, persistence, and security concerns. Those concerns are factually accurate, but they are calibrated for the future route-wiring batch, not for this packet: the exception-review PATCH remains fixture-only, the `lib/db/client.ts` seam has no route caller and is never instantiated without `DATABASE_URL`, and this packet records no runtime behavior. The raised items are therefore future code gates, not defects in current code.

The review-reconciliation tightenings recorded below (Batch 49) promote those concerns into explicit pre-code decision text. They add planning constraints only: no runtime, OpenAPI, generated-type, dependency, package-script, or CI change. Runtime hardening and any schema or contract change remain gated until Matt approves a concrete code-bearing micro-batch.

## Minimum Decisions Required Before Code

### 1. Auth source

Settled position: production request authentication uses Auth.js with database-backed sessions. The session is verified server-side before route logic reaches persistence; a stable actor id and authenticated state are resolved from the session. Missing or invalid auth stays on the `401` Problem Details path. Local/test fixture bearer tokens are test fixtures only and are already fenced from production runtime (`isFixtureAuthRuntimeEnabled` returns false when `NODE_ENV === "production"`); they must not become production credentials. Seam: `lib/security/request-context.ts` (shape and fixture adapters only). Source of record: Batch 41 (Auth And Session Provider), Batch 35 (Auth Provider Direction).

Still gated: the concrete adapter/dependency wiring, and whether the public MockRecall fixture read routes stay public smoke fixtures or become authenticated when production auth lands.

### 2. Server-derived tenant identity

Settled position: tenant identity is resolved only from trusted server-side auth/session and an application-owned PostgreSQL `tenant_memberships` source. Request bodies, query strings, route parameters, arbitrary headers, and client metadata are never tenant authority. An active membership is required before authorization succeeds, and cross-tenant or missing records resolve to a leak-safe `404` Problem Details (never `403`). Seam: `lib/security/request-context.ts` documents tenant identity as a server-owned property. Source of record: Batch 41 (Tenant Membership Source), Batch 35 (Server-Derived Tenant Identity), Batch 40.

Still gated: nothing about the rule changes; the authoritative membership query and its schema usage are implemented only in the approved code batch.

### 3. RBAC decision point

Settled position: deny-by-default, action-oriented authorization runs before any persistence work. The first protected action is `exception.review.update`. Minimum initial role mapping: `tenant_admin` may update, `quality_reviewer` may update, `read_only` may not; unknown roles and unknown actions deny by default. Seam: `lib/security/authorization.ts` (deny-by-default structure plus public-fixture and fixture-exception-review policies). Source of record: Batch 41 (Initial Role Mapping), Batch 45 (RBAC), Batch 35 (RBAC Direction).

Still gated: provider-specific claim mapping and any complete tenant administration / role-management workflow.

### 4. Postgres persistence boundary

Settled position: persistence uses PostgreSQL plus Drizzle behind route → service → repository boundaries. The route parses input, resolves context, authorizes, and maps errors to Problem Details; the service owns the transition, idempotency lifecycle, audit append, and rate-limit coordination; the repository owns tenant-scoped reads/writes. Drizzle migrations are forward-only and checked in during the approved code batch. The first slice stays limited to the exception record, memberships needed for authorization, idempotency entries, audit events, and rate-limit state. A lazy runtime client seam already exists at `lib/db/client.ts` (Batch 46) and is import-safe without `DATABASE_URL` (Batch 47); the schema/migration scaffold exists at `lib/db/schema.ts` and `lib/db/migrations/` (Batch 43). No route imports or calls the seam today. Source of record: Batch 41 (Persistence, Access Layer, And Migrations), Batch 35 (Persistence Direction), Batch 43/46.

Still gated: route wiring, a live `DATABASE_URL` connection, repository business logic, and any schema/migration changes beyond the existing scaffold.

### 5. Idempotency storage

Settled position: a PostgreSQL-backed idempotency table backs the first production-like mutating endpoint. `Idempotency-Key` is required and preserves the OpenAPI length constraints (`minLength: 8`, `maxLength: 200`). Uniqueness is enforced on `tenant_id + operation + idempotency_key`. A stable request hash is computed from the normalized request body and operation context. A fresh key reserves the operation before the transition is applied; a completed same-hash key replays the stored completed response snapshot; a different-hash reuse returns `409 Conflict` Problem Details; in-flight duplicates must not double-apply. The completed replay snapshot stores: HTTP status, response `Content-Type`, response body, relevant replayable headers, audit event reference, request hash, created timestamp, and completed timestamp. Seam shapes: `lib/security/idempotency-audit.ts` (`IdempotencyScope`, `IdempotencyCheck`, `IdempotencyStore`). Source of record: Batch 41 (Idempotency Lifecycle, Replay Snapshot Shape), Batch 35 (Idempotency Store Direction).

Still gated: the concrete lock/transaction strategy, failure-release semantics, and the retention window.

### 6. Append-only / audit-backed transition evidence

Settled position: accepted exception-review transitions append exactly one event to an append-only PostgreSQL `audit_events` table, written only after an accepted transition. Each event includes tenant id, actor id, action, resource reference, server-generated timestamp, source, reason or reviewer note, idempotency key, prior state, and next state. The completed idempotency snapshot references the audit event. There is no update or delete path for `audit_events` in the initial slice. Audit evidence supplements, and does not replace, source-document references or human review. No regulatory-retention sufficiency, compliance certification, legal advice, FDA approval, or FDA endorsement is claimed. Seam shapes: `lib/security/idempotency-audit.ts` (`AuditEvent`, `AuditSink`). Source of record: Batch 41 (Audit Storage And Retention Posture), Batch 35 (Audit Sink Direction).

Still gated: long-term retention, archive/WORM storage, and audit export.

### 7. Problem Details behavior

Settled position: API errors use RFC 9457 Problem Details (`application/problem+json`) for `401`, `403`, leak-safe `404`, `409`, `422`, and applicable `429`, preserving the declared OpenAPI response taxonomy for the operation. Authorization runs before the tenant-scoped load so a cross-tenant miss is reported as `404`, never `403`; this leak-safe ordering already exists for the read routes in `lib/api/route-boundary.ts` and must be preserved for the write. Unsupported client tenant fields and invalid enum values are rejected with `422` where applicable. Source of record: `lib/api/route-boundary.ts` and the Problem catalog (`lib/api/problem.ts`), Batch 45 (Problem Details), `api/openapi.yaml` (source of truth).

Still gated: nothing about the rule; it is fully specified by the contract and the existing boundary.

### 8. 429 Retry-After behavior

Settled position: a PostgreSQL-backed fixed-window limiter is enforced before applying the transition, scoped by tenant, actor, operation, and window. When the limit is exceeded the response is `429` RFC 9457 Problem Details with a `Retry-After` header. The contract already declares the `RateLimited` response with a `Retry-After` header (`api/openapi.yaml`, `components.responses.RateLimited`). If fixed-window limiter persistence requires schema not already present, the later code batch must include the smallest explicitly approved Drizzle migration for that limiter before route success activation. Source of record: Batch 41 (Rate-Limit Posture), Batch 45 (Rate Limiting), `api/openapi.yaml` (`RateLimited` response with `Retry-After`).

Still gated: exact thresholds and window tuning, and whether the first slice wires rate limiting or explicitly defers it.

### 9. Rollback path

Settled position, two scopes:

- For this docs-only packet: rollback is to delete `.planning/phase-3-provider-activation-minimum-decisions.md` and `ops/deltas/0048-provider-activation-minimum-decision-packet.md`, then remove the additive Batch 48 wording and pointers from `README.md`, `.planning/HANDOFF.json`, and `ops/memory/product.md`. No runtime route, OpenAPI, generated type, DB schema, migration, package, test, CI, dependency, auth, RBAC, idempotency, audit, or repository rollback is needed.
- For the future code batch: the batch must name its rollback before code starts. The expected reversible shape is to remove the provider-backed PATCH route wiring, service, repositories, and idempotency/audit/rate-limit activation, plus any minimal in-scope migration added for that slice, while preserving `api/openapi.yaml` as the source of truth and preserving existing MockRecall fixture behavior.

Source of record: Batch 45 (Rollback Expectation For Later Code), and the established `ops/deltas/` rollback convention.

## Decision Readiness Checklist

| # | Decision | Minimum settled position | Source of record |
|---|----------|--------------------------|------------------|
| 1 | Auth source | Auth.js database-backed sessions; server-verified before persistence; fixture tokens test-only and production-fenced; `401` on missing/invalid auth | Batch 41, Batch 35 |
| 2 | Server-derived tenant identity | Tenant from server-side auth/session + PostgreSQL `tenant_memberships` only; client values never authoritative; leak-safe `404` | Batch 41, Batch 35, Batch 40 |
| 3 | RBAC decision point | Deny-by-default action RBAC before persistence; `tenant_admin`/`quality_reviewer` may update, `read_only` may not | Batch 41, Batch 45, Batch 35 |
| 4 | Postgres persistence boundary | PostgreSQL + Drizzle; route → service → repository; tenant-scoped; forward-only migrations in the code batch; lazy client seam exists, not route-wired | Batch 41, Batch 35, Batch 43/46 |
| 5 | Idempotency storage | PostgreSQL idempotency table; required key; uniqueness on tenant+operation+key; reserve → replay snapshot → `409` on hash mismatch | Batch 41, Batch 35 |
| 6 | Append-only audit evidence | Append-only `audit_events`, one event per accepted transition, no update/delete, no retention/compliance claim | Batch 41, Batch 35 |
| 7 | Problem Details behavior | RFC 9457 for `401`/`403`/leak-safe `404`/`409`/`422`/`429`; preserve declared taxonomy; `422` for invalid input | route-boundary.ts, problem.ts, Batch 45, OpenAPI |
| 8 | 429 Retry-After behavior | PostgreSQL fixed-window limiter before transition; `429` Problem Details + `Retry-After`; smallest approved migration if schema missing | Batch 41, Batch 45, OpenAPI |
| 9 | Rollback path | Docs rollback = delete packet + delta, remove additive pointers; code rollback named before code (unwire route/service/repos/idempotency/audit/rate-limit + any in-scope migration) | Batch 45, ops/deltas convention |

Pre-code gate: all nine decisions are settled at the minimum level above, and the future implementation may proceed only after Matt approves a concrete code-bearing micro-batch (exact allowed files, dependency changes, migration scope, validation commands, rollout path, and rollback path) and provider-backed service/repository tests pass before route success activation.

## Pre-Code Tightenings (Review Reconciliation, Batch 49)

These tightenings refine the nine decisions above with the minimum constraints the future code batch must honor. They are planning text only and change no runtime, contract, dependency, package, or CI artifact. Each must be satisfied before the corresponding code-bearing batch activates the route.

### T1. Atomic transaction contract (refines Decisions 4, 5, 6)

Required: no accepted exception-review state transition may commit unless the tenant-scoped exception update, the `audit_events` insert, and the `idempotency_records` completion/replay snapshot commit in the same PostgreSQL transaction. On rollback, none of those three effects may persist.

This promotes the previously "consistent enough" / "preferably in the same transaction" direction to an explicit requirement. Only the concrete lock strategy and failure-release timing remain gated (see T2).

### T2. Idempotency concurrency protocol (refines Decision 5)

The future implementation must use this protocol:

1. Compute a canonical request hash from the normalized request body and operation context.
2. Reserve with `INSERT ... ON CONFLICT DO NOTHING` so concurrent identical requests cannot both reserve.
3. On conflict, `SELECT ... FOR UPDATE` the existing idempotency row and branch on state plus hash:
   - completed and matching hash: replay the stored response snapshot;
   - reserved (in-flight) and matching hash: return a declared Problem Details response, default `409` unless the OpenAPI contract is first changed to add a wait or `425` semantic;
   - any state with mismatched hash: `409 Conflict` Problem Details.
4. Expired `reserved` rows are reclaimable: a single transaction may reclaim and re-reserve an expired row. Cleanup must never delete `completed` idempotency replay snapshots or any `audit_events` evidence before a defined retention window.

Advisory locks are not the default; row reservation plus row locks are.

### T3. Idempotency resource scope - seam versus table mismatch (refines Decision 5; gated schema decision)

Current state: the runtime seam `lib/security/idempotency-audit.ts` carries a resource-scoped `IdempotencyScope` / `scopeKey` (it includes `resourceRef`), but the persisted `idempotency_records` table scopes uniqueness only by `tenant_id + operation + idempotency_key` and has no `resource_type` / `resource_id` column. If `operation` is a bare action name, the same `Idempotency-Key` reused across two exception IDs collides at the persistence layer.

Required before route wiring: the code batch must close this drift by either (a) encoding concrete resource identity into `operation`, or (b) adding explicit `resource_type` / `resource_id` columns to `idempotency_records` and including them in the uniqueness rule. Aligning the table to the already-resource-scoped seam (option b) is preferred. The DDL itself is a gated schema/migration change.

### T4. Redaction and data minimization (refines Decisions 5, 6)

When the code batch populates the free `jsonb` columns it must apply an allowlist:

- `idempotency_records.replay_headers`: allowlisted headers only; strip `Authorization`, `Cookie`, `Set-Cookie`, and any secret-bearing header.
- `idempotency_records.replay_body`: only the idempotent API response needed for replay.
- `audit_events.metadata`: only the enumerated structured fields (identifiers, state-transition fields, sanitized reason codes, `source_document_ref`-style references).
- Never store raw uploaded documents, raw request bodies, `DATABASE_URL`, other secrets, or unnecessary personal data in any column or log.

This makes explicit the allowlist already implied by the enumerated audit and replay field lists in Decisions 5 and 6, and preserves the invariant that free-form notes must not become the only evidence trail.

### T5. Auth mechanism and CSRF (refines Decision 1; gated contract decision)

The contract currently declares a bearer placeholder scheme only (`api/openapi.yaml`), while Decision 1 selects Auth.js database-backed sessions. This mechanism choice must be resolved in an OpenAPI-first contract batch before implementation: either keep the API bearer-based with Auth.js mediating to a server-side bearer/JWT, or document a cookie scheme (`apiKey` in cookie).

If cookie-backed sessions are chosen, the future batch must name CSRF controls before code: `SameSite` plus `Secure` plus `HttpOnly` session cookies, same-origin `Origin` / `Host` validation, a custom CSRF header or double-submit token on unsafe methods (PATCH), rejection of CSRF-simple content types for JSON, and CORS credentials disabled unless explicitly allowlisted.

### T6. DB connection and defense-in-depth hardening (refines Decision 4)

The future code batch that first instantiates `lib/db/client.ts` against a live `DATABASE_URL` must decide and set:

- a TLS policy for production connections (never a blanket `rejectUnauthorized: false`);
- a bounded pool `max`, a nonzero `connectionTimeoutMillis`, an explicit `idleTimeoutMillis`, and an optional max lifetime;
- session timeouts (`statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`) appropriate to `SELECT ... FOR UPDATE` idempotency work;
- a pool-level error handler (`pool.on("error", ...)`) that logs a sanitized, credential-free event;
- the serverless / Fluid Compute connection posture (pooled connections, a provider pooler in front where applicable);
- a least-privilege runtime DB role distinct from the migration owner;
- DB-level append-only enforcement for `audit_events` (an UPDATE/DELETE-rejecting trigger or an INSERT/SELECT-only app role) rather than app-layer convention alone;
- optional Row-Level Security as defense-in-depth, never the sole tenant boundary; tenant-scoped repository methods remain the primary invariant.

### T7. Rate limiting, input limits, migration policy, observability (refines Decisions 7, 8)

- Rate limiting: the fixed-window limiter (already scoped by tenant, actor, operation, and window, already returning `429` with `Retry-After`) carries a boundary-burst weakness (up to roughly twice the nominal rate across a window edge); document this and note that an edge or gateway limiter may supplement it later. Expired-window cleanup rides with the gated tuning and retention decision.
- Input limits: define a JSON body-size cap, a `review_notes` maximum length, and unknown-field / `additionalProperties` rejection behavior, all surfaced as `422`. The corresponding `api/openapi.yaml` changes are a gated contract-batch edit, not part of this docs batch.
- Migration policy: migrations are forward-only with a forward-repair narrative; destructive rollback is not the model.
- Observability: structured logs must carry `requestId` and tenant/resource identifiers, map DB errors to RFC 9457 Problem Details, and never log secrets, `DATABASE_URL`, or personal data.

### T8. First-slice persistence reconciliation (refines Decision 4 and the checklist)

Decision 4 and the Decision Readiness Checklist list "rate-limit state" as part of the first persistence slice, and Decision 6 lists "prior state" and "next state" on each audit event, but the committed scaffold has no `rate_limit` table and `audit_events` carries prior and next state only inside the `metadata` `jsonb` column. Treat both as gated: any `rate_limit` table and any dedicated prior/next-state columns are schema/migration work for the future code batch, not existing first-slice persistence.

### T9. Verification scope and scaffold non-enforcement (refines Decision 4)

`npm run db:check` verifies only Drizzle migration journal/snapshot consistency (`drizzle-kit check`) plus `lib/db/client.ts` import safety. It does not prove live database connectivity, `lib/db/schema.ts`-versus-migration drift, DB-level tenant isolation, or DB-level append-only enforcement. Schema-drift detection (for example a `drizzle-kit generate --check` step) is a gated CI/code-batch addition.

The current schema/migration foundation does not by itself enforce append-only `audit_events` or tenant isolation at the database level; those remain repository/app-layer promises until a later DB-enforcement batch lands triggers, roles, or RLS.

## What This Packet Does NOT Do

- No runtime route implementation or activation; the exception-review PATCH stays fixture-only.
- No edit to `app/api`, `api/openapi.yaml`, or `lib/api/generated/openapi-types.ts`.
- No `lib/db/schema.ts` change, no migration, and no Postgres wiring into runtime routes.
- No dependency, package, lockfile, CI, or `tsconfig.json` change.
- No auth, RBAC, idempotency storage, audit storage, repository logic, or tenant persistence implementation.
- No imports, exports, or production CSV generation.
- No supplier KDE workflow, lot/event workflow, mock recall computation, dashboards, supplier portal, UI expansion, file upload, source-document storage, ERP integration, OCR, or mobile scanning.
- No compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption/regulatory determination; this product provides readiness support only.

## Verification Gate For This Packet

The docs-only baseline gate must continue to pass unchanged:

`npm ci`, `npm run api:check`, `npm run db:check`, `npm run typecheck`, `npm run build`, `npm run test:mock-recall:contract`, `npm run test:exception-review:patch`, `git diff --check`, and `git diff --cached --check`.

`npm run db:check` in this gate verifies only Drizzle migration journal/snapshot consistency plus `lib/db/client.ts` import safety; it does not prove live database connectivity, schema-versus-migration drift, DB-level tenant isolation, or DB-level append-only enforcement (see T9). The docs-only tightenings in this batch add no runtime, contract, dependency, package, or CI artifact, so the gate result is unchanged by them.

## Next Step

The next smallest useful step remains provider-backed repository/service tests (tenant membership lookup, tenant-scoped exception update, idempotency replay/conflict, append-only audit append, and rate limiting) before any production-like route success activation, and only after Matt approves the exact code scope.
