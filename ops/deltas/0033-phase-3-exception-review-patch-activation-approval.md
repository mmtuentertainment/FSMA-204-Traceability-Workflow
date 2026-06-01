# Batch 33 - Phase 3 Exception-Review PATCH Activation Approval

## Summary

Docs/planning-only approval packet for the first mutating-write activation candidate: `PATCH /api/traceability/exceptions/{exceptionId}` only. The packet narrows the future implementation request to one exception-review write, records the explicit Phase 4-8 Non-Goal lift that Matt would need to approve for that one write only, and lists the provider, tenant, RBAC, idempotency, audit, API behavior, test, and rollback decisions required before code.

This batch does not approve or implement runtime activation.

## Files Changed

- `.planning/phase-3-exception-review-patch-activation-approval.md` (new approval packet)
- `.planning/HANDOFF.json` (additive pointer and next-step wording)
- `ops/memory/product.md` (short planning-memory note)
- `ops/deltas/0033-phase-3-exception-review-patch-activation-approval.md` (this delta)

`INTEL.md` remains local-only and untracked. It was not opened for repo truth, edited, moved, staged, or relied on for this docs/planning batch.

## Delta Sequence

- Existing `0031-phase-3-first-mutating-write-design.md` remains unchanged.
- Existing `0032-codebase-map-refresh.md` remains unchanged.
- No duplicate `0032` delta was created.
- This is the only new `0033` delta.

## Stale Reference Scan

Before creating Batch 33, searched `README.md`, `.planning`, `ops/memory`, and `ops/deltas` for stale claims that the codebase-map refresh was still pending or that the next delta should be Batch 32:

```powershell
rg -n -i "next delta.*0032|0032.*approval|codebase map.*pending|codebase-map.*pending" README.md .planning ops/memory ops/deltas
```

Pre-edit result: no matches. A final rerun after this report existed matched only this new report's own stale-scan notes and command text. No pre-existing stale source was found, so no unrelated cleanup changes were made.

## Contract Impact

None. `api/openapi.yaml` was read as the source of truth and not modified.

## Runtime Impact

None. No `app/`, `lib/`, or `tests/` runtime file changed.

## Package / CI Impact

None. No package files, dependency files, generated types, or CI files changed.

## Verification Commands And Results

- `git status --short --branch --untracked-files=all` - branch was `main...origin/main [ahead 1]`; only `INTEL.md` was untracked before edits.
- `git log -1 --oneline` - `15bb863 docs(planning): refresh codebase map`.
- `git remote -v` - origin points to `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`.
- `node -v` - `v22.12.0`.
- `npm -v` - `10.9.0`.
- `Get-ChildItem -Name ops\deltas | Sort-Object | Select-Object -Last 30` - latest sequence ended at `0032-codebase-map-refresh.md` before this batch.
- `Get-ChildItem -Name ops\deltas | Where-Object { $_ -match '^0032-' }` - exactly `0032-codebase-map-refresh.md`.
- `Get-ChildItem -Name ops\deltas | Where-Object { $_ -match '^0033-' }` - no existing result before this batch.
- `rg -n -i "next delta.*0032|0032.*approval|codebase map.*pending|codebase-map.*pending" README.md .planning ops/memory ops/deltas` - pre-edit result had no matches; final rerun matched only this new Batch 33 report's own notes/command text.
- `npm ci` - PASS; added/audited 229 packages and reported 2 moderate npm audit findings.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml` and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js production build completed and listed `/`, `/_not-found`, and the two MockRecall API routes.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`
- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `git diff --stat` - tracked diff showed `.planning/HANDOFF.json` and `ops/memory/product.md`; new untracked docs are visible in `git status`.
- `git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts app lib tests package.json package-lock.json .github` - PASS; no protected-path diffs.

## Next Smallest Implementation Batch After Matt Approval

After Matt explicitly approves the Phase 4-8 Non-Goal lift for the exception-review PATCH only and chooses the required auth, tenant, RBAC, persistence, idempotency, and audit decisions, the next smallest code-bearing batch is:

- Implement `PATCH /api/traceability/exceptions/{exceptionId}` only.
- Add the first protected action, proposed as `exception.review.update`.
- Wire the selected server-derived request context, deny-by-default RBAC policy, tenant-scoped exception repository, idempotency store, and append-only audit sink only as needed for this one write.
- Add targeted tests for auth, RBAC, tenant isolation, idempotency replay/conflict, audit append, validation, optional rate limiting, and unchanged MockRecall fixture behavior.
- Preserve OpenAPI as source of truth and keep production export, supplier portal, traceability lot/event runtime, and broad workflow implementation out of scope.
