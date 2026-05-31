# 03-01A Boundary Decision - Security And Persistence Foundation

**Date:** 2026-05-30
**Branch/HEAD at authoring:** `main` / `30e03014e664ae4307dd661430cd3af287be8a2e`
**Scope:** Design only. No auth, RBAC, tenanting, audit, database, schema, repository, route-handler, package, generated-type, or OpenAPI implementation is started here.

## Decision Summary

Phase 3 will use a provider-neutral security and persistence boundary before any production data workflow is implemented:

1. The server derives tenant identity from trusted authentication/session state.
2. Authentication establishes a request principal before any production traceability action.
3. RBAC authorizes explicit action classes before service or persistence work.
4. Persistence accepts only server-built tenant context and never trusts client-supplied tenant IDs.
5. Mutating writes pair idempotency enforcement with append-only audit evidence.

This note decides the boundary model. It does not select a provider, create schema, add middleware, change route behavior, or implement storage.

## Server-Derived Tenant Identity

Tenant identity is a server-owned request property. Future implementation must resolve it from trusted authentication/session state and membership data, not from request bodies, query strings, route parameters, or arbitrary headers.

Client-supplied tenant-like values may be accepted only as filters or resource references after the server has already resolved the authoritative tenant. Resource lookups must be scoped by the server-derived tenant before returning data or errors, and cross-tenant misses should not leak whether another tenant's resource exists.

Minimum future context shape, conceptually:

- actor identity: authenticated user or service actor
- tenant identity: server-derived organization/account boundary
- membership/role claims: trusted server-side authorization input
- request metadata: request ID, timestamp, source, and route/action

## Auth Boundary

Authentication belongs at the request boundary for future production traceability actions. A route or handler should not perform business or persistence work until it has an authenticated principal or has returned an RFC 9457 Problem Details auth error.

The current MockRecall fixture behavior remains a contract/runtime smoke fixture. This design note does not change that behavior. Future batches must explicitly decide whether and how fixture routes are protected when production auth is introduced.

## RBAC Boundary

RBAC is deny-by-default and action-oriented. Future implementation should authorize at least these action classes before production data access:

- read traceability readiness data
- create or update traceability records
- review exceptions and human-review status
- manage supplier KDE request status
- start or inspect mock recall readiness runs
- request or download readiness export artifacts
- administer tenant membership or policy

RBAC policy should be centralized enough that route handlers cannot drift into one-off authorization checks. Role names and provider-specific claim mapping remain implementation decisions for a later approved batch, but every future read/write/review/export path must have an explicit authorization decision before persistence access.

## Persistence Boundary

Persistence is tenant-scoped and service-owned. Future route handlers should call a request/service boundary with a server-built security context; they should not directly construct database queries or pass client-supplied tenant IDs into storage as authority.

Future persistence work should keep these boundaries:

- route/request layer: parse input, establish principal, build server-derived tenant context, return Problem Details on boundary failures
- authorization layer: evaluate RBAC for the requested action
- service layer: apply workflow rules and conservative readiness language
- persistence layer: read/write only through tenant-scoped operations and server-owned audit/idempotency context

No schema, migrations, repositories, database client, or persistence adapter is created in this design batch.

## Audit And Idempotency Boundary

Mutating writes must enforce idempotency before durable state changes and must append audit evidence for accepted state transitions.

The future idempotency boundary should be scoped by tenant, actor, route/action, and `Idempotency-Key`, with conflict behavior expressed through Problem Details. The future audit boundary should append actor, tenant, action, resource reference, timestamp, source, reason/context, and idempotency reference where applicable.

Audit evidence is not a substitute for source-document references. Free-form notes may support review, but they must not become the only evidence trail.

## Explicitly Out Of Scope For 03-01A

- OpenAPI edits.
- Generated type edits.
- Dependency or package changes.
- Auth provider selection or implementation.
- Middleware implementation.
- RBAC policy code or role schema.
- Tenant model implementation.
- Database schema, migrations, repositories, adapters, or seed data.
- Audit log implementation.
- Idempotency store implementation.
- Runtime route behavior changes.
- Traceability lot/event workflow implementation.
- Supplier KDE request implementation.
- Dynamic MockRecall success behavior.
- Production CSV generation or export workflow.
- Any claim of compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination.

## Next Smallest Implementation Candidate

Only after Matt approves a code-bearing batch, the smallest implementation candidate should be a boundary skeleton that proves request context, authorization policy shape, idempotency/audit interfaces, and persistence ownership without wiring routes to production storage.

That candidate must still name its exact allowed files, decide whether package/schema files are in scope, and preserve fixture-only MockRecall runtime behavior unless Matt explicitly approves otherwise.
