# Batch 53 - Fallow Codebase Intelligence Setup

## Summary

Adds **fallow** (deterministic codebase intelligence for TypeScript/JavaScript) as project tooling: a tuned
`.fallowrc.jsonc`, a project-scoped MCP server registration, a local HTML reference wiki under `docs/fallow/`, a
project `CLAUDE.md` that wires fallow in as the default "better than grep" tool for structural code questions, an
**agent commit gate** (Claude Code `PreToolUse` hook + Codex `AGENTS.md` block) running `fallow audit` before
`git commit`/`git push`, and the **version-matched fallow Agent Skill** copied into `.claude/skills/fallow/`.

This batch lands on a dedicated `chore/fallow-setup` branch off `main` (kept off the phase-3 review branch / PR #12),
so the tooling gets its own clean PR and the gate's `fallow audit` sees only tooling files (verdict `warn`, not the
`fail` that the phase-3 provider complexity produces on its own branch).

This is a tooling/developer-experience batch. It does **not** wire any route, does not change OpenAPI, does not touch
runtime/product code, and does not change `tsconfig.json` or CI.

> **Batch-discipline exception (explicitly approved).** Unlike prior batches, this batch intentionally installs a
> dependency: `fallow` is added to `devDependencies` (and `package-lock.json`), per direct user approval to "set it up
> for this project" as a real, reproducible dev dependency. `node_modules/` and the new `.fallow/` cache dir are
> gitignored. No production dependency was added.

## Follow-up Decisions (discussed & approved 2026-06-03)

The base config (`.fallowrc.jsonc` / `.mcp.json` / `CLAUDE.md` / wiki) was set up in a prior session; four follow-ups
were deferred, then discussed and decided this session:

1. **Branch / PR:** dedicated `chore/fallow-setup` off `main`, its own PR. Keeps the unrelated tooling out of the open
   phase-3 PR #12, and — because the audit base is `main` — lets the gate pass on a tooling-only changeset.
2. **`.claude/` tracked:** the shared agent config (`settings.json`, `hooks/`, `skills/`) is committed;
   `settings.local.json` and `*.lock` are gitignored. Consistent with already committing `.mcp.json` and `CLAUDE.md`.
3. **Gate scope:** both surfaces in one `fallow hooks install --target agent` call (Claude `PreToolUse` hook + Codex
   `AGENTS.md` block). This is also why no separate hand-written `AGENTS.md` "prefer fallow" line was added — the
   installer's managed block already covers the Codex side.
4. **Skill install:** copied (not symlinked) — portable on Windows, survives `node_modules` wipes, and a committed
   symlink into the gitignored `node_modules` would dangle for clones. Re-sync step noted in Rollback.

## Files Changed

- `package.json` - adds `fallow ^2.87.0` to `devDependencies` (CLI + LSP + MCP server + version-matched Agent Skill + typed output contract).
- `package-lock.json` - records `fallow` (pinned to the verified `2.87.0`) and its platform binary package.
- `.gitignore` - ignores `.fallow/` (fallow local cache / impact / snapshots), plus `.claude/settings.local.json` and `.claude/*.lock` so the shared `.claude/` config travels with the repo while personal/runtime files do not.
- `.gitattributes` - forces `*.sh text eol=lf` so the committed gate hook keeps LF endings and runs on Linux/WSL (the installer's script is otherwise re-saved CRLF on Windows, which breaks `#!/usr/bin/env bash`).
- `.fallowrc.jsonc` - tuned fallow config (entry points, ignore patterns, duplication/health ignores, rule severities). Commented with rationale.
- `.mcp.json` - project-scoped MCP registration: server key `fallow`, runs the `fallow-mcp` binary (does not affect other projects).
- `CLAUDE.md` - project memory: agent rules + "if X -> use this" decision table pointing into the wiki.
- `docs/fallow/{index,reference,decision-tree,mcp-tools,config-and-suppression,this-project}.html` + `styles.css` - local reference wiki.
- `AGENTS.md` - fallow-managed block (delimited `<!-- fallow:setup-hooks:start/end -->`) telling the Codex side to run `fallow audit` before commit/push; documents `gate=new-only` semantics. Removable via `fallow hooks uninstall`.
- `.claude/settings.json` - Claude Code `PreToolUse`(Bash) hook that runs the gate script before Bash tool calls.
- `.claude/hooks/fallow-gate.sh` - the gate (bash + jq): matches `git commit`/`git push`, runs `fallow audit --format json --quiet --explain`; verdict `fail` -> exit 2 (blocks, prints findings JSON to stderr so the agent can fix + retry); JSON runtime errors / non-zero exits fail **open** with a stderr notice; min-version floor 2.46.0 (we have 2.87.0). **Locally hardened** beyond fallow's generated regex to close the `git -c …` / `git -C …` / `git commit;` bypasses and the malformed-stdin abort (verified against a 26-case match/no-match matrix); re-apply if reinstalled with `--force`.
- `.claude/skills/fallow/{SKILL.md,references/cli-reference.md,references/gotchas.md,references/patterns.md}` - version-matched fallow Agent Skill copied from `node_modules/fallow/skills/fallow/`; auto-discovered by Claude Code. Re-sync on fallow upgrade (see Rollback).
- `ops/deltas/0053-fallow-setup.md` - this report.

## Contract And Runtime Impact

None. `api/openapi.yaml` is unchanged and remains the source of truth. No route wiring was added; no `app/` or `lib/`
runtime code was modified. fallow is a static-analysis CLI invoked manually / by agents; it is not imported by product
code, so the build and type surfaces are unaffected. The gate is a Claude Code / Codex agent hook only — it does not
touch git's own hooks and is not a CI gate.

## What This Adds

- `npx fallow <command>` - dead-code, dupes, health, audit, fix, trace, list, explain, security, flags (see `docs/fallow/reference.html`).
- A project-scoped MCP server (registered as `fallow`, runs the `fallow-mcp` binary; 22 structured tools) for Claude Code in this repo only.
- A decision-rule layer in `CLAUDE.md` so the agent prefers fallow's graph truth over grep for structural questions.
- An **agent commit gate**: `fallow audit` runs before any agent `git commit`/`git push` (Claude via `PreToolUse` hook, Codex via the `AGENTS.md` block). `gate=new-only`, so only findings introduced by the changeset block; inherited findings are reported but do not block. Reinforcement for agent commits — not a replacement for a CI gate.
- The **fallow Agent Skill** in `.claude/skills/fallow/`, loaded on demand by Claude Code (complements the HTML wiki).

## Config Rationale

Tuned empirically by running fallow zero-config against this tree first, then addressing real findings (fallow's own
recommended workflow). Key choices, all documented inline in `.fallowrc.jsonc`:

- `entry: tests/**` globs - the provider tests are not referenced by every npm script, so fallow treated them as
  unreachable, flagging the test files as unused and cascade-flagging the provider/fixture exports they consume.
  Declaring test files as reachability roots fixes the graph. (Resolved 3 false "unused files" + 6 false "unused exports".)
- `ignorePatterns: lib/api/generated/** , lib/db/migrations/** , next-env.d.ts` - generated output, never analyzed.
- `duplicates.ignore: tests/**` - tests legitimately repeat structure; dropped duplication 6.9% -> 2.2%.
- `health.ignore: tests/**` - test `run()` bodies are sequential-assert lists, not real complexity.
- `rules`: `unused-*` -> `warn`, structural rules (`circular-dependencies`, `unresolved-imports`,
  `unlisted-dependencies`, `duplicate-exports`, `boundary-violation`) -> `error`. Scaffold-stage policy; tighten
  `unused-*` back to `error` as the product matures.

## Findings Snapshot (informational)

With the tuned config: unused files **0**, unused exports **14 (warn)**, structural error-rules **0**, duplication
**2.2% / 2 groups**, health **5 findings / 92.2 maintainability**. The remaining findings are real (not false
positives) and reflect the genuine phase-3 provider-activation state; they are left visible. Details in
`docs/fallow/this-project.html`. (That snapshot was measured against the full phase-3 tree; on this tooling-only
branch off `main`, `fallow audit` reports only the wiki's `styles.css` unreachable-file + HTML stale-suppression
false positives, all warn-level — see Verification.)

## Verification Commands And Results

- `npx fallow --version` - `fallow 2.87.0` (verified; win32-x64-msvc binary signature-verified via the `.fallow-verified` sentinel).
- `npx fallow list --plugins` - detected `nextjs`, `typescript`, `drizzle`, `openapi-ts`.
- `npx fallow hooks install --target agent --dry-run` - previewed the three writes before installing.
- **Full repo gate (run on `chore/fallow-setup` before commit — all green):**
  - `npm ci` - clean install from the regenerated lock; 246 packages; fallow 2.87.0 signature-verified. 6 moderate audit findings pre-existing/unchanged.
  - `npm run api:check` - redocly lint valid + `openapi-typescript --check` clean.
  - `npm run typecheck` - `tsc --noEmit` clean.
  - `npm run build` - `next build` succeeded (3 routes; static + dynamic).
  - `npm run test:mock-recall:contract` - passed.
  - `npm run test:exception-review:patch` - 13/13 PATCH assertions passed.
  - `npm run db:check` - on `main` this is `drizzle-kit check` (no live DB needed): "Everything's fine".
- **Gate behavior verified:** `fallow audit` on this branch returns verdict **`warn`** (0 complexity, 0 duplication,
  no dead-code errors; warn-level findings are `docs/fallow/styles.css` as an unreachable file plus HTML
  stale-suppression false positives in the wiki). `warn` -> the gate **allows** the commit. (On the phase-3 branch the
  same audit returns `fail` because the provider code is "introduced since `main`"; that is the intentionally-visible
  scaffold complexity, and `gate=new-only` means it stops blocking once phase-3 merges to `main`.)
- **Gate script reviewed & hardened:** a 6-agent adversarial preflight reviewed the changeset (5 PASS / 1 concerns / 0
  blocks). The concerns were bypass gaps in fallow's *generated* `fallow-gate.sh` regex (`git commit;`,
  `git -C dir commit`, `git -c k=v commit` slipped past) plus a malformed-stdin abort. Both were fixed locally and the
  new regex was verified against a 26-case match/no-match matrix (all real commit/push forms gated; non-commit forms
  like `git config commit.gpgsign` / `git config push.default` not gated). See the in-script comment. The script is
  committed with LF endings (enforced by `.gitattributes`) so it runs on Linux/WSL.

## Rollback Path

Revert this batch commit (or drop the whole `chore/fallow-setup` branch). If rolling back manually before commit:
`npx fallow hooks uninstall --target agent` (removes the Claude hook, gate script, and the `AGENTS.md` managed block),
`rm -rf .claude/skills/fallow`, `npm remove fallow`, then delete `.fallowrc.jsonc`, `.mcp.json`, `CLAUDE.md`,
`docs/fallow/`, the `.fallow/` + `.claude/*` lines in `.gitignore`, and this delta. No schema, migration, OpenAPI,
route, or CI rollback is needed.

**Skill re-sync (on fallow upgrade):** the skill is a copy, so refresh it after upgrading fallow —
`rm -rf .claude/skills/fallow && cp -r node_modules/fallow/skills/fallow .claude/skills/fallow`.

## Next Smallest Useful Micro-Batch

Optional, separately approvable:

- ~~Install the agent commit gate~~ — **done in this batch** (Claude hook + Codex `AGENTS.md` block).
- Add `fallow audit --ci` to CI (`.github/workflows/`) alongside the existing `api:check / typecheck / build / test:*`
  gate, so the gate is enforced on PRs, not only on agent commits.
- After phase-3 / PR #12 merges, re-run fallow under `main` and tighten `unused-*` rules back to `error` as the
  provider PATCH route is wired.
- Clean the `docs/fallow/config-and-suppression.html` stale-suppression false positives (literal
  `// fallow-ignore-file <token>` examples in the wiki are parsed as real suppressions) and the `styles.css`
  unreachable-file warn, so `fallow audit` on tooling-only changes is fully clean.
