# Phase 3 Provider Activation Decisions

**Date:** 2026-06-02
**Batch:** 41
**Scope:** Docs/planning only. This converts the Batch 40 provider gap audit into default provider choices for a future exception-review PATCH implementation batch. It does not implement runtime behavior, add dependencies, create schema, edit OpenAPI, or activate production providers.
**Applies to:** Future production-like activation of `PATCH /api/traceability/exceptions/{exceptionId}` only.

## Non-Activation Statement

The current exception-review PATCH remains fixture-only. It still uses local/test fixture auth, server-derived fixture tenant identity, same-tenant reviewer RBAC, in-memory fixture state, in-memory idempotency replay/conflict handling, and in-memory audit evidence.

This decision record selects implementation-ready defaults for a later approved code batch. Mutating endpoint activation remains blocked until Matt explicitly approves that code batch, including allowed files, dependency changes, validation commands, rollout path, and rollback path.

## Source Of Truth

- OpenAPI remains the API source of truth at `api/openapi.yaml`.
- Generated OpenAPI types remain generated from the contract and must not be hand-edited.
- Tenant identity must be derived from trusted server-side auth/session and membership state, never from request bodies, query strings, route parameters, arbitrary headers, or client metadata.
- API errors for the production-like write must use RFC 9457 Problem Details and preserve the declared `401`, `403`, `404`, `409`, `422`, and applicable `429` response taxonomy.

## Approved Default Decisions

### Auth And Session Provider

Default decision: use Auth.js with database-backed sessions for production request authentication.

Implementation expectations for the later code batch:

- Verify the session server-side before route logic reaches persistence.
- Resolve a stable actor id and authenticated state from the database-backed session.
- Do not reuse local/test fixture bearer tokens as production credentials.
- Keep missing or invalid auth on the `401` Problem Details path with `WWW-Authenticate: Bearer` where the bearer contract remains active.
- Add Auth.js and any adapter/dependency changes only in the approved implementation batch.

### Tenant Membership Source

Default decision: use an application-owned PostgreSQL `tenant_memberships` source as the authoritative membership and role mapping for traceability writes.

Implementation expectations:

- Resolve `tenantId` from server-side membership state after authentication.
- Treat client-supplied tenant-looking values as non-authoritative and reject unsupported payload fields where the contract permits no such field.
- Require an active membership before authorization succeeds.
- Keep cross-tenant or missing exception records on a leak-safe `404` Problem Details path.

### Initial Role Mapping

Default decision: use these minimum initial tenant roles:

- `tenant_admin`
- `quality_reviewer`
- `read_only`

Initial action mapping for the first production-like write:

- `tenant_admin`: may perform `exception.review.update`.
- `quality_reviewer`: may perform `exception.review.update`.
- `read_only`: may not perform `exception.review.update`.

The route should authorize the action before persistence work. Complete tenant administration and full role-management workflows remain out of scope for the first implementation slice.

### Persistence, Access Layer, And Migrations

Default decision: use PostgreSQL plus Drizzle for the future provider-backed persistence slice.

Implementation expectations:

- Keep route -> service -> repository boundaries.
- Route layer parses the request, resolves context, authorizes action, and maps errors to Problem Details.
- Service layer owns the exception-review transition, idempotency lifecycle, audit append, and rate-limit coordination.
- Repository layer owns PostgreSQL/Drizzle reads and writes behind tenant-scoped methods.
- Drizzle migrations are forward-only and checked in during the approved implementation batch.
- The first implementation slice must stay limited to the exception-review PATCH resource, tenant memberships needed for authorization, idempotency entries, audit events, and rate-limit state.

### Idempotency Lifecycle

Default decision: use a PostgreSQL-backed idempotency table for the first production-like mutating endpoint.

Required lifecycle:

- Require `Idempotency-Key` for the PATCH, preserving the contract's length constraints.
- Compute a stable request hash from the normalized request body and operation context.
- Enforce uniqueness on `tenant_id + operation + idempotency_key`.
- Store actor id, resource reference, operation, request hash, lifecycle state, created timestamp, and completed timestamp.
- A fresh key reserves the operation before the state transition is applied.
- A completed key with the same request hash replays the stored completed response snapshot.
- A key with a different request hash returns `409 Conflict` Problem Details.
- In-flight duplicate handling must prevent double application.
- Failure release or retry semantics must be explicit in the implementation batch.

### Replay Snapshot Shape

Default decision: completed idempotency entries store a replay snapshot, not only the domain record.

Minimum replay snapshot fields:

- HTTP status;
- response `Content-Type`;
- response body;
- relevant replayable headers;
- audit event reference;
- request hash;
- created timestamp;
- completed timestamp.

The snapshot must be sufficient to replay the prior completed response without applying the transition again.

### Audit Storage And Retention Posture

Default decision: use append-only PostgreSQL `audit_events` for accepted exception-review transitions.

Implementation expectations:

- Append one audit event only after an accepted state transition.
- Include tenant id, actor id, action, resource reference, server timestamp, source, reason or reviewer note, idempotency key, prior state, and next state.
- Store a reference from the completed idempotency snapshot to the audit event.
- Provide no update or delete path for `audit_events` in the initial implementation slice.
- Treat long-term retention, archive, WORM storage, and audit export as separate future decisions; do not claim regulatory retention sufficiency in this slice.

### Rate-Limit Posture

Default decision: use a PostgreSQL-backed fixed-window limiter for the first production-like mutating endpoint.

Implementation expectations:

- Scope the limiter by tenant, actor, operation, and window.
- Enforce the limiter before applying the state transition.
- Return `429` RFC 9457 Problem Details with `Retry-After` when the limit is exceeded.
- Keep exact thresholds and operational tuning in the approved implementation batch.

### Provider-Backed Test Expectations

Default decision: provider-backed service and repository tests are required before route success activation.

Minimum test coverage before production-like route success activation:

- Auth.js session resolution produces authenticated actor context.
- `tenant_memberships` resolves the authoritative tenant and role set.
- `tenant_admin` and `quality_reviewer` can perform `exception.review.update`; `read_only` cannot.
- Cross-tenant or missing exceptions return leak-safe `404` behavior.
- PostgreSQL/Drizzle exception repository applies only tenant-scoped updates.
- Idempotency reserves fresh requests, replays completed same-hash requests, and returns `409` for hash mismatch.
- Replay snapshots include status, content type, body, relevant headers, audit event reference, request hash, and timestamps.
- Accepted transitions append exactly one audit event.
- Fixed-window rate limiting returns `429` with `Retry-After`.
- Existing MockRecall fixture behavior remains unchanged.

## Remaining Non-Goals

- No production provider implementation in this batch.
- No dependency install or package change in this batch.
- No database schema, migration, seed, or connection configuration in this batch.
- No route activation or runtime behavior change in this batch.
- No OpenAPI, generated type, package, test, or CI change in this batch.
- No supplier KDE workflow, lot/event workflow, exception listing or creation workflow, dynamic mock recall aggregation, imports, production exports, production CSV generation, UI expansion, file upload, source-document storage, tenant administration workflow, ERP integration, OCR, mobile scanning, or dashboards.
- No compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination.

## Next Smallest Useful Micro-Batch

The next smallest useful micro-batch is a code-bearing provider scaffold only after Matt approves it. It should add the approved Auth.js, Drizzle, and PostgreSQL dependencies/configuration, define the minimal Drizzle schema and migrations for sessions, tenant memberships, exception-review records, idempotency entries, audit events, and fixed-window rate limits, and add provider-backed service/repository tests.

That scaffold should still avoid route success activation until the provider-backed tests pass and Matt approves wiring the production-like PATCH route.
