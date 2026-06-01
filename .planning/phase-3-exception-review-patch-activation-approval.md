# Phase 3 Exception-Review PATCH Activation Approval Packet

**Date:** 2026-06-01
**Scope:** Docs/planning only. This is an approval packet for a later code-bearing slice; it does not approve or implement runtime activation.

## Approval Request

This packet prepares the decision Matt would need to approve before the first mutating-write activation slice starts: implement the existing `PATCH /api/traceability/exceptions/{exceptionId}` contract only.

The approval, if granted later, should name the exact code-bearing batch, allowed files, provider choices, verification commands, and rollback path. Until that explicit approval exists, the exception-review PATCH remains design-only and gated.

## Slice Scope

In scope for the later approved activation slice:

- One write only: `PATCH /api/traceability/exceptions/{exceptionId}`.
- One tenant-scoped exception record, referenced by `exceptionId`.
- Existing OpenAPI `ExceptionPatch` fields only: `status`, `review_reason`, `review_notes`, and `human_review_required`.
- Server-derived tenant identity, RBAC, idempotency, tenant-scoped persistence, and append-only audit only as needed to make that one write safe and contract-conformant.

Out of scope:

- Traceability lot/event runtime.
- Supplier portal or supplier KDE workflow implementation.
- Production export or production CSV generation.
- Database buildout beyond the smallest tenant-scoped repository/store/sink needed for this write.
- Broad workflow implementation, aggregation, imports, dashboards, ERP integration, OCR, mobile scanning, or automated exemption determination.

## Why This Is The Smallest Useful First Write

- The endpoint already exists in `api/openapi.yaml`; the later slice would conform to the current contract rather than inventing a new API surface.
- It mutates one owned review record by id, with no new aggregate creation, no production CSV workflow, and no downstream recomputation.
- It proves the Phase 3 foundation on a real but narrow action: authenticated actor, server-derived tenant, RBAC decision, idempotency key, accepted state transition, and audit evidence.
- It fits the product boundary: human-review readiness support, not compliance certification, legal advice, FDA endorsement, or automated exemption determination.
- It is reversible: unwire the PATCH route/repository/idempotency/audit activation and return to the current read-only MockRecall runtime posture.

## Phase 4-8 Non-Goal Lift

`KICKOFF.md` fences exceptions into Phase 4-8. Approving the activation slice requires an explicit Phase 4-8 Non-Goal lift for this one write only:

- Lifted only for: updating the review state of a single existing exception through `PATCH /api/traceability/exceptions/{exceptionId}`.
- Not lifted for: exception listing workflow, exception creation, lot/event CRUD, supplier request lifecycle, dynamic mock recall aggregation, production export, production CSV generation, or any broad Phase 4-8 workflow.

This packet itself does not grant the lift. It documents the exact lift Matt would need to approve before code starts.

## Required Provider Decisions Before Code

- **Auth provider / fixture-auth posture:** select the auth/session approach and decide whether existing public MockRecall fixture routes remain public smoke fixtures or become authenticated when production auth lands.
- **Server-derived tenant identity:** define the trusted tenant/membership source and the resolver behavior for missing or invalid auth; client body, query, route, and arbitrary header values must never be tenant authority.
- **RBAC policy:** confirm role names and action mapping for the first protected action, proposed as `exception.review.update`, with deny-by-default behavior.
- **Tenant-scoped persistence/repository:** choose the persistence provider, migration approach, repository boundary, and tenant-scoped lookup/write semantics for the exception record.
- **Idempotency store semantics:** define scope, request fingerprinting, replay behavior, conflict behavior, in-flight handling, and retention.
- **Append-only audit sink semantics:** define storage, retention, append-only guarantees, and the evidence payload for accepted transitions.

## Required API Behavior

- `Idempotency-Key` is required for every PATCH request; a missing or invalid key returns RFC 9457 Problem Details.
- Tenant identity is derived only by the server and is never accepted from the client as authority.
- Responses for `401`, `403`, `404`, `409`, `422`, and `429` use `application/problem+json` RFC 9457 Problem Details.
- `401` responses should align with the declared bearer auth scheme when auth activates.
- Cross-tenant misses return `404`, never a resource-existence-leaking `403`.
- Key reuse with a different request fingerprint returns `409 Conflict`; replay of the same key returns the stored prior result instead of applying twice.
- Validation failures for the PATCH body return `422`.
- Rate-limited responses return `429` with `Retry-After`.
- Accepted transitions append audit attribution including actor, tenant, time, source, reason, prior state, next state, and idempotency key.

## Required Tests For The Later Implementation Batch

- Auth missing/invalid path returns `401` Problem Details without runtime leakage.
- Authenticated actor without `exception.review.update` receives `403` Problem Details before persistence work.
- Authorized actor can update only the tenant-scoped exception record.
- Cross-tenant or missing exception returns `404` Problem Details without exposing whether another tenant owns the resource.
- Missing `Idempotency-Key` returns `422`; duplicate key with same request replays the prior result; duplicate key with a different fingerprint returns `409`.
- Accepted transition appends exactly one audit event with actor, tenant, action, resource, time, source, reason, prior state, next state, and idempotency key.
- Validation rejects out-of-contract fields or invalid enum values with `422`.
- `429` includes `Retry-After` if rate limiting is enabled in the slice.
- Existing MockRecall fixture detail and packet behavior remain unchanged.
- Baseline gate passes: `npm ci`, `npm run api:check`, `npm run typecheck`, `npm run build`, and `npm run test:mock-recall:contract`.

## Rollback Path

For this docs-only packet, rollback is to delete this file and the Batch 33 delta, then remove any additive pointers from `.planning/HANDOFF.json` and `ops/memory/product.md`.

For the later implementation slice, rollback must be named before code starts. The expected reversible shape is to remove the PATCH route activation, the exception repository/store/sink wiring, and the action-policy/idempotency/audit activation for `exception.review.update`, while preserving the current MockRecall read routes and OpenAPI source of truth unless Matt separately approves contract changes.

## Explicit Non-Activation Statement

Batch 33 does not approve or implement runtime activation. It changes no runtime behavior, no OpenAPI contract, no generated types, no package or CI configuration, no auth provider, no persistence provider, no RBAC enforcement, no idempotency store, and no audit sink.
