# 0004 OpenAPI License Metadata

Date: 2026-05-28

## What Changed

- Added OpenAPI `info.license` metadata to `api/openapi.yaml`.
- Completed the proprietary license object with:
  - `name: Proprietary`
  - `identifier: LicenseRef-Proprietary`

## Why LicenseRef-Proprietary Was Chosen

The repo does not currently expose a clear SPDX-compatible public license in
package metadata or a root `LICENSE` file. `LicenseRef-Proprietary` keeps the
contract metadata explicit for a private/proprietary project while satisfying
Redocly's strict license rule without inventing a license URL.

## Files Changed

- `api/openapi.yaml`
- `ops/deltas/0004-openapi-license-metadata.md`

## Commands Run

- `git status --short`
- `git log --oneline -5`
- `node -v`
- `npm -v`
- `Get-Location`
- `git remote -v`
- `git diff -- api/openapi.yaml`
- `npm run api:lint`
- `npm run api:types:check`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- `git status --short`
- `git diff -- lib/api/generated/openapi-types.ts`

## Redocly Warning Result

- `npm run api:lint` passed.
- Redocly validated `api/openapi.yaml`.
- No `info-license` warning was reported.
- No `info-license-strict` warning was reported.
- No new Redocly warnings or errors were reported.

## Generated Type Freshness Result

- `npm run api:types:check` passed.
- `lib/api/generated/openapi-types.ts` did not change for this metadata-only
  update.

## Typecheck and Build Result

- `npm run typecheck` passed.
- `npm run build` passed with Next.js `16.2.6`.
- `git diff --check` passed.

## What Was Intentionally Skipped

- No dependencies were installed, removed, upgraded, or downgraded.
- No `npm audit fix` was run.
- No `package.json` or `package-lock.json` changes were made.
- No Redocly configuration was added or modified.
- No license URL, `LICENSE` file, terms of service, contact metadata, legal
  advice language, compliance certification language, or FDA endorsement
  language was added.
- No database, authentication, route handlers, API handlers, UI product
  features, imports, exports, runtime traceability logic, tests, migrations,
  data models, supplier portal, OCR, ERP integration, or CI changes were added.
- No OpenAPI paths, schemas, operationIds, parameters, responses, security
  behavior, idempotency behavior, RFC 9457 error behavior, Retry-After
  behavior, CSV export behavior, tenant isolation posture, or human-review
  semantics were changed.
- `PLAN.md` was intentionally left untracked and uncommitted.

## Final Git Status

Before the approved commit, `git status --short` showed:

- `M api/openapi.yaml`
- `?? PLAN.md`

After this delta file was added, the only intended tracked changes for commit
are `api/openapi.yaml` and `ops/deltas/0004-openapi-license-metadata.md`; the
untracked `PLAN.md` remains intentionally excluded.

## Recommended Next Micro-Batch

Run a narrow OpenAPI contract-quality review to identify the next smallest
source-of-truth cleanup, if any, before adding handlers, database work,
authentication, imports, exports, UI product features, or runtime traceability
logic.
