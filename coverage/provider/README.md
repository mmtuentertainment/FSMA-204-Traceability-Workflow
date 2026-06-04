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
  `reserveIdempotencyRecord`, `applyTenantScopedExceptionReview` (all 100% covered by the
  Batch A1/A2 provider tests).
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

Requires a disposable PostgreSQL test DB (the a1/a2 suites are provider-backed). Use
`127.0.0.1`, never `localhost` (IPv6 `::1` → `pg.Pool` ECONNRESET against a Docker port).

```bash
# 1. disposable Postgres
docker run -d --name fsma204-cov-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=fsma204_a1a2_test \
  -p 55432:5432 postgres:16-alpine
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/fsma204_a1a2_test"
export TEST_DATABASE_URL="$DATABASE_URL"
npx drizzle-kit migrate --config drizzle.config.ts        # apply schema to a FRESH db

# 2. capture V8 coverage from the provider suites
rm -rf .coverage-tmp && mkdir -p .coverage-tmp/v8
NODE_V8_COVERAGE=.coverage-tmp/v8 node --experimental-strip-types tests/db/exception-review-provider-a1.test.ts
NODE_V8_COVERAGE=.coverage-tmp/v8 node --experimental-strip-types tests/db/exception-review-provider-a2.test.ts

# 3. V8 -> Istanbul, then normalize: paths -> repo-relative POSIX, and c8's `-1`
#    sentinels -> 0 (fallow's parser rejects `-1`). Writes coverage/provider/coverage-final.json.
npx --yes c8 report --temp-directory .coverage-tmp/v8 --reporter json --report-dir .coverage-tmp/istanbul
node scripts/normalize-coverage.mjs   # (Batch 0058 lands this as a committed script + the `c8` devDep)

# 4. confirm the gate clears with it
FALLOW_COVERAGE=coverage/provider/coverage-final.json \
  npx fallow audit --base origin/main --format json --quiet 2>/dev/null   # verdict pass/warn

docker rm -f fsma204-cov-pg
```

Until Batch 0058 lands the committed normalizer + a Postgres CI job, the normalize step is the
one-off transform documented in `ops/deltas/0057-*.md`: rewrite each entry's absolute path key and
inner `.path` to `path.relative(root, …)` with forward slashes, and recursively replace `-1` → `0`.
