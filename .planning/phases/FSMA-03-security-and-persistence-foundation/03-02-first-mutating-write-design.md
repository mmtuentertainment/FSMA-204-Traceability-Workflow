# 03-02 First Mutating-Write Design - Security And Persistence Foundation

**Date:** 2026-05-31
**Branch/HEAD at authoring:** `main` / `790a8dbeff740e214d096a0d80b1034a582efcaf`
**Scope:** Design / threat-model only. No implementation, no migrations, no OpenAPI edit, no runtime change, no dependency change. Every provider, ORM, schema, role, and interface choice below is a **gated direction** requiring explicit Matt approval before any code. Type/schema fragments are **illustrative, non-binding**.

## Context And Status

The Phase 3 boundary skeleton (Batch 29, PR #5) is merged: the two MockRecall read routes flow through `handleReadAction` (resolve context -> authorize action -> tenant-scoped load -> Problem mapping) using public-fixture default adapters, with byte-identical behavior. The seams exist as interface shapes: `RequestContextResolver`, `AuthorizationPolicy`, `MockRecallSource`, `IdempotencyStore`, `AuditSink`. Idempotency and audit are uninvoked. This document designs the **first mutating-write slice** that activates a non-public resolver/policy plus the idempotency and audit interfaces. It does not implement it.

This is the planning artifact for `HANDOFF.json`'s next step (`first mutating-write path`). It supersedes nothing; it extends `KICKOFF.md` and `03-01A-boundary-decision.md`.

### Phase 4-8 Non-Goal reconciliation (read first)

`KICKOFF.md` Non-Goals fence traceability lots/events, **exceptions**, supplier KDE requests, and dynamic mock-recall aggregation into Phase 4-8. A first mutating write must touch *some* resource to prove the auth/tenant/RBAC/idempotency/audit machinery, and every candidate resource is on that fence. **Decision (this slice, gated):** the first write is the single smallest exception-review transition (below), and the activation slice requires Matt to **explicitly lift the Phase 4-8 Non-Goal for that one minimal resource only**. The foundation is proven by the first small feature write; no broader Phase 4-8 workflow (aggregation, lot/event CRUD, supplier lifecycle, export) is unfenced.

## Goal Of The Slice

Prove the security and persistence foundation end-to-end with the smallest possible real state change: an authenticated, RBAC-authorized, tenant-scoped, idempotent, audited human-review decision on one exception record, with all failures returned as RFC 9457 Problem Details and no cross-tenant existence leakage.

## Non-Goals

- No implementation in this doc; this is design only.
- No OpenAPI edit, generated-type edit, package/dependency change, runtime change.
- No Phase 4-8 feature workflow beyond the single exception-review transition (no lot/event CRUD, no supplier lifecycle, no mock-recall aggregation, no production CSV/export).
- No provider/ORM/auth selection is finalized here; all are gated options.
- No change to the existing byte-identical MockRecall read behavior.
- No compliance certification, legal advice, FDA approval/endorsement, or automated exemption determination.

## Chosen First Write: Exception-Review Transition

**Endpoint (already declared in the contract):** `PATCH /api/traceability/exceptions/{exceptionId}` -> `200 ExceptionRecord`, with the `Idempotency-Key` parameter and the `401/403/404/409/422/429` taxonomy already declared (`api/openapi.yaml`).

**What it mutates (corrected to the real contract).** `ExceptionPatch` fields are `status` (enum `open | in_review | resolved | deferred`), `review_reason` (enum), `review_notes`, and `human_review_required`. There is **no `review_status` field** on `ExceptionRecord`/`ExceptionPatch` (that lives on TraceLot/TraceEvent/MockRecall). The review transition is therefore a `status` change (e.g. `open -> in_review` or `in_review -> resolved`) plus optional `review_reason`/`review_notes`/`human_review_required`, on a record already referenced by id.

**Why smallest and safest:**
- One owned record, referenced by id; no new aggregate, no identity allocation, no downstream recomputation.
- Contract-conformance, not contract-design: the endpoint, idempotency header, and error taxonomy already exist, so the activation slice conforms to an existing shape rather than designing new contract surface.
- Canonical audit story: a human marking an exception reviewed is exactly the actor/tenant/action/resource/time/source/reason event the foundation must capture; the structured `status` transition is the evidence, with `review_notes` as supplement (not the sole trail).
- Reversible: revert = unwire the write adapter + idempotency/audit activation + non-public resolver/policy; routes return to Batch 29 read-only behavior; the two GET routes are never touched.

**Illustrative, non-binding seam extension** (a write counterpart to `MockRecallSource`; not a commitment):

    // illustrative only - extends lib/security/authorization.ts Action union
    type Action = "mock_recall.read" | "mock_recall.packet.read" | "exception.review.update";

    // illustrative only - tenant-scoped write seam, Promise-based (see Error/Async section)
    interface ExceptionReviewSink {
      applyReview(ctx: RequestContext, exceptionId: string, patch: ExceptionReviewPatch):
        Promise<{ status: "applied"; record: ExceptionRecord }
              | { status: "not_found" }                          // -> 404, leak-safe
              | { status: "conflict"; current: ExceptionRecord }>; // -> 409 Problem
    }

## Threat Model (STRIDE-lite, mapped to the boundary order)

Boundary order under design: **(1) resolve context -> (2) authorize action -> (3) tenant-scoped load/write -> (4) idempotency -> (5) audit -> (6) Problem Details**.

| STRIDE | Threat | Mitigating stage | Activation note |
|---|---|---|---|
| Spoofing | Forged identity / client-supplied tenant | (1) resolve | Tenant + principal **server-derived only**; bodies/query/headers never tenant authority. 401 + `WWW-Authenticate: Bearer` on missing/invalid auth. Resolver MUST NOT throw - it returns a context the policy denies (0030 A1). |
| Tampering | Over-broad/mass-assign PATCH, out-of-enum `status` | (2) authorize + (3) write | Deny-by-default authorizes `exception.review.update` first; body validated against `ExceptionPatch` -> `422`; only whitelisted review fields writable, tenant-scoped. |
| Repudiation | Actor denies the decision | (5) audit | Append-only `AuditSink.append` records actor/tenant/action/resourceRef/occurredAt/source/reason/idempotencyKey. |
| Information disclosure | Cross-tenant existence probe; error internals | (2/3) authorize-before-write + leak-safe miss + (6) Problem | Authorize first; tenant-scoped miss -> **404, never 403**. Miss sentinel must be **total** (`== null`, 0030 A2). Policy must consume `ctx` to avoid BOLA (0030 B1). Errors are RFC 9457 only (no stack leak, 0030 A1). |
| DoS | Replay storms / unbounded retries | (4) idempotency + rate limiting | Idempotency dedupes replays; `429 RateLimited` with `Retry-After` where rate limiting applies (see Error surface). |
| Elevation | Acting above role | (2) authorize | Role -> action mapping; only `reviewer`/`admin` may perform `exception.review.update`. |

## Persistence Direction (gated; shape + invariants only)

| Option | Pros | Cons |
|---|---|---|
| Vercel Marketplace Postgres (e.g. Neon / Supabase) | Native to the deploy target; managed; SQL + append-only audit fit; tenant-scoping via composite keys | New dependency + provider decision; migration tooling to choose |
| Other managed Postgres / SQL | Portability | Less integrated with Vercel; more wiring |
| Document/KV store | Simple writes | Weaker fit for relational tenant-scoping + append-only audit + idempotency uniqueness |

**Recommended direction (GATED):** a Vercel-marketplace Postgres with a lightweight typed access layer and forward-only, checked-in migrations. **Not selected** - provider, ORM/query layer, and migration tool are decisions for the approved code-bearing batch.

**Illustrative, non-binding tenant-scoped shape** (shape + invariants only; not a schema commitment - no PKs/indexes/columns are fixed here):
- `tenant` - server-derived organization/account boundary.
- exception review record - keyed within tenant; carries `status` + review fields.
- idempotency keys - unique per `(tenant, actor, action, key)`.
- audit events - append-only; one row per accepted transition.

**Invariant:** persistence accepts only server-built tenant context; client-supplied tenant IDs are never authority. Migrations/seed/repository code are out of scope for this design doc.

## Auth + Server-Derived Tenant Identity (gated)

| Option | Pros | Cons |
|---|---|---|
| Auth.js (NextAuth) | Open, framework-native, self-hosted control | More wiring; you own session + membership store |
| Managed provider (e.g. Clerk) | Fast, hosted orgs/membership | Vendor dependency/cost |
| Sign in with Vercel | Native to platform | Newer; org/membership modeling to confirm |
| Custom JWT/session | Full control | Highest security-maintenance burden |

**Recommended direction (GATED):** an option that cleanly yields a **server-derived tenant + principal + membership/role claims**, replacing `publicFixtureContextResolver` with a real `RequestContextResolver`. The membership store (the authoritative `userId -> tenantId/roles` mapping) is the most load-bearing input and is an explicit open decision.

**Fixture-route decision (explicit, gated):** whether the existing public MockRecall fixture routes become authenticated when production auth lands, or remain public smoke fixtures, must be decided in the activation batch. Default proposal: keep them public read fixtures unless Matt directs otherwise.

**Resolver contract (0030 A1):** the real resolver returns a context the policy denies on auth failure rather than throwing; if it ever throws, the boundary maps it to a Problem (not a 500). Align the resolver comment with this in the activation slice.

## RBAC Activation (gated)

- Proposed roles: `viewer` (read), `reviewer` (read + `exception.review.update`), `admin` (all). Names are gated.
- `Action` union gains `exception.review.update` (illustrative literal above). Deny-by-default preserved: any action not explicitly allowed is denied.
- `publicFixturePolicy` (ignores `ctx`, allows the two reads) evolves into a real `ctx`-aware `AuthorizationPolicy` that authorizes on tenant + principal + role. **0030 B1 (BOLA):** the policy MUST consume `ctx`; a real resolver wired without a real policy would let every authenticated tenant pass. Proposed guard: a wiring/startup assertion that refuses to serve protected actions if the public-fixture default policy is still active in a non-fixture deployment (gated mechanism, not implemented here).
- **0030 B3 (vocabulary):** reconcile `AuthorizationDecision.reason "unauthenticated"` vs catalog key `unauthorized` vs `unauthorizedResponse` on the 401 path during activation.

## Idempotency Design (gated)

- **Scope:** `(tenantId, actorId, action, key)` - matches the shipped `IdempotencyScope`. `Idempotency-Key` is already a declared contract parameter.
- **States:** the shipped `IdempotencyCheck` is `fresh | replayed`. A mutating write also needs in-flight and request-fingerprint-mismatch handling. **Gated interface change:** widening `IdempotencyCheck`/`IdempotencyStore` (e.g. add `in_flight` and `fingerprint_mismatch`, and a reserve/commit lifecycle) edits a shipped `lib/security` seam and is therefore a code-bearing decision for the activation batch, not adopted here.
- **Conflict semantics:** a key reused with a different request fingerprint -> `409 Conflict` Problem; a replay of the same key returns the prior result, not a re-apply. Missing required key on a mutating endpoint -> `422`.
- **Retention (proposed, gated):** retain idempotency keys for a bounded window (proposal: 24-72h) sufficient to dedupe client retries; shorter-lived than audit.

## Append-Only Audit Design (gated)

- Uses the shipped `AuditEvent` fields: `requestId, tenantId, actorId, action, resourceRef, occurredAt, source, reason?, idempotencyKey?`. `AuditSink.append` is invoked only on an **accepted** transition.
- Append-only storage (aligned with the persistence option). One row per accepted review decision.
- **Retention (proposed, gated):** audit evidence is retained materially longer than idempotency keys; propose a concrete window in the activation batch (candidate: >= 1 year, to be confirmed - this is a retention *proposal*, not a compliance representation).
- **Invariant:** audit evidence supplements, but does not replace, `source_document_ref`; free-form `review_notes` must not become the only evidence trail.

## Error And Rate-Limit Surface (gated)

- **Problem catalog additions (0030 D3):** add `conflict` (409), `validation` (422), and `rateLimited` (429) entries to the Problem catalog during activation; today only `notFound`/`unauthorized`/`forbidden` exist.
- **429 / Retry-After:** the contract's `RateLimited` response declares a `Retry-After` header; where rate limiting applies to the mutating path, the `rateLimited` Problem must carry `Retry-After`. Whether the first slice enables rate limiting at all is an open decision; the catalog entry + header shape are designed here so it is ready.
- **401 (0030 D1):** the 401 path must add `WWW-Authenticate: Bearer` (matching the declared `bearerAuth` scheme) when the auth path activates.
- **Async load/write (0030 A3):** `handleReadAction`'s `load` (and the new write seam) must become Promise-aware and `await`ed, wrapped so a thrown/rejected adapter maps to a Problem rather than an unhandled 500. This is a code change to a shipped seam, gated to the activation batch.

## Contract Impact

**This document:** none. No `api/openapi.yaml` edit, no generated-type edit, no runtime change.

**Future activation slice:** the mutating endpoint is already declared; the activation batch needs a **contract-first conformance pass** confirming the implemented PATCH behavior, the `Idempotency-Key`/409/422/429 responses, and the new catalog entries match the contract. `api/openapi.yaml` remains the source of truth and is edited only under an explicitly approved contract-first batch.

## Acceptance Criteria

### This design batch
- This doc exists under the Phase 3 directory; truth surfaces point to it; one delta records the planning-only batch.
- No OpenAPI/generated-type/package/dependency/runtime/test/CI/db/auth/RBAC/audit/persistence change is introduced.
- Baseline gate passes (proves no runtime impact).

### The future activation slice (for reference, gated)
- Authenticated requests resolve tenant + principal server-side; the exception-review PATCH enforces `exception.review.update` via a `ctx`-aware deny-by-default policy.
- The write is tenant-scoped; a cross-tenant miss returns 404 (never 403); the miss sentinel is total.
- `Idempotency-Key` is enforced: replay returns the prior result; fingerprint mismatch -> 409; missing key -> 422.
- An accepted transition appends one audit event (actor/tenant/action/resource/time/source/reason/idempotency).
- Failures are RFC 9457 Problem Details with no cross-tenant leakage; 401 carries `WWW-Authenticate`; 429 carries `Retry-After` where rate limiting applies.
- The two existing MockRecall read routes remain byte-identical; baseline gate + targeted slice tests pass.

## Decisions Requiring Matt Approval Before Code

1. **Lift the Phase 4-8 Non-Goal** for the single exception-review write (and nothing else).
2. Persistence provider + access layer + migration tool.
3. Auth/session source + the authoritative membership (`userId -> tenant/roles`) store.
4. RBAC role names and the first protected action literal (`exception.review.update` proposed).
5. Idempotency key retention window + whether to widen the shipped `IdempotencyCheck`/`IdempotencyStore` seam.
6. Audit storage model + retention window.
7. Whether the first slice enables rate limiting (and thus wires `429`/`Retry-After`) now or defers it.
8. Whether the public MockRecall fixture routes become authenticated or stay public.
9. Whether the activation batch is one slice or split (e.g. persistence+auth wiring, then the write). **Resolved 2026-06-05: split — B0 (DB-hardening: append-only trigger + restricted runtime role, no route) then B1 (route wiring + runtime hardening). See 03-03 / delta 0062.**

## Explicit Statement

This batch changes no runtime, API, contract, generated type, package, dependency, database, auth, RBAC, idempotency, or audit behavior. It is planning and threat-model documentation only. Phase 3 implementation remains gated behind explicit Matt approval of a concrete code-bearing micro-batch.
