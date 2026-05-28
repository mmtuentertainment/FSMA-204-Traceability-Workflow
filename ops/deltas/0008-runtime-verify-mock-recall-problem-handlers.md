# Batch 8 - Runtime Verify Mock Recall Problem Details Handlers

## Goal

Run focused request-level runtime verification against the two mock-recall `GET` endpoints added in Batch 7, proving that a running Next production server returns the documented `404` RFC 9457-style Problem Details body and exact `application/problem+json` header.

This was a verification-only batch plus this delta report. No runtime code was changed.

## Preflight baseline

- Repo path: `C:\Users\matth\Desktop\FSMA 204 Workflow Product`
- Baseline HEAD: `3120a69 Add first mock recall problem handlers`
- Pre-existing untracked file: `PLAN.md`
- Remote: `origin https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`
- Node: `v22.12.0`
- npm: `10.9.0`

Recent commit baseline:

```text
3120a69 Add first mock recall problem handlers
6c8aa8a Add OpenAPI not-found responses
d3e12e4 Audit OpenAPI contract guardrails
f2f54ca Add OpenAPI license metadata
ff54a0f Add OpenAPI tooling
```

## Files changed

- `ops/deltas/0008-runtime-verify-mock-recall-problem-handlers.md`

## Server command and port used

Server command:

```powershell
npm run start -- -H 127.0.0.1 -p 3217
```

Port used: `3217`

The server started successfully on `http://127.0.0.1:3217` from the production build and was stopped after runtime assertions completed.

Note: the suggested inline PowerShell `node -e` form stripped JavaScript quote marks in this Windows shell, so the same Node 22 `fetch` assertion script was run from a temporary `.mjs` file under `%TEMP%`. The temporary script was removed after execution and no repository files were added for assertions.

## Endpoint URLs verified

- `http://127.0.0.1:3217/api/traceability/mock-recalls/batch8-demo-id`
- `http://127.0.0.1:3217/api/traceability/mock-recalls/batch8-demo-id/packet.csv`

## Assertion results

### `GET /api/traceability/mock-recalls/batch8-demo-id`

- status: `404`
- `Content-Type`: `application/problem+json`
- body `type`: `about:blank`
- body `title`: `Resource not found`
- body `status`: `404`
- body `detail`: `No mock recall was found for mockRecallId "batch8-demo-id".`
- body `instance`: `/api/traceability/mock-recalls/batch8-demo-id`

Observed response:

```json
{
  "url": "http://127.0.0.1:3217/api/traceability/mock-recalls/batch8-demo-id",
  "status": 404,
  "contentType": "application/problem+json",
  "body": {
    "type": "about:blank",
    "title": "Resource not found",
    "status": 404,
    "detail": "No mock recall was found for mockRecallId \"batch8-demo-id\".",
    "instance": "/api/traceability/mock-recalls/batch8-demo-id"
  }
}
```

### `GET /api/traceability/mock-recalls/batch8-demo-id/packet.csv`

- status: `404`
- `Content-Type`: `application/problem+json`
- body `type`: `about:blank`
- body `title`: `Resource not found`
- body `status`: `404`
- body `detail`: `No mock recall was found for mockRecallId "batch8-demo-id".`
- body `instance`: `/api/traceability/mock-recalls/batch8-demo-id/packet.csv`

Observed response:

```json
{
  "url": "http://127.0.0.1:3217/api/traceability/mock-recalls/batch8-demo-id/packet.csv",
  "status": 404,
  "contentType": "application/problem+json",
  "body": {
    "type": "about:blank",
    "title": "Resource not found",
    "status": 404,
    "detail": "No mock recall was found for mockRecallId \"batch8-demo-id\".",
    "instance": "/api/traceability/mock-recalls/batch8-demo-id/packet.csv"
  }
}
```

The packet CSV endpoint returned Problem Details on `404` with `Content-Type: application/problem+json`; it did not return `text/csv`.

## Verification commands and results

- `npm run api:lint` - PASS. Redocly validated `api/openapi.yaml` with no warning or error findings; it printed the normal built-in recommended config note.
- `npm run api:types:check` - PASS.
- `npm run typecheck` - PASS.
- `npm run build` - PASS. The build route table listed both mock-recall API endpoints as dynamic routes.
- `git diff --check` - PASS.
- Runtime Node 22 `fetch` assertions against the production server - PASS for both endpoint URLs.

## What was intentionally skipped

- No runtime code changes.
- No changes to `lib/api/problem.ts`.
- No changes to `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`.
- No changes to `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`.
- No changes to `api/openapi.yaml` or `lib/api/generated/openapi-types.ts`.
- No changes to `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`, `AGENTS.md`, `PLAN.md`, or UI files.
- No tests, fixtures, database, auth, RBAC implementation, audit log implementation, middleware, route families beyond mock-recalls, `PATCH`/`POST` handlers, successful mock recall payloads, CSV packet generation, in-memory stores, migrations, imports/exports workflow logic, supplier portal, OCR, ERP integration, CI, dependency changes, `npm audit fix`, or Redocly config.
- No legal advice, compliance certification language, FDA endorsement language, or automated exemption determination language.
- No `PLAN.md` commit.
- No remote push.

## Final git status after commit

Expected post-commit working tree state:

```text
?? PLAN.md
```

## Commit hash note

Commit hash is reported in the final response because a commit cannot contain its own final hash.

## Recommended next micro-batch

Add the next smallest product-facing contract slice for mock recalls before adding storage: define the first successful mock recall response shape in OpenAPI only, including conservative readiness-workflow language and explicit human-review boundaries, without implementing database, auth, CSV generation, imports, exports, or UI.
