# FSMA 204 Workflow Product — Forensic Realignment Report

> **Generated:** 2026-05-29 · **Tool:** `/gsd-progress --forensic` (GSD situational audit)
> **Audience:** ChatGPT Pro (Max 20× subscription) — context-handoff / realignment brief
> **Author of record:** Matthew (`mmtuentertainment@gmail.com`) · solo developer

---

## 0. How to use this document (read first, ChatGPT)

You are being handed an **independently audited snapshot** of a real software project so you can
re-synchronize your mental model before advising or generating code. Treat this file as **ground
truth as of 2026-05-29**. Where this report and your prior context disagree, **this report wins**.

When you respond after ingesting this:

1. **Adopt the role:** senior engineering consultant for a conservative, contract-first regulatory
   readiness product built under strict micro-batch discipline.
2. **Honor the guardrails in §3** as hard constraints, not preferences. They are load-bearing.
3. **Internalize the single most important fact (§4):** the GSD planning system was *initialized*
   but its plan→execute cycle has **never run**. The roadmap's progress numbers are a hand-authored
   retrofit over pre-existing work, **not** machine-tracked execution state.
4. **Do not propose work that expands scope** (database, auth, UI, CSV generation, etc.) unless the
   human explicitly opens an approved batch/phase for it.
5. If asked "where are we and what's next," answer from §4, §11, and §12 — not from the optimistic
   framing in `STATE.md`/`ROADMAP.md`.

---

## 1. Realignment in 60 seconds (TL;DR)

- **What it is:** A lightweight **FSMA 204 traceability *readiness* workflow** for fresh-cut produce
  mock-recall preparation. Contract-first (OpenAPI), Next.js App Router, TypeScript. It is **not** a
  compliance/certification engine, legal-advice tool, FDA-endorsed system, or ERP.
- **What is actually built:** A minimal scaffold + an OpenAPI 3.1 contract (430 lines) + generated
  TS types + **2 runtime routes** (mock-recall detail & packet CSV) that each serve **one in-memory
  fixture** and return **RFC 9457 Problem Details** 404s for everything else. A CI "Contract Gate"
  and one committed smoke test protect that surface. **Nothing else runs.**
- **What is NOT built:** database, auth, tenant model, RBAC, audit log, persistence, imports,
  exports, production CSV generation, and ~7 of the 9 contracted endpoints.
- **Planning state (the catch):** GSD artifacts (PROJECT/REQUIREMENTS/ROADMAP/STATE/research/
  codebase-maps) were created **2026-05-28**, but **no GSD phase has been planned or executed**.
  There is **no `.planning/phases/` directory**, **0 PLAN.md**, **0 SUMMARY.md**. The machine-
  readable GSD progress is **0/0 plans (0%)**.
- **Forensic verdict:** **2 integrity issues** found (state-vs-reality divergence; orphaned resume
  handoffs) + 1 documentation-drift note. Details in §6.
- **The single correct next action:** Decide between (a) starting the GSD cycle with
  `/gsd-discuss-phase 1`, or (b) continuing the existing `ops/deltas/` micro-batch discipline —
  treating the two already-satisfied roadmap items as done-baseline. See §12.

---

## 2. Repository identity & toolchain

| Field | Value |
|-------|-------|
| Product name | FSMA 204 Workflow Product (`fsma-204-workflow-product`, v0.0.0, `private`) |
| GitHub remote | `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git` |
| Local path | `C:\Users\matth\Desktop\FSMA 204 Workflow Product` (Windows 11, PowerShell) |
| Branch | `main` |
| Stack | Next.js `^16.2.6` (App Router) · React `^19.2.6` · TypeScript `^5.9.3` · npm · Node `>=20.9` |
| Contract tooling | `@redocly/cli ^2.31.5` (lint) · `openapi-typescript ^7.13.0` (codegen) |
| API source of truth | `api/openapi.yaml` (OpenAPI **3.1.0**, API version `0.1.0`, license `LicenseRef-Proprietary`) |
| Generated types | `lib/api/generated/openapi-types.ts` — **never hand-edit** |
| CI | `.github/workflows/contract-gate.yml` — Node 22.x; runs on `push` + `pull_request` |

**Canonical commands** (also the CI gate, in order):

```powershell
npm ci
npm run api:check          # = api:lint (redocly) && api:types:check (openapi-typescript --check)
npm run typecheck          # tsc --noEmit
npm run build              # next build
npm run test:mock-recall:contract   # node tests/mock-recall-contract-smoke.mjs
```

---

## 3. Product identity & NON-NEGOTIABLE guardrails

**Core value:** *A reviewer can assemble a trustworthy, human-reviewed mock recall readiness packet
from traceability records and supplier KDE gaps without mistaking the workflow for legal or FDA
approval.*

**Hard guardrails (do not violate, do not soften the language):**

1. **Regulatory posture is "readiness" only.** Allowed language: *readiness workflow, human review,
   FDA-style sortable export.* **Forbidden:** compliance certification, legal advice, FDA
   endorsement/approval, automated exemption determination.
2. **Human review stays explicit.** Ambiguous exemption, imported-food, kill-step, partial-exemption,
   and lot-code-ambiguity cases must route to a human, never an automated legal determination.
3. **Contract-first.** OpenAPI (`api/openapi.yaml`) changes precede any DB/auth/runtime work.
   Generated types are regenerated via `npm run api:types`, never edited by hand.
4. **Micro-batch discipline.** Work ships in small, reversible, approved batches; each batch is
   documented in `ops/deltas/NNNN-*.md`. Don't install deps or create generated artifacts unless the
   batch explicitly allows it.
5. **No scope creep.** Database, auth, tenant model, RBAC, audit log, imports, exports, CSV
   generation, UI expansion, supplier portal, OCR, blockchain, mobile scanning, dashboards, ERP
   integration → **all out of scope** until an approved phase/batch opens them.
6. **Artifact hygiene.** Never commit `.next/`, `node_modules/`, `next-env.d.ts`, `.env*.local`, or
   `*.tsbuildinfo` (all in `.gitignore`).
7. **`PLAN.md` (repo root) is frozen.** It is the consultant-approved baseline scaffold plan; do not
   edit it unless explicitly approved.
8. **FDA date claims require a recheck.** As researched 2026-05-28: FDA intends **not to enforce the
   Food Traceability Rule before July 20, 2028** (2026 appropriations directive; a 30-month extension
   from the original Jan 20, 2026 date was proposed). The FDA "electronic sortable spreadsheet"
   template is **illustrative, not mandatory**. Re-verify official FDA sources before any
   date-specific regulatory statement.

---

## 4. GROUND TRUTH: GSD was initialized but never executed

This is the realignment crux. Read carefully.

- On **2026-05-28**, the project was bootstrapped into the GSD planning framework: `PROJECT.md`,
  `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `config.json`, `research/` (5 files), and a 7-file
  `codebase/` map were all written. (Evidence: `ops/deltas/0011-gsd-project-initialization.md`,
  commit `bb48318 docs: initialize gsd project`.)
- **But the GSD plan→execute→verify loop has not run even once.** Concretely:

| Signal | Expected if a phase had run | Actual |
|--------|------------------------------|--------|
| `.planning/phases/` directory | exists, with `NN-<slug>/` subdirs | **does not exist** |
| `NN-NN-PLAN.md` files | ≥1 | **0** |
| `NN-NN-SUMMARY.md` files | ≥1 | **0** |
| `NN-CONTEXT.md` (discuss output) | exists for current phase | **0** |
| `gsd-sdk query state-snapshot` | populated phase/plan/status | **all `null`**, `decisions: []`, `blockers: []` |
| `gsd-sdk query roadmap.analyze` | per-phase `plan_count`/`disk_status` | **every phase: `plan_count: 0`, `disk_status: "no_directory"`** |
| `gsd-sdk query progress.bar` | partial bar | **`[░░░░░░░░░░░░░░░░░░░░] 0/0 plans (0%)`** |

- **Therefore the "progress" you see in `ROADMAP.md`/`STATE.md` is a hand-authored retrofit, not
  execution telemetry.** The roadmap's progress table ("Phase 1 — 1/3", "Phase 2 — 1/2") and the
  inline `[done]` plan markers describe **pre-GSD `ops/deltas/` batch work**, mapped onto the new
  phase structure after the fact. The GSD engine itself recorded none of it.
- **All real engineering to date lived in 22 `ops/deltas/` micro-batches** (`0000`–`0019`, plus
  `0001b`, `0002a`), executed largely in **Codex text-mode** before/around GSD initialization. That
  work is genuine and committed; it simply predates (and bypassed) the GSD phase machinery.

**Two roadmap items are already satisfied by committed code** but were never produced as GSD plans:

- **Plan `01-02`** ("repeatable contract gate / CI workflow") → satisfied by
  `.github/workflows/contract-gate.yml` (commits `326477c`, `8f646d7`, `fed8328`).
- **Plan `02-01`** ("smallest route verification for the MockRecall fixture & not-found behavior") →
  satisfied by `tests/mock-recall-contract-smoke.mjs` + runtime verification in
  `ops/deltas/0008-...md` (commits `a12c73f`, `8534f56`, `aceec01`).

> **Implication for ChatGPT:** When the human runs GSD planning, those two items should be treated as
> **done-baseline** (don't re-implement the CI gate or re-add a second smoke harness). Note also a
> sequencing oddity: Phase 2's `02-01` is marked done while Phase 1 is incomplete — further evidence
> the markers are a manual overlay, not ordered execution.

---

## 5. Standard GSD progress report

```
# FSMA 204 Workflow Product
Progress (machine-tracked):  [░░░░░░░░░░░░░░░░░░░░] 0/0 GSD plans (0%)
Progress (roadmap-narrated): Phase 1 of 8 "in progress" — see §4 for why these disagree
Profile: balanced   ·   Mode: interactive   ·   Granularity: fine   ·   Runtime: codex
Discuss mode: discuss   ·   Auto-advance: off   ·   Branching: phase (gsd/phase-{n}-{slug})
```

**Recent work (from git, newest first):**

- `aceec01` — test: add response-context diagnostics to mock recall contract smoke
- `a7ea809` — docs: sync repo guidance with contract gate baseline
- `8534f56` — Add mock recall 404 OpenAPI examples
- `a12c73f` — Harden mock recall CSV contract smoke test
- `8f646d7` — Merge PR #1 (codex/fsma204/ci-contract-gate) — Wire MockRecall smoke into CI

**Current position:** Phase **1 of 8** — *Contract Gate And Examples* (the first phase with no
completed GSD plans). No `CONTEXT.md` exists yet → the phase has not been discussed or planned in GSD.

**Key decisions on record (`PROJECT.md` / `STATE.md`):**

- Keep the product a lightweight readiness workflow (prevents ERP/compliance-engine creep).
- OpenAPI is the API source of truth; generated types are committed.
- API errors use RFC 9457 Problem Details.
- Ambiguous regulatory cases require human review.
- Use GSD fine-grained phases with Codex text-mode and **no auto-advance**.

**Blockers:** none recorded (`STATE.md` blockers empty; `HANDOFF.json` `blockers: []`).

**Pending todos / debug sessions:** none (no `.planning/todos/`, no `.planning/debug/`).

**What's next (roadmap):** Phase 1 → validate the contract repeatably + review concrete
`MockRecallDetail`/packet examples before any runtime expansion (requirements GOV-01/02/03).

---

## 6. Forensic Integrity Audit (6 checks)

Running 6 deep checks against project state…

**Check 1 — STATE vs artifact consistency → ⚠ WARNING**
`STATE.md` and `ROADMAP.md` narrate "Phase 1 in progress (1/3)" and "Phase 2 (1/2)", but the
machine-readable GSD state is empty: `gsd-sdk state-snapshot` returns all-`null`; `roadmap.analyze`
reports every phase at `plan_count: 0, disk_status: "no_directory"`; `progress.bar` = `0/0 plans
(0%)`. The human-authored narrative diverges from machine truth (see §4). `STATE.md` is also prose-
only — it lacks the structured frontmatter the SDK parses, so GSD situational tooling is effectively
blind to it.

**Check 2 — Orphaned handoff files → ⚠ WARNING**
Both `.planning/.continue-here.md` **and** `.planning/HANDOFF.json` are present. Both point to the
same un-taken next step: *"Run `/gsd discuss-phase 1`."* Work was paused immediately after GSD
initialization and never resumed through the GSD flow. → *Read the handoff before continuing.*

**Check 3 — Deferred scope drift → ✓ PASS**
No `.planning/phases/` artifacts reference phases missing from `ROADMAP.md`. Future scope (V2-01…06)
is captured explicitly in `REQUIREMENTS.md` (imports, supplier portal, OCR, ERP, mobile, dashboards).

**Check 4 — Memory-flagged pending work → ✓ PASS**
No GSD `.planning/MEMORY.md` or `.planning/memory/` exists. (`ops/memory/product.md` is the separate
durable product memory and is clean/consistent.)

**Check 5 — Blocking operational todos → ✓ PASS**
No `.planning/todos/` directory; nothing blocking.

**Check 6 — Uncommitted code → ✓ PASS**
Working tree clean (no modified source outside `.planning/`). *Note:* at audit time `main` was **1
commit ahead of `origin/main`** (`aceec01`, committed but unpushed) — that is a push-state note, not
an uncommitted-code failure. This report's own commit + push resolves it.

### Verdict: 2 INTEGRITY ISSUE(S) FOUND (Checks 1 & 2); 4 passed

The *machine* progress report is trustworthy (0/0). The *narrated* progress in `STATE.md`/`ROADMAP.md`
is optimistic and must be read with §4 in mind. Concrete next actions:

- **Check 1:** Reconcile `STATE.md`/`ROADMAP.md` narrative with the real "GSD-initialized, not yet
  executed" status — or actually start the GSD cycle so machine state catches up.
- **Check 2:** Read `.planning/HANDOFF.json` + `.planning/.continue-here.md`; either run
  `/gsd-discuss-phase 1` or clear the stale handoffs once a direction is chosen.

---

## 7. What is actually built (runtime surface)

```
app/
  layout.tsx                         # root HTML shell + metadata
  page.tsx                           # baseline status page (no app UI)
  api/traceability/mock-recalls/[mockRecallId]/
    route.ts                         # GET detail  → 200 fixture OR 404 Problem Details   (21 LOC)
    packet.csv/route.ts              # GET CSV      → 200 fixture OR 404 Problem Details   (24 LOC)
lib/api/
  problem.ts                         # problemResponse() + mockRecallNotFoundResponse()   (RFC 9457)
  mock-recall.ts                     # ONE fixture: id "contract-fixture-ready-for-review" (57 LOC)
  generated/openapi-types.ts         # generated from api/openapi.yaml (DO NOT EDIT)
api/openapi.yaml                     # OpenAPI 3.1.0 contract, 430 lines, 9 endpoints
tests/mock-recall-contract-smoke.mjs # spins prod Next server, asserts fixture + 404s    (304 LOC)
.github/workflows/contract-gate.yml  # CI gate (Node 22.x; push + PR)
ops/deltas/0000…0019 (+0001b,0002a)  # 22 micro-batch evidence reports
ops/memory/product.md                # durable product memory
PLAN.md                              # FROZEN consultant-approved baseline scaffold plan
```

**Behavioral truth of the 2 live routes:**

- `GET /api/traceability/mock-recalls/contract-fixture-ready-for-review` → **200** JSON
  `MockRecallDetail` (status `ready_for_human_review`; 1 affected lot, 2 shipments, 1 open exception,
  1 supplier request, `humanReviewRequired: true`, reasons `[supplier_kde_gap, lot_code_ambiguity]`).
- `GET …/contract-fixture-ready-for-review/packet.csv` → **200** `text/csv; charset=utf-8`, a 2-row
  fixture CSV (CRLF-terminated).
- **Any other `mockRecallId`** → **404** `application/problem+json` with `type/title/status/detail/
  instance` (RFC 9457). The CSV route returns Problem Details (not `text/csv`) on miss.

> ⚠ **Correction to a common misreading:** the runtime is **NOT** "404 for all requests." There is a
> real 200 success path for the single fixture id. See §10.

---

## 8. What is contracted but NOT built

`api/openapi.yaml` declares 9 endpoints; only the 2 mock-recall GETs have any runtime. **Unbuilt:**

| Endpoint | Methods | Status |
|----------|---------|--------|
| `/api/traceability/lots` | GET, POST | contract only |
| `/api/traceability/events` | GET, POST | contract only |
| `/api/traceability/exceptions` | GET | contract only |
| `/api/traceability/exceptions/{exceptionId}` | PATCH | contract only |
| `/api/traceability/supplier-requests` | GET, POST | contract only |
| `/api/traceability/supplier-requests/{supplierRequestId}` | PATCH | contract only |
| `/api/traceability/mock-recalls` | POST (create) | contract only |
| `/api/traceability/mock-recalls/{mockRecallId}` | GET | **partial** (fixture + 404) |
| `/api/traceability/mock-recalls/{mockRecallId}/packet.csv` | GET | **partial** (fixture + 404) |

The contract also declares `bearerAuth` (placeholder), a required `Idempotency-Key` header on all
mutations, and standard `401/403/404/409/422/429` Problem Details responses — **none enforced at
runtime yet.** Absent across the board: database, auth, tenant resolution, RBAC, audit log,
persistence, in-memory store, imports, production exports, production CSV generation.

---

## 9. Requirements & roadmap map

**Requirements** (`REQUIREMENTS.md`): 5 brownfield BASE-01…05 **done**; **17 v1 pending**; 6 v2 deferred.

| Group | IDs | Phase | Status |
|-------|-----|-------|--------|
| Governance | GOV-01, GOV-02, GOV-03 | 1 | pending |
| Runtime API | RUN-01 | 2 | pending |
| Security & Audit | SEC-01, SEC-02, SEC-03 | 3 | pending |
| Traceability records | TRC-01, TRC-02 | 4 | pending |
| Human review | REV-01, REV-02 | 5 | pending |
| Supplier KDE | SUP-01 | 6 | pending |
| Readiness summary | RUN-02, TRC-03 | 7 | pending |
| Export | RUN-03, EXP-01, EXP-02 | 8 | pending |

**Roadmap** (`ROADMAP.md`): 8 phases, all `Mode: mvp`, executed strictly 1→2→…→8 (each depends on the
prior). Phase numbering: integers = planned work; decimals = urgent `INSERTED` insertions; completed
pre-GSD batches stay in `ops/deltas/` and are **not** renumbered into the roadmap.

1. **Contract Gate And Examples** — repeatable contract validation + reviewed examples *(current)*
2. **Problem Details Test Harness** — protect not-found behavior with committed verification
3. **Security And Persistence Foundation** — tenant/auth/RBAC/idempotency/append-only audit
4. **Traceability Lot And Event Records** — lot + receiving/transformation/shipping events
5. **Human Review Exceptions** — reviewable KDE gaps / ambiguity (no auto legal calls)
6. **Supplier KDE Requests** — track supplier KDE requests blocking readiness
7. **Mock Recall Readiness Summary** — aggregate readiness over approved records
8. **FDA-Style CSV Packet Export** — bounded sortable CSV, gated on human review

---

## 10. Corrections to likely misreadings (documentation drift)

| Claim you may have absorbed | Reality (2026-05-29) | Source of truth |
|------------------------------|----------------------|-----------------|
| "Routes return not-found for **all** requests." | False — a 200 success fixture exists for `contract-fixture-ready-for-review`. | `lib/api/mock-recall.ts:41-57`, `…/route.ts:14-20` |
| "Phase 1 is in progress (1/3 plans done)." | No GSD plan has executed; machine state 0/0. The "1/3" is a manual retrofit. | §4; `gsd-sdk roadmap.analyze` |
| "STATE.md reflects live phase/plan status." | STATE.md is prose; SDK `state-snapshot` = all null. | §6 Check 1 |
| "CI gate / smoke test still need building (Phase 1/2 work)." | Already built & committed; treat as done-baseline. | §4; `contract-gate.yml`, `…smoke.mjs` |

> **`research/SUMMARY.md` is the stale file** — its line "currently return not-found Problem Details
> for all requests" predates the success-fixture batches (0013–0019). `STATE.md`, the `codebase/`
> maps, `HANDOFF.json`, and `ops/memory/product.md` are accurate. Trust those over the research
> summary on runtime behavior.

---

## 11. Git & CI posture

- **Branch:** `main`. At audit time, **1 commit ahead of `origin/main`** (`aceec01`); working tree
  clean. This report adds one more commit; pushing carries both to the remote.
- **Branching strategy (configured):** GSD phase branches `gsd/phase-{phase}-{slug}`; tags on
  milestone completion (`create_tag: true`). No phase branch exists yet (no phase executed).
- **CI ("Contract Gate", `.github/workflows/contract-gate.yml`):** on every `push` and
  `pull_request`, Node 22.x → `npm ci` → `npm run api:check` → `npm run typecheck` → `npm run build`
  → `npm run test:mock-recall:contract`. `permissions: contents: read`.
- **History shape:** PR #1 (`codex/fsma204/ci-contract-gate`) merged the CI gate; subsequent commits
  hardened the smoke test and added 404 OpenAPI examples. 22 `ops/deltas/` reports document the full
  micro-batch lineage.

---

## 12. The single correct next action (decision point)

The GSD router (Route B: *phase needs planning, no `CONTEXT.md`, no UI*) and both resume handoffs
agree on the mechanical next step:

```
/clear  then:
/gsd-discuss-phase 1        # gather context for Phase 1, then /gsd-plan-phase 1
```

**But there is a real human decision first** — choose the operating model going forward:

- **Option A — Adopt the GSD cycle.** Run `/gsd-discuss-phase 1` → `/gsd-plan-phase 1` →
  `/gsd-execute-phase 1`. This creates the missing `.planning/phases/` artifacts and makes machine
  state catch up to reality. When planning Phase 1, **mark `01-02` (CI gate) and `02-01` (smoke
  test) as done-baseline** — they already exist; do not rebuild them.
- **Option B — Stay with `ops/deltas/` micro-batches** (the model that actually produced all work so
  far). Keep shipping small, reversible, consultant-approved batches; let `ROADMAP.md` remain a
  directional map rather than a GSD-tracked execution log. If so, **reconcile `STATE.md`/`ROADMAP.md`
  wording** to say "GSD initialized; execution continues via `ops/deltas/`," and clear the stale
  handoffs.

**Either way, first resolve the 2 integrity issues from §6** (reconcile state narrative; address the
orphaned handoffs). Whatever Phase 1 actually adds, it must stay inside the §3 guardrails: contract
examples and truth-surface sync only — **no** database, auth, route success expansion, imports,
exports, or UI in Phase 1.

---

## 13. Appendix — fast facts for grounding

- **Fixture identity:** `contract-fixture-ready-for-review` (the only id that returns 200 anywhere).
- **Problem Details shape:** `{ type, title, status, detail, instance }`, `Content-Type:
  application/problem+json` (RFC 9457). 404 `type` is `about:blank`.
- **GSD config highlights:** `model_profile: balanced`, `mode: interactive`, `granularity: fine`,
  `runtime: codex`, `text_mode: true`, `auto_advance: false`, `discuss_mode: discuss`,
  `security_enforcement: true` (ASVS L1, block on high), `code_review: standard`, `project_code: FSMA`,
  `claude_md_path: ./AGENTS.md`.
- **FDA sources checked 2026-05-28:**
  - Food Traceability Rule — https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-proposed-rule-food-traceability
  - Food Traceability List — https://www.fda.gov/food/food-safety-modernization-act-fsma/food-traceability-list
  - Sortable spreadsheet template — https://www.fda.gov/media/181945/download
- **Files to read in order for a fresh agent:** `AGENTS.md` → `.planning/STATE.md` →
  `.planning/PROJECT.md` → `.planning/REQUIREMENTS.md` → `.planning/ROADMAP.md` →
  `.planning/codebase/ARCHITECTURE.md` → `api/openapi.yaml` →
  `ops/deltas/0011-gsd-project-initialization.md`.

---

*This report was produced by an independent forensic pass (`/gsd-progress --forensic`) on
2026-05-29 and committed to `main`. It supersedes any earlier progress framing where they conflict.*
