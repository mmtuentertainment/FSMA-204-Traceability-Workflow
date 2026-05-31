# Batch 29 - Boundary Skeleton (Phase 3, Variant A)

## Goal

Refactor Phase 3 of the approved 3-phase architecture deepening plan and the first code-bearing Phase 3 slice: introduce a provider-neutral boundary skeleton (server-derived request context, deny-by-default action authorization, a tenant-scoped MockRecall data seam, and idempotency/audit interface shapes) and route the two existing GET handlers through it. Fixture success and 404 behavior are preserved byte-identically. This realizes the "next smallest code-bearing candidate" described in `KICKOFF.md` and `03-01A-boundary-decision.md`.

## Approval Reference

Matt approved a code-bearing batch with this exact file scope, validation, and rollback (the 3-phase plan, Phase 3 = Variant A). The slice proves request context, authorization policy shape, idempotency/audit interfaces, and persistence ownership **without** wiring routes to production storage, **without** changing MockRecall success behavior, and reversibly without any OpenAPI change.

## Files Inspected

- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`
- `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`
- `lib/api/mock-recall.ts`, `lib/api/problem.ts`
- `lib/api/generated/openapi-types.ts` (read-only)
- `api/openapi.yaml` (read-only; declares bearerAuth, Idempotency-Key, and 401/403/404/409/422/429 responses)
- `tests/mock-recall-contract-smoke.mjs` (read-only oracle, unedited)
- `tsconfig.json`
- `.planning/phases/FSMA-03-security-and-persistence-foundation/KICKOFF.md`, `03-01A-boundary-decision.md`

## Files Changed In Batch 29

New (pure types + functions; no deps, no I/O, no provider, no storage):
- `lib/security/request-context.ts` — `Principal`, `TenantContext` (server-derived), `RequestContext`, `RequestContextResolver`; default `publicFixtureContextResolver` + `PUBLIC_FIXTURE_TENANT_ID`.
- `lib/security/authorization.ts` — `Action`, `AuthorizationDecision`, `AuthorizationPolicy`; deny-by-default `publicFixturePolicy` (read actions explicitly allowed).
- `lib/api/mock-recall-source.ts` — `MockRecallSource` tenant-scoped seam; `fixtureMockRecallSource` adapter over the existing fixture getters.
- `lib/api/route-boundary.ts` — `handleReadAction(...)` + `defaultBoundaryDeps`.
- `lib/security/idempotency-audit.ts` — `AuditEvent`/`AuditSink`/`IdempotencyScope`/`IdempotencyCheck`/`IdempotencyStore` shapes + `noopAuditSink` (uninvoked).

Edited:
- `lib/api/problem.ts` — additive `unauthorizedResponse` (401) + `forbiddenResponse` (403) and their catalog entries; `mockRecallNotFoundResponse` and `problemResponse` unchanged.
- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts` — routed through `handleReadAction` (`mock_recall.read`).
- `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts` — routed through `handleReadAction` (`mock_recall.packet.read`).

This file (`ops/deltas/0029-boundary-skeleton.md`) and the truth surfaces below.

Pre-existing uncommitted planning/docs files from earlier Phase 3 kickoff batches remain present and were not staged or reverted.

## Design

Four seams, each with one default "fixture is public" adapter so live behavior is identical:

1. **Request context** — `RequestContextResolver` resolves a server-owned `RequestContext`; `publicFixtureContextResolver` yields a single implicit server-derived tenant (`PUBLIC_FIXTURE_TENANT_ID`) and never throws.
2. **Authorization** — deny-by-default `AuthorizationPolicy`; `publicFixturePolicy` allows exactly the two read actions, denies everything else by default.
3. **Data ownership** — `MockRecallSource` is tenant-scoped; `fixtureMockRecallSource` gates on the public tenant and a cross-tenant lookup returns `null` (leak-safe).
4. **Idempotency/audit** — interface shapes only; nothing invokes them. Current routes are read-only GETs, so idempotency/audit (which pair with mutating writes) are deferred to the first approved mutating-write batch.

`handleReadAction` orders the checks leak-safely: resolve context → authorize the action class (401/403) → tenant-scoped load → `null` becomes 404 (`notFound`), never 403, so resource existence is not leaked across tenants. The 404 detail interpolates the real `mockRecallId` (passed as `resourceId`), guaranteeing byte-identity. The 401/403 branches are dormant for the public fixture (the policy allows the read actions) and become live only when a non-public resolver/policy is wired in a future approved batch.

## Behavior Preservation

Detail JSON (`application/json`), packet CSV (`text/csv; charset=utf-8`, byte-identical body), and 404 Problem Details (`application/problem+json`, exact `type`/`title`/`status`/`detail`/`instance`) are unchanged. The smoke test ran **unedited** and passed — that is the behavior-preservation proof.

## Contract And Runtime Impact

Runtime: byte-identical for all paths the smoke test exercises. No new runtime failure path is reachable with the public-fixture defaults.

This batch did not modify:

- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `tests/`
- `.github/`
- `package.json`, `package-lock.json`, dependencies
- `tsconfig.json` (the optional `@/*` alias task was deferred)
- any database, schema, migration, repository, middleware, auth provider, or storage code

`git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json tests/ .github/` returned no output. `git diff --check` is clean.

## Verification Commands And Results

- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml` and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js 16.2.6 production build completed and listed both MockRecall API routes.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`

## Rollback Path

Revert the two route files and `lib/api/problem.ts` to their pre-batch form, and delete the five new `lib/` modules plus this delta and the truth-surface edits:

- delete `lib/security/request-context.ts`, `lib/security/authorization.ts`, `lib/security/idempotency-audit.ts`, `lib/api/mock-recall-source.ts`, `lib/api/route-boundary.ts`
- revert `lib/api/problem.ts`, the two `route.ts` files
- revert truth-surface edits and delete `ops/deltas/0029-boundary-skeleton.md`

OpenAPI, generated types, package/dependency files, CI workflows, and the smoke test were never in scope, so the system returns to current `main` runtime behavior with the full gate green.

## Next Smallest Step

Phase 3 is not complete — only the boundary skeleton slice landed. The next approved batch is the first mutating-write path, which activates `IdempotencyStore` + `AuditSink` and a non-public `RequestContextResolver`/`AuthorizationPolicy`, and selects a persistence and auth provider. Optionally, a small follow-up may add a `@/*` tsconfig path alias (plan task P3-T9, deferred here).
