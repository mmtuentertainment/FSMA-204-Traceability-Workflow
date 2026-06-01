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
- The default resolver and policy are public-fixture adapters, not production auth or tenant enforcement.
- Idempotency and audit interfaces exist but are uninvoked.
- The Batch 31 exception-review PATCH design remains gated behind an explicit Phase 4-8 Non-Goal lift and provider/auth/RBAC/idempotency/audit/persistence decisions.

## Contract Runtime Gap

- `api/openapi.yaml` defines many endpoints that do not exist at runtime.
- `MockRecallDetail` exists in OpenAPI and generated types, and one contract fixture exists for runtime smoke checks, but no persisted or storage-backed success flow exists.
- The CSV endpoint has one fixture-derived output for the contract smoke check, but no production CSV generation workflow exists.
- The exceptions PATCH endpoint is contracted and designed as the recommended first mutating write, but not implemented.

## Testing Gap

- There is one committed MockRecall contract smoke check.
- Broader unit, integration, and end-to-end test coverage is absent.
- Dormant 401/403, idempotency, audit, provider, and non-public tenant paths are not tested because they are not operational yet.
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

- `README.md` still says Phase 3 implementation has not started; current source and planning truth are more precise: the boundary skeleton is implemented, while Phase 3 remains incomplete.
- `.planning/HANDOFF.json` still names an older `codebase_map_commit`; the map documents now carry their own `last_mapped_commit` front matter for `47b3adb`.
- `INTEL.md` is local-only and untracked; do not treat it as committed repo truth unless Matt explicitly asks.

## Operational Concerns

- `PLAN.md` is tracked and should not be edited unless explicitly approved.
- No remote push should be assumed from local commits unless requested.
- `gh pr view <n>` plus `gh pr checks <n>` is the reliable live mergeability source for future PRs.
- For docs-only batches, explicitly prove protected paths stayed untouched before staging or committing.
