#!/usr/bin/env node
// scripts/normalize-coverage.mjs — Batch 0058
//
// Pure, deterministic transform of a c8/Istanbul `coverage-final.json` into the
// committed fallow-gate snapshot format (coverage/provider/coverage-final.json).
//
// Why this exists: `fallow audit` reads coverage via FALLOW_COVERAGE so CRAP
// scores reflect real test coverage (Batch 0057). Raw c8 output is not gate-ready:
//   1. Path keys + inner `.path` are ABSOLUTE and OS-native — they must be
//      repo-relative POSIX so the same snapshot matches functions by content hash
//      on BOTH Windows (local hook) and Linux (CI). (core.autocrlf=false + LF
//      `.ts` in the tree make the hashed source bytes identical across OS.)
//   2. c8 emits `-1` "unknown" hit sentinels; fallow's parser rejects them
//      ("invalid value: integer -1, expected u32"), so every `-1` becomes `0`.
//   3. Only production `lib/**` code is gate-relevant. Test files (entry points,
//      excluded from health/duplication in .fallowrc.jsonc) are dropped. We keep
//      by the `lib/` path PREFIX — never by hardcoded filenames — so the snapshot
//      tracks whatever provider/lib code the suites actually execute.
//
// Determinism: top-level file keys are sorted (the one source of cross-run / cross-OS
// / c8-discovery-order variation). Within each entry, the integer-string index keys of
// s/f/b/statementMap/etc. serialize in ascending numeric order regardless of input order
// (V8 normalizes array-index keys per the ECMAScript spec), and the non-integer structural
// keys keep their fixed insertion order from c8/Istanbul. JSON is 2-space indented with a
// single trailing newline. Same input → byte-identical output, and a byte-for-byte
// reproduction of the committed Batch-0057 snapshot.
//
// Usage:
//   node scripts/normalize-coverage.mjs [--in <c8 coverage-final.json>] [--out <dest>]
// Defaults: --in .coverage-tmp/istanbul/coverage-final.json
//           --out coverage/provider/coverage-final.json

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_IN = path.join(".coverage-tmp", "istanbul", "coverage-final.json");
const DEFAULT_OUT = path.join("coverage", "provider", "coverage-final.json");
const KEEP_PREFIX = "lib/"; // production code only; drops tests/**, scripts/**, node noise

function parseArgs(argv) {
  const args = { in: DEFAULT_IN, out: DEFAULT_OUT };
  const consumeValue = (index, flag) => {
    const next = argv[index];
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`normalize-coverage: ${flag} requires a value`);
    }
    return next;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--in") {
      args.in = consumeValue((i += 1), "--in");
    } else if (token === "--out") {
      args.out = consumeValue((i += 1), "--out");
    } else if (token.startsWith("--in=")) {
      args.in = token.slice("--in=".length);
    } else if (token.startsWith("--out=")) {
      args.out = token.slice("--out=".length);
    } else {
      throw new Error(`normalize-coverage: unrecognized argument "${token}"`);
    }
  }
  if (!args.in || !args.out) {
    throw new Error("normalize-coverage: --in and --out must both be non-empty");
  }
  return args;
}

// Absolute or already-relative path → repo-relative with forward slashes.
function toRepoRelativePosix(filePath) {
  const relative = path.relative(process.cwd(), filePath);
  return relative.split(path.sep).join("/");
}

// Recursively replace the numeric leaf -1 with 0 (c8 "unknown" → fallow-safe).
function zeroOutUnknownCounts(value) {
  if (Array.isArray(value)) {
    return value.map(zeroOutUnknownCounts);
  }
  if (value !== null && typeof value === "object") {
    const result = {};
    for (const [key, inner] of Object.entries(value)) {
      result[key] = zeroOutUnknownCounts(inner);
    }
    return result;
  }
  if (typeof value === "number" && value === -1) {
    return 0;
  }
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const raw = await readFile(args.in, "utf8");
  const coverage = JSON.parse(raw);

  // Keep production lib/** entries, sorted by repo-relative path so the top-level
  // file order is stable regardless of c8's discovery order. Entry-internal order is
  // preserved (see the header note) for a byte-faithful, low-noise snapshot.
  const kept = Object.entries(coverage)
    .map(([key, entry]) => [toRepoRelativePosix(key), entry])
    .filter(([relKey]) => relKey.startsWith(KEEP_PREFIX))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  if (kept.length === 0) {
    throw new Error(
      `normalize-coverage: no ${KEEP_PREFIX}** entries found in ${args.in} — ` +
        "the suites did not execute the provider code under coverage.",
    );
  }

  const normalized = {};
  for (const [relKey, entry] of kept) {
    const cleaned = zeroOutUnknownCounts(entry);
    cleaned.path = relKey; // rewrite inner .path to match the repo-relative key
    normalized[relKey] = cleaned;
  }

  const json = `${JSON.stringify(normalized, null, 2)}\n`;

  await mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
  await writeFile(args.out, json, "utf8");

  console.log(
    `normalize-coverage: wrote ${kept.length} entr${
      kept.length === 1 ? "y" : "ies"
    } to ${args.out}`,
  );
  for (const [relKey] of kept) {
    console.log(`  - ${relKey}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
