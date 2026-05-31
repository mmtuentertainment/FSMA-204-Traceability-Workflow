# Product Memory

- FSMA 204 readiness workflow, not compliance certification.
- First wedge remains fresh-cut produce mock recall readiness.
- OpenAPI-first contract and generated TypeScript contract tooling exist.
- The GitHub Actions CI contract gate exists and runs install, `api:check`, typecheck, build, and MockRecall contract smoke checks.
- Mock-recall routes expose one OpenAPI-declared contract fixture for runtime smoke checks.
- MockRecall OpenAPI examples were reviewed against the fixture and missing-resource Problem Details behavior; no OpenAPI repair was needed.
- The committed MockRecall contract smoke check verifies the fixture and missing-resource Problem Details behavior against a production Next server.
- Unknown mock-recall IDs still return RFC 9457-style Problem Details.
- No persisted runtime/storage flow or production CSV generation exists yet.
- Phase 1 and Phase 2 are complete; Phase 3 Security And Persistence Foundation kickoff planning exists but implementation has not started.
- Phase 3 implementation requires explicit approval and must preserve server-derived tenant context, RBAC, idempotency, auditability, and OpenAPI-first discipline.
- 03-01A documents a provider-neutral security/persistence boundary decision; no implementation has started.
- `PLAN.md` is tracked in the current HEAD; do not edit it unless explicitly approved.
- Next useful batch should be small, reversible, and consultant-approved.
