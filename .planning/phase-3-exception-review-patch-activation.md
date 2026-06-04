# Phase 3 Exception-Review PATCH Activation Approval

**Date:** 2026-06-02
**Batch:** 45
**Scope:** Docs/planning only. This approval packet authorizes the shape of a later code-bearing implementation batch for `PATCH /api/traceability/exceptions/{exceptionId}`. It does not implement runtime behavior, edit OpenAPI, edit generated types, change database schema or migrations, add dependencies, add a PostgreSQL runtime driver, or activate production-like route success.

## Decision Summary

The first mutating-write activation slice is approved for future implementation only as:

- one write: `PATCH /api/traceability/exceptions/{exceptionId}`;
- one action: `exception.review.update`;
- one bounded route -> service -> repository implementation slice;
- Drizzle-backed PostgreSQL persistence behind deliberately narrow repositories;
- server-verified auth/session and server-derived tenant membership before any write;
- durable idempotency, append-only audit evidence, RFC 9457 Problem Details, and 429 `Retry-After` behavior.

The existing runtime remains fixture-only until Matt approves a later code batch with exact file scope, dependency changes, migration changes if any, validation commands, rollout path, and rollback path.

This packet supersedes the older Batch 33 approval packet for implementation guidance because Batches 41, 42, 43, and 44 have since made provider, activation-scope, schema/migration, and CI-guardrail decisions more concrete.

## Explicit Phase 4-8 Non-Goal Lift

The Phase 4-8 non-goal is lifted only for the future implementation of:

`PATCH /api/traceability/exceptions/{exceptionId}`

The lift is limited to updating the review state of one existing tenant-scoped exception record according to the current OpenAPI `ExceptionPatch` contract fields:

- `status`
- `review_reason`
- `review_notes`
- `human_review_required`

No other Phase 4-8 workflow is authorized by this packet.

## Still Out Of Scope

The future implementation batch must not include:

- traceability lot workflow;
- traceability event workflow;
- supplier KDE workflow;
- supplier portal;
- exception listing or exception creation workflow beyond the one PATCH path;
- mock recall readiness computation or dynamic aggregation;
- import workflow;
- production export or production CSV generation;
- dashboard or UI expansion;
- file upload or source-document storage;
- tenant administration workflow beyond reading active memberships for authorization;
- ERP integration, OCR, mobile scanning, or broader operations workflow;
- compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination.

## Source Of Truth

- `api/openapi.yaml` remains the API source of truth.
- `lib/api/generated/openapi-types.ts` remains generated from OpenAPI and must not be hand-edited.
- The implementation must conform to the existing `PATCH /api/traceability/exceptions/{exceptionId}` operation, `Idempotency-Key` parameter, `ExceptionPatch` request shape, `ExceptionRecord` response shape, and declared `401`, `403`, `404`, `409`, `422`, and `429` responses.
- Any contract mismatch discovered during implementation must stop the code batch or be handled in a separately approved contract-first batch.

## Implementation Mode Decision

The later code batch must use a deliberately narrow repository seam backed by PostgreSQL plus Drizzle.

Approved shape:

- Route layer: parse route params and request body, resolve server-verified auth/session, resolve server-derived tenant membership, authorize `exception.review.update`, validate `Idempotency-Key`, map failures to Problem Details, and call the service.
- Service layer: coordinate rate-limit check, idempotency reservation/replay/conflict, tenant-scoped exception update, audit append, replay snapshot creation, and response assembly.
- Repository layer: use Drizzle-backed PostgreSQL methods for tenant membership lookup, tenant-scoped exception update, idempotency records, audit events, and rate-limit state when the rate-limit storage exists.

Not approved as the future production-like activation:

- fixture-backed success behavior;
- client-trusted tenant identity;
- direct route-to-database writes without a service boundary;
- a broad product data model or workflow implementation;
- route activation before provider-backed service/repository tests pass.

Existing fixture behavior may remain available for local fixture tests, but it cannot be the activated production-like success path.

## Required Guardrails

### Auth And Session

- Use server-verified auth/session before route success.
- Do not reuse fixture bearer tokens as production credentials.
- Missing or invalid auth returns `401` Problem Details.
- Production runtime must not enable local/test fixture auth.

### Tenant Isolation

- Resolve tenant identity only from trusted server-side membership state.
- Never accept tenant identity from request body, query string, route parameter, arbitrary header, or client metadata.
- Require an active membership before authorization succeeds.
- Missing or cross-tenant exception records return leak-safe `404` Problem Details.

### RBAC

- Enforce deny-by-default authorization before persistence writes.
- Minimum initial role mapping:
  - `tenant_admin`: may perform `exception.review.update`;
  - `quality_reviewer`: may perform `exception.review.update`;
  - `read_only`: may not perform `exception.review.update`.
- Unknown roles and unknown actions deny by default.

### Idempotency

- Require `Idempotency-Key` on every request and preserve the OpenAPI length constraints.
- Scope idempotency by tenant, operation, and key.
- Compute a stable request hash from the normalized request body and operation context.
- Reserve a fresh key before applying the transition.
- Replay a completed same-hash request from the stored response snapshot.
- Return `409` Problem Details for a hash mismatch.
- Prevent duplicate in-flight application.
- Store completed replay data: status, content type, response body, relevant headers, audit event reference, request hash, created timestamp, and completed timestamp.

### Audit

- Append audit evidence only after an accepted transition.
- Include tenant id, actor id, action, resource reference, server timestamp, source, reason or reviewer note, idempotency key, prior state, and next state.
- Provide no update or delete repository path for `audit_events` in the initial implementation slice.
- Do not claim regulatory retention sufficiency, compliance certification, legal advice, FDA approval, or FDA endorsement.

### Problem Details

- Use RFC 9457 Problem Details for `401`, `403`, leak-safe `404`, `409`, `422`, and applicable `429`.
- Preserve the declared OpenAPI response taxonomy.
- Reject unsupported client tenant fields and invalid enum values with `422` where applicable.

### Rate Limiting

- Enforce a fixed-window rate limiter before applying the transition.
- Scope rate limiting by tenant, actor, operation, and window.
- Return `429` Problem Details with `Retry-After` when the limit is exceeded.
- If rate-limit persistence requires schema not already present, the later code batch must include the smallest explicitly approved Drizzle migration for that limiter before route success activation.

## Acceptance Criteria For The Later Implementation Batch

The future code-bearing activation batch is accepted only when all of the following are true:

1. The implementation uses route -> service -> repository boundaries.
2. The route success path uses server-verified auth/session and server-derived tenant membership.
3. `tenant_admin` and `quality_reviewer` can perform `exception.review.update`; `read_only`, missing roles, and unknown roles cannot.
4. The route rejects client-supplied tenant authority and preserves leak-safe cross-tenant `404` behavior.
5. The PATCH body accepts only the current OpenAPI `ExceptionPatch` fields and enum values.
6. `Idempotency-Key` is required; fresh requests reserve before transition; same-hash completed requests replay; different-hash reuse returns `409`.
7. A completed replay snapshot includes status, content type, response body, relevant headers, audit event reference, request hash, created timestamp, and completed timestamp.
8. Accepted transitions append exactly one audit event and expose no update/delete audit repository path.
9. Rate-limited requests return `429` Problem Details with `Retry-After`.
10. Provider-backed service/repository tests cover tenant membership lookup, RBAC, tenant-scoped exception update, idempotency replay/conflict, audit append, and rate limiting before route success activation.
11. Existing MockRecall fixture behavior and existing fixture-focused exception-review tests remain unchanged unless Matt approves a separate fixture migration.
12. `api/openapi.yaml` remains source of truth and generated OpenAPI types are regenerated only through the approved tooling if a separately approved contract change is required.
13. The local and CI gate pass: `npm ci`, `npm run api:check`, `npm run db:check`, `npm run typecheck`, `npm run build`, `npm run test:mock-recall:contract`, and `npm run test:exception-review:patch`.

## Rollback Expectation For Later Code

The later implementation batch must name its rollback path before code starts. The expected reversible shape is to remove the provider-backed PATCH route wiring, service, repositories, idempotency/audit/rate-limit activation, and any minimal in-scope migration added for that slice, while preserving OpenAPI as source of truth and preserving MockRecall fixture behavior.

## Non-Activation Statement

Batch 45 is an approval packet only. The current `PATCH /api/traceability/exceptions/{exceptionId}` remains fixture-only, with local/test fixture auth, server-derived fixture tenant identity, reviewer RBAC, in-memory fixture state, in-memory idempotency replay/conflict handling, and in-memory audit evidence.
