# Batch 30 - Provider-Activation Hardening Checklist

## Goal

Capture, as a durable ledger, the forward-looking hardening items surfaced by a
multi-specialist review board over the open Phase 1-3 PRs. None of these are
defects in the shipped boundary skeleton: the change set is byte-identical for
the MockRecall success and 404 paths, the unedited contract smoke test passes,
and every item is a dormant or future-only concern. They become actionable when
the **first non-public `RequestContextResolver`/`AuthorizationPolicy` and the
first mutating-write path** are wired - the "Next Smallest Step" named in
`ops/deltas/0029-boundary-skeleton.md`. This document is the checklist that batch
should work through.

This is a planning/ops record only. It changes no code, contract, type, test, or
dependency.

## Provenance

- **Source:** a 10-specialist review board (general correctness, type design,
  silent-failure hunting, test coverage, simplification/YAGNI, API security /
  OWASP API Top 10 2023, REST + RFC 9457, behavior-preservation/byte-identity,
  planning-docs accuracy, CodeRabbit-config review) run over PRs #4, #5, #6.
- **Filtering:** each Critical/Warning finding was independently re-checked by an
  adversarial verifier instructed to refute. 20 raw findings -> 0 Critical, 0
  Warning after verification; everything below is **info / forward-looking**.
- **Reconciliation:** the CodeRabbit CLI returned 0 findings on #4 and #5; the
  board concurs there are no blocking issues and adds the deduplicated hardening
  notes below beyond the CLI.

## Verdicts (at review time)

- PR #6 (`.coderabbit.yaml` config): APPROVE.
- PR #4 (Phase 3 kickoff + 03-01A docs): APPROVE WITH NITS.
- PR #5 (CSV projection + Problem catalog + boundary skeleton): APPROVE WITH NITS.

Nothing here blocks merging the stack (order: #6 -> #4 -> #5). The byte-identity
auditor independently re-ran `tsc`, `next build`, and the pinned smoke test on the
PR #5 branch and confirmed success + 404 bytes are unchanged.

## Activation trigger

Apply the relevant section when, and only when, a batch:
- wires a non-public `RequestContextResolver` (real authentication), and/or
- wires a non-public `AuthorizationPolicy` (real multi-tenant RBAC), and/or
- introduces the first mutating-write path (activates `IdempotencyStore` /
  `AuditSink`), and/or
- selects a real persistence provider for `MockRecallSource`.

Until then the public-fixture defaults keep every item below dormant.

## Checklist

### A. Boundary robustness (`lib/api/route-boundary.ts`)

- [ ] **A1 (highest value) - Map resolver/load throws to Problem Details.**
  `request-context.ts` documents that a resolver "may reject by throwing an auth
  failure the boundary maps to Problem Details," but `handleReadAction` awaits
  `resolver.resolve(...)` and calls `args.load(ctx)` with no `try/catch`. A real
  throwing resolver would surface a Next.js 500 (stack/diagnostic leak) instead of
  the promised 401/403. Maps to OWASP API8:2023.
  - *Lowest-cost honest fix, valid now and byte-identical:* tighten the
    `request-context.ts` comment to state resolvers MUST NOT throw and must return
    a context the policy denies.
  - *Full fix at activation:* wrap resolve+authorize+load in `try/catch`, map a
    typed auth error to `unauthorizedResponse`/`forbiddenResponse` and any other
    throw to a generic 5xx Problem (new catalog entry); add a throwing-resolver
    unit test.
- [ ] **A2 - Make the miss-sentinel total.** `load: (ctx) => T | null` is checked
  with `value === null`. A future async/ORM adapter returning `undefined` on a
  miss (`Map.get`, `findFirst`) would pass the guard and be rendered as a hit
  instead of a leak-safe 404. Fix: `value == null` (or `=== null || === undefined`)
  and/or bound `T extends NonNullable<unknown>`. The `MockRecallSource` interface
  already pins the convention to `... | null`, so today's two adapters are safe.
- [ ] **A3 - Await the load seam.** `load` is synchronous and un-awaited. A
  Promise-returning adapter would render a pending Promise, and a rejection would
  be an unhandled 500. Fix at activation: make `load` Promise-aware, `await` it,
  and wrap per A1.

### B. Auth & tenant type-safety (`lib/security/*`)

- [ ] **B1 - Policy must consume `ctx`.** `publicFixturePolicy.authorize` ignores
  `ctx` and authorizes the action class only; tenant isolation rests solely on the
  `MockRecallSource` tenant gate. If a real multi-tenant resolver is wired but the
  policy is not, every authenticated tenant passes authorization for the read
  actions - the classic OWASP API1:2023 (BOLA) failure mode. Fix: have the policy
  receive and use `ctx` (tenant/principal); consider failing closed if
  `defaultBoundaryDeps` (public-fixture policy) is still active in a non-fixture
  deployment.
- [ ] **B2 - Bind `TenantContext.source` to `tenantId`.** The `source`
  (`"fixture-public" | "authenticated"`) and `tenantId` fields can drift
  independently; the leak-safe guard keys off a runtime string compare
  (`tenantId !== PUBLIC_FIXTURE_TENANT_ID`), not the type system. Fix: model
  `TenantContext` as a discriminated union on `source`, and/or introduce a branded
  `TenantId` so a public-fixture id and an authenticated tenant id are not
  interchangeable strings.
- [ ] **B3 (cosmetic) - Unify the auth vocabulary.** Three near-synonyms appear:
  `AuthorizationDecision.reason` `"unauthenticated"`, catalog key `unauthorized`,
  function `unauthorizedResponse` (401). The mapping is correct; optionally align
  the reason literal with the catalog key / HTTP semantic.

### C. Dormant-branch test coverage (unit-testable today via the `deps?` seam; no provider needed)

- [ ] **C1 - 401/403 deny branch + authorize-before-load ordering.** Stub a policy
  returning `{allowed:false, reason:"unauthenticated"}` -> assert 401; another with
  `"forbidden"` -> assert 403; assert `load` is never called on denial (proves
  leak-safe ordering).
- [ ] **C2 - Cross-tenant null guard.** `fixtureMockRecallSource.getDetail`/
  `getPacketCsv` with a non-public `tenantId` -> `null`; positive control with
  `PUBLIC_FIXTURE_TENANT_ID` -> non-null.
- [ ] **C3 - 401/403 Problem byte-shape.** Assert `unauthorizedResponse('/p')` and
  `forbiddenResponse('/p')` status (401/403), `application/problem+json`, and the
  parsed body with the same rigor `assertProblemDetails` applies to 404.
- [ ] **C4 (optional) - `toPacketCsv` field mapping.** The smoke test pins final
  bytes via its own literal; it cannot prove the projection maps the right field to
  the right column or renders `humanReviewRequired` as `"true"`/`"false"`. Export
  `toPacketCsv` and unit-test the mapping with a synthetic record.

Note: `package.json` currently has only the smoke script - no unit-test runner.
Selecting/adding one is part of the activation batch, not the skeleton.

### D. Problem Details / contract conformance (`lib/api/problem.ts`)

- [ ] **D1 - 401 needs `WWW-Authenticate`.** RFC 9110 s15.5.2 requires a 401 to
  carry a `WWW-Authenticate` challenge; the contract declares `bearerAuth`
  (http/bearer), so `WWW-Authenticate: Bearer`. Add it when the 401 path activates;
  consider attaching it in a 401-specific helper so callers cannot forget.
- [ ] **D2 (advisory) - `about:blank` title vs status phrase.** RFC 9457 s4.2.1
  advises that with `type: about:blank` the title SHOULD be the HTTP status phrase.
  `unauthorized` uses "Authentication required" (vs "Unauthorized"); the existing
  `notFound` already uses "Resource not found", so this continues an intentional
  pattern. If strict semantics are wanted later, align titles to status phrases or
  mint dedicated problem type URIs.
- [ ] **D3 - Catalog vs declared taxonomy.** The contract declares
  Unauthorized/Forbidden/NotFound/Conflict(409)/ValidationError(422)/RateLimited(429);
  the catalog now owns 401/403/404. Add `conflict`/`validationError`/`rateLimited`
  (the last with the contract's `Retry-After` header) with the first mutating-write
  batch so the catalog mirrors the contract.

### E. Scope / YAGNI (approved; track, do not necessarily change)

- [ ] **E1 - `lib/security/idempotency-audit.ts` is entirely uninvoked.** Shapes
  for mutating writes shipped in a read-only slice (approved by the plan). If
  minimizing uninvoked surface is preferred, this is the one module that could be
  deferred to the batch that first needs it.
- [ ] **E2 - `deps?` injection point and `render`'s `ctx` arg are unused** by both
  callers. A reasonable low-cost testability seam (see section C); acceptable to
  keep.

### F. Documentation nits (PR #4)

- [ ] **F1 - Phase 1 attribution.** `KICKOFF.md` says Phase 1 "merged via PR #2";
  the implementation merged in PR #1 - PR #2 was the docs closeout. Reword to
  "contract gate merged via PR #1, closed out via PR #2".
- [ ] **F2 - HANDOFF version skip.** `HANDOFF.json` jumps 1.2 -> 1.4 because one
  commit bundles batches 0025 and 0026. No change required; optionally note in
  delta 0026 that 1.3 was the folded-in intermediate state.

### G. Tooling (PR #6)

- [ ] **G1 - `auto_review.enabled: true`** auto-reviews every non-draft PR. A
  deliberate choice; flip to `false` for on-demand review (`@coderabbitai review`)
  if preferred.

## Out of scope (explicitly NOT required by this checklist)

Wiring a real auth or persistence provider, storage/DB/schema/migrations,
enforcement on non-public tenants, and activating idempotency/audit are the
substance of the future batch itself - this document only records what to harden
*as part of* that work, not a mandate to start it.

## Cross-references

- `ops/deltas/0029-boundary-skeleton.md` - the skeleton these items harden, and its
  "Next Smallest Step".
- `lib/api/route-boundary.ts`, `lib/security/request-context.ts`,
  `lib/security/authorization.ts`, `lib/api/mock-recall-source.ts`,
  `lib/api/problem.ts` - the surfaces referenced above.
- `tests/mock-recall-contract-smoke.mjs` - the unedited byte-identity oracle.

## Next Smallest Step

Unchanged from `0029`: the first mutating-write path / non-public resolver+policy
batch. When it is planned, lift sections A-D into its task list.
