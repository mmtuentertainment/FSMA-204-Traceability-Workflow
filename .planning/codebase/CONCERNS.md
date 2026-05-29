---
last_mapped_commit: b106c66ac96b65ad47b658772886ffcd871c13f9
mapped_at: 2026-05-28
focus: concerns
---

# Concerns

## Scope Creep Risk

- The repo is intentionally a lightweight FSMA 204 readiness workflow, not an ERP or broad operations platform.
- Future work can easily over-expand into database, auth, tenant model, RBAC, audit log, supplier portal, OCR, dashboard, mobile scanning, ERP integration, or legal determination features.
- `AGENTS.md`, `README.md`, `ops/memory/product.md`, and `.planning/HANDOFF.json` all reinforce the narrow scope and should be preserved.

## Contract Runtime Gap

- `api/openapi.yaml` defines many endpoints that do not exist at runtime.
- `MockRecallDetail` exists in OpenAPI and generated types, but runtime handlers still return not-found Problem Details for all IDs.
- The CSV endpoint is contracted for future `text/csv` success output, but no CSV generation exists.

## Testing Gap

- There is no committed test suite.
- Runtime evidence currently lives in `ops/deltas/0008-runtime-verify-mock-recall-problem-handlers.md`.
- A CI contract gate is a natural next batch because package scripts already exist.

## Generated File Risk

- `lib/api/generated/openapi-types.ts` should not be hand-edited.
- Changes to `api/openapi.yaml` should be paired with `npm run api:types` and `npm run api:types:check`.
- Next build and typecheck may create ignored artifacts such as `.next/`, `next-env.d.ts`, and `*.tsbuildinfo`.

## API Design Guardrails

- Future mutating handlers must implement idempotency behavior matching `Idempotency-Key`.
- Future auth must derive tenant context server-side and preserve tenant isolation without exposing tenant IDs in request shapes.
- Future errors should keep `application/problem+json`.
- Future review-sensitive paths should preserve explicit `human_review_required` semantics.

## Operational Concerns

- `.planning/HANDOFF.json` says the next work should be consultant-approved and micro-batch sized.
- Current recommended next options are contract-only `MockRecallDetail` examples or CI contract gates.
- `PLAN.md` is tracked and should not be edited unless explicitly approved.
- No remote push should be assumed from local commits unless requested.
