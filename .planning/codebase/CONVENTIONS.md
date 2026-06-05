# Coding Conventions

**Analysis Date:** 2026-06-04

This repository is a Next.js (App Router) + TypeScript scaffold for an FSMA 204 food-traceability readiness workflow. OpenAPI at `api/openapi.yaml` is the source of truth; generated types live at `lib/api/generated/openapi-types.ts` and are **never hand-edited** (`api:types` regenerates them, and `.fallowrc.jsonc` ignores `lib/api/generated/**`). The runtime is deliberately fixture-only / scaffold-stage. There is **no ESLint, Prettier, or Biome config in the tree** — style is enforced by TypeScript `strict` mode, the `fallow` structural gate (`.fallowrc.jsonc`), and the conventions below as observed in `lib/**` and `app/**`.

## Naming Patterns

**Files:**
- kebab-case for all source modules: `lib/api/exception-review.ts`, `lib/api/route-boundary.ts`, `lib/db/exception-review-provider.ts`, `lib/security/idempotency-audit.ts`, `lib/shared/canonical-json.ts`.
- App Router conventions for routes: `route.ts` handlers under dynamic-segment dirs `app/api/traceability/exceptions/[exceptionId]/route.ts`; React entry files are `app/page.tsx`, `app/layout.tsx`.
- Config files keep their tool-mandated names: `drizzle.config.ts`, `tsconfig.json`, `.fallowrc.jsonc`.
- Tests are `*.test.ts` or `*.mjs` (see `TESTING.md`).

**Functions:**
- camelCase verbs for behavior: `handleReadAction`, `readExceptionPatch`, `resolveConnectionString`, `reserveIdempotencyRecord`, `stableStringify`, `computeExceptionReviewRequestHash`.
- Type guards are `isX` returning a TypeScript predicate: `isPlainObject(value): value is Record<string, unknown>` (`lib/shared/canonical-json.ts:10`), `isFixtureAuthRuntimeEnabled` (`lib/security/request-context.ts:64`).
- Async DB/provider functions read as full sentences describing the operation: `applyTenantScopedExceptionReview`, `getActiveTenantMembership`, `reviewTraceabilityExceptionInTransaction`, `appendExceptionReviewAuditEvent` (`lib/db/exception-review-provider.ts`).
- HTTP handlers are the uppercase verb Next.js requires: `export async function GET(...)`, `export async function PATCH(...)`.

**Variables:**
- camelCase for locals and parameters: `idempotencyKey`, `patchResult`, `resourceRef`, `connectionString`.
- SCREAMING_SNAKE_CASE for module-level constants and frozen/immutable sets: `FIXTURE_EXCEPTION_ID`, `PUBLIC_FIXTURE_TENANT_ID`, `EXCEPTION_REVIEW_OPERATION`, `IDEMPOTENCY_KEY_MIN_LENGTH`, `PROBLEM_CATALOG`, `STATUSES`, `PATCH_FIELDS`, `REPLAY_HEADER_ALLOWLIST`. (`IDEMPOTENCY_KEY_MIN_LENGTH`/`REPLAY_HEADER_ALLOWLIST` are module-private constants in `lib/db/exception-review-provider.ts`; `PUBLIC_FIXTURE_TENANT_ID`/`FIXTURE_EXCEPTION_ID` are exported.)
- Private class fields use `readonly` and camelCase: `private readonly records = new Map(...)` (`lib/api/exception-review.ts:59`), `private readonly entries` / `private readonly events` (`lib/security/idempotency-audit.ts`).

**Types:**
- PascalCase for interfaces and type aliases: `RequestContext`, `RequestContextResolver`, `AuthorizationPolicy`, `AuthorizationDecision`, `ProviderDbClient`, `ProviderExceptionReviewOutcome`, `BoundaryDeps`, `DbClient`.
- Domain shapes that mirror the OpenAPI contract are derived, never re-declared: `export type ExceptionRecord = components["schemas"]["ExceptionRecord"]` (`lib/api/exception-review.ts:9`); `type Problem = components["schemas"]["Problem"]` (`lib/api/problem.ts:3`); `type MockRecallDetail = components["schemas"]["MockRecallDetail"]` (`lib/api/mock-recall.ts:6`).
- String-literal unions express closed vocabularies: `type Action = "mock_recall.read" | "mock_recall.packet.read" | "exception.review.update"` (`lib/security/authorization.ts:11`); `ExceptionStatus`, `ExceptionReviewReason`, `TenantRole` (`lib/db/exception-review-provider.ts`), `PrincipalRole` (`lib/security/request-context.ts:12`).
- Discriminated unions on a `status` literal model outcomes and results: see `ProviderExceptionReviewOutcome` (`lib/db/exception-review-provider.ts:97`) and the `{ ok: true; ... } | { ok: false; detail: string }` result of `readExceptionPatch` (`lib/api/exception-review.ts:106`).
- DB row interfaces extend `QueryResultRow` and use snake_case keys to mirror column names: `interface ExceptionRow extends QueryResultRow { ... lot_id: string | null; ... }` (`lib/db/exception-review-provider.ts:124`).

## Code Style

**Formatting (no formatter config present — match the existing files):**
- 2-space indentation throughout.
- Double-quoted strings everywhere (`import { drizzle } from "drizzle-orm/node-postgres";`).
- Semicolons always.
- Trailing commas in multi-line literals, arrays, and parameter lists (e.g. `lib/db/exception-review-provider.ts` arg objects).
- ES module syntax only (`"module": "esnext"`, `"isolatedModules": true`); no CommonJS in source.

**TypeScript (`tsconfig.json`):**
- `"strict": true`, `"noEmit": true` (typecheck-only; Next compiles), `"target": "ES2017"`, `"moduleResolution": "bundler"`.
- `"allowImportingTsExtensions": true` — **intra-repo imports include the `.ts` extension** in modules consumed by the type-stripping test runner. Example: `import { stableStringify } from "../shared/canonical-json.ts"` (`lib/db/exception-review-provider.ts:5`), `import { fixtureAuthContextResolver } from "../../../../../lib/security/request-context.ts"` (PATCH route handler, `app/api/traceability/exceptions/[exceptionId]/route.ts:19`). Some sibling imports in `lib/api/route-boundary.ts`, `lib/api/mock-recall-source.ts`, and the MockRecall GET route handlers omit the extension; **prefer the explicit `.ts` extension** so a file is loadable by both Next and `node --experimental-strip-types`.
- `"jsx": "react-jsx"`; React 19 (`react`/`react-dom` `^19.2.6`) / Next 16 (`next` `^16.2.6`). `next` tsconfig plugin enabled.
- `"allowJs": false` — source is TS/TSX only. `.mjs` exists exclusively for the smoke/orchestration test and coverage scripts (`tests/mock-recall-contract-smoke.mjs`, `scripts/*.mjs`).

**Linting / structural gate (`fallow`, `.fallowrc.jsonc`):**
- There is no lint rule engine for style; `fallow` enforces *structure*. Structural-correctness rules are hard **errors**: `circular-dependencies`, `unresolved-imports`, `unlisted-dependencies`, `duplicate-exports`, `boundary-violation`. Scaffold-stage `unused-files`, `unused-exports`, `unused-types` are **warnings** (to be tightened to `error` as the product matures).
- Health thresholds are strict: `maxCyclomatic: 20`, `maxCognitive: 15`, `maxCrap: 30` (kept honest by the committed coverage snapshot, see `TESTING.md`). Keep new functions under these limits.
- A `PreToolUse` agent hook and the CI Contract Gate both run `fallow audit` and block on `verdict: fail`. Run `fallow audit --format json --quiet --explain` (append `|| true` for ad-hoc runs) before committing.

## Import Organization

**Order observed (group, blank-line separated):**
1. Node built-ins, prefixed `node:` — `import { createHash } from "node:crypto";` (`lib/db/exception-review-provider.ts:1`), `import assert from "node:assert/strict";` (tests).
2. Third-party packages — `import { drizzle } from "drizzle-orm/node-postgres";`, `import { Pool, type PoolConfig } from "pg";` (`lib/db/client.ts`).
3. Local/relative modules — `import * as schema from "./schema.ts";`, `import { stableStringify } from "../shared/canonical-json.ts";`.

**Type-only imports** use the `import type` form or inline `type` qualifier: `import type { components } from "./generated/openapi-types";`, `import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";`, and mixed `import { Pool, type PoolConfig } from "pg";`. Required because `isolatedModules` is on.

**Path style:** **No path aliases** — `tsconfig.json` defines no `paths`/`baseUrl`. All cross-module imports are deep relative paths (route handlers reach into `lib/` with `../../../../../lib/...`). When adding a route handler, count the segments to `lib/` and include the `.ts` extension.

## Error Handling

- **API errors are RFC 9457 Problem Details, always.** `lib/api/problem.ts` is the single seam: `problemResponse(problem, headers)` serializes any `Problem` with `Content-Type: application/problem+json`, and a named `PROBLEM_CATALOG` (`notFound`, `unauthorized`, `forbidden`, `conflict`, `validationError`) fixes `type`/`title`/`status`; callers attach per-call `detail`/`instance`. Use the named helpers (`exceptionNotFoundResponse`, `conflictResponse`, `validationErrorResponse`, `unauthorizedResponse`, `forbiddenResponse`, `mockRecallNotFoundResponse`) rather than constructing responses inline.
- **Result objects over thrown exceptions for expected control flow.** Validation and lookups return discriminated unions: `readExceptionPatch` returns `{ ok: true; patch } | { ok: false; detail }` (`lib/api/exception-review.ts:106`); the provider returns a `status`-tagged `ProviderExceptionReviewOutcome` covering `accepted | replayed | conflict | in_flight | rate_limited | forbidden | not_found | validation_error` (`lib/db/exception-review-provider.ts:97`). Callers branch on `status`/`ok`, never `try/catch` the happy path.
- **`throw new Error(...)` is reserved for invariant violations and misconfiguration**, with full-sentence messages: `"DATABASE_URL is required when creating the PostgreSQL database client."` (`lib/db/client.ts:27`), `"Expected one reserved idempotency record to complete."` (`lib/db/exception-review-provider.ts:466`), `"Completed idempotency record is missing its replay body."` (line 370).
- **`try/catch` is used at true boundaries:** parsing untrusted JSON (`await request.json()` in `readExceptionPatch`, catch → `{ ok: false, detail }`) and transaction lifecycle in `withProviderExceptionReviewTransaction` (`BEGIN` → run → `COMMIT`; on error `ROLLBACK` and re-throw; `finally` releases the client) (`lib/db/exception-review-provider.ts:159`).
- **Leak-safe ordering is mandatory:** authorize the action class first (401/403), then treat a tenant-scoped miss as 404 — never 403 — so resource existence is not leaked across tenants. Encoded in `handleReadAction` (`lib/api/route-boundary.ts:38`) and the PATCH handler (`app/api/traceability/exceptions/[exceptionId]/route.ts`).

## Logging

- **No logging framework.** Production code emits no logs. There is no logger dependency; `console` is not used in `lib/**` or `app/**` (verified — no matches).
- `console.log` / `console.error` appear **only in tests and scripts** as progress and diagnostic output: `console.log(\`PASS ${test.name}\`)` (test runners), structured error context in `tests/mock-recall-contract-smoke.mjs`, and `console.error(...)` before `process.exit` in `scripts/normalize-coverage.mjs` / `scripts/run-db-coverage.mjs`.
- Observability (error tracking, request logging) is out of scope at scaffold stage; add it behind a seam when a batch lifts that boundary.

## Comments

- **No JSDoc/TSDoc.** Comments are plain `//` line comments. No `@param`/`@returns` annotations anywhere — types carry that information.
- **File-header block comments state purpose, the seam contract, and scope boundaries.** Every non-trivial module opens with a multi-line `//` header. Examples: `lib/api/route-boundary.ts` (the read-path boundary contract and the leak-safe ordering rule), `lib/security/request-context.ts` ("Tenant identity is a server-owned property: adapters must resolve it from trusted auth/session ... never from request bodies"), `lib/security/idempotency-audit.ts` ("SHAPE ONLY ... nothing in this batch invokes these interfaces" — note the fixture exception-review PATCH route now does exercise the `FixtureIdempotencyStore`/`FixtureAuditSink` implementations), `lib/shared/canonical-json.ts` (why it was extracted to kill a `fallow` duplication finding).
- **Inline comments explain WHY, not what** — especially security/ordering invariants and scaffold seams: "// dormant for the current public fixture" (`lib/api/problem.ts:58`), "// Server-derived only." (`lib/security/request-context.ts:15`), "// no-op until an approved audit-storage batch provides a real sink." (`lib/security/idempotency-audit.ts:53`).
- **Scripts carry rich header rationale** documenting cross-OS/determinism reasoning (`scripts/normalize-coverage.mjs`, `scripts/run-db-coverage.mjs`).
- Keep comments current: `.fallowrc.jsonc` is itself heavily commented to justify every rule severity and ignore — follow that "document WHY next to every exception" norm.

## Function Design

- **Size:** Functions stay small and single-purpose; the `fallow` health gate caps complexity (`maxCyclomatic: 20`, `maxCognitive: 15`). The longest function, `reviewTraceabilityExceptionWithProvider` (`lib/db/exception-review-provider.ts:564`), is a flat orchestration that delegates each step to a named helper (`getActiveTenantMembership`, `reserveIdempotencyRecord`, `applyTenantScopedExceptionReview`, `appendExceptionReviewAuditEvent`, `completeIdempotencyRecord`).
- **Parameters:** Two styles, applied consistently. (1) For 3+ args or anything optional, pass a single **named options object**: `applyTenantScopedExceptionReview(client, { tenantId, exceptionId, actorAuthSubjectId, patch, sourceDocumentRef, reviewedAt })`; `handleReadAction({ request, action, resourceId, load, render, deps })`. (2) Leading positional `client`/`pool`/`request` plus an options object. Avoid long positional parameter lists.
- **Return values:** Prefer typed discriminated unions and explicit `null` for "not found" (`load: (ctx) => T | null`); booleans from guards; `Promise<Response>` from handlers. Use `asserts ... is` assertion functions in tests (`assertAccepted` in `tests/db/exception-review-provider-a1.test.ts:216`).
- **Dependency injection via a `deps` seam with defaults:** the boundary takes `deps?: Partial<BoundaryDeps>` merged over `defaultBoundaryDeps` (`{ resolver: publicFixtureContextResolver, policy: publicFixturePolicy }`) so resolver/policy are swappable without touching call sites (`lib/api/route-boundary.ts:33`). Follow this pattern for any new injectable collaborator.
- **Purity where possible:** helpers like `stableStringify`, `computeExceptionReviewRequestHash`, `sanitizeReplayHeaders`, `toExceptionRecord`, and the `scripts/normalize-coverage.mjs` transform are pure (no I/O, deterministic) — keep new helpers pure and push I/O to the edges.

## Module Design

- **Provider-neutral seam-and-adapter pattern is the core convention.** Each capability defines a shape (interface/type) plus a default fixture adapter, and selects no provider in the shape module:
  - `RequestContextResolver` interface + `publicFixtureContextResolver` and `fixtureAuthContextResolver` adapters (`lib/security/request-context.ts`).
  - `AuthorizationPolicy` interface + `publicFixturePolicy` / `fixtureExceptionReviewPolicy` (`lib/security/authorization.ts`).
  - `MockRecallSource` interface + `fixtureMockRecallSource` (`lib/api/mock-recall-source.ts`).
  - `AuditSink` / `IdempotencyStore` interfaces + `noopAuditSink`, `FixtureAuditSink`, `FixtureIdempotencyStore` (`lib/security/idempotency-audit.ts`).
  - `RateLimiter` interface + `noopRateLimiter` default and the in-memory `FixtureFixedWindowRateLimiter` (injected clock) (`lib/security/rate-limit.ts`) — a status-discriminated `RateLimitDecision` (`{ status: "allow" } | { status: "deny"; retryAfterSeconds }`) deliberately mirroring the idempotency seam.
  - `ProviderDbClient` interface so provider functions accept either a `Pool` or a `PoolClient` (`lib/db/exception-review-provider.ts:33`).
  When adding a real provider, implement the existing interface and slot it in via the `deps`/default seam — do not change call sites or route handlers.
- **Exports:** Named exports only — no `export default` in `lib/**` (defaults appear only for Next-mandated React/route entry files). Export the interface/type, the default adapter instance, and the pure helpers; keep internal helpers (e.g. `cloneRecord`, `recordKey`, `readBearerToken`) unexported.
- **Barrel files:** **None.** There is no `index.ts` re-export layer; import directly from the owning module. Do not introduce barrels (they would muddy `fallow`'s reachability graph and risk `duplicate-exports`).
- **Shared utilities live in `lib/shared/`** as the single source of truth — `canonical-json.ts` was extracted there specifically so the `lib/api` fingerprinter and the `lib/db` request hasher agree on canonical form; both import it rather than re-implementing.
- **Layering & boundaries:** `app/api/**/route.ts` are thin handlers that delegate to `lib/api/**` (boundary + service seams) which delegate to `lib/security/**` and `lib/db/**`. Routes contain no business logic. The `boundary-violation` rule is a hard error — respect the layer direction (routes → lib/api → lib/security, lib/db; never the reverse).
- **Generated/migration code is off-limits:** never hand-edit `lib/api/generated/**` (regenerate via `npm run api:types`) or `lib/db/migrations/**` (generate via `drizzle-kit`); both are `fallow`-ignored.

---

*Convention analysis: 2026-06-04*
