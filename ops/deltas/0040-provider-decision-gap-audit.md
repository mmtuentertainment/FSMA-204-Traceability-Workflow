# Batch 40 - Provider Decision Gap Audit

## Summary

Docs/planning-only audit of provider-decision gaps after PR #10. This batch clarifies what is already decided, what remains undecided, what must be true before the fixture-only exception-review PATCH can become production-like, and what stays out of scope for the next code-bearing implementation batch.

No runtime behavior, OpenAPI contract, generated type, test, package, dependency, lockfile, CI workflow, database, production auth provider, production RBAC provider, durable idempotency store, persisted audit sink, supplier workflow, import/export behavior, or production CSV generation was added.

## Files Changed

- `.planning/phase-3-provider-decision-gap-audit.md`
- `ops/deltas/0040-provider-decision-gap-audit.md`

`.planning/HANDOFF.json` and `ops/memory/product.md` were inspected but not changed because this audit clarifies existing project meaning rather than changing current posture.

## Findings

- The fixture-only exception-review PATCH is the only active runtime write.
- PR #10 fenced fixture bearer-token auth from production runtime and repaired fixture idempotency key serialization, but it did not select or implement production providers.
- Existing provider-decision docs already choose the architectural direction: server-verified auth/session, server-derived tenant membership, tenant-scoped durable relational persistence, durable idempotency entries, append-only audit evidence, and deny-by-default RBAC.
- Concrete provider choices and operational details remain blockers before any production-like write: auth/session provider, membership source, persistence provider/access layer, migrations, idempotency reserve/commit and replay snapshot semantics, audit storage/retention, rate-limit posture, and targeted provider-backed tests.
- Server-derived tenant identity remains mandatory; client-provided tenant values are not authority.

## Non-Goals

- No production auth, database, production tenant model, production RBAC provider, durable idempotency store, or persisted audit sink.
- No supplier workflow, traceability lot/event workflow, exception listing or creation workflow, dynamic mock recall aggregation, imports, production exports, production CSV generation, or UI expansion.
- No compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination.
- No OpenAPI, generated type, runtime, test, package, lockfile, dependency, or CI changes.

## Verification Commands And Results

- `git status --short --branch --untracked-files=all` - PASS; branch is `docs/phase-3-provider-gap-audit`, tracked edits are limited to two new docs/planning files, and pre-existing local-only `.audit/` files plus `INTEL.md` remain untracked.
- `npm ci` - PASS; added 228 packages, audited 229 packages, and reported the known 2 moderate npm audit findings. No dependency repair was attempted in this docs-only batch.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml`, and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js production build completed.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`
- `npm run test:exception-review:patch` - PASS; all 13 focused checks passed. Node printed the expected experimental type-stripping and module-type warnings.
- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `git diff --name-only` - PASS; no tracked unstaged diffs were listed before staging because Batch 40 introduced new untracked docs files.
- `git diff --cached --name-only` - PASS; staged files are exactly `.planning/phase-3-provider-decision-gap-audit.md` and `ops/deltas/0040-provider-decision-gap-audit.md`.
- `git diff --cached --check` - PASS after removing one extra blank line at the end of the new planning artifact.

## Rollback Path

Delete `.planning/phase-3-provider-decision-gap-audit.md` and `ops/deltas/0040-provider-decision-gap-audit.md`.

No runtime, API contract, generated type, package, lockfile, dependency, test, CI, database, production auth, production RBAC, durable idempotency, persisted audit, import/export, or production CSV rollback is needed.

## Next Smallest Candidate Batch

The next smallest candidate is a docs/planning provider-details decision packet for the exception-review PATCH only, unless Matt supplies concrete providers directly. It should choose the auth/session provider, authoritative membership source, persistence provider/access layer, migration approach, idempotency lifecycle and retention, audit storage and retention model, rate-limit posture, exact allowed files, validation commands, and rollback path.

Only after those details are approved should a code-bearing provider-adapter spike begin for `PATCH /api/traceability/exceptions/{exceptionId}` only.
