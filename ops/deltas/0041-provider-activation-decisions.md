# Batch 41 - Provider Activation Decisions

## Summary

Docs/planning-only provider activation decision record for the future production-like exception-review PATCH path. This converts Batch 40's provider blockers into explicit default choices without implementing runtime behavior.

No runtime behavior, API contract, generated type, test, package, dependency, lockfile, CI workflow, database schema, production auth provider, production RBAC provider, durable idempotency store, persisted audit sink, supplier workflow, import/export behavior, or production CSV generation was added.

## Files Changed

- `.planning/phase-3-provider-activation-decisions.md`
- `.planning/HANDOFF.json`
- `ops/memory/product.md`
- `ops/deltas/0041-provider-activation-decisions.md`

`README.md` was inspected and did not need edits because it correctly says no production providers are implemented yet.

## Decisions Made

- Auth/session provider: Auth.js with database-backed sessions.
- Tenant membership source: application-owned PostgreSQL `tenant_memberships`.
- Minimum initial roles: `tenant_admin`, `quality_reviewer`, and `read_only`.
- Role mapping: `tenant_admin` and `quality_reviewer` may perform `exception.review.update`; `read_only` may not.
- Persistence, access layer, and migrations: PostgreSQL plus Drizzle behind route -> service -> repository boundaries.
- Idempotency lifecycle: PostgreSQL-backed table, uniqueness on `tenant_id + operation + idempotency_key`, request-hash mismatch returns `409`, and completed requests replay a stored response snapshot.
- Replay snapshot shape: status, content type, response body, relevant headers, audit event reference, request hash, created timestamp, and completed timestamp.
- Audit storage and retention posture: append-only PostgreSQL `audit_events` for accepted transitions, with no update/delete path in the initial implementation slice.
- Rate-limit posture: PostgreSQL-backed fixed-window limiter for the first mutating endpoint, returning `429` Problem Details with `Retry-After`.
- Provider-backed tests: PostgreSQL/Drizzle-backed service and repository tests are required before route success activation.

## Contract And Runtime Impact

None. `api/openapi.yaml` remains the source of truth and was not edited. The fixture-only exception-review PATCH runtime remains unchanged.

## Remaining Non-Goals

- No dependency install or package change.
- No database schema, migration, seed, or connection configuration.
- No production auth, database, RBAC provider, durable idempotency store, audit sink, or rate limiter implementation.
- No supplier KDE workflow, lot/event workflow, exception listing or creation workflow, dynamic mock recall aggregation, imports, production exports, production CSV generation, UI expansion, file upload, source-document storage, tenant administration workflow, ERP integration, OCR, mobile scanning, or dashboards.
- No compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination.

## Verification Commands And Results

- `git status --short --branch --untracked-files=all` - PASS before staging; branch is `docs/phase-3-provider-activation-decisions`, tracked edits are limited to `.planning/HANDOFF.json` and `ops/memory/product.md`, new Batch 41 docs are untracked, and local-only `.audit/` files plus `INTEL.md` remain untracked.
- `npm ci` - PASS; added 228 packages, audited 229 packages, and reported the known 2 moderate npm audit findings. No dependency repair was attempted in this docs-only batch.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml`, and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js production build completed.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`
- `npm run test:exception-review:patch` - PASS; all 13 focused checks passed. Node printed the expected experimental type-stripping and module-type warnings.
- `git diff --check` - PASS; no tracked whitespace or conflict-marker errors.
- `git diff --exit-code -- app/api lib tests api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json tsconfig.json .github` - PASS; no runtime/API/generated/test/package/CI diffs.
- `node -e "JSON.parse(require('fs').readFileSync('.planning/HANDOFF.json','utf8')); console.log('HANDOFF ok')"` - PASS; `HANDOFF ok`.
- `git diff --cached --check` - PASS after removing one extra blank line at the end of the new decision record.

## Rollback Path

Delete `.planning/phase-3-provider-activation-decisions.md` and `ops/deltas/0041-provider-activation-decisions.md`, then remove the additive Batch 41 provider-decision entries from `.planning/HANDOFF.json` and `ops/memory/product.md`.

No runtime, API contract, generated type, package, lockfile, dependency, test, CI, database, production auth, production RBAC, durable idempotency, persisted audit, import/export, or production CSV rollback is needed.

## Next Smallest Useful Micro-Batch

After Matt explicitly approves a code-bearing batch, add the provider scaffold only: approved Auth.js, Drizzle, and PostgreSQL dependencies/configuration; minimal Drizzle schema and migrations for sessions, tenant memberships, exception-review records, idempotency entries, audit events, and fixed-window rate limits; and provider-backed service/repository tests.

Do not activate production-like route success behavior until that scaffold is verified and Matt approves the route wiring batch.
