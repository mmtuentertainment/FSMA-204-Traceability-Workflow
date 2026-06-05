# Architecture

> Last updated: 2026-06-04. Reflects the "Batch 58" working state; the source it describes lands on `main` via the phase-3 PR (#12).

The FSMA 204 Workflow Product is a Next.js (App Router) + TypeScript service for food-traceability recall readiness. OpenAPI is the source of truth at `api/openapi.yaml`; the runtime is deliberately fixture-only / scaffold-stage. Three API route handlers are wired today, all under `app/api/traceability/**`. The recently-added provider-neutral security/persistence boundary (`lib/security/**`, `lib/api/**`) and the Drizzle + Postgres provider adapters (`lib/db/**`) exist behind seams; production auth, storage, imports, exports, and CSV generation are explicitly out of scope.

## System Overview

```
                          INBOUND HTTP (Request)
                                   |
   +-------------------------------+--------------------------------+
   |                               |                                |
   v                               v                                v
+--------------------------+  +-----------------------------+  +---------------------------+
| app/api/traceability/    |  | app/api/traceability/       |  | app/api/traceability/     |
|   mock-recalls/          |  |   mock-recalls/.../         |  |   exceptions/             |
|   [mockRecallId]/        |  |   packet.csv/route.ts (GET) |  |   [exceptionId]/route.ts  |
|   route.ts (GET)         |  | mock_recall.packet.read     |  |   (PATCH)                 |
| mock_recall.read         |  +--------------+--------------+  | exception.review.update   |
+------------+-------------+                 |                  +-------------+-------------+
             |                               |                                |
             v                               v                                | (inlined,
   +------------------------------------------------------+                    |  not via
   | READ BOUNDARY                                        |                    |  read boundary)
   | lib/api/route-boundary.ts :: handleReadAction()      |                    |
   |  1. resolver.resolve(request)  -> RequestContext     |                    |
   |  2. policy.authorize(ctx, action) (deny-by-default)  |                    v
   |  3. load(ctx) (tenant-scoped) -> value | null        |     +----------------------------------------+
   |  4. render(value) | Problem Details                  |     | WRITE PATH (assembled in route.ts)     |
   +------+-----------------------+-----------------------+     |  1. fixtureAuthContextResolver.resolve |
          |                       |                             |  2. fixtureExceptionReviewPolicy       |
          v                       v                             |  3. idempotency-key validation         |
+-----------------------+  +---------------------------+        |  4. readExceptionPatch (validate)      |
| lib/security/         |  | lib/security/             |        |  5. idempotencyStore.check()           |
| request-context.ts    |  | authorization.ts          |        |  6. repository.applyReview()           |
| (RequestContextResolver)| | (AuthorizationPolicy)    |        |  7. auditSink.append()                 |
| publicFixtureContext- |  | publicFixturePolicy       |        |  8. idempotencyStore.storeSuccess()    |
| Resolver              |  | fixtureExceptionReview-   |        +-------------------+--------------------+
| fixtureAuthContext-   |  |   Policy                  |                            |
| Resolver              |  +---------------------------+                            v
+-----------------------+                                       +----------------------------------------+
          |                                                     | lib/api/exception-review.ts            |
          v                                                     |  FixtureExceptionReviewRepository      |
+----------------------------+    +-------------------------+    |  fixtureExceptionReviewIdempotencyStore|
| lib/api/mock-recall-       |    | lib/api/problem.ts      |    |  fixtureExceptionReviewAuditSink       |
|   source.ts                |    |  problemResponse +      |    |  (in-memory, from lib/security/        |
| (MockRecallSource seam,    |    |  PROBLEM_CATALOG (RFC   |    |   idempotency-audit.ts shapes)         |
|  tenant guard)             |    |  9457 Problem Details)  |    +-------------------+--------------------+
+------------+---------------+    +-------------------------+                        |
             |                                                                      |
             v                                                                      v
+----------------------------+                                  +----------------------------------------+
| lib/api/mock-recall.ts     |                                  | lib/shared/canonical-json.ts           |
| (in-memory contract        |                                  | (stableStringify - shared by api +     |
|  fixture + derived CSV)     |                                  |  db request hashers)                   |
+----------------------------+                                  +----------------------------------------+

  Types for all of the above are generated from api/openapi.yaml into
  lib/api/generated/openapi-types.ts  (npm run api:types ; never hand-edited).

  DORMANT PROVIDER FOUNDATION (compiled + tested, NOT wired into any route):
  +---------------------------+  +---------------------------+  +---------------------------+
  | lib/db/client.ts          |  | lib/db/exception-review-  |  | lib/db/schema.ts          |
  | (pg.Pool + drizzle,       |  |   provider.ts             |  | (Drizzle pg-core tables)  |
  |  lazy getDb())            |  | (SQL transaction: RBAC,   |  | tenant_memberships,       |
  +---------------------------+  |  tenant-scoped review,    |  | audit_events,             |
                                 |  durable idempotency,     |  | traceability_exceptions,  |
                                 |  persisted audit)         |  | idempotency_records       |
                                 +---------------------------+  +-------------+-------------+
                                                                              |
                                                       lib/db/migrations/ (drizzle-kit SQL)
```

## Component Responsibilities

| Component | Responsibility | File |
|---|---|---|
| MockRecall detail route | `GET` handler; delegates to the read boundary with `mock_recall.read`, renders `MockRecallDetail` JSON | `app/api/traceability/mock-recalls/[mockRecallId]/route.ts` |
| MockRecall packet route | `GET` handler; delegates to the read boundary with `mock_recall.packet.read`, renders `text/csv` | `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts` |
| Exception-review route | `PATCH` handler; assembles the full write path inline (auth, RBAC, idempotency, repository, audit) | `app/api/traceability/exceptions/[exceptionId]/route.ts` |
| Read boundary | Owns the leak-safe read order: resolve context, authorize action class, tenant-scoped load, map failures to Problem Details | `lib/api/route-boundary.ts` |
| Request-context resolver | Seam producing server-derived `RequestContext` (tenant, principal, route); two fixture adapters | `lib/security/request-context.ts` |
| Authorization policy | Deny-by-default `authorize(ctx, action)` over an `Action` union; public-fixture + exception-review fixture adapters | `lib/security/authorization.ts` |
| MockRecall source seam | Tenant-scoped `MockRecallSource` interface + in-memory fixture adapter; cross-tenant miss returns `null` | `lib/api/mock-recall-source.ts` |
| MockRecall fixture data | Single contract fixture record + derived packet CSV projection | `lib/api/mock-recall.ts` |
| Problem Details catalog | RFC 9457 `Problem` serializer + named catalog (404/401/403/409/422/429) | `lib/api/problem.ts` |
| Exception-review fixtures | In-memory repository, idempotency store, audit sink instances; patch parsing + request fingerprint | `lib/api/exception-review.ts` |
| Idempotency/audit shapes | Interfaces (`AuditSink`, `IdempotencyStore`, `IdempotencyScope`, `AuditEvent`) + in-memory fixture implementations | `lib/security/idempotency-audit.ts` |
| Rate-limit seam (optional) | `RateLimiter` interface + `RateLimitScope`/`RateLimitDecision` (allow \| deny + `retryAfterSeconds`), `noopRateLimiter`, and `FixtureFixedWindowRateLimiter` (injected clock); shape-only, no route wiring | `lib/security/rate-limit.ts` |
| Canonical JSON | `stableStringify` / `isPlainObject` — single source of truth for request hashing in both `lib/api` and `lib/db` | `lib/shared/canonical-json.ts` |
| Generated contract types | `openapi-typescript` output consumed via `components["schemas"][...]`; treated as generated | `lib/api/generated/openapi-types.ts` |
| DB client | Lazy `pg.Pool` + Drizzle client behind `getDb()`; requires `DATABASE_URL` | `lib/db/client.ts` |
| Exception-review provider | Postgres transaction implementing tenant-membership RBAC, tenant-scoped review, durable idempotency, persisted audit | `lib/db/exception-review-provider.ts` |
| Drizzle schema | `pgTable` definitions for the four foundation tables, indexes, and CHECK constraints | `lib/db/schema.ts` |
| Drizzle migrations | drizzle-kit-generated SQL + meta snapshots for the schema | `lib/db/migrations/**` |
| App shell | Root layout + placeholder home page (no product UI) | `app/layout.tsx`, `app/page.tsx` |

## Pattern Overview

- **OpenAPI-first / contract-as-source-of-truth.** `api/openapi.yaml` is authoritative; `lib/api/generated/openapi-types.ts` is generated by `npm run api:types` and consumed everywhere via `components["schemas"][...]` type aliases. Runtime fixtures (`lib/api/mock-recall.ts`, `lib/api/exception-review.ts`) are typed against the generated types so they cannot drift from the contract.
- **Provider-neutral seams (ports & adapters).** Each cross-cutting concern is an `interface` with one or more fixture adapters: `RequestContextResolver`, `AuthorizationPolicy`, `MockRecallSource`, `AuditSink`, `IdempotencyStore`, `RateLimiter`. Routes depend on the interface; a production adapter slots in without touching routes.
- **Dependency injection via defaults.** `handleReadAction` takes a `deps?: Partial<BoundaryDeps>` and merges over `defaultBoundaryDeps` (`publicFixtureContextResolver` + `publicFixturePolicy`), so tests can inject alternates while live routes use the defaults.
- **Deny-by-default authorization.** `Action` is a closed union; `authorize` returns `{ allowed: false, reason }` for anything not explicitly allowed.
- **Leak-safe ordering.** Authorize the action class first (401/403); only then a tenant-scoped miss becomes 404 — resource existence is never leaked across tenants.
- **Idempotency + append-only audit pairing.** Every mutating write is scoped by `{ tenantId, actorId, action, resourceRef, key, requestFingerprint }` and pairs a replay/conflict check with an audit append.
- **Catalog seam for errors.** `PROBLEM_CATALOG` centralizes RFC 9457 `type/title/status`; call sites attach only `detail`/`instance`.
- **Fixture-only runtime.** All persistence is in-memory `Map`s/arrays; the Postgres provider in `lib/db/**` is compiled and integration-tested but not invoked by any route.

## Layers

1. **Contract layer** — `api/openapi.yaml` (authoritative) → `lib/api/generated/openapi-types.ts` (generated). Validated by `npm run api:check`.
2. **Route layer (entry points)** — `app/api/traceability/**/route.ts`. Thin handlers; the GETs delegate to the read boundary, the PATCH assembles its pipeline inline.
3. **Boundary / security layer** — `lib/api/route-boundary.ts` plus `lib/security/**` (context resolution, authorization, idempotency/audit shapes).
4. **Data-seam layer** — `lib/api/mock-recall-source.ts` (read seam) and `lib/api/exception-review.ts` (write fixtures). Tenant ownership lives here.
5. **Fixture data layer** — `lib/api/mock-recall.ts` (read fixture + CSV) and the in-memory stores in `lib/api/exception-review.ts`.
6. **Error layer** — `lib/api/problem.ts` (cross-cuts the route + boundary layers).
7. **Persistence provider layer (dormant)** — `lib/db/**` + `drizzle.config.ts` + `lib/db/migrations/**`. Not on any request path; exercised only by the db test suites (`tests/db/**` plus `tests/db-client-import.test.ts`, the import-safety guard for `lib/db/client.ts`).
8. **Shared utilities** — `lib/shared/canonical-json.ts`, shared by the api and db request hashers.

## Data Flow

### Primary Request Path — MockRecall read (`GET /api/traceability/mock-recalls/{mockRecallId}`)

1. Next.js routes to `app/api/traceability/mock-recalls/[mockRecallId]/route.ts:8` (`GET`); awaits `params` to read `mockRecallId` (`route.ts:12`).
2. Handler calls `handleReadAction({ action: "mock_recall.read", resourceId: mockRecallId, load, render })` (`route.ts:14`).
3. `lib/api/route-boundary.ts:46` merges `defaultBoundaryDeps` (resolver = `publicFixtureContextResolver`, policy = `publicFixturePolicy`).
4. `resolver.resolve(request)` → `lib/security/request-context.ts:73` returns a `RequestContext` with `tenant.tenantId = "public-fixture"`, `principal.actorId = "anonymous"`, `route = URL pathname` (`route-boundary.ts:47`).
5. `policy.authorize(ctx, "mock_recall.read")` → `lib/security/authorization.ts:32`; `PUBLIC_ALLOWED` contains the action, so `{ allowed: true }` (`route-boundary.ts:50`).
6. `load(ctx)` calls `fixtureMockRecallSource.getDetail(ctx.tenant.tenantId, mockRecallId)` → `lib/api/mock-recall-source.ts:22`. The tenant guard passes (tenant is `public-fixture`), so it calls `getMockRecallDetail(mockRecallId)` (`route.ts:19`).
7. `lib/api/mock-recall.ts:55` returns the contract fixture iff `mockRecallId === "contract-fixture-ready-for-review"`, else `null`.
8. If `value === null`, `route-boundary.ts:59` returns `mockRecallNotFoundResponse(resourceId, instance)` → `lib/api/problem.ts:39` (404 `application/problem+json`). Otherwise `render(value)` runs `Response.json(detail)` (`route.ts:20`).

The packet route (`packet.csv/route.ts`) is identical with `action: "mock_recall.packet.read"`, `load` calling `getPacketCsv`, and a `text/csv` render.

### Primary Request Path — exception-review write (`PATCH /api/traceability/exceptions/{exceptionId}`)

This path is assembled inline in the route (it does not use `handleReadAction`).

1. Next.js routes to `app/api/traceability/exceptions/[exceptionId]/route.ts:27` (`PATCH`); awaits `params` for `exceptionId` (`route.ts:31`).
2. `fixtureAuthContextResolver.resolve(request)` → `lib/security/request-context.ts:103`. In non-production it reads the `Bearer` token and maps it through `FIXTURE_AUTH_TOKENS` to a server-derived tenant/role context; an unknown/missing token yields an unauthenticated context (`request-context.ts:90`). `instance = ctx.route` (`route.ts:33`).
3. `fixtureExceptionReviewPolicy.authorize(ctx, "exception.review.update")` → `lib/security/authorization.ts:40`: denies `unauthenticated` (401) unless authenticated; requires the `reviewer` role else `forbidden` (403) (`route.ts:35`-40).
4. Idempotency-Key header is validated for presence and length 8–200, else `validationErrorResponse` (422) (`route.ts:42`-52).
5. `readExceptionPatch(request)` → `lib/api/exception-review.ts:106` parses JSON, rejects unknown fields, and validates `status`/`review_reason`/`review_notes`/`human_review_required`; failure → 422 (`route.ts:54`-57).
6. An `idempotencyScope` is built (`route.ts:60`) with `requestFingerprint(patchResult.patch)` (`exception-review.ts:157` → `stableStringify`).
7. `fixtureExceptionReviewIdempotencyStore.check(scope)` → `lib/security/idempotency-audit.ts:63`. `replayed` returns the stored response; `conflict` → `conflictResponse` (409) (`route.ts:68`-80).
8. `fixtureExceptionReviewRepository.applyReview(tenantId, exceptionId, patch)` → `lib/api/exception-review.ts:65`. A tenant-scoped `Map` miss → `not_found` → `exceptionNotFoundResponse` (404) (`route.ts:82`-90).
9. `fixtureExceptionReviewAuditSink.append({...beforeState, afterState...})` → `lib/security/idempotency-audit.ts:99` records append-only audit evidence (`route.ts:92`-114).
10. `fixtureExceptionReviewIdempotencyStore.storeSuccess(scope, record)` (`route.ts:115`) then `Response.json(update.record)` returns the updated `ExceptionRecord` (`route.ts:120`).

The parallel **persisted** write path lives in `lib/db/exception-review-provider.ts:564` (`reviewTraceabilityExceptionWithProvider`) — RBAC via `getActiveTenantMembership`, an **optional rate-limit checkpoint** (`request.limiter?.check(...)`, after RBAC and before the reservation: a `deny` short-circuits to a `rate_limited` outcome writing no rows; absent/permissive limiter leaves the path byte-identical — `exception-review-provider.ts:590`), `reserveIdempotencyRecord` (INSERT … ON CONFLICT DO NOTHING + `FOR UPDATE`), `applyTenantScopedExceptionReview` (`SELECT … FOR UPDATE` then `UPDATE`), `appendExceptionReviewAuditEvent`, `completeIdempotencyRecord` — but no route invokes it; it is reached only by `tests/db/**`.

## Key Abstractions

- **`RequestContext` / `RequestContextResolver`** (`lib/security/request-context.ts:20`,`:31`) — server-derived identity; tenant is never taken from request bodies/queries/route params/arbitrary headers.
- **`Action` union + `AuthorizationPolicy`** (`lib/security/authorization.ts:11`,`:20`) — closed set of action classes authorized before any load.
- **`MockRecallSource`** (`lib/api/mock-recall-source.ts:13`) — tenant-scoped read seam; cross-tenant miss → `null`.
- **`IdempotencyStore` / `IdempotencyScope` / `AuditSink` / `AuditEvent`** (`lib/security/idempotency-audit.ts`) — the mutating-write seams.
- **`RateLimiter` / `RateLimitScope` / `RateLimitDecision`** (`lib/security/rate-limit.ts:14`,`:26`,`:37`) — optional per-action rate-limit checkpoint seam; `noopRateLimiter` default + `FixtureFixedWindowRateLimiter` for tests; consumed only by the persisted provider's optional `request.limiter`.
- **`BoundaryDeps`** (`lib/api/route-boundary.ts:28`) — injectable resolver+policy with fixture defaults.
- **Generated `components["schemas"]` aliases** — e.g. `MockRecallDetail`, `ExceptionRecord`, `ExceptionPatch`, `Problem` pulled from `lib/api/generated/openapi-types.ts`.
- **`ProviderExceptionReviewOutcome`** (`lib/db/exception-review-provider.ts:97`) — the discriminated union the persisted provider returns (`accepted`/`replayed`/`conflict`/`in_flight`/`rate_limited`/`forbidden`/`not_found`/`validation_error`).

## Entry Points

- **HTTP routes** (the only live runtime entry points):
  - `app/api/traceability/mock-recalls/[mockRecallId]/route.ts` — `GET`.
  - `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts` — `GET`.
  - `app/api/traceability/exceptions/[exceptionId]/route.ts` — `PATCH`.
- **App shell:** `app/layout.tsx` (root layout), `app/page.tsx` (placeholder page).
- **Tooling / config entry points:** `drizzle.config.ts` (drizzle-kit), `next.config` is absent (Next defaults), `package.json` scripts (`dev`, `build`, `start`, `typecheck`, `api:*`, `db:*`, `test:*`, `fallow:ci`).
- **Test entry points** (declared as fallow reachability roots in `.fallowrc.jsonc` via the globs `tests/**/*.test.ts`, `tests/**/*.test.mts`, `tests/**/*.mjs`, `scripts/**/*.mjs`): `tests/exception-review-patch.test.ts`, `tests/db/exception-review-provider-a1.test.ts` through `tests/db/exception-review-provider-a5.test.ts`, `tests/db-client-import.test.ts`, `tests/mock-recall-contract-smoke.mjs`, and `scripts/*.mjs` (coverage tooling).
- **CI entry point:** `.github/workflows/contract-gate.yml` (two jobs: `verify` and `db-provider-tests`).

## Architectural Constraints

- **OpenAPI is authoritative; generated types are never hand-edited** (`lib/api/generated/openapi-types.ts`). `npm run api:types:check` enforces freshness.
- **Tenant identity is server-derived only** — documented at the top of `lib/security/request-context.ts`; adapters must not trust client-supplied tenant values.
- **Deny-by-default authorization** — `Action` is a closed union; new actions are denied until explicitly allowed.
- **Fixture-only runtime / scaffold stage** — no production auth, persistence, imports, exports, or CSV generation; the Postgres provider is dormant. `.fallowrc.jsonc` keeps `unused-*` rules at `warn` for this reason.
- **Node `>=22.6`** (`package.json` engines); type-stripped tests run via `node --experimental-strip-types`.
- **Structural-correctness gates are hard errors** — fallow `circular-dependencies`, `unresolved-imports`, `unlisted-dependencies`, `duplicate-exports`, `boundary-violation` are `error`; CI runs `fallow audit --fail-on-issues` and an agent `PreToolUse` hook (`.claude/hooks/fallow-gate.sh`) blocks commits on `verdict: fail`.
- **Conservative FSMA posture** — no compliance/legal/FDA-endorsement claims (README, `.planning/STATE.md` guardrails).
- **No path alias** — relative imports are used throughout (the optional `@/*` alias is deferred per `.planning/STATE.md`).

## Anti-Patterns (avoid)

- **Calling fixtures/storage directly from a route.** Go through the seams (`MockRecallSource`, the repository/idempotency/audit instances). Persistence ownership lives behind one interface so the provider can slot in later (`lib/api/mock-recall-source.ts` header comment).
- **Hand-editing `lib/api/generated/openapi-types.ts`.** Regenerate from `api/openapi.yaml`.
- **Reading tenant identity from the request.** Tenant comes only from the resolver.
- **Deriving 404 before 401/403.** Authorize first; only then map a tenant-scoped miss to 404 (the leak-safe order in `route-boundary.ts`).
- **Duplicating canonical JSON.** Both hashers must import `stableStringify` from `lib/shared/canonical-json.ts` (it was extracted to remove byte-identical copies fallow flagged).
- **Re-deciding Problem `type/title/status` at a call site.** Use `PROBLEM_CATALOG`.
- **Wiring the Postgres provider into a route without an approved batch.** The provider is intentionally dormant.

## Error Handling

- **RFC 9457 Problem Details** are the single error vocabulary. `problemResponse` (`lib/api/problem.ts:7`) serializes any `Problem` with `Content-Type: application/problem+json` and `status` from the body. The named catalog covers `notFound` (404), `unauthorized` (401), `forbidden` (403), `conflict` (409), `validationError` (422), `rateLimited` (429); `unauthorizedResponse` also sets `WWW-Authenticate: Bearer`, and `rateLimitedResponse` (`lib/api/problem.ts:100`) sets an integer `Retry-After` (clamped to a whole second ≥ 1).
- **Read boundary mapping** (`lib/api/route-boundary.ts`): deny → 401 (`unauthenticated`) or 403; `null` load → 404. Success is whatever the handler's `render` returns.
- **Write path mapping** (exception route): unauthenticated → 401, non-reviewer → 403, bad idempotency key or invalid patch → 422, idempotency fingerprint mismatch → 409, tenant-scoped miss → 404; replay returns the stored success body.
- **Persisted provider errors** (`lib/db/exception-review-provider.ts`) return a discriminated `ProviderExceptionReviewOutcome`; idempotency conflicts produce a structured `ProviderProblemDetails` (409) and an error audit row. Transactions are wrapped by `withProviderExceptionReviewTransaction` (BEGIN/COMMIT/ROLLBACK, `lib/db/exception-review-provider.ts:159`).
- **DB client** throws if `DATABASE_URL` is unset (`lib/db/client.ts:25`).
- **Body parsing**: `readExceptionPatch` catches JSON parse errors and rejects non-object bodies and unknown fields with a 422 detail string.

## Cross-Cutting Concerns

- **Authorization** — `lib/security/authorization.ts`, applied before any load/write.
- **Tenant scoping** — enforced in `lib/api/mock-recall-source.ts` (guard) and in the repository key `tenantId|exceptionId` (`lib/api/exception-review.ts:54`); in the provider via `WHERE tenant_id = $1`.
- **Idempotency** — `lib/security/idempotency-audit.ts` (in-memory) and `idempotency_records` table + `reserveIdempotencyRecord`/`completeIdempotencyRecord` (durable).
- **Audit** — append-only `AuditSink` (in-memory) and the `audit_events` table + append functions (persisted), capturing before/after state.
- **Canonical hashing** — `lib/shared/canonical-json.ts` underpins both the api request fingerprint and the provider `computeExceptionReviewRequestHash` (SHA-256 over `stableStringify`).
- **Contract conformance** — `npm run api:check` (Redocly lint + generated-types freshness) and `tests/mock-recall-contract-smoke.mjs`.
- **Codebase intelligence / commit gates** — fallow (`.fallowrc.jsonc`, `.mcp.json` `fallow-mcp`, `.claude/hooks/fallow-gate.sh`, CI `fallow:ci`) catches circular deps, boundary violations, dupes, and complexity; runtime coverage is fed in via `FALLOW_COVERAGE=coverage/provider/coverage-final.json`.
- **Schema/migration safety** — `npm run db:check` (drizzle-kit check + `tests/db-client-import.test.ts`); the `db-provider-tests` CI job applies migrations to a disposable Postgres and runs the provider suites under coverage.
