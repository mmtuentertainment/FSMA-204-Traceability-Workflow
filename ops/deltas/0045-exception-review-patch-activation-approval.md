# Batch 45 - Exception-Review PATCH Activation Approval

## Summary

Adds a docs-only approval packet for the future provider-backed activation slice of `PATCH /api/traceability/exceptions/{exceptionId}`.

The packet records the one-write Phase 4-8 non-goal lift, excluded scope, required guardrails, implementation mode decision, acceptance criteria, and non-activation statement so a later code batch can proceed without re-deciding architecture during runtime edits.

## Files Changed

- `.planning/phase-3-exception-review-patch-activation.md`
- `README.md`
- `.planning/HANDOFF.json`
- `ops/memory/product.md`
- `ops/deltas/0045-exception-review-patch-activation-approval.md`

## Decision Recorded

- The future activation is limited to `PATCH /api/traceability/exceptions/{exceptionId}` and action `exception.review.update`.
- The future implementation must use route -> service -> repository boundaries.
- The success path must use server-verified auth/session, server-derived tenant membership, deny-by-default RBAC, Drizzle-backed PostgreSQL repositories, durable idempotency replay/conflict handling, append-only audit evidence, RFC 9457 Problem Details, and 429 `Retry-After` behavior.
- Fixture-backed success behavior is not approved as the future production-like activation path; existing fixture behavior remains unchanged until the later code batch.
- If fixed-window rate-limit persistence requires schema not already present, the later implementation batch must include the smallest explicitly approved migration before route success activation.

## Still Out Of Scope

- No runtime route implementation or activation.
- No OpenAPI or generated type changes.
- No Drizzle schema or SQL migration changes.
- No package, dependency, PostgreSQL runtime driver, test, or CI changes.
- No Auth.js runtime integration.
- No supplier KDE workflow, lot/event workflow, mock recall computation, imports, exports, production CSV, dashboard, supplier portal, UI expansion, or broader workflow logic.
- No compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination claims.

## Contract And Runtime Impact

None. `api/openapi.yaml` remains the API source of truth. `app/api`, generated OpenAPI types, `lib/db/schema.ts`, migrations, package files, tests, `tsconfig.json`, and `.github` were not edited.

The current exception-review PATCH remains fixture-only with local/test fixture auth, server-derived fixture tenant identity, fixture reviewer RBAC, in-memory fixture state, in-memory idempotency replay/conflict handling, and in-memory audit evidence.

## Verification Commands And Results

- `npm ci` - passed; npm reported 6 moderate audit findings and transitive `@esbuild-kit/*` deprecation warnings, not fixed in this batch.
- `npm run api:check` - passed.
- `npm run db:check` - passed; Drizzle read `drizzle.config.ts` and reported the migration metadata was fine without a live database.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:mock-recall:contract` - passed.
- `npm run test:exception-review:patch` - passed; Node printed the known experimental type-stripping and typeless package/module warnings.
- `git diff --check` - passed.
- `git diff --cached --check` - passed after staging only the intended files.

## Rollback Path

Delete `.planning/phase-3-exception-review-patch-activation.md` and `ops/deltas/0045-exception-review-patch-activation-approval.md`, then remove the additive Batch 45 wording and pointers from `README.md`, `.planning/HANDOFF.json`, and `ops/memory/product.md`.

No runtime route, API contract, generated type, DB schema, migration, package, test, CI, dependency, auth provider, or database rollback is needed.

## Next Smallest Useful Implementation Batch

Add provider-backed service/repository tests and narrow route -> service -> repository wiring for the exception-review PATCH only, after Matt approves exact file scope, dependency changes, migration changes if any, validation commands, rollout path, and rollback path.
