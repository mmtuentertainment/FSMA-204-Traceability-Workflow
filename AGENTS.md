# AGENTS.md

## Documentation

- For library, framework, SDK, API, CLI, or cloud-service questions, use Context7 first: `npx ctx7@latest library <name> "<question>"`, then `npx ctx7@latest docs <libraryId> "<question>"`.
- Do not use Context7 for refactoring, business-logic debugging, code review, scripts from scratch, or general programming concepts.
- If Context7 reports quota limits, say so and suggest `npx ctx7@latest login` or `CONTEXT7_API_KEY`; do not answer from stale assumptions.

## Product Scope

- Use conservative FSMA language: readiness workflow, human review, and FDA-style sortable export.
- Do not claim compliance certification, legal advice, or FDA endorsement.
- Batch 0 is scaffold only: no product features, no database, no authentication, no imports, no exports, and no runtime workflow logic.

## Batch Discipline

- Keep work in small approved batches and document each batch in `ops/deltas/`.
- Do not install dependencies or create generated artifacts unless the batch explicitly permits it.
- Do not leave `.next/`, `node_modules/`, `next-env.d.ts`, lockfiles, or other generated outputs in the working tree without an approved `.gitignore` plan.
- Before edits, verify the repository path, `git status --short`, `git remote -v`, `node -v`, and `npm -v`; Node.js must be >= 20.9.

## Future API Guardrails

- Add the OpenAPI contract before database, auth, or product implementation.
- Use RFC 9457 Problem Details for API errors.
- Design mutating writes with idempotency keys.
- Preserve tenant isolation, RBAC checks, and append-only auditability in future batches.
