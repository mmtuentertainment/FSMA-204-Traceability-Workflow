# FSMA 204 Workflow Product

Baseline scaffold for an FSMA 204 traceability readiness workflow. This product should help teams prepare, review, and export traceability records; it must not claim compliance certification or replace human review.

## Stack

- Next.js App Router
- TypeScript
- npm
- Node.js >= 20.9

## Setup

Dependencies are declared but not installed in Batch 0.

```powershell
npm install
npm run dev
npm run typecheck
npm run build
```

## Current Status

This is a baseline-only scaffold. It has no database, authentication, FSMA runtime workflows, imports, exports, tenant model, RBAC model, or audit log implementation.

## Next Batch

Add `.gitignore` and `api/openapi.yaml` before dependency install, database work, authentication, or product code.
