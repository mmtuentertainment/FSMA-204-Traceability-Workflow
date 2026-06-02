# Product Memory

- FSMA 204 readiness workflow, not compliance certification.
- First wedge remains fresh-cut produce mock recall readiness.
- OpenAPI-first contract and generated TypeScript contract tooling exist.
- The GitHub Actions CI contract gate exists and runs install, `api:check`, typecheck, build, MockRecall contract smoke, and exception-review PATCH focused fixture checks.
- Mock-recall routes expose one OpenAPI-declared contract fixture for runtime smoke checks.
- MockRecall OpenAPI examples were reviewed against the fixture and missing-resource Problem Details behavior; no OpenAPI repair was needed.
- The committed MockRecall contract smoke check verifies the fixture and missing-resource Problem Details behavior against a production Next server.
- Unknown mock-recall IDs still return RFC 9457-style Problem Details.
- No persisted runtime/storage flow or production CSV generation exists yet; the packet CSV is a derived projection of the in-memory fixture record (Batch 27).
- Phase 1 and Phase 2 are complete; Phase 3's approved boundary skeleton (Batch 29) is implemented with byte-identical behavior, but auth/persistence providers and enforcement remain unstarted.
- Phase 3 implementation requires explicit approval and must preserve server-derived tenant context, RBAC, idempotency, auditability, and OpenAPI-first discipline.
- 03-01A documents a provider-neutral security/persistence boundary decision; Batch 29 implemented its boundary skeleton (request context, deny-by-default authorization, tenant-scoped MockRecallSource, Problem catalog, idempotency/audit shapes) as seams plus public-fixture default adapters only.
- Batch 33 added a docs-only approval packet for the first mutating-write activation candidate: exception-review PATCH only. Batch 34 later lifted that Phase 4-8 Non-Goal boundary only for the fixture-backed PATCH slice; production provider/auth/RBAC/tenant/idempotency/audit decisions remain gated.
- Batch 34 implements that first write as fixture-only runtime: local/test bearer auth, server-derived fixture tenant, same-tenant reviewer RBAC, in-memory exception repository, idempotency replay/conflict, and append-only in-memory audit for `PATCH /api/traceability/exceptions/{exceptionId}` only.
- Batch 35 records the production provider-selection direction without implementation: server-verified auth/session, server-derived tenant membership, tenant-scoped relational persistence, durable idempotency entries, and append-only audit evidence for the exception-review PATCH path.
- Batch 37 wires the existing fixture-only exception-review PATCH focused test into package scripts and the CI contract gate without changing runtime behavior.
- `PLAN.md` is tracked in the current HEAD; do not edit it unless explicitly approved.
- Next useful batch should be small, reversible, and consultant-approved.
