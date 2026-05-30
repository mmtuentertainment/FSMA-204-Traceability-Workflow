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
- `PLAN.md` is tracked in the current HEAD; do not edit it unless explicitly approved.
- Next useful batch should be small, reversible, and consultant-approved.
