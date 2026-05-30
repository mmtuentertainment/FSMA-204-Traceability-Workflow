# Phase 2 Verification Scope - Problem Details Test Harness

**Date:** 2026-05-30
**Branch at authoring:** `phase-2-verification-scope-docs` (cut from `main` after PR #2 merge `0181658`)
**Plan:** 02-02 - Document verification scope and skipped runtime expansion.
**Scope:** Documentation and planning only. No runtime, OpenAPI, generated-type, package, test, or CI change in this batch.

## Purpose

This note records exactly what the committed MockRecall contract smoke check protects today, and states plainly what it does not. It exists so future batches do not mistake the current verification for production runtime, persistence, or compliance coverage.

## What The Committed Verification Protects

The verification lives in `tests/mock-recall-contract-smoke.mjs` and runs as `npm run test:mock-recall:contract` (also wired into `.github/workflows/contract-gate.yml`). It starts a production Next.js server (`next start`) and asserts against live HTTP responses.

### Missing-resource Problem Details (the Phase 2 focus)

- **Missing mock recall detail returns `404` `application/problem+json`.**
  - Request: `GET /api/traceability/mock-recalls/contract-smoke-missing`.
  - Asserted by `assertMissingDetailProblem` -> `assertProblemDetails` (`tests/mock-recall-contract-smoke.mjs:285-288`, `:147-186`).
- **Missing packet CSV returns `404` `application/problem+json`, not `text/csv`.**
  - Request: `GET /api/traceability/mock-recalls/contract-smoke-missing/packet.csv`.
  - Asserted by `assertMissingPacketProblem` -> `assertProblemDetails` (`tests/mock-recall-contract-smoke.mjs:290-293`).
- **The Problem Details body includes `type`, `title`, `status`, `detail`, and `instance`.**
  - The `404` status and `application/problem+json` content type are asserted at `tests/mock-recall-contract-smoke.mjs:151-160`.
  - All five body members are asserted with exact values at `tests/mock-recall-contract-smoke.mjs:161-185`:
    - `type` = `"about:blank"`
    - `title` = `"Resource not found"`
    - `status` = `404`
    - `detail` = ``No mock recall was found for mockRecallId "<id>".``
    - `instance` = the requested path.
  - The runtime source of this shape is `mockRecallNotFoundResponse` in `lib/api/problem.ts:12-23`, which delegates to `problemResponse` (`lib/api/problem.ts:5-10`); `problemResponse` sets the `application/problem+json` content type.

### Success path (fixture-only, included for completeness)

The same smoke check also pins the single static success fixture, but this is **not** production or persisted behavior:

- Detail `200 application/json` for the one hardcoded ID `contract-fixture-ready-for-review` (`assertFixtureDetail`, `tests/mock-recall-contract-smoke.mjs:188-244`).
- Packet `200 text/csv` for the same single ID, with an exact CRLF body and a guard that the CSV contains no "compliance certification", "legal advice", or "FDA endorsement" language (`assertFixturePacketCsv`, `tests/mock-recall-contract-smoke.mjs:246-283`).
- The fixture is a literal object in `lib/api/mock-recall.ts:8-33` (packet CSV string at `:35-39`); `getMockRecallDetail`/`getMockRecallPacketCsv` return it only for the exact fixture ID and return `null` (-> Problem Details) for every other ID (`lib/api/mock-recall.ts:41-57`).

**Success coverage remains fixture-only.** There is no dynamic, persisted, or storage-backed success path. The only ID that returns `200` is the single hardcoded contract fixture.

## What This Phase Does Not Cover

Phase 2's immediate scope is verification documentation, not runtime expansion. The following do not exist yet and are out of scope for this batch:

- No database.
- No authentication.
- No tenant model (no server-derived tenant context; no client-supplied tenant ID trusted as authority).
- No RBAC.
- No audit log / append-only audit evidence.
- No persisted traceability records or storage-backed mock-recall payloads beyond the in-memory fixture.
- No production CSV generation; the packet CSV is a static fixture string.
- No imports or production exports.
- No idempotency-key handling for mutating writes.
- No rate-limit (`429` / `Retry-After`) runtime behavior.
- No production workflow implementation.

## Conservative Product Boundary

This product is readiness support only. It does not certify FSMA 204 compliance, provide legal advice, imply FDA endorsement, or automate exemption determinations. The smoke check additionally guards the packet CSV against compliance-certification, legal-advice, and FDA-endorsement language.

## Skipped Runtime Expansion (Recorded, Not Started)

Runtime success expansion, persistence, and security foundations are intentionally deferred to later approved phases and were not started in this batch:

- Security/persistence foundation (auth, server-derived tenant isolation, RBAC, idempotency, append-only audit) is Phase 3 work.
- Dynamic / approved-data mock recall success runtime is Phase 7 work.
- Production FDA-style sortable CSV export is Phase 8 work.

None of these may begin without an approved phase plan.

## Evidence Pointers

- Verification: `tests/mock-recall-contract-smoke.mjs`; command `npm run test:mock-recall:contract`.
- CI gate: `.github/workflows/contract-gate.yml`.
- Runtime under verification: `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`, `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`, `lib/api/problem.ts`, `lib/api/mock-recall.ts`.
- Contract source of truth: `api/openapi.yaml` (unchanged by this batch).
- Phase 1 closeout: `.planning/phases/FSMA-01-contract-gate-and-examples/CLOSEOUT.md`.
- Prior verification history: deltas `0008`, `0014`, `0015`, `0019`.
- This batch: `ops/deltas/0024-phase-2-verification-scope-documentation.md`.
