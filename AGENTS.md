# AGENTS.md

## Documentation

- For library, framework, SDK, API, CLI, or cloud-service questions, use Context7 first: `npx ctx7@latest library <name> "<question>"`, then `npx ctx7@latest docs <libraryId> "<question>"`.
- Do not use Context7 for refactoring, business-logic debugging, code review, scripts from scratch, or general programming concepts.
- If Context7 reports quota limits, say so and suggest `npx ctx7@latest login` or `CONTEXT7_API_KEY`; do not answer from stale assumptions.

## Product Scope

- Use conservative FSMA language: readiness workflow, human review, and FDA-style sortable export.
- Do not claim compliance certification, legal advice, or FDA endorsement.
- Current posture is an OpenAPI-first scaffold with generated contract checks, a CI contract gate, one MockRecall contract smoke fixture, and one fixture-only exception-review PATCH.
- The exception-review PATCH uses local/test fixture auth, server-derived fixture tenant identity, reviewer RBAC, in-memory fixture state, idempotency replay/conflict handling, and in-memory audit evidence only.
- No production auth provider, database persistence, production tenant model, production RBAC provider, persisted audit log, imports, exports, production CSV generation, or broader production workflow logic exists yet.
- Phase 3 has started but is not complete; Phase 4-8 runtime work remains out of scope unless a later approved micro-batch explicitly lifts that boundary.

## Batch Discipline

- Keep work in small approved batches and document each batch in `ops/deltas/`.
- Use the existing local/CI gate as the baseline: `npm ci`, `npm run api:check`, `npm run typecheck`, `npm run build`, `npm run test:mock-recall:contract`, and `npm run test:exception-review:patch`.
- Do not install dependencies or create generated artifacts unless the batch explicitly permits it.
- Do not leave `.next/`, `node_modules/`, `next-env.d.ts`, lockfiles, or other generated outputs in the working tree without an approved `.gitignore` plan.
- Before edits, verify the repository path, `git status --short`, `git remote -v`, `node -v`, and `npm -v`; Node.js must be >= 22.6 for the fixture-only exception-review PATCH type-stripping test gate.

## Future API Guardrails

- Keep OpenAPI as the source of truth before database, auth, or product implementation.
- Use RFC 9457 Problem Details for API errors.
- Design mutating writes with idempotency keys.
- Preserve tenant isolation, RBAC checks, and append-only auditability in future batches.

---

<!-- fallow:setup-hooks:start -->
## Fallow local gate

Before any `git commit` or `git push`, run `fallow audit --format json --quiet --explain`. If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `"audit": { "gate": "all" }` in `.fallowrc.jsonc` to gate every finding in changed files.
<!-- fallow:setup-hooks:end -->
