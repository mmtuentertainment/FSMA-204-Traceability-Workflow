# Phase 3 Kickoff Plan - Security And Persistence Foundation

**Date:** 2026-05-30
**Branch/HEAD at authoring:** `main` / `30e03014e664ae4307dd661430cd3af287be8a2e`
**Scope:** Planning and documentation only. No Phase 3 implementation is started by this file.

## Current Baseline

- Phase 1 is complete and merged via PR #2.
- Phase 2 is complete and merged via PR #3 as verification and documentation only.
- OpenAPI remains the API source of truth at `api/openapi.yaml`.
- The local and CI baseline gate is `npm ci`, `npm run api:check`, `npm run typecheck`, `npm run build`, and `npm run test:mock-recall:contract`.
- Current runtime success behavior remains fixture-only for MockRecall detail and packet CSV smoke checks.
- No database, authentication, tenant model implementation, RBAC implementation, audit log, persistence, imports, exports, production CSV generation, or production workflow logic exists yet.

## Phase 3 Goal

Establish the approved security and persistence foundation required before production-like traceability data workflows begin. Phase 3 should define and then implement, in small approved batches, server-derived tenant context, authentication and authorization boundaries, RBAC checks, mutating-write idempotency, persistence shape, and append-only audit evidence while preserving readiness-only product language.

## Non-Goals

- No compliance certification, legal advice, FDA endorsement, or automated exemption determination.
- No Phase 4-8 feature workflow work: traceability lots/events, exceptions, supplier KDE requests, dynamic mock recall aggregation, or production CSV export.
- No runtime behavior change unless it is part of a separately approved Phase 3 implementation batch.
- No OpenAPI change unless a contract-first Phase 3 batch explicitly approves it.
- No generated type edit by hand.
- No package, dependency, database, auth, RBAC, audit, or persistence code in this kickoff batch.
- No client-supplied tenant ID may become authoritative.

## Approval Gate Before Implementation

Phase 3 implementation must not start until Matt approves a concrete micro-batch. Approval should name:

- the exact goal and file scope;
- whether `api/openapi.yaml`, package files, migrations, runtime routes, middleware, tests, or CI may change;
- the selected persistence and auth direction, or a decision that the next batch remains design-only;
- the validation commands for that micro-batch;
- the rollback path.

Until that approval exists, Phase 3 remains not started.

## Security And Persistence Invariants

- OpenAPI remains the source of truth before route or persistence behavior expands.
- Authenticated requests derive tenant context on the server from trusted auth/session state.
- Request bodies, query strings, and arbitrary headers must not be trusted as tenant authority.
- RBAC is explicit and deny-by-default for read, write, review, and export paths.
- Cross-tenant resource access must not leak resource existence.
- Mutating writes require `Idempotency-Key` handling within the authenticated tenant and actor boundary.
- State transitions and review decisions append audit evidence with actor, time, action, source, and reason context.
- Source-document references remain metadata references unless a later approved file-storage batch changes that.
- Free-form notes must not become the only evidence trail.
- API errors use RFC 9457 Problem Details, including auth, authorization, validation, conflict, and not-found cases.
- Exports remain readiness artifacts and must not claim compliance certification, legal advice, FDA endorsement, or automated exemption determinations.

## Acceptance Criteria

### Kickoff Batch Acceptance

- This kickoff plan exists under `.planning/phases/FSMA-03-security-and-persistence-foundation/`.
- Truth surfaces point to Phase 3 as pending approval, not started.
- One delta report records the planning-only batch.
- No OpenAPI, generated type, package, dependency, runtime, test, CI, database, auth, RBAC, audit, persistence, import, export, or production CSV change is introduced.

### Phase 3 Implementation Acceptance

Phase 3 can be considered complete only after approved implementation batches show:

- authenticated requests resolve tenant context on the server;
- read and write paths enforce explicit RBAC decisions;
- mutating writes enforce idempotency keys;
- persistence is tenant-isolated and does not trust client-supplied tenant IDs;
- mutating actions and review decisions append audit evidence;
- security and persistence failures return Problem Details without leaking cross-tenant details;
- the baseline local/CI gate passes, plus any Phase 3-specific checks approved for the batch;
- documentation and delta evidence remain synchronized.

## Validation Gates

Every Phase 3 batch starts from the existing baseline:

```powershell
npm ci
npm run api:check
npm run typecheck
npm run build
npm run test:mock-recall:contract
```

Code-bearing Phase 3 batches should also add targeted verification for the approved slice, such as tenant-context resolution, RBAC denial/allow cases, idempotency replay, audit append behavior, migration/schema checks, and Problem Details error shape.

Protected-path inspection remains required for planning-only work:

```powershell
git diff --check
git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json app lib tests .github
```

## 03-01A Design Decision Status

The first approved design-only slice is documented at `.planning/phases/FSMA-03-security-and-persistence-foundation/03-01A-boundary-decision.md`.

That note chooses the provider-neutral boundary model for:

- server-derived tenant identity;
- request-boundary authentication;
- deny-by-default action RBAC;
- tenant-scoped persistence ownership;
- paired idempotency and append-only audit for future mutating writes.

No implementation was started by `03-01A`.

## Next Smallest Code-Bearing Candidate

Only after Matt approves a code-bearing batch, the next smallest implementation candidate should be a boundary skeleton that proves request context, authorization policy shape, idempotency/audit interfaces, and persistence ownership. It should not wire routes to production storage, should not change MockRecall success behavior, and should be reversible without affecting the OpenAPI contract.

## Decisions Required Before Code

- Persistence provider and migration approach.
- Auth/session source for server-derived tenant identity.
- RBAC role names and the first protected actions.
- Audit evidence storage model and retention expectations.
- Idempotency key retention and conflict semantics.
- Whether Phase 3 begins with a design-only decision batch or a minimal code-bearing schema/boundary batch.
