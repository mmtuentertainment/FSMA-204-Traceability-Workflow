---
last_mapped_commit: b106c66ac96b65ad47b658772886ffcd871c13f9
mapped_at: 2026-05-28
focus: arch
---

# Structure

## Top-Level Layout

- `AGENTS.md` contains project instructions, product scope, batch discipline, and future API guardrails.
- `README.md` describes the current stack, setup checks, and implementation absences.
- `PLAN.md` is a tracked baseline scaffold plan and should not be edited unless explicitly approved.
- `package.json` and `package-lock.json` define the npm project and locked dependencies.
- `tsconfig.json` defines TypeScript and Next settings.
- `.gitignore` keeps generated and local artifacts out of Git.

## App Directory

- `app/layout.tsx` is the root layout.
- `app/page.tsx` is the minimal status page.
- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts` handles mock recall detail requests.
- `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts` handles packet CSV requests.

## API And Library Directory

- `api/openapi.yaml` is the authoritative API contract.
- `lib/api/problem.ts` is the shared Problem Details response helper.
- `lib/api/generated/openapi-types.ts` is generated from OpenAPI and should not be manually edited.

## Operations Directory

- `ops/memory/product.md` is concise product memory.
- `ops/deltas/*.md` documents approved micro-batches and review-only evidence, including the Phase 1 pointer repair, MockRecall example review, and truth-surface wording reconciliation.
- Delta files should continue to capture goal, files changed, verification, skipped scope, and recommended next batch.

## Planning Directory

- `.planning/HANDOFF.json` is structured resume state.
- `.planning/.continue-here.md` is the human-readable continuation note.
- `.planning/codebase/` contains this generated codebase map.

## Naming Conventions

- API route folders follow Next.js dynamic segment naming, such as `[mockRecallId]`.
- OpenAPI operation IDs use stable verb-noun names, such as `getMockRecall` and `downloadMockRecallPacketCsv`.
- Operational deltas use zero-padded batch IDs, such as `0009-openapi-mock-recall-detail-success-shape.md`.
- Generated OpenAPI type names follow `openapi-typescript` output conventions: `paths`, `components`, and `operations`.

## Files To Treat Carefully

- Do not hand-edit `lib/api/generated/openapi-types.ts`; update `api/openapi.yaml` and run the generator.
- Do not expand `AGENTS.md` regulatory claims beyond readiness workflow, human review, and FDA-style sortable export.
- Do not edit `PLAN.md` during unrelated batches.
- Do not add runtime product logic, database, auth, tenant model, RBAC, audit logging, imports, exports, or CSV generation without an approved batch.
