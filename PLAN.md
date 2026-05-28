# Baseline Scaffold Plan — FSMA 204 Traceability Workflow

> **Consultant inline update — 2026-05-27:** Reviewed against current official Next.js, OpenAI Codex, FDA FSMA 204, and RFC 9457 sources. Verdict: **approve with tightening**. No additional product discovery is needed before the baseline scaffold. The only material implementation grey area is the intentional omission of `.gitignore` under the 8-file cap.

## Summary
- Verification gate passed: current folder is `C:\Users\matth\Desktop\FSMA 204 Workflow Product`, Git status is clean, and `origin` is exactly `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`.
- Create the smallest baseline only: Next.js App Router + TypeScript + npm, no Tailwind, no database, no auth, no FSMA runtime features.
- **Consultant update:** Keep the scaffold minimal, but explicitly note the live framework baseline: current Next.js docs show App Router support, latest docs list Next.js `16.2.2`, and the minimum Node.js version is `20.9`. Add `node -v` and `npm -v` to the preflight so Codex does not create a repo that cannot run locally.
- **Consultant update:** Context7 docs could not be fetched because the monthly quota is reached. This is **not a blocker** for Batch 0 because official Next.js/Codex/FDA docs were checked separately. Keep Context7 as a future docs convenience, not a hard dependency.
- **Consultant update:** Keep regulatory language as readiness/workflow language. Do not claim compliance certification. FDA’s current framing still supports the product wedge: covered firms must maintain KDEs tied to CTEs and provide records to FDA within 24 hours or an agreed reasonable time; the electronic sortable spreadsheet template is illustrative, not mandatory.

## Key Changes
- Add exactly these 8 files, staying under 400 net LOC:
  - `package.json` with `dev`, `build`, `start`, and `typecheck` scripts.
    - **Consultant update:** Use `private: true`. Include only baseline dependencies/devDependencies needed for a minimal Next + TypeScript scaffold. Do **not** add ESLint unless also adding the necessary config/dependencies in a later batch.
    - **Consultant update:** Do not guess exotic framework options. Next’s manual install path requires `next`, `react`, and `react-dom`; TypeScript support needs `typescript` and React/Node type packages.
  - `tsconfig.json` for strict TypeScript and Next-compatible settings.
    - **Consultant update:** Include `next-env.d.ts`, `.next/types/**/*.ts`, `**/*.ts`, and `**/*.tsx`; exclude `node_modules`. Next generates `next-env.d.ts` during `next dev`, `next build`, or `next typegen`.
  - `app/layout.tsx` with a minimal HTML shell.
    - **Consultant update:** Root layout must include `<html>` and `<body>` tags.
  - `app/page.tsx` with a baseline status page only.
  - `README.md` covering purpose, stack, setup commands, current baseline-only status, and next batch: OpenAPI contract.
    - **Consultant update:** Add Node requirement: `Node.js >= 20.9`.
  - `AGENTS.md` with all required FSMA scope, future API/idempotency/problem-details/tenant/RBAC/audit, and batch-limit rules.
    - **Consultant update:** This is worth keeping in Batch 0 because Codex reads `AGENTS.md` before work and layers project-specific instructions from the repo root.
  - `ops/memory/product.md` with no more than 8 lines.
  - `ops/deltas/0000-baseline-scaffold.md` documenting what changed, why, files changed, commands run, skipped validation, and next micro-batch.

## Validation
- Before edits: run `pwd`, `git status --short`, `git remote -v`, `node -v`, and `npm -v`; stop if the repo identity check fails.
- **Consultant update:** Stop and report if Node is missing or below `20.9`. Do not attempt to “fix” Node from Codex.
- After edits: run `git status --short`.
- Do not install dependencies.
- Run `npm run typecheck` and `npm run build` only if dependencies are already available; otherwise report both as skipped because dependencies are not installed.
- **Consultant update:** Because this batch intentionally omits `.gitignore`, do not leave generated artifacts such as `.next/`, `next-env.d.ts`, or `node_modules/` in the working tree. If validation would generate them and no `.gitignore` exists, skip validation and report that `.gitignore` should be added before dependency install/build validation.

## Assumptions
- Use npm with package dependencies declared but not installed in this batch.
- Avoid generating extra framework files such as lockfiles or `next-env.d.ts` in this batch.
- **Consultant update:** The lack of `package-lock.json` is acceptable only because no install occurs in Batch 0. The first dependency-install batch should create and commit a lockfile.
- **Consultant update:** The lack of `.gitignore` is the one real scaffold gap. To preserve the 8-file cap, keep it out of this batch, but make the next micro-batch either:
  1. `.gitignore` + OpenAPI contract, or
  2. one-file exception now to add `.gitignore` before any install/build.
- The next micro-batch is an OpenAPI contract only, before DB/auth/product implementation.
  - **Consultant update:** Amend this to: “OpenAPI contract plus `.gitignore` if still missing.” No DB/auth/product implementation yet.

## Grey Areas Checked
- **Repo identity:** resolved. Proceed only if `origin` exactly matches the GitHub repo.
- **Context7 unavailable:** non-blocking for Batch 0.
- **Next.js baseline:** resolved. Minimal App Router scaffold is appropriate; no Tailwind, no DB, no auth.
- **`next-env.d.ts`:** resolved enough for now. Do not generate/commit it in Batch 0; add `.gitignore` before any real install/build workflow.
- **Validation:** partially blocked by the no-install constraint. Skipped validation is acceptable if reported honestly.
- **Regulatory scope:** resolved for scaffold. Keep AGENTS/README language to “readiness workflow,” “human review,” and “FDA-style sortable export,” not “compliance certification.”

## Consultant-Approved Codex Execution Delta
Use the original plan with these additions:
1. Add `node -v` and `npm -v` to preflight.
2. Require Node.js `>=20.9`; stop if lower.
3. Keep exactly 8 files unless the user approves a one-file `.gitignore` exception.
4. Do not run build/typecheck if doing so leaves generated files in the repo without `.gitignore`.
5. End the Codex result with an explicit recommendation: “Next batch should add `.gitignore` and `api/openapi.yaml` before dependency install, DB, auth, or product code.”

## Source Notes Checked
- Next.js official docs: App Router installation, manual package requirements, `app/layout.tsx` and `app/page.tsx`, Node minimum, and `next-env.d.ts` generation.
- OpenAI Codex official docs: Codex reads `AGENTS.md` before work and supports workspace-write/read-only sandbox modes.
- FDA FSMA 204 official docs: KDE/CTE recordkeeping, 24-hour response, and electronic sortable spreadsheet template.
- RFC 9457: Problem Details for HTTP APIs for future API error design.
