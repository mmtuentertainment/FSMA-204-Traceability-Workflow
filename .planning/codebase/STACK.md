# Technology Stack

> Reference document for `.planning/codebase/`. Reflects the "Batch 58" working state (source lands on `main` via the phase-3 PR #12), generated 2026-06-04. Every claim is grounded in repository files; see inline `path:line` references.

The FSMA 204 Workflow Product is a Next.js (App Router) + TypeScript food-traceability "recall-readiness" product. It is **deliberately scaffold-stage and fixture-only**: the live HTTP runtime serves in-memory fixtures, while a provider-neutral security boundary and a PostgreSQL + Drizzle persistence layer exist as wired-but-not-route-activated scaffolding.

## Languages

- **TypeScript** — the implementation language for all `lib/**`, `app/**`, and `tests/**` source. Configured `strict: true` with `target: ES2017`, `module: esnext`, `moduleResolution: bundler`, `jsx: react-jsx`, `isolatedModules: true`, and `noEmit: true` (`tsconfig.json:2-26`). `allowImportingTsExtensions` is enabled, so intra-repo imports use explicit `.ts` extensions (e.g. `lib/db/client.ts:4`, `app/api/traceability/exceptions/[exceptionId]/route.ts:7`).
- **JavaScript (ESM `.mjs`)** — used for executable dev/test tooling that runs outside the type-checked build: the contract smoke test `tests/mock-recall-contract-smoke.mjs` and the coverage-regen scripts `scripts/run-db-coverage.mjs` and `scripts/normalize-coverage.mjs`.
- **SQL (PostgreSQL dialect)** — Drizzle-generated migration files under `lib/db/migrations/` (`0000_postgres_exception_review_foundation.sql`, `0001_idempotency_resource_scope.sql`). Treated as generated; `.fallowrc.jsonc:35` ignores `lib/db/migrations/**`.
- **YAML** — the OpenAPI 3.1.0 contract `api/openapi.yaml` (the declared source of truth) and the CI workflow `.github/workflows/contract-gate.yml`.
- **JSONC** — fallow tool configuration `.fallowrc.jsonc`.
- **TSX (React)** — two App Router files only: `app/layout.tsx` and `app/page.tsx`.

## Runtime

- **Node.js `>=22.6`** — declared in `package.json:23-25` (`engines.node`). CI pins `node-version: 22.x` (`.github/workflows/contract-gate.yml:24,102`). No `.nvmrc` file exists.
- **Module type** — the project is ESM (Next.js / `module: esnext`). Dev tooling and provider tests are executed with Node's native TypeScript stripping via `node --experimental-strip-types` (e.g. `package.json:16,18,19`) and the coverage capture re-invokes the same flag (`scripts/run-db-coverage.mjs:97`).
- **HTTP runtime** — Next.js App Router route handlers under `app/api/**`. Three live routes exist (see Frameworks). Request/response handling uses the Web Fetch `Request`/`Response` primitives (e.g. `lib/api/route-boundary.ts:38-63`, `app/api/traceability/exceptions/[exceptionId]/route.ts:27`).
- **Package manager** — npm (`package-lock.json` present; CI uses `npm ci` and `cache: npm` at `.github/workflows/contract-gate.yml:25,28`). `package.json:3-4` sets `version: 0.0.0` and `private: true`.

## Frameworks

- **Next.js `^16.2.6`** (resolved `16.2.6`) — App Router. The TypeScript Next plugin is enabled (`tsconfig.json:21-25`) and ambient types come from generated `next-env.d.ts` (which references `./.next/types/routes.d.ts`). **No `next.config.*` file exists** — the project runs on Next.js defaults. Scripts: `dev` / `build` / `start` (`package.json:6-8`).
  - Live routes (App Router file-system routing):
    - `app/api/traceability/mock-recalls/[mockRecallId]/route.ts` — `GET` MockRecall detail (fixture-backed).
    - `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts` — `GET` MockRecall packet CSV (fixture-backed).
    - `app/api/traceability/exceptions/[exceptionId]/route.ts` — `PATCH` exception review (fixture-backed mutating write).
  - UI surface is minimal: `app/page.tsx` is a static scaffold page; `app/layout.tsx` is the root layout.
- **React `^19.2.6`** + **react-dom `^19.2.6`** (resolved `19.2.6`) — runtime dependencies of Next.js (`package.json:30-31`). Used only by the two `.tsx` files.
- **Drizzle ORM `^0.45.2`** (resolved `0.45.2`) — the persistence framework for the scaffolded DB layer. Schema is defined in `lib/db/schema.ts` using `drizzle-orm/pg-core`; the client is built with `drizzle-orm/node-postgres` over a `pg` Pool (`lib/db/client.ts:1-2`). **Scaffold-only:** no `app/**` route imports `getDb`, `createDbClient`, or `reviewTraceabilityExceptionInTransaction` (grep over `app/` returns no matches), so the ORM is not on any live request path.

## Key Dependencies

Resolved versions are from `package-lock.json`.

### Runtime dependencies (`package.json` `dependencies`)

| Package | Range | Resolved | Role |
|---|---|---|---|
| `next` | `^16.2.6` | `16.2.6` | App Router web framework / HTTP runtime |
| `react` | `^19.2.6` | `19.2.6` | UI library (used by `app/*.tsx` only) |
| `react-dom` | `^19.2.6` | `19.2.6` | React DOM renderer |
| `drizzle-orm` | `^0.45.2` | `0.45.2` | ORM / typed schema for the scaffolded DB layer |
| `pg` | `^8.21.0` | `8.21.0` | PostgreSQL driver (`Pool`) behind the DB client seam |

Note: `drizzle-orm` and `pg` are declared as runtime deps but currently only reachable from the scaffolded `lib/db/**` layer and the provider tests — not from any wired route. Batch 62 added the rate-limit checkpoint seam `lib/security/rate-limit.ts` (`RateLimiter` interface, `RateLimitScope`, status-discriminated `RateLimitDecision`, `noopRateLimiter`, in-memory `FixtureFixedWindowRateLimiter` with an injected clock) and an optional checkpoint inside `reviewTraceabilityExceptionWithProvider` (`lib/db/exception-review-provider.ts:590-603`, after RBAC / before the idempotency reservation) plus `rateLimitedResponse` in `lib/api/problem.ts:100-110`; this introduced **no new runtime dependency** — the limiter uses only an injected clock (`lib/security/rate-limit.ts:1-7,61`).

### Dev dependencies (`package.json` `devDependencies`)

| Package | Range | Resolved | Role |
|---|---|---|---|
| `typescript` | `^5.9.3` | `5.9.3` | Type checker (`npm run typecheck` → `tsc --noEmit`) |
| `@types/node` | `^20.19.41` | `20.19.41` | Node type definitions |
| `@types/react` | `^19.2.15` | `19.2.15` | React type definitions |
| `@types/react-dom` | `^19.2.3` | `19.2.3` | React DOM type definitions |
| `@types/pg` | `^8.20.0` | `8.20.0` | `pg` type definitions |
| `drizzle-kit` | `^0.31.10` | `0.31.10` | Migration generate / `check` / `migrate` CLI (`drizzle.config.ts`) |
| `openapi-typescript` | `^7.13.0` | `7.13.0` | Generates `lib/api/generated/openapi-types.ts` from the OpenAPI spec |
| `@redocly/cli` | `^2.31.5` | `2.31.5` | OpenAPI linting (`redocly lint api/openapi.yaml`) |
| `fallow` | `^2.87.0` | `2.87.0` | Codebase-intelligence dev tool + CI/agent commit gates |
| `c8` | `^11.0.0` | `11.0.0` | V8→Istanbul coverage conversion for the provider coverage snapshot |

**Dev-vs-runtime distinction:** `fallow` (codebase intelligence), `c8` (coverage), `@redocly/cli` + `openapi-typescript` (contract tooling), `drizzle-kit` (migration tooling), and `typescript` are all build/dev-time only. There is **no test-runner framework** (no Jest/Vitest); tests are plain Node scripts run via `node --experimental-strip-types` / `node` (`package.json:16-20`).

## Configuration

- **`tsconfig.json`** — strict TS, `noEmit`, bundler module resolution, Next plugin, `.ts`-extension imports. Excludes `node_modules`; includes `next-env.d.ts`, `.next/types/**`, `.next/dev/types/**`, `**/*.ts(x)`.
- **`next-env.d.ts`** — generated Next.js ambient types (marked "should not be edited"); gitignored (`.gitignore:4`).
- **No `next.config.*`** — Next.js runs on defaults.
- **`drizzle.config.ts`** — Drizzle Kit config: `schema: ./lib/db/schema.ts`, `out: ./lib/db/migrations`, `dialect: postgresql`, `strict: true`, `verbose: true`. Reads `process.env.DATABASE_URL`, falling back to a credential-free local URL `postgresql://localhost:5432/fsma204_schema_check` so schema checks run without a live DB (`drizzle.config.ts:3-16`).
- **`api/openapi.yaml`** — OpenAPI 3.1.0 source of truth (`openapi: 3.1.0`, `info.title: FSMA 204 Traceability Workflow API`, `version: 0.1.0`, license `LicenseRef-Proprietary`). Single server `url: /`. Generated types regenerate to `lib/api/generated/openapi-types.ts` via `npm run api:types` (treated as generated; `.fallowrc.jsonc:34` ignores `lib/api/generated/**`).
- **`.fallowrc.jsonc`** — fallow tuning: test/script globs declared as reachability `entry` roots; `lib/api/generated/**`, `lib/db/migrations/**`, `next-env.d.ts`, `docs/**` globally ignored; duplication/health exclude `tests/**` (health also excludes `scripts/**`); health thresholds `maxCyclomatic: 20`, `maxCognitive: 15`, `maxCrap: 30`; `unused-*` rules are `warn` (scaffold stage), structural rules (`circular-dependencies`, `unresolved-imports`, `unlisted-dependencies`, `duplicate-exports`, `boundary-violation`) are `error`.
- **`.mcp.json`** — project-scoped MCP server `fallow` (`npx fallow-mcp`, env `FALLOW_AGENT_SOURCE: claude_code`).
- **Agent commit gate** — `.claude/settings.json` wires a `PreToolUse`/`Bash` hook to `.claude/hooks/fallow-gate.sh` (runs `fallow audit` before git commit/push).
- **`.coderabbit.yaml`** — CodeRabbit review configuration (present at repo root).
- **`.gitattributes`** — enforces LF line endings (relevant to the `.sh` gate hook).
- **Secrets** — no committed secret files were read; `.gitignore:5` ignores `.env*.local`. Environment variables consumed are listed in `INTEGRATIONS.md`.

## Platform Requirements

- **Node.js `>=22.6`** (`package.json:23-25`); CI on `22.x` (`ubuntu-latest`).
- **PostgreSQL** — required only by the scaffolded DB layer and the provider DB test suites, **not** by `typecheck`/`build`/the live fixture routes. `drizzle.config.ts` has a credential-free fallback so `npm run db:check` runs without a database. The provider tests and coverage regen require a disposable Postgres (CI uses `postgres:16-alpine`, `.github/workflows/contract-gate.yml:73`; the regen README pins `127.0.0.1`, never `localhost`, at `coverage/provider/README.md:39-40`).
- **OS** — repo developed on Windows 11 (per project memory); CI runs on Linux (`ubuntu-latest`). Cross-OS concerns are handled deliberately: `.gitattributes` enforces LF; coverage paths are stored repo-relative + POSIX (`coverage/provider/README.md:34-35`); the coverage script avoids shell env-prefixes for cross-platform parity (`scripts/run-db-coverage.mjs:4-6`).
- **`bash` + `jq`** — required by the local fallow agent gate hook (`.claude/hooks/fallow-gate.sh`); the hook fails open if `jq`/`fallow` are missing (per `CLAUDE.md`).
