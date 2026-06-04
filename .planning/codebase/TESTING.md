# Testing Patterns

**Analysis Date:** 2026-06-04

This is a fixture-only / scaffold-stage repository. There is **no third-party test framework** (no Jest, no Vitest, no Mocha) and **no test-runner config file**. Tests are plain Node.js programs that import the code under test, assert with `node:assert/strict`, and exit non-zero on failure. TypeScript tests run directly via Node's native type-stripping (`node --experimental-strip-types`, Node >= 22.6). The CI Contract Gate (`.github/workflows/contract-gate.yml`) wires the suites together.

## Test Framework

**Runner:**
- **Node.js built-in test execution** (no framework). Each test file is an executable script.
- TypeScript tests: `node --experimental-strip-types <file>.test.ts` (requires Node >= 22.6; `package.json` `engines.node: ">=22.6"`).
- JavaScript smoke/orchestration tests: plain `node <file>.mjs`.
- Config: **none** — there is no `jest.config.*`, `vitest.config.*`, or equivalent.

**Assertion Library:**
- `node:assert/strict` — every test opens with `import assert from "node:assert/strict";`. Used: `assert.equal`, `assert.deepEqual`, `assert.match`, `assert.doesNotMatch`, `assert.throws`, `assert.ok`, `assert.notEqual`, `assert.fail`.

**Run Commands (from `package.json` scripts):**
```bash
npm run test:exception-review:patch   # fixture-only PATCH suite (type-stripped .ts)
npm run test:mock-recall:contract     # boots `next start`, hits live routes (.mjs)
npm run test:db-client:import         # DB client import/guard check (type-stripped .ts)
npm run test:db                        # provider-backed Postgres suites a1 + a2 + a3 (needs TEST_DATABASE_URL)
npm run test:db:coverage               # runs a1+a2+a3 under V8 coverage, regenerates the snapshot
npm run db:check                       # drizzle migration check (db:migrations:check) + db-client import test
npm run api:check                      # api:lint (redocly lint) + api:types:check (openapi-typescript --check)
npm run typecheck                      # tsc --noEmit
```
There is **no aggregate `test` script and no watch mode.** Run each suite explicitly. The baseline gate (per `AGENTS.md`) is: `npm ci`, `npm run api:check`, `npm run typecheck`, `npm run build`, `npm run test:mock-recall:contract`, `npm run test:exception-review:patch`.

Exact script definitions:
- `test:exception-review:patch`: `node --experimental-strip-types tests/exception-review-patch.test.ts`
- `test:mock-recall:contract`: `node tests/mock-recall-contract-smoke.mjs`
- `test:db-client:import`: `node --experimental-strip-types tests/db-client-import.test.ts`
- `test:db`: `node --experimental-strip-types tests/db/exception-review-provider-a1.test.ts && node --experimental-strip-types tests/db/exception-review-provider-a2.test.ts`
- `test:db:coverage`: `node scripts/run-db-coverage.mjs`
- `db:check`: `npm run db:migrations:check && npm run test:db-client:import` (where `db:migrations:check` is `drizzle-kit check --config drizzle.config.ts`)
- `api:check`: `npm run api:lint && npm run api:types:check`

## Test File Organization

**Location:** Separate top-level `tests/` directory (NOT co-located with source). Provider/DB-backed suites live one level deeper in `tests/db/`.

```
tests/
├── exception-review-patch.test.ts        # fixture PATCH route, in-memory state
├── db-client-import.test.ts              # lib/db/client.ts import + missing-env guard
├── mock-recall-contract-smoke.mjs        # live-server contract smoke (GET routes + CSV)
└── db/
    ├── exception-review-provider-a1.test.ts   # provider against real Postgres
    └── exception-review-provider-a2.test.ts   # provider against real Postgres
```

**Naming:**
- `*.test.ts` — type-stripped TypeScript suites.
- `*.test.mts` — declared as a valid entry glob in `.fallowrc.jsonc` (`tests/**/*.test.mts`); **none present at HEAD**.
- `*-smoke.mjs` — JavaScript smoke tests that need no type stripping (boot a server, run async I/O).

**Reachability:** Test globs are declared as `fallow` **entry points** in `.fallowrc.jsonc` (`tests/**/*.test.ts`, `tests/**/*.test.mts`, `tests/**/*.mjs`, `scripts/**/*.mjs`) so the analyzer treats tests as roots and does not flag them — or the `lib` exports they consume — as unused. `tests/**` is excluded from `fallow`'s duplication and health analyses (tests legitimately repeat arrange/act/assert).

## Test Structure

The established pattern is a **`TestCase[]` array driven by a sequential `for ... of` loop** (no `describe`/`it`). Each case has a `name` and an async `run()`; a `PASS <name>` line prints per case; an unhandled assertion rejection exits non-zero and fails the suite/CI step.

**Suite Organization (actual snippet from `tests/db/exception-review-provider-a1.test.ts`):**
```typescript
type TestCase = {
  name: string;
  run: () => Promise<void>;
};

const tests: TestCase[] = [
  {
    name: "successful update writes allowed review and source-reference fields",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );
      assertAccepted(outcome);

      const row = await readException();
      assert.equal(row.status, "in_review");
      assert.equal(row.review_reason, "ambiguous_lot_code");
      assert.equal(row.review_notes, reviewPatch.reviewNotes);
      assert.equal(row.human_review_required, true);
      assert.equal(row.source_document_ref, sourceDocumentRef);
    },
  },
  // ...more cases
];

try {
  await ensureMigrated();

  for (const test of tests) {
    await test.run();
    console.log(`PASS ${test.name}`);
  }

  console.log("Provider-backed exception-review Batch A1 tests passed.");
} finally {
  await pool.end();
}
```

**Patterns:**
- **Setup:** per-case explicit reset → seed → act. DB suites call `resetTables()` (`TRUNCATE ... RESTART IDENTITY CASCADE`) then `seedMembership()` / `seedException()`; the fixture suite calls `resetExceptionReviewFixtures()` and relies on a documented per-case ordering for replay/conflict cases.
- **Teardown:** a top-level `try { ... } finally { ... }` guarantees resource cleanup — `await pool.end()` (DB suites), `await stopServer()` (smoke), env-var restoration (`db-client-import`). Always wrap suite execution in `try/finally`.
- **Assertion style:** flat, explicit `assert.equal`/`assert.deepEqual` with literal expected values; a `name` string per case substitutes for nested describe blocks. Smoke tests pass a rich `context` string as the assertion message (`tests/mock-recall-contract-smoke.mjs`, `formatResponseContext`).
- **Custom assertion helpers** narrow types and de-duplicate: `assertAccepted(outcome)` (an `asserts outcome is ...` function, `tests/db/exception-review-provider-a1.test.ts:212`), `assertProblem` / `assertProblemInstance` (validate RFC 9457 Problem Details: status, `application/problem+json` content type, `type: "about:blank"`, `instance`) in the fixture PATCH suite; the smoke test's equivalent is `assertProblemDetails`.

## Mocking

**Framework:** None. There is no mocking/stubbing/spy library.

**Patterns — substitute via the production dependency-injection seam, not a mock library:**
```typescript
// The route boundary accepts deps?: Partial<BoundaryDeps> over a default adapter,
// so tests inject a different resolver/policy with no mocking framework.
// (lib/api/route-boundary.ts:33)
export const defaultBoundaryDeps: BoundaryDeps = {
  resolver: publicFixtureContextResolver,
  policy: publicFixturePolicy,
};
```
In-memory **fixture implementations of the real interfaces** stand in for I/O: `FixtureIdempotencyStore<T>` and `FixtureAuditSink` (`lib/security/idempotency-audit.ts`) implement `IdempotencyStore`/`AuditSink`; `FixtureExceptionReviewRepository` (`lib/api/exception-review.ts`) holds state in a `Map`. Tests assert against these (e.g. `fixtureExceptionReviewAuditSink.readEvents()`).

Environment is manipulated directly when behavior is env-gated — `tests/exception-review-patch.test.ts` defines a `withNodeEnv(value, run)` helper using `Reflect.set`/`Reflect.deleteProperty` on `process.env`, restoring the prior value in `finally`. `tests/db-client-import.test.ts` deletes (`delete process.env.DATABASE_URL`) and restores `process.env.DATABASE_URL` via plain reassignment in a `finally` block (the same delete/restore intent, without `Reflect`).

**What to Mock:** Nothing via a library. Swap collaborators through the `deps` seam or use the provided in-memory fixture adapters.

**What NOT to Mock:** The database in `tests/db/**` — those suites run against a **real PostgreSQL** instance (see Integration Tests). HTTP in the smoke test — it boots a real `next start` server and uses `fetch`.

## Fixtures and Factories

**Test Data — module-level constants plus override-merging factory functions:**
```typescript
// Default patch + a factory that builds a full request with per-case overrides.
// (tests/db/exception-review-provider-a1.test.ts)
const reviewPatch: ProviderExceptionPatch = {
  status: "in_review",
  reviewReason: "ambiguous_lot_code",
  reviewNotes: "Reviewed by provider-backed Batch A1 test.",
  humanReviewRequired: true,
};

function request(
  overrides: Partial<ProviderExceptionReviewRequest> = {},
): ProviderExceptionReviewRequest {
  return {
    tenantId: tenantA,
    actorAuthSubjectId: reviewer,
    exceptionId,
    idempotencyKey: "provider-a1-key-0001",
    patch: reviewPatch,
    source: "provider-backed-exception-review-a1",
    sourceDocumentRef,
    now,   // fixed Date("2026-06-03T12:00:00.000Z") for deterministic timestamps
    ...overrides,
  };
}
```
The DB suites also provide seed factories with optional-arg defaults: `seedMembership({ tenantId?, authSubjectId?, role? })`, `seedException({ id?, tenantId?, status?, reviewReason?, reviewNotes?, sourceRef? })`, plus read helpers `readException`, `readIdempotencyRows`, `readAuditRows`, `countRows`. The fixture PATCH suite uses a `patchException({ body?, key?, token?, id? })` helper that builds a `Request` with headers and invokes the route's exported `PATCH`.

**Locations:**
- **Production canonical fixtures** (the source of truth, imported by both routes and tests): `lib/api/exception-review.ts` (`FIXTURE_EXCEPTION_ID`, `initialExceptionRecord`, the exported `fixtureExceptionReviewRepository`/`...IdempotencyStore`/`...AuditSink`, `resetExceptionReviewFixtures()`), `lib/api/mock-recall.ts` (`MOCK_RECALL_CONTRACT_FIXTURE_ID`, `mockRecallContractFixture`), `lib/security/request-context.ts` (`FIXTURE_AUTH_TOKENS`, fixture tenant IDs).
- **Per-suite test data** is defined inline at the top of each test file (no shared factories module).

## Coverage

**Requirements:** No line/branch coverage threshold is enforced as a pass/fail bar. Coverage is consumed **indirectly** by the `fallow` health gate: real provider test coverage feeds the CRAP score so `.fallowrc.jsonc` can keep `health.maxCrap: 30` strict without false-positiving well-tested functions.

**Mechanism (Batch 0057/0058):**
- A **committed Istanbul snapshot** lives at `coverage/provider/coverage-final.json` (docs: `coverage/provider/README.md`).
- `fallow audit` reads it via the `FALLOW_COVERAGE` env var (set in CI and the local commit hook).
- It **fails closed:** `fallow` matches coverage to a function by content hash; editing a covered function changes its hash, the snapshot stops matching, the function reads as 0%, CRAP re-inflates, and the gate fails — forcing a regenerate.
- Tool: `c8` (devDependency `^11.0.0`) converts Node V8 coverage to Istanbul JSON. `scripts/run-db-coverage.mjs` orchestrates V8 capture of the a1/a2/a3 suites (run sequentially under `NODE_V8_COVERAGE`) and calls `scripts/normalize-coverage.mjs` (repo-relative POSIX paths, `-1` → `0`, `lib/**` only, deterministic key order for cross-OS byte-stable output).

**Regenerate / view coverage:**
```bash
# Requires a disposable Postgres test DB; use 127.0.0.1, never localhost.
# (Port 55432 below is illustrative for a local container — match your own.)
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/fsma204_provider_test"
export TEST_DATABASE_URL="$DATABASE_URL"          # db name has the "test" token → passes every suite fence (a1/a2/a3)
npx drizzle-kit migrate --config drizzle.config.ts
npm run test:db:coverage                          # writes coverage/provider/coverage-final.json

# Confirm the gate clears with it (verdict pass/warn):
FALLOW_COVERAGE=coverage/provider/coverage-final.json \
  npx fallow audit --base origin/main --format json --quiet 2>/dev/null
```
CI's `db-provider-tests` job (in `.github/workflows/contract-gate.yml`) provisions a `postgres:16-alpine` service, applies migrations with `npx drizzle-kit migrate`, regenerates a fresh snapshot to a temp `--out` (`.coverage-tmp/fresh.json`), and a strict freshness guard fails the job when the committed snapshot's `fallow` verdict diverges from the fresh one (or when fresh coverage does not clear the gate).

## Test Types

**Unit / fixture tests:**
- `tests/exception-review-patch.test.ts` — exercises the exported `PATCH` route handler directly with synthesized `Request` objects against in-memory fixtures. Covers auth (401/403), env-gated fixture auth, leak-safe cross-tenant 404, idempotency 422/200/replay/409, and audit-evidence assertions. **No network, no DB.**
- `tests/db-client-import.test.ts` — imports `lib/db/client.ts` and asserts the exported functions exist (`createDbClient`, `getDb`, `closeDbClient`) and that `createDbClient()`/`getDb()` throw when `DATABASE_URL` is absent (uses `assert.throws` with a message regex).

**Integration tests (real PostgreSQL):**
- `tests/db/exception-review-provider-a1.test.ts` and `...-a2.test.ts` — run the provider (`lib/db/exception-review-provider.ts`) against a live Postgres via `pg.Pool`. They require `TEST_DATABASE_URL`, and **refuse to run unless the DB name matches `/(^|[_-])(test|a1)([_-]|$)/i`** (a safety fence, `resolveTestDatabaseUrl`). `ensureMigrated()` asserts the expected schema/columns exist before the loop. CI provisions a `postgres:16-alpine` service and applies migrations with `npx drizzle-kit migrate`.

**Contract / smoke tests (live server):**
- `tests/mock-recall-contract-smoke.mjs` — `spawn`s `next start` (via `process.execPath` running `node_modules/next/dist/bin/next start`) on `127.0.0.1` at a configurable port (env `MOCK_RECALL_SMOKE_PORT`, default 3227), polls a probe URL until ready (or detects early exit via `server.exitCode`), then `fetch`es the live MockRecall GET routes. Asserts the fixture detail JSON, the FDA-style CSV packet (exact CRLF-joined body, header/row, and `assert.doesNotMatch` for disallowed compliance language), and RFC 9457 404 Problem Details for a missing id. Cleans up with `taskkill` (Windows) or `SIGTERM`.

**E2E (browser) Tests:** Not used.

**Contract type-check:** `npm run api:check` runs `redocly lint api/openapi.yaml` (`api:lint`) and `openapi-typescript ... --check` (`api:types:check`) so the generated `lib/api/generated/openapi-types.ts` cannot drift from the OpenAPI source. `npm run db:check` runs `drizzle-kit check` (`db:migrations:check`) plus the db-client import test.

## Common Patterns

**Async testing:** Every case is an `async run()`; the driver `await`s each sequentially. Top-level `await` is used directly (ES modules). Always `await` async assertions and wrap the loop in `try/finally` for cleanup.
```typescript
for (const test of tests) {
  await test.run();
  console.log(`PASS ${test.name}`);
}
```

**Error / failure-path testing:** Assert the typed failure outcome and the absence of side effects (no audit row, exception unchanged, no idempotency record):
```typescript
// tests/db/exception-review-provider-a1.test.ts
const outcome = await reviewTraceabilityExceptionInTransaction(
  pool,
  request({ actorAuthSubjectId: reviewer }),
);
assert.equal(outcome.status, "forbidden");
assert.equal((await readException()).status, "open");
assert.equal(await countRows("audit_events"), 0);
assert.equal(await countRows("idempotency_records"), 0);
```
For thrown errors use `assert.throws(fn, /message regex/)` (`tests/db-client-import.test.ts`). For Problem Details responses use the `assertProblem`/`assertProblemInstance` helpers (status + `problem+json` content type + body shape + `instance`).

**Determinism:** Inject a fixed `now` into requests so timestamps and idempotency expiry are reproducible (a1 uses `new Date("2026-06-03T12:00:00.000Z")`, a2 uses `...T15:00:00.000Z`); manipulate `process.env` only through restore-in-`finally` helpers (`withNodeEnv`).

---

*Testing analysis: 2026-06-04*
