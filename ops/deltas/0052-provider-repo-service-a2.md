# Batch 52 - Provider Repository/Service A2

## Summary

Expands the provider-backed exception-review repository/service slice for idempotency mismatch handling, cross-resource and cross-tenant idempotency isolation, deterministic conflict Problem Details, and structured audit evidence for conflict/error paths.

This remains a non-route provider-backed test slice. It does not wire the live exception-review PATCH route, does not change OpenAPI, does not add dependencies, does not add a rate-limit table, and does not add prior/next audit columns.

## Files Changed

- `lib/db/exception-review-provider.ts` - extends conflict outcomes with stable RFC 9457-style Problem Details, stored replay-body introspection, and conflict/error audit appends; success audit metadata now includes `status = success`.
- `tests/db/exception-review-provider-a1.test.ts` - adjusts the existing A1 conflict assertion to account for the newly-approved conflict audit event.
- `tests/db/exception-review-provider-a2.test.ts` - adds six focused provider-backed A2 cases.
- `.planning/phase-3-provider-backed-repository-service-test-approval.md` - records A1/A2 implementation progress, remaining Batch A inventory, and the A2 conflict-audit adjustment.
- `ops/deltas/0052-provider-repo-service-a2.md` - this report.

## Contract And Runtime Impact

None. `api/openapi.yaml` is unchanged and remains the source of truth.

No route wiring was added. `app/api/traceability/exceptions/[exceptionId]/route.ts` remains fixture-backed and does not import `lib/db/client.ts` or `lib/db/exception-review-provider.ts`.

No package files were changed. The repo still has no `npm run test:exception-review-provider-a1` script; the A1/A2 provider tests are run directly with `node --experimental-strip-types` against a disposable test PostgreSQL database.

## Provider Behavior

New A2 behavior:

- A repeated idempotency key with a different request hash in the same tenant, operation, resource type, and resource id returns a deterministic `status = conflict` outcome.
- The conflict outcome includes RFC 9457-style Problem Details:
  - `type = about:blank`
  - `title = Conflict`
  - `status = 409`
  - deterministic detail text
  - structured context with operation, resource type, resource id, idempotency key, and reason.
- A conflict preserves the existing idempotency record and does not overwrite or replay it.
- A conflict exposes the stored replay body when the existing idempotency record has one.
- A conflict appends an `audit_events` row with tenant, actor, action, resource type, resource id, source, reason, idempotency key, `status = conflict`, and `error_reason = idempotency_request_hash_mismatch` in metadata.
- Same-key reuse on a different exception resource remains isolated by the Batch 51 T3 uniqueness scope and succeeds as a new operation.
- Same-key reuse across tenants remains isolated and succeeds independently.
- Accepted updates continue to append audit events, now with `metadata.status = success`.

The earlier Batch 50 planning inventory said hash-mismatch `409` conflicts should not append audit rows. Batch 52 intentionally updates that planning expectation for this approved A2 slice: hash-mismatch conflicts now append structured error audit evidence. Replays, in-flight duplicates, and rejected non-transition paths remain non-appending.

## Tests Added

`tests/db/exception-review-provider-a2.test.ts` covers:

1. `mismatched_payload_same_key_returns_conflict_and_audit`
2. `same_key_same_payload_different_resource_is_successful`
3. `repeated_conflict_returns_same_problem_details`
4. `cross_tenant_key_reuse_isolated`
5. `error_audit_fields_are_populated`
6. `successful_update_still_appends_audit_event`

A1 provider tests still pass after updating the expected audit count for the conflict case.

## Verification Commands And Results

- `git status --short --branch` - showed `review/phase-3-batches-44-48...origin/review/phase-3-batches-44-48` with only local-only `.audit/`, `.claude/`, and `INTEL.md` untracked before edits.
- `npm ci` - passed; npm reported the pre-existing 6 moderate audit findings.
- `npm run api:check` - passed.
- `npm run db:check` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:exception-review:patch` - passed; all 13 fixture PATCH cases passed.
- `npm run test:mock-recall:contract` - passed.
- Disposable provider-backed DB setup:
  - `npx drizzle-kit migrate --config drizzle.config.ts` - passed against a disposable `postgres:16-alpine` test database.
  - `node --experimental-strip-types tests/db/exception-review-provider-a1.test.ts` - passed all 12 A1 cases.
  - `node --experimental-strip-types tests/db/exception-review-provider-a2.test.ts` - passed all 6 A2 cases.
- `npm run test:exception-review-provider-a1` - failed because no such package script exists, and this batch explicitly forbids changing `package.json`. The direct A1 provider test command above is the valid current harness.
- `git diff --check` - passed.
- `git diff -- api/openapi.yaml app .github package.json package-lock.json tsconfig.json` - empty; no protected contract, route, workflow, package, lockfile, or tsconfig surfaces changed.

Node printed the existing experimental type-stripping and typeless-package warnings for TypeScript tests; no package metadata was changed.

## Rollback Path

Revert this batch commit. If manually rolling back before commit, restore `lib/db/exception-review-provider.ts` and `tests/db/exception-review-provider-a1.test.ts` to Batch 51, delete `tests/db/exception-review-provider-a2.test.ts` and this delta, and remove the Batch 52 progress notes from `.planning/phase-3-provider-backed-repository-service-test-approval.md`.

No schema, migration, OpenAPI, route, package, lockfile, or CI rollback is needed.

## Next Smallest Useful Micro-Batch

Continue the remaining Batch A inventory without route wiring:

- Add broader idempotency lifecycle cases for reserved/failed/expired mismatch states and completed-expired replay.
- Add multi-connection competing-reservation coverage.
- Add forced-fault transaction rollback proofs.
- Keep rate-limit persistence, live route wiring, and Batch B runtime hardening gated.
