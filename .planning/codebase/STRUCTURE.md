---
last_mapped_commit: 47b3adb8ba0224e2c30edf112661f77b4d69410c
mapped_at: 2026-06-01
focus: arch
---

# Structure

## Top-Level Layout

- `AGENTS.md` contains project instructions, product scope, batch discipline, Context7 rules, and future API guardrails.
- `README.md` describes stack, setup checks, and the current Phase 3 fixture-only posture.
- `PLAN.md` is a tracked baseline scaffold plan and should not be edited unless explicitly approved.
- `package.json` and `package-lock.json` define the npm project and locked dependencies.
- `tsconfig.json` defines TypeScript and Next settings.
- `.gitignore` keeps generated and local artifacts out of Git.

## App Directory

- `app/layout.tsx` is the root layout.
- `app/page.tsx` is the minimal status page.
- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts` handles mock recall detail requests.
- `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts` handles packet CSV requests.
- `app/api/traceability/exceptions/[exceptionId]/route.ts` handles the fixture-only exception-review PATCH.

## API And Library Directory

- `api/openapi.yaml` is the authoritative API contract.
- `lib/api/mock-recall.ts` owns the static MockRecall contract fixture and derives the fixture packet CSV.
- `lib/api/mock-recall-source.ts` defines the tenant-scoped `MockRecallSource` seam and public-fixture adapter.
- `lib/api/exception-review.ts` owns the fixture exception record, patch validation, request fingerprinting, and fixture repository exports.
- `lib/api/problem.ts` is the shared Problem Details response helper and catalog.
- `lib/api/route-boundary.ts` is the read-route request boundary.
- `lib/api/generated/openapi-types.ts` is generated from OpenAPI and should not be manually edited.

## Security Directory

- `lib/security/request-context.ts` defines server-owned request identity, the public fixture resolver, and local/test fixture auth for the exception-review PATCH.
- `lib/security/authorization.ts` defines action-oriented authorization, the public fixture policy, and the fixture reviewer policy.
- `lib/security/idempotency-audit.ts` defines mutating-write idempotency/audit interfaces plus fixture in-memory stores.

## Test And CI Directory

- `tests/mock-recall-contract-smoke.mjs` starts a production Next server and checks fixture detail, fixture CSV, and missing-resource Problem Details.
- `tests/exception-review-patch.test.ts` directly exercises the fixture-only exception-review PATCH path and is wired into the package/CI gate through `npm run test:exception-review:patch`.
- `.github/workflows/contract-gate.yml` runs the install, contract, typecheck, build, and smoke-test gate on push and pull request events.

## Operations Directory

- `ops/memory/product.md` is concise product memory.
- `ops/deltas/*.md` documents approved micro-batches and review-only evidence.
- Recent deltas include:
  - `0027-mock-recall-record-source-of-truth.md`
  - `0028-problem-details-catalog-structure.md`
  - `0029-boundary-skeleton.md`
  - `0030-provider-activation-hardening.md`
  - `0031-phase-3-first-mutating-write-design.md`
  - `0034-exception-review-patch-fixture-activation.md`
  - `0035-production-provider-selection.md`

## Planning Directory

- `.planning/HANDOFF.json` is structured resume state.
- `.planning/STATE.md` is the current project-state truth surface.
- `.planning/codebase/` contains this refreshed codebase map.
- `.planning/phases/FSMA-01-contract-gate-and-examples/` contains Phase 1 planning artifacts.
- `.planning/phases/FSMA-02-problem-details-test-harness/` contains the Phase 2 verification scope.
- `.planning/phases/FSMA-03-security-and-persistence-foundation/` contains Phase 3 kickoff, 03-01A boundary decision, and 03-02 first mutating-write design.

## Naming Conventions

- API route folders follow Next.js dynamic segment naming, such as `[mockRecallId]`.
- OpenAPI operation IDs use stable verb-noun names, such as `getMockRecall` and `downloadMockRecallPacketCsv`.
- Operational deltas use zero-padded batch IDs, such as `0031-phase-3-first-mutating-write-design.md`.
- Generated OpenAPI type names follow `openapi-typescript` output conventions: `paths`, `components`, and `operations`.
- Security action names use dot-delimited action classes, such as `mock_recall.read`.

## Files To Treat Carefully

- Do not hand-edit `lib/api/generated/openapi-types.ts`; update `api/openapi.yaml` and run the generator.
- Do not expand `AGENTS.md` regulatory claims beyond readiness workflow, human review, and FDA-style sortable export.
- Do not edit `PLAN.md` during unrelated batches.
- Do not add production runtime product logic, database, production auth provider, production tenant model, production RBAC provider, persisted audit logging, imports, exports, or CSV generation without an approved batch.
- Keep `INTEL.md` local-only unless Matt explicitly asks otherwise.
