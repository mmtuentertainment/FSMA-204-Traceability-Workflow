# Phase 3 Exception-Review PATCH Activation Scope

**Date:** 2026-06-02
**Batch:** 42
**Scope:** Docs/planning only. This record explicitly lifts the Phase 4-8 non-goal only for the future production-like implementation of `PATCH /api/traceability/exceptions/{exceptionId}`. It does not implement runtime behavior, add dependencies, create database migrations, create auth/session/provider code, edit OpenAPI, or activate production providers.

## Explicit Non-Goal Lift

The Phase 4-8 non-goal is lifted only for one future write:

`PATCH /api/traceability/exceptions/{exceptionId}`

This lift authorizes a future implementation shape for the first mutating write only. It does not authorize any broader Phase 4-8 workflow, production data model, export, UI, supplier, lot/event, import, or dashboard work.

The current runtime remains unchanged. The existing exception-review PATCH remains fixture-only until a later code-bearing batch is explicitly approved by Matt.

## Still Excluded

This lift does not authorize:

- traceability lot workflow;
- traceability event workflow;
- supplier KDE workflow;
- supplier portal;
- exception listing or exception creation workflow beyond the one PATCH path;
- mock recall readiness computation or dynamic aggregation;
- production CSV generation;
- production exports;
- import workflow;
- dashboards;
- UI expansion;
- file upload or source-document storage;
- tenant administration workflow;
- ERP integration, OCR, mobile scanning, or broader operations workflow;
- compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination.

## Source Of Truth And Provider Decisions

The future implementation must preserve OpenAPI-first discipline:

- `api/openapi.yaml` remains the API source of truth.
- `lib/api/generated/openapi-types.ts` remains generated from OpenAPI and must not be hand-edited.
- Any contract mismatch must be resolved contract-first in an explicitly approved batch.

The future implementation must use the Batch 41 provider decisions from `.planning/phase-3-provider-activation-decisions.md`:

- Auth.js with database-backed sessions;
- application-owned PostgreSQL `tenant_memberships`;
- minimum initial roles `tenant_admin`, `quality_reviewer`, and `read_only`;
- PostgreSQL plus Drizzle;
- PostgreSQL-backed idempotency with completed replay snapshots;
- append-only PostgreSQL `audit_events`;
- PostgreSQL-backed fixed-window rate limiting;
- provider-backed service/repository tests before route success activation.

## Required Implementation Shape

The future code must use route -> service -> repository boundaries.

Route boundary:

- Parse the request and route params.
- Resolve server-verified auth/session.
- Resolve server-derived tenant membership.
- Enforce deny-by-default RBAC before persistence work.
- Validate `Idempotency-Key` and request body against the OpenAPI-defined PATCH shape.
- Map failures to RFC 9457 Problem Details.

Service boundary:

- Coordinate idempotency reservation and replay.
- Coordinate fixed-window rate limiting.
- Apply the exception-review transition only through a tenant-scoped repository.
- Append audit evidence for accepted transitions.
- Build replay snapshots for completed idempotency entries.

Repository boundary:

- Use PostgreSQL plus Drizzle behind tenant-scoped methods.
- Never trust client-supplied tenant values as authority.
- Return leak-safe missing/cross-tenant results so the route can emit `404` Problem Details.
- Keep schema, migration, and provider code limited to the approved exception-review PATCH slice.

## Required Write Guarantees

The future write must require:

- server-verified auth/session;
- server-derived tenant membership;
- deny-by-default RBAC for `exception.review.update`;
- `Idempotency-Key`;
- durable idempotency reservation, request hash comparison, completed response replay, and `409` conflict on hash mismatch;
- append-only audit evidence for accepted transitions;
- RFC 9457 Problem Details for `401`, `403`, leak-safe `404`, `409`, `422`, and applicable `429`;
- `429` Problem Details with `Retry-After` where rate limiting applies;
- provider-backed service/repository tests before route success activation.

## Fixture Behavior Preservation

Existing fixture-only behavior must remain unchanged until the future implementation batch:

- local/test fixture auth remains fixture-only;
- fixture bearer tokens remain disabled in production runtime;
- fixture tenant identity remains server-derived;
- fixture idempotency and audit remain in-memory;
- existing MockRecall fixture behavior remains unchanged;
- existing fixture-focused tests remain part of the baseline gate.

## Implementation Prerequisites

Before production-like route success activation, a future code-bearing batch must:

1. Receive explicit Matt approval for exact file scope, dependency changes, migration scope, validation commands, rollout path, and rollback path.
2. Add provider-backed service/repository tests for Auth.js session resolution, PostgreSQL tenant memberships, RBAC mapping, tenant-scoped exception updates, idempotency replay/conflict, audit append, fixed-window rate limiting, and unchanged fixture behavior.
3. Prove the local/CI baseline gate passes.
4. Prove no supplier, lot/event, mock recall aggregation, import/export, production CSV, dashboard, UI, or broader workflow behavior was added.

## Next Smallest Useful Micro-Batch

The next smallest useful micro-batch is still provider scaffolding and tests only: approved dependencies/configuration, minimal Drizzle schema and migrations for the Batch 41 provider set, and provider-backed service/repository tests.

Route success activation should remain a later explicit batch after the provider scaffold is verified.
