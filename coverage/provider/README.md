# Provider coverage snapshot (fallow gate input)

`coverage-final.json` is a **committed Istanbul coverage snapshot** of the provider-backed
exception-review code. The fallow gate reads it (via the `FALLOW_COVERAGE` env in CI and in the
local commit hook) so that **CRAP complexity scores reflect real test coverage** instead of an
assumed ~0%. It is what lets `.fallowrc.jsonc` keep `health.maxCrap: 30` strict without
false-positiving the well-tested provider functions. Introduced in Batch 0057
(`ops/deltas/0057-*.md`).

## What it covers

The functions that otherwise trip coverage-blind CRAP at `maxCrap: 30`:

- `lib/db/exception-review-provider.ts` — `reviewTraceabilityExceptionWithProvider`,
  `reserveIdempotencyRecord`, `applyTenantScopedExceptionReview` (function-entry coverage by the
  Batch A1/A2/A3 provider tests — sufficient for the CRAP gate). Statement/branch coverage is **not**
  100%: e.g. the `stableStringify` array branch is unexercised and several provider branches are
  cold; the snapshot exists to make CRAP reflect real coverage, not to assert full-path coverage.
- `lib/shared/canonical-json.ts` — the shared `stableStringify` request-hash helper.

> Not covered here: `lib/api/exception-review.ts:readExceptionPatch` (a pre-existing function,
> reported by the gate as an **inherited** warn — non-fatal under the default `new-only` gate).
> Broadening the snapshot to the fixture-tested surface is a deferred follow-up.

## Fails closed (why a committed snapshot is safe)

fallow matches coverage to a function by content hash. Edit a covered function → its hash changes
→ this snapshot no longer matches → the function reads as 0% → CRAP re-inflates → the gate
**fails**, forcing a refresh. A stale snapshot can only "pass" while the covered source is
byte-unchanged (where the old coverage is still valid). Paths are stored **repo-relative + POSIX**
so the same file matches on both Windows (local hook) and Linux (CI).

## Regenerate

Requires a disposable PostgreSQL test DB (the a1/a2/a3 suites are provider-backed). Use
`127.0.0.1`, never `localhost` (IPv6 `::1` → `pg.Pool` ECONNRESET against a Docker port).

```bash
# 1. disposable Postgres
docker run -d --name fsma204-cov-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=fsma204_provider_test \
  -p 55432:5432 postgres:16-alpine
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/fsma204_provider_test"
export TEST_DATABASE_URL="$DATABASE_URL"        # db name contains "test" → passes all provider fences (a1/a2/a3)
npx drizzle-kit migrate --config drizzle.config.ts        # apply schema to a FRESH db

# 2. regenerate the snapshot: runs all provider suites (a1/a2/a3) under coverage, converts V8 -> Istanbul
#    via c8, then normalizes (repo-relative POSIX paths, -1 -> 0, lib/** only, deterministic).
npm run test:db:coverage                                  # writes coverage/provider/coverage-final.json

# 3. confirm the gate clears with it
FALLOW_COVERAGE=coverage/provider/coverage-final.json \
  npx fallow audit --base origin/main --format json --quiet 2>/dev/null   # verdict pass/warn

docker rm -f fsma204-cov-pg
```

`npm run test:db:coverage` (Batch 0058) is the committed, reproducible path: `scripts/run-db-coverage.mjs`
orchestrates the V8 capture and calls `scripts/normalize-coverage.mjs`, and `c8` is a devDependency. The
same command runs in CI — the `db-provider-tests` job in `.github/workflows/contract-gate.yml` regenerates
a fresh snapshot to a temp `--out` and a strict freshness guard fails the job when fallow's verdict from
the committed snapshot diverges from the fresh one (or when fresh coverage does not clear the gate). The
transform is deterministic: regenerating with byte-unchanged source reproduces the committed file exactly.
The guard compares fallow's 3-way *verdict* (gate-equivalence), not raw bytes, so it tolerates
count/offset/CRLF/OS noise — it enforces that the snapshot stays *gate-equivalent*, not necessarily
byte-fresh — and it also fails the job if either audit crashes or yields no verdict.
