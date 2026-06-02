# Phase 3 Production Provider Selection Decision

**Date:** 2026-06-01
**Scope:** Docs/planning only. This records the production-path provider direction after the accepted fixture-only exception-review PATCH activation. It does not implement production auth, database persistence, production RBAC, idempotency storage, or audit storage.

## Decision Summary

The fixture-only `PATCH /api/traceability/exceptions/{exceptionId}` activation remains the only runtime write. For the production path, use a standards-based bearer-auth adapter plus a durable relational persistence boundary for tenant-scoped traceability records, idempotency entries, and append-only audit evidence.

No named vendor or package is selected in this record. A later implementation batch must choose the concrete provider and integration details before code starts.

## Auth Provider Direction

Decision: production auth will use a server-verified bearer token/session provider that can prove actor identity, roles, and tenant membership before route logic reaches persistence.

Requirements:

- Verify tokens or sessions server-side; do not trust client-side claims without server validation.
- Resolve an actor id, actor type, role set, and active tenant membership into `RequestContext`.
- Keep the existing local/test fixture bearer tokens as test fixtures only; they must not become production credentials.
- Keep MockRecall fixture read routes public only if explicitly retained as smoke fixtures; production traceability writes require authenticated context.
- Preserve `401` Problem Details for missing/invalid auth and `403` Problem Details for authenticated actors without the required action.

Placeholder: the concrete production provider remains unselected. The later provider-selection implementation batch may choose a managed auth service, an existing organization identity provider, or an internal token verifier, but it must satisfy the server-derived tenant and RBAC requirements below.

## Server-Derived Tenant Identity

Decision: tenant identity is derived only from trusted server-side auth/session and membership state.

Client input remains non-authoritative:

- Request body fields such as `tenant_id` or `tenantId` are not tenant authority.
- Query parameters, route parameters, arbitrary headers, and user-controlled metadata are not tenant authority.
- If a client supplies tenant-looking input in a write payload, the route should reject it as unsupported or ignore it only where the contract explicitly permits unrelated data.
- Cross-tenant or missing records return `404` Problem Details rather than leaking existence with `403`.

The production resolver should produce `RequestContext` with actor, tenant, route, request id, and auth state before authorization or persistence work begins.

## Persistence Direction

Decision: production persistence should use a durable relational store with explicit tenant-scoped repository boundaries. A Postgres-compatible relational store is the default direction unless Matt approves a different provider before implementation.

Initial production persistence should cover only the approved resource slice:

- tenant-scoped traceability exception records needed by `PATCH /api/traceability/exceptions/{exceptionId}`;
- tenant membership/role lookup data only as needed by auth/RBAC integration;
- durable idempotency entries;
- append-only audit evidence.

Persistence rules:

- All exception lookups and writes include `tenantId` in the repository boundary.
- Accepted updates should store prior and next review state in a way that supports audit attribution.
- Production implementation must not broaden into supplier workflow, lot/event workflow, dynamic mock recall aggregation, production exports, production CSV generation, or broad database buildout.
- Schema/migration details remain a later implementation decision.

## Idempotency Store Direction

Decision: production idempotency entries should be durable and scoped by tenant, actor, action, resource, and idempotency key.

Required semantics:

- Missing, too-short, too-long, or malformed `Idempotency-Key` returns `422` Problem Details.
- First use of a valid key with a request fingerprint is fresh and may apply the transition.
- Reuse of the same key with the same request fingerprint replays the stored prior successful response.
- Reuse of the same key with a different request fingerprint returns `409 Conflict`.
- In-flight duplicate handling must prevent double application; the concrete lock/transaction strategy is selected with the persistence implementation.
- Retention must be explicit before production launch; default retention is a product/security decision, not a route-level constant.

The current in-memory fixture idempotency store proves semantics only. It is not production storage.

## Audit Sink Direction

Decision: production audit evidence should be append-only, tenant-scoped, and written for accepted state transitions only.

Required attribution model:

- request id;
- tenant id;
- actor id;
- action, initially `exception.review.update`;
- resource reference;
- occurred-at timestamp generated server-side;
- source, such as route/action identifier;
- reason or reviewer note where present;
- idempotency key;
- prior state and next state for review fields;
- source-document reference when the workflow has one.

Audit evidence supplements source documents; it does not replace source-document references or human review. The first production implementation may use an append-only relational audit table in the same durable store as the exception write, preferably in the same transaction. WORM/archive/export strategy is out of scope for this decision.

## RBAC Direction

Decision: keep action-oriented, deny-by-default RBAC.

- The first protected production action remains `exception.review.update`.
- The actor must be authenticated and authorized for the derived tenant before persistence work.
- Role names and claim mapping are provider-specific and remain a later implementation detail.
- Same-tenant reviewer behavior from the fixture slice is the production shape to preserve, not a complete production role model.

## Explicitly Out Of Scope

This record does not approve or implement:

- production auth provider wiring;
- database creation, migrations, or ORM setup;
- production persistence implementation;
- production RBAC provider or complete role model;
- production idempotency table implementation;
- production audit sink implementation;
- supplier KDE workflow;
- traceability lot/event runtime;
- imports;
- production exports;
- production CSV generation;
- dynamic mock recall aggregation;
- UI expansion;
- compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination.

## Rollback Path

Rollback for this docs-only decision:

1. Delete `.planning/phase-3-production-provider-selection.md`.
2. Delete `ops/deltas/0035-production-provider-selection.md`.
3. Remove the additive provider-selection pointer and summary text from `.planning/HANDOFF.json`.
4. Remove the additive provider-selection note from `ops/memory/product.md`.

No runtime, test, OpenAPI, generated type, package, dependency, CI, or database surface is affected by this record.

## Next Smallest Implementation Candidate

After Matt accepts this decision and selects the concrete production provider details, the next smallest implementation candidate is a provider-adapter spike for the exception-review PATCH only:

- replace fixture auth resolution for that route with the selected server-verified auth/tenant resolver;
- persist one tenant-scoped exception record through the selected repository boundary;
- persist idempotency entries with replay/conflict semantics;
- append one durable audit event for accepted transitions;
- keep the existing OpenAPI contract as the source of truth;
- keep supplier, lot/event, export, CSV, dynamic mock recall, and broader database workflows out of scope.
