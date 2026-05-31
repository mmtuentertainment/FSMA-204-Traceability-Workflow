# Batch 28 - Problem Details Catalog Structure

## Goal

Refactor Phase 2 of the approved 3-phase architecture deepening plan: reshape `lib/api/problem.ts` into a named Problem Details catalog seam. Introduce a `PROBLEM_CATALOG` that owns the canonical `type`/`title`/`status` for each error class, and re-express `mockRecallNotFoundResponse` as a thin wrapper over the `notFound` entry. Behavior-preserving and byte-identical for the 404 response. One entry today; the Phase 3 request boundary adds auth entries behind the same seam.

## Files Inspected

- `lib/api/problem.ts`
- `lib/api/generated/openapi-types.ts` (read-only; `Problem` schema)
- `api/openapi.yaml` (read-only; declares Unauthorized/Forbidden/NotFound/Conflict/ValidationError/RateLimited responses)
- `tests/mock-recall-contract-smoke.mjs` (read-only oracle; pins 404 Problem bytes)
- latest `ops/deltas/`

## Files Changed In Batch 28

- `lib/api/problem.ts` (added internal `PROBLEM_CATALOG` with a single `notFound` entry; re-expressed `mockRecallNotFoundResponse` to spread the catalog entry; `problemResponse` documented as the low-level primitive, signature unchanged)
- `ops/deltas/0028-problem-details-catalog-structure.md` (new, this file)

Pre-existing uncommitted planning/docs files from the Phase 3 kickoff batches remain present and were not staged or reverted.

## Design Change

`lib/api/problem.ts` previously built the 404 Problem inline inside `mockRecallNotFoundResponse`. The canonical `type`/`title`/`status` now live in a named catalog:

```ts
const PROBLEM_CATALOG = {
  notFound: { type: "about:blank", title: "Resource not found", status: 404 },
} as const;
```

`mockRecallNotFoundResponse` spreads `PROBLEM_CATALOG.notFound` and attaches per-call `detail`/`instance`. `problemResponse` remains the internal low-level primitive and keeps its signature.

This is grounded in the existing contract: `api/openapi.yaml` already declares `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `ValidationError`, and `RateLimited` responses, while code implements only the 404. The catalog is the home for that declared taxonomy. Per the plan, no speculative auth entries are added in this batch — only `notFound`.

## Byte-Identity

The spread emits keys in the order `type, title, status` (from the catalog entry), then `detail`, then `instance` — identical to the prior inline literal. `JSON.stringify` honors insertion order, so the serialized 404 body, the `status: 404`, and the `Content-Type: application/problem+json` header are byte-identical. The smoke test's `assertProblemDetails` passes unchanged for both the missing-detail and missing-packet routes.

## Contract And Runtime Impact

Runtime: byte-identical 404 Problem Details behavior. Success responses untouched.

This batch did not modify:

- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `app/`
- `tests/`
- `.github/`
- `package.json`
- `package-lock.json`
- dependencies

`git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json` returned no output. The only code file changed was `lib/api/problem.ts`.

## Verification Commands And Results

- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml` and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js 16.2.6 production build completed and listed the MockRecall API routes.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`

## Rollback Path

Revert only:

- `lib/api/problem.ts` (restore the inline-literal `mockRecallNotFoundResponse`)
- `ops/deltas/0028-problem-details-catalog-structure.md`

This removes the catalog structure without touching OpenAPI, generated types, package/dependency files, CI workflows, the smoke test, or any other runtime surface.

## Next Smallest Step

Phase 3 of the plan (approved Variant A boundary skeleton): introduce provider-neutral request-context, deny-by-default authorization, a `MockRecallSource` data seam, and a route boundary, then route the two GET handlers through it while preserving byte-identical fixture and 404 behavior. Adds `unauthorizedResponse`/`forbiddenResponse` entries to this catalog. Documented in Batch 29.
