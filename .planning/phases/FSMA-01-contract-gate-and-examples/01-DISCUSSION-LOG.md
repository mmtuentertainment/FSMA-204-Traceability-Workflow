# Phase 1: Contract Gate And Examples - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-29T20:08:40-04:00
**Phase:** 1-Contract Gate And Examples
**Areas discussed:** baseline classification, remaining Phase 1 scope, product/runtime boundaries

---

## Baseline Classification

| Option | Description | Selected |
|--------|-------------|----------|
| Rebuild completed checks | Re-plan the CI gate and smoke check from scratch. | |
| Treat completed checks as baseline | Use the existing CI contract gate and MockRecall smoke check as already satisfied evidence. | yes |
| Skip baseline review | Avoid classifying prior work. | |

**User's choice:** Treat completed checks as baseline.
**Notes:** The prompt explicitly requires CI gate and mock-recall smoke verification to be treated as done-baseline, not new work.

---

## Remaining Phase 1 Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Truth-surface reconciliation and reviewed examples | Reconcile GSD state/narrative with repo reality and review MockRecall examples only. | yes |
| Runtime implementation | Add database, auth, UI, production CSV, storage, or workflow behavior. | |
| Broad contract rebuild | Rework completed OpenAPI/runtime/smoke fixture batches. | |

**User's choice:** Truth-surface reconciliation and reviewed examples.
**Notes:** The remaining planning candidate is limited to `.planning/` and documentation/truth surfaces unless Matt approves otherwise.

---

## Product And Runtime Boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative readiness language | Use readiness workflow, human review, and FDA-style sortable export language. | yes |
| Compliance/legal positioning | Claim certification, legal advice, automated exemption determination, or FDA endorsement. | |
| Product expansion | Open database/auth/tenant/RBAC/audit/import/export/UI/runtime expansion in Phase 1. | |

**User's choice:** Conservative readiness language with no runtime expansion.
**Notes:** Phase 1 discussion must preserve the lightweight traceability workflow layer boundary.

---

## Claude's Discretion

- Use current repo evidence to fill the context without interactive questions because the user supplied exact decisions and stop rules in the command.
- Prefer `gsd-sdk query init.phase-op 1` as the post-write machine-state check.

## Deferred Ideas

- Database, auth, tenant model, RBAC, audit log, imports, exports, production CSV generation, UI expansion, storage-backed runtime payloads, and production workflow logic.
