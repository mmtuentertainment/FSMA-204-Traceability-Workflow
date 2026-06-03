# CLAUDE.md — FSMA 204 Workflow Product

Project memory for Claude Code. Repo posture, batch discipline, and the agent docs convention live in
[`AGENTS.md`](AGENTS.md) — read it too (it applies to Claude as well as Codex).

---

## Codebase intelligence: use `fallow`, not `grep`, for structural questions

This repo has **fallow** (codebase intelligence for TS/JS) installed as a dev dependency and wired in as the
default tool for *structural* code questions. It is **better than grep/ripgrep** for "what's connected to what" —
it returns graph truth (re-export chains, reachability, clones, complexity), not text matches.

Full local reference wiki: **[`docs/fallow/index.html`](docs/fallow/index.html)** ·
master reference **[`docs/fallow/reference.html`](docs/fallow/reference.html)** ·
this repo's setup **[`docs/fallow/this-project.html`](docs/fallow/this-project.html)**.

### Non-negotiable agent rules (full list: [reference.html#agent-rules](docs/fallow/reference.html#agent-rules))

1. Parse JSON, never text: `--format json --quiet 2>/dev/null`. **Never** `2>&1`.
2. **Always append `|| true`.** Exit `1` = "issues found" (normal); only exit `2` is a real error. Without `|| true`
   the Bash tool treats exit 1 as failure.
3. **Never run `fallow watch`** (interactive, never exits).
4. **Always `fix --dry-run` before `fix --yes`** — `fix` edits source files; run tests after.
5. Parsing output in TS? `import type { CheckOutput, HealthOutput, DupesOutput, AuditOutput } from "fallow/types"`.

### If X → use this  ·  (decision rules)

| If you need to… | Use | Reference |
|---|---|---|
| Find a literal string / regex | **`rg` (ripgrep)** — not fallow | — |
| Know **who imports a symbol** / why it's "used" | `npx fallow dead-code --trace FILE:EXPORT …` · MCP `trace_export` | [reference#trace](docs/fallow/reference.html#trace) |
| Know **where a dependency is imported** | `npx fallow dead-code --trace-dependency PKG …` · MCP `trace_dependency` | [reference#trace](docs/fallow/reference.html#trace) |
| See **all edges of a file** | `npx fallow dead-code --trace-file FILE …` · MCP `trace_file` | [reference#trace](docs/fallow/reference.html#trace) |
| Check code is **dead before deleting** | `npx fallow dead-code …` · MCP `analyze` | [reference#dead-code](docs/fallow/reference.html#dead-code) |
| Review **a change / your own edits / a PR** | `npx fallow audit --explain …` · MCP `audit` | [reference#audit](docs/fallow/reference.html#audit) |
| Find **copy-paste** before refactoring | `npx fallow dupes …` · MCP `find_dupes` | [reference#dupes](docs/fallow/reference.html#dupes) |
| Pick a **refactor target / hotspot** | `npx fallow health --hotspots --targets …` · MCP `check_health` | [reference#health](docs/fallow/reference.html#health) |
| Decide **what to do with a finding** | Fix / encode-exception / change-policy | [decision-tree](docs/fallow/decision-tree.html#decide) |
| **Suppress** a false positive | match the token to the analysis (dead-code ≠ `code-duplication` ≠ `complexity`) | [config#tokens](docs/fallow/config-and-suppression.html#tokens) |
| Edit `.fallowrc.jsonc` | narrowest mechanism, document why | [config](docs/fallow/config-and-suppression.html) |

> **Before deleting any "unused" export/file, trace it first.** fallow is syntactic (oxc, no TS compiler):
> fully dynamic `import(variable)`, reflection, and runtime-only consumers are invisible. Trace → if "used", add a
> narrow suppression; if "not used", it's safe. ([decision-tree](docs/fallow/decision-tree.html))

### MCP server (project-scoped)

`fallow-mcp` is registered in repo-root [`.mcp.json`](.mcp.json) — available **only in this project**. It exposes 21
structured tools (`trace_export`, `trace_dependency`, `trace_file`, `analyze`, `check_changed`, `audit`, …). Full
list: [mcp-tools.html](docs/fallow/mcp-tools.html). If the server isn't loaded, every tool has a CLI equivalent.

### Config note

Tuned config: [`.fallowrc.jsonc`](.fallowrc.jsonc). Tests are entry points (reachability) and excluded from
duplication/health; generated code (`lib/api/generated/**`, `lib/db/migrations/**`) is ignored; `unused-*` rules are
`warn` (scaffold stage), structural rules are `error`. **Tighten `unused-*` back to `error` as the product matures.**
Current findings snapshot and what's expected during phase 3: [this-project.html](docs/fallow/this-project.html).
`.fallow/` (cache) is gitignored. Setup batch: `ops/deltas/0053-fallow-setup.md`.
