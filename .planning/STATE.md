# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-28)

**Core value:** A reviewer can assemble a trustworthy, human-reviewed mock recall readiness packet from traceability records and supplier KDE gaps without mistaking the workflow for legal or FDA approval.
**Current focus:** Phase 3 - **Batch A accepted** (`ops/deltas/0061-batch-a-acceptance.md`, 2026-06-05). The provider-backed repository/service test slice for the exception-review PATCH is complete: five suites (`tests/db/exception-review-provider-a1..a5.test.ts`) exercise the provider against a real PostgreSQL test database - a1 idempotency resource-scope, a2 mismatch/isolation/audit conflicts, a3 append-only audit surface proofs, a4 atomicity forced-fault rollback, a5 rate-limit posture - running in CI under the `db-provider-tests` job and feeding the committed `fallow` coverage snapshot. The boundary skeleton (Batch 29), fixture-only exception-review PATCH (Batch 34), and the Postgres + Drizzle schema/migration foundation with its lazy client seam remain in place; the provider is staged but **unwired** (imported only by tests) and the runtime stays fixture-only. Batch B (route wiring + runtime hardening) is the next approved code batch and remains gated behind this acceptance.

## Current Repository State

- Repo path: `C:\Users\matth\Desktop\FSMA 204 Workflow Product`.
- Branch at initialization: `main`.
- Remote: `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`.
- OpenAPI source of truth: `api/openapi.yaml`.
- Generated types: `lib/api/generated/openapi-types.ts`.
- Runtime implemented today: mock recall detail and packet routes expose one contract fixture for smoke checks and return not-found Problem Details for missing resources. As of Batch 29 these routes flow through the boundary skeleton (request-context resolver, deny-by-default authorization, tenant-scoped `MockRecallSource`, Problem catalog) with byte-identical behavior. As of Batch 34, the exception-review PATCH exists as a fixture-only mutating write.
- Boundary skeleton seams (`lib/security/request-context.ts`, `lib/security/authorization.ts`, `lib/api/mock-recall-source.ts`, `lib/api/route-boundary.ts`, `lib/security/idempotency-audit.ts`) remain provider-neutral. The MockRecall read defaults are public-fixture adapters only, while the exception-review PATCH uses local/test fixture auth plus in-memory fixture idempotency and audit evidence. No production auth provider, persistence/storage, production RBAC provider, durable idempotency store, or persisted audit sink exists.
- MockRecall OpenAPI examples have been reviewed against the fixture and missing-resource behavior; no OpenAPI repair or runtime change was needed.
- Current absences: database, production auth provider, production tenant model, production RBAC provider, persisted audit log, persisted traceability records, imports, exports, storage-backed mock recall payloads, production CSV generation, and broader production workflow logic.

## Planning Artifacts

- Project context: `.planning/PROJECT.md`.
- Config: `.planning/config.json`.
- Research: `.planning/research/`.
- Codebase map: `.planning/codebase/`.
- Requirements: `.planning/REQUIREMENTS.md`.
- Roadmap: `.planning/ROADMAP.md`.
- Repo instructions: `AGENTS.md`.
- Phase 1 closeout: `.planning/phases/FSMA-01-contract-gate-and-examples/CLOSEOUT.md`.
- Phase 2 verification scope: `.planning/phases/FSMA-02-problem-details-test-harness/VERIFICATION-SCOPE.md`.
- Phase 3 kickoff plan: `.planning/phases/FSMA-03-security-and-persistence-foundation/KICKOFF.md`.
- Phase 3 03-01A boundary decision: `.planning/phases/FSMA-03-security-and-persistence-foundation/03-01A-boundary-decision.md`.
- Phase 3 03-02 first mutating-write design: `.planning/phases/FSMA-03-security-and-persistence-foundation/03-02-first-mutating-write-design.md`.

## Recent Decisions

- Keep FSMA language conservative: readiness workflow, human review, and FDA-style sortable export only.
- Keep OpenAPI first and generated types checked.
- The CI contract gate and committed MockRecall contract smoke check already exist; future batches should use them as the baseline rather than duplicate them.
- The MockRecall example review is complete; future work should not reopen it unless new drift is verified.
- Keep future work in small approved batches with `ops/deltas/` evidence.
- Use GSD `interactive` mode with Codex text-mode and no auto-advance.
- Start with Phase 1 rather than jumping directly into database, auth, CSV, or UI work.
- Phase 2's immediate scope is documenting the existing Problem Details verification (the committed `tests/mock-recall-contract-smoke.mjs` smoke check), not runtime success expansion or persistence. The only success path remains the single static contract fixture.
- Phase 3 kickoff planning defines the approval gate and invariants for security/persistence work; implementation has started only as approved narrow fixture slices.
- 03-01A chooses a provider-neutral boundary model: server-derived tenant identity, request-boundary auth, deny-by-default RBAC, tenant-scoped persistence, and paired idempotency/audit for future writes.
- Batch 29 implemented the approved boundary skeleton (Variant A) for that model: the two MockRecall read routes flow through a request-context resolver, a deny-by-default authorization policy, a tenant-scoped `MockRecallSource`, and the Problem catalog (now with 401/403 entries). Batch 34 then activated the first fixture-only exception-review PATCH with local/test auth, reviewer RBAC, in-memory fixture state, idempotency replay/conflict, and append-only in-memory audit evidence. No production provider, storage, OpenAPI, generated-type, package, or CI change was introduced by the provider-selection docs in Batch 35. Phase 3 is not complete.
- Batches 27-28 (Phase 1-2 of the refactor plan) made the packet CSV a derived projection and reshaped Problem Details into a named catalog seam, both byte-identical.
- Batches 43-50 built the Postgres + Drizzle foundation (Batch 43), the `db:check` CI gate (44), provider-activation decision/approval packets (45, 48, 49, 50), a lazy runtime client seam (46), and a client import-safety gate (47) - all docs/scaffold with no route wiring.
- Batch A (the provider-backed test slice) landed across PRs #12-#18: a1 idempotency resource-scope (Batch 51) and a2 mismatch/isolation/audit conflicts (Batch 52); fallow codebase-intelligence tooling + CI audit (PRs #13/#14, deltas 0053/0054); runtime coverage wired into the fallow gate at `maxCrap 30` (Batch 57) and reproducible provider-DB tests + coverage in CI (Batch 58); the PR #12 review remainder = two provider correctness fixes, actor-in-idempotency-hash and `not_found` orphan cleanup (Batch 59); a3 append-only audit surface proofs A4-18/19/20 (Batch 60, PR #15); a4 atomicity forced-fault rollback A3-15/16 + A4-17 (Batch 61, PR #17); and a5 rate-limit posture (Area 5) + an optional checkpoint seam (Batch 62, PR #18, main `8f58d08`).
- Batch A is accepted as of 2026-06-05 (`ops/deltas/0061-batch-a-acceptance.md`); the CI provider-DB database name was renamed `fsma204_a1a2_test` -> `fsma204_provider_test` (neutral; still satisfies every suite's `test`-token fence) and the truth surfaces were de-staled from "a1/a2/a3" to "a1-a5". Batch B (route wiring) is unblocked but gated as its own approved code batch.

## Next Step

Batch A is accepted (delta 0061), which unblocks **Batch B** - the next approved code batch - for `PATCH /api/traceability/exceptions/{exceptionId}` only. Batch B is a hardened, non-splittable bundle: repoint the route's DB connection to a restricted non-owner role, install DB-level append-only enforcement (an `ENABLE ALWAYS` trigger) as the first DDL, invert the a3/A4-20 non-enforcement asserts to enforcement asserts (REVOKE-only is forbidden), wire the provider into the route against `lib/db/client.ts` with a live `DATABASE_URL`, add persistent rate limiting, and activate PATCH success. Deferred review carry-forwards are Batch B entry criteria: the fail-closed-vs-fail-open limiter decision (errors-1), the `Number.isFinite` Retry-After guard (errors-2), an optional `toRetryAfterSeconds()` helper (types-3), throttled-attempt audit/observability (A5-DENIED-ATTEMPT-AUDIT), and validation-before-limiter precedence (A5-16). Also tighten `.fallowrc.jsonc` `unused-*` rules back to `error` once the staged provider exports are wired. No production provider, storage, enforcement on non-public tenants, supplier workflow, lot/event workflow, export, CSV generation, or broader Phase 4-8 runtime work is approved beyond Batch B, and the optional `@/*` path alias remains deferred.

## Guardrails

- Do not claim compliance certification, legal advice, FDA endorsement, or automated exemption determination.
- Do not hand-edit generated OpenAPI types.
- Do not add database, auth, tenant model, RBAC, audit log, imports, exports, CSV generation, UI expansion, or runtime traceability logic without an approved phase/batch.
- Recheck official FDA sources before making date-specific regulatory claims.
- Use Context7 first when a future task asks about library, framework, SDK, API, CLI, or cloud-service docs.
