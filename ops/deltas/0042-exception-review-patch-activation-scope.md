# Batch 42 - Exception-Review PATCH Activation Scope

## Summary

Docs/planning-only activation scope record that explicitly lifts the Phase 4-8 non-goal only for the future production-like implementation of `PATCH /api/traceability/exceptions/{exceptionId}`.

This batch authorizes the future implementation shape for the first mutating write only. It does not implement runtime behavior.

## Files Changed

- `.planning/phase-3-exception-review-patch-activation-scope.md`
- `.planning/HANDOFF.json`
- `ops/memory/product.md`
- `ops/deltas/0042-exception-review-patch-activation-scope.md`

`README.md` was inspected and did not need edits because it correctly says production providers and broader workflows are not implemented yet.

## Contract And Runtime Impact

None. `api/openapi.yaml` remains the source of truth and was not edited. Runtime behavior remains fixture-only for the exception-review PATCH.

## Scope Explicitly Lifted

The Phase 4-8 non-goal is lifted only for the future production-like implementation of:

`PATCH /api/traceability/exceptions/{exceptionId}`

The future implementation must use the Batch 41 provider decisions, preserve OpenAPI-first discipline, keep tenant identity server-derived, use route -> service -> repository boundaries, and require auth/session, tenant membership, deny-by-default RBAC, `Idempotency-Key`, durable idempotency replay, append-only audit, RFC 9457 Problem Details, `429 Retry-After` posture, and provider-backed service/repository tests before route success activation.

## Scope Still Excluded

- Traceability lot/event workflow.
- Supplier KDE workflow and supplier portal.
- Exception listing or creation workflow beyond the one PATCH path.
- Mock recall readiness computation or dynamic aggregation.
- Production CSV generation and production exports.
- Import workflow.
- Dashboards or UI expansion.
- File upload or source-document storage.
- Tenant administration workflow.
- ERP integration, OCR, mobile scanning, or broader operations workflow.
- Compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination.

## Implementation Prerequisites

- Explicit Matt approval for a code-bearing batch, including exact file scope, dependencies, migration scope, validation commands, rollout path, and rollback path.
- Provider-backed service/repository tests before route success activation.
- OpenAPI-first conformance to the existing exception-review PATCH contract.
- Server-verified auth/session and server-derived tenant membership.
- Deny-by-default RBAC for `exception.review.update`.
- Durable idempotency reservation, request hash comparison, completed response replay, and `409` conflict on hash mismatch.
- Append-only audit evidence for accepted transitions.
- RFC 9457 Problem Details for `401`, `403`, leak-safe `404`, `409`, `422`, and applicable `429`.
- `429` responses include `Retry-After` where rate limiting applies.
- Existing fixture-only behavior remains unchanged until the implementation batch.

## Verification Commands And Results

- `git status --short --branch --untracked-files=all` - PASS before staging; branch is `docs/phase-3-exception-review-patch-activation-scope`, tracked edits are limited to `.planning/HANDOFF.json` and `ops/memory/product.md`, new Batch 42 docs are untracked, and local-only `.audit/` files plus `INTEL.md` remain untracked.
- `npm ci` - PASS; added 228 packages, audited 229 packages, and reported the known 2 moderate npm audit findings. No dependency repair was attempted in this docs-only batch.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml`, and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js production build completed.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`
- `npm run test:exception-review:patch` - PASS; all 13 focused checks passed. Node printed the expected experimental type-stripping and module-type warnings.
- `git diff --check` - PASS; no tracked whitespace or conflict-marker errors.
- `git diff --exit-code -- app/api lib tests api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json tsconfig.json .github` - PASS; no runtime/API/generated/test/package/CI diffs.
- `node -e "JSON.parse(require('fs').readFileSync('.planning/HANDOFF.json','utf8')); console.log('HANDOFF ok')"` - PASS; `HANDOFF ok`.
- `git diff --cached --check` - PASS after removing one extra blank line at the end of the new activation-scope record.

## Rollback Path

Delete `.planning/phase-3-exception-review-patch-activation-scope.md` and `ops/deltas/0042-exception-review-patch-activation-scope.md`, then remove the additive Batch 42 activation-scope entries from `.planning/HANDOFF.json` and `ops/memory/product.md`.

No runtime, API contract, generated type, package, lockfile, dependency, test, CI, database, production auth, production RBAC, durable idempotency, persisted audit, import/export, production CSV, or provider implementation rollback is needed.

## Next Smallest Useful Micro-Batch

The next smallest useful micro-batch is provider scaffolding and tests only: approved dependencies/configuration, minimal Drizzle schema and migrations for the Batch 41 provider set, and provider-backed service/repository tests.

Do not activate production-like route success behavior until the provider scaffold is verified and Matt approves the route wiring batch.
