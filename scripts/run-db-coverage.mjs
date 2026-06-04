#!/usr/bin/env node
// scripts/run-db-coverage.mjs — Batch 0058
//
// Cross-platform orchestrator behind `npm run test:db:coverage`. Regenerates the
// committed provider coverage snapshot (or a temp copy in CI) reproducibly, with
// no shell env-prefix so it runs identically on Windows, macOS, and CI bash.
//
// Steps (all in-process):
//   1. Clean + recreate the V8 coverage scratch dir under .coverage-tmp/.
//   2. Run the provider suites SEQUENTIALLY (a1 then a2) under NODE_V8_COVERAGE.
//      They share tables and TRUNCATE between cases, so running them in parallel
//      would race; sequential spawnSync preserves order. A failing suite
//      propagates its non-zero exit (this is what makes the CI job actually
//      EXECUTE the provider tests — a regression fails the job).
//   3. Convert V8 → Istanbul with c8, resolved via require.resolve('c8/bin/c8.js')
//      to avoid .cmd/.sh bin-shim issues on Windows.
//   4. Normalize the Istanbul output into the gate snapshot (paths, -1→0, lib/**
//      only, deterministic key order) via scripts/normalize-coverage.mjs.
//
// TEST_DATABASE_URL (and DATABASE_URL for migrations) are inherited from the
// environment — provision a disposable Postgres first (see coverage/provider/README.md).
//
// Usage:
//   node scripts/run-db-coverage.mjs [--out <dest>]
// --out is passed through to the normalizer. Default: coverage/provider/coverage-final.json.

import { createRequire } from "node:module";
import { rmSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const require = createRequire(import.meta.url);

const ROOT = process.cwd();
const TMP_DIR = path.join(ROOT, ".coverage-tmp");
const V8_DIR = path.join(TMP_DIR, "v8");
const ISTANBUL_DIR = path.join(TMP_DIR, "istanbul");
const ISTANBUL_FILE = path.join(ISTANBUL_DIR, "coverage-final.json");

const SUITES = [
  path.join("tests", "db", "exception-review-provider-a1.test.ts"),
  path.join("tests", "db", "exception-review-provider-a2.test.ts"),
];

function parseOut(argv) {
  let out = path.join("coverage", "provider", "coverage-final.json");
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--out") {
      const next = argv[(i += 1)];
      if (next === undefined || next.startsWith("--")) {
        throw new Error("run-db-coverage: --out requires a value");
      }
      out = next;
    } else if (token.startsWith("--out=")) {
      out = token.slice("--out=".length);
    }
  }
  if (!out) {
    throw new Error("run-db-coverage: --out must be non-empty");
  }
  return out;
}

function run(label, command, commandArgs, extraEnv = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) {
    throw new Error(`run-db-coverage: ${label} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    console.error(`run-db-coverage: ${label} exited ${result.status ?? "(signal)"}`);
    process.exit(result.status === null ? 1 : result.status);
  }
}

function main() {
  const out = parseOut(process.argv.slice(2));

  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      "run-db-coverage: TEST_DATABASE_URL is required (provision a disposable " +
        "Postgres test database first — see coverage/provider/README.md).",
    );
  }

  // 1. Clean scratch dirs so stale V8/Istanbul output can never leak in.
  rmSync(V8_DIR, { recursive: true, force: true });
  rmSync(ISTANBUL_DIR, { recursive: true, force: true });
  mkdirSync(V8_DIR, { recursive: true });

  // 2. Provider suites, sequentially, under V8 coverage.
  for (const suite of SUITES) {
    run(suite, process.execPath, ["--experimental-strip-types", suite], {
      NODE_V8_COVERAGE: V8_DIR,
    });
  }

  // 3. V8 → Istanbul JSON via c8 (resolve the bin JS, not the platform shim).
  const c8Bin = require.resolve("c8/bin/c8.js");
  run("c8 report", process.execPath, [
    c8Bin,
    "report",
    "--temp-directory",
    V8_DIR,
    "--reporter",
    "json",
    "--report-dir",
    ISTANBUL_DIR,
  ]);

  // 4. Normalize into the gate snapshot.
  run("normalize-coverage", process.execPath, [
    path.join("scripts", "normalize-coverage.mjs"),
    "--in",
    ISTANBUL_FILE,
    "--out",
    out,
  ]);

  console.log(`run-db-coverage: snapshot written to ${out}`);
}

main();
