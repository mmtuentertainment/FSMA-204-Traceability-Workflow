# External Integrations

> Reference document for `.planning/codebase/`. Describes the current state at git HEAD (`51141c9`, "Batch 58"), generated 2026-06-04. Every claim is grounded in repository files; see inline `path:line` references.

The runtime is **deliberately fixture-only / scaffold-stage**. There are no live third-party API clients, no outbound network calls, and no production data store wired into any request path. The integrations below are split carefully into **active** (reachable from a live route / CI) and **scaffold** (configured but not route-wired).

## APIs & External Services

- **No outbound third-party API clients.** No payment, email, storage, LLM, or SaaS SDK is present in `package.json`. The runtime makes no external network calls.
- **First-party HTTP API surface** — the product *exposes* an API defined by the OpenAPI 3.1.0 contract `api/openapi.yaml` (`info.title: FSMA 204 Traceability Workflow API`, `version: 0.1.0`, single server `url: /`). The contract declares paths for lots, events, exceptions, supplier-requests, and mock-recalls, all with `401/403/429` (and `409/422` on writes) responses.
  - **Active (route-wired) endpoints** — only three of the contract's paths are implemented as Next.js App Router handlers, all fixture-backed:
    - `GET /api/traceability/mock-recalls/{mockRecallId}` → `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`.
    - `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv` → `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`.
    - `PATCH /api/traceability/exceptions/{exceptionId}` → `app/api/traceability/exceptions/[exceptionId]/route.ts`.
  - All other contract paths (lots, events, exception list, supplier-requests, mock-recall create) are **declared in the spec only** — no route handler exists.
- **MockRecall fixture** — a single in-memory contract fixture (`MOCK_RECALL_CONTRACT_FIXTURE_ID = "contract-fixture-ready-for-review"`, `lib/api/mock-recall.ts:3`) plus an `application/problem+json` not-found path for unknown IDs. The packet CSV is derived deterministically with no escaping (production CSV generation is explicitly deferred, `lib/api/mock-recall.ts:36-38`).
- **Code generation from the contract** — `openapi-typescript` regenerates `lib/api/generated/openapi-types.ts` (`npm run api:types`); all route/lib code imports `components["schemas"][...]` from it (e.g. `lib/api/exception-review.ts:1`, `lib/api/problem.ts:1`). Errors follow RFC 9457 Problem Details (`application/problem+json`) via `lib/api/problem.ts`.

## Data Storage

- **Active runtime storage: in-memory fixtures only.** No persistence is on any live request path. State lives in module-scoped JS structures:
  - `FixtureExceptionReviewRepository` (a `Map`, `lib/api/exception-review.ts:58-92`).
  - `FixtureIdempotencyStore` and `FixtureAuditSink` (`lib/security/idempotency-audit.ts:57-118`).
  - `fixtureMockRecallSource` over the in-memory MockRecall fixture (`lib/api/mock-recall-source.ts:21-34`).
  Grep confirms no `app/**` route imports `getDb`, `createDbClient`, or `reviewTraceabilityExceptionInTransaction`.
- **Scaffold (configured, NOT route-wired): PostgreSQL via Drizzle ORM + `pg`.**
  - **Client seam** — `lib/db/client.ts` builds a `pg` `Pool` wrapped by `drizzle-orm/node-postgres`, lazily cached via `getDb()`. It requires `DATABASE_URL` and throws only when a client is actually requested (`lib/db/client.ts:22-49`); importing the module without `DATABASE_URL` is safe (verified by `tests/db-client-import.test.ts`).
  - **Schema** — `lib/db/schema.ts` defines four PostgreSQL tables with `drizzle-orm/pg-core`: `tenant_memberships`, `audit_events` (append-only; the migration comments forbid update/delete paths, `lib/db/migrations/0000_postgres_exception_review_foundation.sql:14`), `traceability_exceptions`, and `idempotency_records` — with unique constraints, indexes, and `CHECK` constraints for roles/statuses/review-reasons.
  - **Migrations** — generated SQL + meta snapshots in `lib/db/migrations/` (`0000_…`, `0001_idempotency_resource_scope.sql`, plus `meta/_journal.json` and per-version snapshots). Managed by `drizzle-kit` (`drizzle.config.ts`); validated offline by `npm run db:migrations:check`.
  - **Provider service** — `lib/db/exception-review-provider.ts` implements the full provider-backed exception-review write (tenant-membership RBAC, idempotency reserve/replay/conflict/reclaim, `FOR UPDATE` row locking, append-only audit insert, transaction wrapper). This is exercised only by `tests/db/exception-review-provider-a1.test.ts` and `…-a2.test.ts` against a real Postgres test DB — **never by a live route**.
  - **Dialect/version** — PostgreSQL; CI provisions `postgres:16-alpine` (`.github/workflows/contract-gate.yml:73`).
- **No other data stores** — no Redis/cache, object storage, search, or queue is present. File upload is explicitly out of scope (`SourceDocumentRef` in `api/openapi.yaml` is "a metadata reference … file upload is out of scope").

## Authentication & Identity

- **No production auth provider.** No Clerk/Auth0/NextAuth/OIDC dependency exists. The OpenAPI contract declares a single global `bearerAuth` HTTP Bearer scheme described as a "Placeholder for future server-side auth; tenant context is derived by the server" (`api/openapi.yaml`, `components.securitySchemes.bearerAuth`).
- **Provider-neutral security boundary (scaffold + partial active).** `lib/security/**` defines the seams:
  - **Request context** (`lib/security/request-context.ts`) — server-derived identity only (tenant is never read from request bodies/queries/headers). Two resolvers exist:
    - `publicFixtureContextResolver` — anonymous, single implicit `public-fixture` tenant; used by the live `GET` MockRecall routes via the read boundary.
    - `fixtureAuthContextResolver` — **local/test fixture auth** that maps hardcoded fixture Bearer tokens (`fixture-reviewer-token`, `fixture-viewer-token`, `fixture-other-tenant-reviewer-token`) to fixture principals/tenants/roles; disabled when `NODE_ENV === "production"` (`isFixtureAuthRuntimeEnabled`, `request-context.ts:64-68`). This is the resolver wired into the live `PATCH` exceptions route (`app/api/traceability/exceptions/[exceptionId]/route.ts:19,32`).
  - **Authorization** (`lib/security/authorization.ts`) — deny-by-default, action-oriented policies. `publicFixturePolicy` allows only the two read actions; `fixtureExceptionReviewPolicy` requires `authenticated` + the `reviewer` role for `exception.review.update`.
  - **Idempotency & audit shapes** (`lib/security/idempotency-audit.ts`) — interfaces plus in-memory fixture implementations for mutating writes.
- **Provider-side identity (DB scaffold)** — the schema models tenant identity as `tenant_memberships` rows keyed by `tenant_id` + `auth_subject_id` with roles `tenant_admin` / `quality_reviewer` / `read_only` (`lib/db/schema.ts:18-42`); the provider service enforces membership-based RBAC (`lib/db/exception-review-provider.ts:680-682`). No identity provider issues these subjects yet.
- **Net:** the only "authentication" reachable at runtime is non-production fixture Bearer tokens on the single PATCH route. Production auth, runtime tenant resolution, and production RBAC are explicitly out of scope (`README.md:21`).

## Monitoring & Observability

- **Not detected.** No logging, metrics, tracing, error-reporting (e.g. Sentry), or APM library is present in `package.json`, and no telemetry SDK is imported anywhere.
- The closest construct is **append-only audit evidence**, which is product-domain data, not operational observability: the `audit_events` table (`lib/db/schema.ts:44-71`) and the in-memory `FixtureAuditSink` (`lib/security/idempotency-audit.ts:96-118`). Audit appends happen on the fixture PATCH route into the in-memory sink only.
- Request correlation IDs are generated per request (`crypto.randomUUID()` in the context resolvers, `lib/security/request-context.ts:76,92,119`) but are not exported to any external system.

## CI/CD & Deployment

- **CI: GitHub Actions** — single workflow `.github/workflows/contract-gate.yml` ("Contract Gate"), triggered on `pull_request` and `push`, `permissions: contents: read`, Node `22.x` on `ubuntu-latest`.
  - **Job `verify`** runs, in order: `npm ci` → `npm run api:check` (Redocly lint + generated-types check) → `npm run db:check` (Drizzle migration check + DB-client import test) → `npm run typecheck` → `npm run build` → `npm run test:mock-recall:contract` → `npm run test:exception-review:patch` → **fallow CI audit** (`npm run fallow:ci -- --base origin/main`, blocking on `verdict: fail`/exit 1 and runtime errors/exit 2). The fallow step sets `FALLOW_COVERAGE=coverage/provider/coverage-final.json` so CRAP scores reflect real coverage (`.github/workflows/contract-gate.yml:48-63`).
  - **Job `db-provider-tests`** spins up a `postgres:16-alpine` service (health-checked), applies migrations with `npx drizzle-kit migrate`, runs the provider DB suites under coverage (`npm run test:db:coverage -- --out .coverage-tmp/fresh.json`), then a strict **coverage-freshness guard** that compares fallow's 3-way verdict from the committed snapshot vs. a freshly regenerated one and fails on drift, on `verdict=fail`, or on any audit crash (`.github/workflows/contract-gate.yml:65-156`). The service is reached over `127.0.0.1` (never `localhost`) to avoid IPv6 `pg.Pool` resets (`.github/workflows/contract-gate.yml:86-91`).
- **Agent commit gate** — `.claude/settings.json` wires a `PreToolUse`/`Bash` hook to `.claude/hooks/fallow-gate.sh`, which runs `fallow audit` before each `git commit`/`git push` and blocks on `verdict: fail` (fails open if `bash`/`jq`/`fallow` are missing). A matching Codex gate lives in `AGENTS.md`.
- **Code review** — CodeRabbit is configured via `.coderabbit.yaml` at repo root.
- **Deployment** — **Not detected.** No deploy workflow, no `Dockerfile`, no `vercel.json`/`netlify.toml`, no `next.config.*`. Build/run scripts are the stock `next build` / `next start` (`package.json:7-8`). No deployment target is committed.
- **Coverage tooling** — `scripts/run-db-coverage.mjs` (orchestrates V8 capture → `c8` → normalize) and `scripts/normalize-coverage.mjs` produce the committed snapshot `coverage/provider/coverage-final.json` consumed by the fallow gate; the snapshot "fails closed" on source edits (`coverage/provider/README.md:23-29`).

## Environment Configuration

No `.env*` contents were read; only existence/usage is noted. Environment variables referenced in code:

| Variable | Where read | Purpose | Status |
|---|---|---|---|
| `DATABASE_URL` | `drizzle.config.ts:4`; `lib/db/client.ts:6,23`; CI `db-provider-tests` job | PostgreSQL connection for Drizzle Kit and the runtime DB client seam. Drizzle Kit falls back to a credential-free local URL when unset; the runtime client throws only when a client is requested. | Scaffold + migrations/tests only |
| `TEST_DATABASE_URL` | `tests/db/exception-review-provider-a1.test.ts:47`, `…-a2.test.ts:44`; `scripts/run-db-coverage.mjs:83` | Connection for the provider DB test suites and coverage regen; name must contain "test" (safety fence). | Tests / coverage only |
| `NODE_ENV` | `lib/security/request-context.ts:65` | Gates fixture-auth: fixture Bearer tokens are disabled when `production`. | Active (PATCH route) |
| `MOCK_RECALL_SMOKE_PORT` | `tests/mock-recall-contract-smoke.mjs:7` | Port for the MockRecall contract smoke test (default `3227`). | Test only |
| `FALLOW_COVERAGE` | `.github/workflows/contract-gate.yml:53,126,130`; local gate hook | Points fallow at the committed coverage snapshot so CRAP reflects real coverage. | CI / agent gate |
| `FALLOW_AGENT_SOURCE` | `.mcp.json:7` | Identifies the MCP client (`claude_code`) to fallow. | Dev tooling |

- **Gitignored env files** — `.gitignore:5` ignores `.env*.local`. No `.env` files were read.
- The baseline `typecheck`/`build` require **no** live `DATABASE_URL` (`README.md:40`); the live fixture routes likewise read no environment variables (they serve in-memory fixtures).

## Webhooks & Callbacks

- **Not detected.** No inbound webhook receiver routes (no `app/api/webhooks/**` or signature-verification code) and no outbound webhook/callback dispatch exist. The only inbound HTTP surface is the three fixture-backed traceability routes described above.
- The OpenAPI contract declares no `webhooks` section and no callback objects (only standard request/response paths).
