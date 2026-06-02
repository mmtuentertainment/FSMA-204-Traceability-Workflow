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

## Next Step

The next smallest useful step remains provider-backed repository/service tests (tenant membership lookup, tenant-scoped exception update, idempotency replay/conflict, append-only audit append, and rate limiting) before any production-like route success activation, and only after Matt approves the exact code scope.
