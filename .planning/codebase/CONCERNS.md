---
last_mapped_commit: 47b3adb8ba0224e2c30edf112661f77b4d69410c
mapped_at: 2026-06-01
focus: concerns
---

# Concerns

## Scope Creep Risk

- The repo is intentionally a lightweight FSMA 204 readiness workflow, not an ERP or broad operations platform.
- Future work can easily over-expand into database, auth, tenant model, RBAC, audit log, supplier portal, OCR, dashboard, mobile scanning, ERP integration, or legal determination features.
- `AGENTS.md`, `.planning/STATE.md`, `.planning/HANDOFF.json`, `ops/memory/product.md`, and this map should preserve the narrow scope.

## Phase 3 Boundary Risk

- Phase 3 has started but is not complete.
- The boundary skeleton is real code, but it is only provider-neutral scaffolding around existing read routes.
- The exception-review PATCH is also real code, but it is fixture-only and limited to one approved route.
- The default resolver and policy are public-fixture adapters, not production auth or tenant enforcement.
- The PATCH route uses local/test fixture auth, in-memory fixture idempotency, and in-memory fixture audit evidence; production provider wiring, durable idempotency, and persisted audit remain absent.
- The Phase 4-8 Non-Goal lift has been approved only for the Batch 34 fixture-only exception-review PATCH. Broader supplier, lot/event, export, CSV, database, production auth, and production persistence work remains gated.

## Contract Runtime Gap

- `api/openapi.yaml` defines many endpoints that do not exist at runtime.
- `MockRecallDetail` exists in OpenAPI and generated types, and one contract fixture exists for runtime smoke checks, but no persisted or storage-backed success flow exists.
- The CSV endpoint has one fixture-derived output for the contract smoke check, but no production CSV generation workflow exists.
- The exceptions PATCH endpoint is contracted and implemented only as the approved fixture-backed first mutating write.

## Testing Gap

- There is one committed MockRecall contract smoke check.
- Broader unit, integration, and end-to-end test coverage is absent.
- The baseline gate is `npm ci`, `npm run api:check`, `npm run typecheck`, `npm run build`, `npm run test:mock-recall:contract`, and `npm run test:exception-review:patch`.
- The fixture-only exception-review PATCH focused direct test is part of the package/CI gate and covers 401/403, tenant isolation, validation, idempotency replay/conflict, and in-memory audit append.
- Production provider, durable idempotency, persisted audit, and non-public tenant paths are not operational yet.
- Contracted but unimplemented routes have no runtime tests.

## Generated File Risk

- `lib/api/generated/openapi-types.ts` should not be hand-edited.
- Changes to `api/openapi.yaml` should be paired with `npm run api:types` and `npm run api:types:check`.
- Next build and typecheck may create ignored artifacts such as `.next/`, `next-env.d.ts`, and `*.tsbuildinfo`.

## API Design Guardrails

- Future mutating handlers must implement idempotency behavior matching `Idempotency-Key`.
- Future auth must derive tenant context server-side and preserve tenant isolation without exposing tenant IDs in request shapes.
- Future errors should keep `application/problem+json`.
- Future review-sensitive paths should preserve explicit `human_review_required` semantics.
- Cross-tenant misses should avoid existence leaks.

## Truth-Surface Drift

- Older historical deltas and phase planning docs can still describe Batch 31/33 as gated because they predate Batch 34. Treat them as provenance, not current-state docs.
- Current-state surfaces should say Phase 3 is started but incomplete: the boundary skeleton and fixture-only exception-review PATCH exist, while production providers and broader Phase 4-8 runtime work remain absent.
- `.planning/HANDOFF.json` still names an older `codebase_map_commit`; the map documents now carry their own `last_mapped_commit` front matter for `47b3adb`.
- `INTEL.md` is local-only and untracked; do not treat it as committed repo truth unless Matt explicitly asks.

## Operational Concerns

- `PLAN.md` is tracked and should not be edited unless explicitly approved.
- No remote push should be assumed from local commits unless requested.
- `gh pr view <n>` plus `gh pr checks <n>` is the reliable live mergeability source for future PRs.
- For docs-only batches, explicitly prove protected paths stayed untouched before staging or committing.
