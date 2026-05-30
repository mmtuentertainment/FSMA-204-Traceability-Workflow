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
- `MockRecallDetail` exists in OpenAPI and generated types, and one contract fixture exists for runtime smoke checks, but no persisted or storage-backed success flow exists.
- The CSV endpoint has one fixture output for the contract smoke check, but no production CSV generation workflow exists.

## Testing Gap

- There is one committed MockRecall contract smoke check.
- Runtime evidence lives in `ops/deltas/0008-runtime-verify-mock-recall-problem-handlers.md` and the committed MockRecall contract smoke check.
- Broader unit, integration, and end-to-end test coverage is still absent.

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

- Current handoff guidance keeps any remaining Phase 1 work to closeout or handoff wording unless Matt approves a new micro-batch.
- No MockRecall OpenAPI repair is pending; future options should build on the existing reviewed examples, CI gate, and MockRecall smoke coverage.
- `PLAN.md` is tracked and should not be edited unless explicitly approved.
- No remote push should be assumed from local commits unless requested.
