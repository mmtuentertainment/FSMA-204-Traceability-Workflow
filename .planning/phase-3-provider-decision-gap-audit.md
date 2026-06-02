# Phase 3 Provider Decision Gap Audit

**Date:** 2026-06-02
**Batch:** 40
**Scope:** Docs/planning only. No runtime behavior, OpenAPI contract, generated type, package, test, or CI surface changes.
**Baseline:** Current `main` after PR #10, merge commit `316f8ae`.

## Purpose

This audit reconciles the existing provider-decision docs after PR #10. It distinguishes the accepted fixture-only exception-review PATCH behavior from what still must be selected and implemented before any production-like mutating write is approved.

## Sources Audited

- `AGENTS.md`
- `README.md`
- `package.json`
- `.github/workflows/contract-gate.yml`
- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `app/api/traceability/exceptions/[exceptionId]/route.ts`
- `lib/security/request-context.ts`
- `lib/security/authorization.ts`
- `lib/security/idempotency-audit.ts`
- `lib/api/exception-review.ts`
- `tests/exception-review-patch.test.ts`
- `.planning/HANDOFF.json`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phase-3-production-provider-selection.md`
- `.planning/phase-3-exception-review-patch-activation-approval.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/TESTING.md`
- `ops/memory/product.md`
- `ops/deltas/0035-production-provider-selection.md`
- `ops/deltas/0039-pr10-coderabbit-repairs.md`

## What Is Already Decided

- OpenAPI remains the API source of truth before route, provider, persistence, or workflow expansion.
- Conservative product language remains mandatory: readiness workflow, human review, and FDA-style sortable export wording only.
- The only active runtime write is `PATCH /api/traceability/exceptions/{exceptionId}`, and it is fixture-only.
- The fixture-only PATCH uses local/test bearer-token fixtures, server-derived fixture tenant identity, same-tenant reviewer RBAC, an in-memory fixture exception repository, idempotency replay/conflict handling, and append-only in-memory audit evidence.
- PR #10 fenced fixture bearer-token auth from production runtime: when `NODE_ENV === "production"`, fixture tokens do not authorize the PATCH path.
- The fixture idempotency store now avoids raw delimiter collisions, but it still uses a non-production `check()` then `storeSuccess()` shape.
- Production direction is selected at the architectural level: server-verified auth/session, server-derived tenant membership, tenant-scoped durable relational persistence, durable idempotency entries, append-only audit evidence, and deny-by-default action RBAC.
- Server-derived tenant identity is mandatory. Client bodies, queries, route parameters, arbitrary headers, and client metadata are not tenant authority.
- Production-like mutating endpoints require auth, RBAC/authorization, `Idempotency-Key`, tenant isolation, audit trail, RFC 9457 Problem Details, and appropriate `429 Retry-After` behavior.

## What Is Still Undecided

- The concrete auth/session provider is not selected.
- The authoritative membership source for actor-to-tenant and actor-to-role mapping is not selected.
- Production role names, claim mapping, and complete RBAC provider behavior remain undecided beyond the first action shape `exception.review.update`.
- It is undecided whether public MockRecall fixture routes stay public smoke fixtures or become authenticated when production auth lands.
- The concrete persistence provider, access layer, migration tooling, schema shape, transaction boundaries, and seed/data strategy are not selected.
- Durable idempotency storage details remain open: atomic reserve/commit lifecycle, in-flight duplicate behavior, exact stored response snapshot shape, failure release behavior, lock strategy, and retention window.
- Durable audit storage details remain open: storage model, transaction coupling with accepted writes, retention, append-only enforcement, archive/WORM strategy, and export strategy.
- Rate-limiting implementation remains undecided. The contract requires `429` with `Retry-After` where rate limiting applies, but the first production slice must decide whether to wire rate limiting or explicitly defer it.
- The stable production test strategy for provider-backed writes remains undecided. The current direct TypeScript test uses Node built-in type stripping and is accepted only for the fixture gate.
- The next code-bearing batch has not yet named exact provider choices, allowed files, rollout/rollback path, or implementation order.

## Before The PATCH Can Become Production-Like

The fixture-only exception-review PATCH can become production-like only after a later approved micro-batch makes these true for that one route:

1. Matt approves a concrete code-bearing slice, including exact file scope, provider choices, validation commands, and rollback path.
2. The selected auth/session provider verifies identity server-side and resolves actor, tenant, roles, route, request id, and auth state before route logic reaches persistence.
3. Tenant identity remains server-derived only, and any client-supplied tenant-looking field is rejected or treated as non-authoritative according to the OpenAPI contract.
4. A deny-by-default production RBAC policy authorizes `exception.review.update` before tenant-scoped persistence work.
5. The exception repository is durable, tenant-scoped, and selected for the approved resource slice only.
6. Idempotency is durable and atomic enough to prevent double application, with replay for the same request fingerprint and `409 Conflict` for a different fingerprint.
7. Successful idempotency entries store the response shape needed for exact replay, not only an informal fixture record.
8. Accepted transitions write append-only audit evidence with request id, tenant id, actor id, action, resource reference, server timestamp, source, reason or reviewer note, idempotency key, prior state, and next state.
9. Persistence, idempotency, and audit behavior are transactionally consistent enough that failure cannot leave an accepted write without the required audit/idempotency evidence.
10. `401`, `403`, cross-tenant or missing `404`, `409`, `422`, and applicable `429` responses return RFC 9457 Problem Details without leaking cross-tenant existence.
11. `429` responses include `Retry-After` if rate limiting is active for the slice.
12. The full local/CI gate passes, with targeted provider-backed tests for auth, RBAC, tenant isolation, idempotency replay/conflict, audit append, validation, and unchanged MockRecall fixture behavior.

## Explicitly Out Of Scope For The Next Code-Bearing Implementation Batch

If the next implementation batch is approved, it should stay limited to the provider-backed exception-review PATCH path. These remain out of scope:

- new or expanded OpenAPI endpoints unless Matt explicitly approves a contract-first slice;
- hand edits to generated OpenAPI types;
- supplier KDE workflow;
- traceability lot/event workflow;
- exception listing or exception creation workflow beyond the one PATCH path;
- dynamic mock recall aggregation;
- imports;
- production exports;
- production CSV generation;
- UI expansion;
- broad database buildout beyond the minimum approved resource, idempotency, membership, and audit boundaries;
- complete production tenant administration or full role-management workflow;
- file upload or source-document storage;
- ERP integration, OCR, mobile scanning, dashboards, or supplier portal work;
- compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination.

## Gap Summary

The current docs already choose the architectural direction, but they do not yet choose concrete providers or the operational details needed for a production-like write. The largest remaining blockers are concrete auth/membership selection, durable tenant-scoped persistence, atomic idempotency with response replay snapshots, persisted append-only audit evidence, rate-limit handling, and targeted provider-backed verification.

## Next Smallest Candidate Batch

The next smallest candidate is a docs/planning provider-details decision packet unless Matt supplies the concrete providers directly. That packet should choose the auth/session provider, membership source, persistence provider/access layer, migration approach, idempotency lifecycle, audit storage/retention model, rate-limit posture, exact allowed files, validation commands, and rollback path for the exception-review PATCH only.

Only after those details are approved should a code-bearing provider-adapter spike begin.
