# Batch 27 - MockRecall Record Source Of Truth

## Goal

Refactor Phase 1 of the approved 3-phase architecture deepening plan: collapse the lib-internal duplication in `lib/api/mock-recall.ts` so the readiness packet CSV is derived from the MockRecall fixture record via a pure projection (`toPacketCsv`), instead of a hand-maintained parallel string literal. The change is byte-identical and behavior-preserving. It is a contract-fidelity refactor, not production CSV generation.

## Files Inspected

- `lib/api/mock-recall.ts`
- `lib/api/generated/openapi-types.ts` (read-only; `MockRecallDetail` shape)
- `api/openapi.yaml` (read-only oracle; packet CSV example block scalar)
- `tests/mock-recall-contract-smoke.mjs` (read-only oracle; pins runtime CSV bytes)
- `package.json` (scripts)
- latest `ops/deltas/`

## Files Changed In Batch 27

- `lib/api/mock-recall.ts` (added internal `toPacketCsv(detail)`; replaced the hand-written `mockRecallPacketCsv` literal with `toPacketCsv(mockRecallContractFixture)`)
- `ops/deltas/0027-mock-recall-record-source-of-truth.md` (new, this file)

Pre-existing uncommitted planning/docs files from the Phase 3 kickoff batches remain present and were not staged or reverted.

## Design Change

`lib/api/mock-recall.ts` previously held two independent representations of the same MockRecall record: the structured `mockRecallContractFixture` object and a hand-typed `mockRecallPacketCsv` string. Any field change required editing both by eye, with the smoke test as the only drift tripwire.

The packet CSV is now a function of the record:

- `toPacketCsv(detail)` reads exactly five fields — `mockRecallId`, `scope.traceabilityLotCode`, `scope.productDescription`, `readinessSummary.humanReviewRequired` (rendered via `String(...)`), and `status` — emits the fixed `fda_style_sortable_csv` header and a single comma-joined row, and joins `[header, row, ""]` with `"\r\n"` (CRLF + trailing empty line).
- `mockRecallPacketCsv` is now `toPacketCsv(mockRecallContractFixture)`.

The projection is deliberately fixture-scoped with no CSV escaping/quoting and no I/O. Production CSV generation over arbitrary or persisted records (escaping, multiple rows, real data) remains deferred to the export phase. The smoke test and the OpenAPI example remain independent oracles and were not made to depend on the projection.

## Byte-Identity

Substituting the fixture's values into `toPacketCsv` yields the exact prior bytes:

```
mock_recall_id,traceability_lot_code,product_description,human_review_required,readiness_status\r\n
contract-fixture-ready-for-review,TLC-FC-2026-05-READY,Fresh-cut melon cup,true,ready_for_human_review\r\n
```

No fixture cell contains a comma, quote, CR, or LF, so the absence of escaping cannot diverge from the prior literal. The runtime bytes the smoke test pins (CRLF + trailing line) are reproduced exactly.

## Contract And Runtime Impact

Runtime: byte-identical. The packet CSV route response and the detail route response are unchanged.

This batch did not modify:

- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `app/`
- `tests/`
- `.github/`
- `package.json`
- `package-lock.json`
- dependencies

`git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json` returned no output. The only code file changed was `lib/api/mock-recall.ts`.

## Verification Commands And Results

- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml` and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js 16.2.6 production build completed and listed the MockRecall API routes.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`

## Rollback Path

Revert only:

- `lib/api/mock-recall.ts` (restore the inline `mockRecallPacketCsv` literal)
- `ops/deltas/0027-mock-recall-record-source-of-truth.md`

This removes the projection without touching OpenAPI, generated types, package/dependency files, CI workflows, the smoke test, or any other runtime surface.

## Next Smallest Step

Phase 2 of the plan: reshape `lib/api/problem.ts` into a named Problem Details catalog seam with one `notFound` entry, re-expressing `mockRecallNotFoundResponse` as a thin wrapper, keeping the 404 response bytes identical. Documented in Batch 28.
