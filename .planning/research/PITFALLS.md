---
created: 2026-05-28
sources: repo, FDA
---

# Pitfalls

## Regulatory Language Drift

Avoid wording that implies compliance certification, FDA endorsement, legal advice, or automated exemption determination. Use readiness workflow, human review, and FDA-style sortable export language.

## Date Drift

FDA's Food Traceability Rule compliance/enforcement timing has changed from the original January 20, 2026 date. As of the FDA page checked on 2026-05-28, the non-enforcement date is tied to July 20, 2028. Recheck official FDA pages before making date-specific claims.

## Contract-Implementation Mismatch

The OpenAPI contract describes more than the runtime implements. Keep README, product memory, generated types, route behavior, and delta reports synchronized so users are not misled about what works.

## Security Sequencing

Adding storage before auth, tenant isolation, RBAC, and auditability could create later rework. The repo should design these together before production data is persisted.

## Generated Artifacts

Next and TypeScript commands can create `.next/`, `next-env.d.ts`, and `*.tsbuildinfo`. These are ignored, but batch reports should still note generated artifacts when validation runs.

## Testing Gaps

Runtime behavior is documented in `ops/deltas/0008-runtime-verify-mock-recall-problem-handlers.md`, but there are no committed tests yet. Without CI, contract drift can return quietly.

## Scope Expansion

Supplier portals, OCR, ERP integration, legal exemption engines, dashboards, mobile scanning, and blockchain-style traceability could all sound adjacent. They are out of scope unless explicitly approved.
