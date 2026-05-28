# Batch 7 - First Mock Recall Problem Details Route Handlers

## Goal

Add the smallest runtime API handler slice for the mock-recalls resource family, proving App Router route handling and the shared Problem Details helper without adding storage, auth, success payloads, CSV generation, UI, dependencies, tests, or broader workflow logic.

## Preflight baseline

- Repo path: `C:\Users\matth\Desktop\FSMA 204 Workflow Product`
- Baseline HEAD: `6c8aa8a Add OpenAPI not-found responses`
- Pre-existing untracked file: `PLAN.md`
- Remote: `origin https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`
- Node: `v22.12.0`
- npm: `10.9.0`

## Files changed

- `lib/api/problem.ts`
- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`
- `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`
- `ops/deltas/0007-first-mock-recall-problem-handlers.md`

## Route paths added

- `GET /api/traceability/mock-recalls/{mockRecallId}`
- `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv`

## Exact Problem Details behavior

Both route handlers currently return a native Web `Response` with:

- status: `404`
- `Content-Type`: `application/problem+json`
- `type`: `about:blank`
- `title`: `Resource not found`
- `status`: `404`
- `detail`: `No mock recall was found for mockRecallId "<mockRecallId>".`
- `instance`: the request pathname from `new URL(request.url).pathname`

All `mockRecallId` values currently return `404` because no backing storage layer exists yet. This is intentional for the first runtime slice.

## Documentation check

Context7 was used for current Next.js route-handler guidance:

- `npx ctx7@latest library "Next.js" "Batch 7 first mock recall Problem Details route handlers: App Router route.ts GET handlers under app/api, dynamic route params in Next.js 15/16 should be awaited, native Web Response from route handlers"`
- `npx ctx7@latest docs /vercel/next.js "Batch 7 first mock recall Problem Details route handlers: App Router route.ts GET handlers under app/api, dynamic route params in Next.js 15/16 should be awaited, native Web Response from route handlers"`

The fetched Next.js docs confirmed route handlers live under the `app` directory, use standard Web `Request` and `Response` APIs, and dynamic `params` are Promise-wrapped and must be awaited.

## Verification commands and results

- `npm run api:lint` - PASS. Redocly validated `api/openapi.yaml` with no warning or error findings; it printed the normal built-in recommended config note.
- `npm run api:types:check` - PASS.
- `npm run typecheck` - PASS.
- `npm run build` - PASS. The build route table listed the two new dynamic API routes.
- `git diff --check` - PASS.

Additional inspection:

- `git diff -- lib/api/problem.ts` - empty because the file was untracked before staging.
- `git diff -- app/api/traceability/mock-recalls/[mockRecallId]/route.ts` - empty because the file was untracked before staging.
- `git diff -- app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts` - empty because the file was untracked before staging.
- `Get-Content` inspection confirmed the three new runtime files matched the intended tiny implementation.
- `git status --short --untracked-files=all` showed only `PLAN.md` plus the four allowed Batch 7 files before staging.

## What was intentionally skipped

- No changes to `api/openapi.yaml` or `lib/api/generated/openapi-types.ts`.
- No changes to `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`, `AGENTS.md`, `PLAN.md`, or UI files.
- No database, auth, RBAC implementation, audit log implementation, middleware, route families beyond mock-recalls, `PATCH`/`POST` handlers, successful mock recall payloads, CSV packet generation, in-memory stores, fixtures, tests, migrations, imports/exports workflow logic, supplier portal, OCR, ERP integration, CI, dependency changes, `npm audit fix`, or Redocly config.
- No legal advice, compliance certification language, FDA endorsement language, or automated exemption determination language.
- No `PLAN.md` commit.
- No remote push.

## Final git status after commit

Expected post-commit working tree state:

```text
?? PLAN.md
```

## Commit hash

To be reported in the final response after Git creates the commit. A commit cannot include its own final hash in tracked file content without changing that hash.

## Recommended next micro-batch

Add a focused request-level runtime verification batch for these two `GET` endpoints, proving the actual `404 application/problem+json` response body and headers from a running Next.js server without adding storage, success data, auth, CSV generation, or broader route families.
