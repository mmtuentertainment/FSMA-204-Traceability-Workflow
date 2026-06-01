# Batch 35 - Production Provider Selection Decision

## Summary

Docs/planning-only provider-selection decision for the production path after the accepted fixture-only exception-review PATCH activation. Adds a decision record for production auth, server-derived tenant identity, persistence, idempotency storage, audit evidence, RBAC direction, out-of-scope boundaries, rollback, and the next smallest implementation candidate.

No runtime, test, OpenAPI, generated type, package, lockfile, CI, dependency, database, production auth, or production persistence behavior changed.

## Files Inspected

- `README.md`
- `.planning/HANDOFF.json`
- `.planning/phase-3-exception-review-patch-activation-approval.md`
- `ops/memory/product.md`
- `ops/deltas/0031-phase-3-first-mutating-write-design.md`
- `ops/deltas/0033-phase-3-exception-review-patch-activation-approval.md`
- `ops/deltas/0034-exception-review-patch-fixture-activation.md`
- `lib/security/request-context.ts`
- `lib/security/authorization.ts`
- `lib/security/idempotency-audit.ts`
- `lib/api/exception-review.ts`
- `app/api/traceability/exceptions/[exceptionId]/route.ts`

## Files Changed

- `.planning/phase-3-production-provider-selection.md` (new decision record)
- `.planning/HANDOFF.json` (additive pointer, summary, and next-step guidance)
- `ops/memory/product.md` (short product-memory note)
- `ops/deltas/0035-production-provider-selection.md` (this delta)

`INTEL.md` remains local-only and untracked. It was not staged or committed.

## Decisions Recorded

- **Auth:** use a server-verified bearer token/session provider capable of deriving actor, roles, and tenant membership; concrete provider remains unselected until a later implementation batch.
- **Tenant identity:** derive tenant only from trusted server-side auth/session and membership state; client body/query/route/header tenant input remains non-authoritative.
- **Persistence:** use a durable tenant-scoped relational repository boundary; Postgres-compatible storage is the default direction unless Matt approves a different provider.
- **Idempotency:** persist entries scoped by tenant, actor, action, resource, and key; replay same fingerprint, return `409` on different fingerprint, and define in-flight/retention behavior before production.
- **Audit:** append tenant-scoped evidence for accepted transitions with actor, time, source, reason, prior state, next state, and idempotency attribution.
- **RBAC:** keep action-oriented, deny-by-default authorization; first protected production action remains `exception.review.update`.

## Contract And Runtime Impact

None. `api/openapi.yaml` remains the source of truth and was not edited. The fixture-only exception-review PATCH runtime remains unchanged.

## Package / CI Impact

None. No package, lockfile, dependency, or CI files changed.

## Out Of Scope

- production auth implementation;
- database/schema/migration implementation;
- production persistence implementation;
- production RBAC provider;
- production idempotency storage;
- production audit sink;
- supplier workflow;
- traceability lot/event workflow;
- import/export behavior;
- production CSV generation;
- dynamic mock recall aggregation;
- UI expansion;
- compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination.

## Verification Commands And Results

- `git status --short --branch --untracked-files=all` - checked before edits; branch was `main...origin/main [ahead 3]` with only `INTEL.md` untracked.
- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `git diff --exit-code -- app lib tests api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json .github` - PASS; no runtime, test, OpenAPI, generated type, package, lockfile, or CI diffs.
- `node -e "JSON.parse(require('fs').readFileSync('.planning/HANDOFF.json','utf8')); console.log('HANDOFF ok')"` - PASS; `HANDOFF ok`.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml` and `openapi-typescript --check` completed.

## Rollback Path

Delete `.planning/phase-3-production-provider-selection.md` and this delta, then remove the additive provider-selection pointer/summary/next-step note from `.planning/HANDOFF.json` and `ops/memory/product.md`.

## Next Smallest Implementation Candidate

After Matt accepts this decision and chooses concrete provider details, the next smallest implementation candidate is a provider-adapter spike for `PATCH /api/traceability/exceptions/{exceptionId}` only: selected auth/tenant resolver, tenant-scoped exception repository, durable idempotency entries, and append-only audit event persistence. Keep supplier, lot/event, export, CSV, dynamic mock recall, and broad database work out of scope.
