import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const fixtureId = "contract-fixture-ready-for-review";
const missingId = "contract-smoke-missing";
const host = "127.0.0.1";
const port = Number(process.env.MOCK_RECALL_SMOKE_PORT ?? 3227);
const baseUrl = `http://${host}:${port}`;
const expectedPacketCsvHeader =
  "mock_recall_id,traceability_lot_code,product_description,human_review_required,readiness_status";
const expectedPacketCsvRow =
  "contract-fixture-ready-for-review,TLC-FC-2026-05-READY,Fresh-cut melon cup,true,ready_for_human_review";
const expectedPacketCsv = [
  expectedPacketCsvHeader,
  expectedPacketCsvRow,
  "",
].join("\r\n");

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", host, "-p", String(port)],
  {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverOutput = "";

server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForServer() {
  const probePath = `/api/traceability/mock-recalls/${missingId}`;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next server exited early.\n${serverOutput}`);
    }

    try {
      await fetch(`${baseUrl}${probePath}`);
      return;
    } catch {
      await delay(500);
    }
  }

  throw new Error(`Timed out waiting for Next server.\n${serverOutput}`);
}

async function stopServer() {
  if (server.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    server.kill("SIGTERM");
  }

  await Promise.race([
    new Promise((resolve) => {
      server.once("exit", resolve);
    }),
    delay(5000),
  ]);
}

async function fetchJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  const bodyText = await response.text();

  return {
    response,
    body: JSON.parse(bodyText),
  };
}

function assertProblemDetails({ response, body }, pathname, mockRecallId) {
  assert.equal(response.status, 404);
  assert.match(
    response.headers.get("content-type") ?? "",
    /application\/problem\+json/,
  );
  assert.equal(body.type, "about:blank");
  assert.equal(body.title, "Resource not found");
  assert.equal(body.status, 404);
  assert.equal(
    body.detail,
    `No mock recall was found for mockRecallId "${mockRecallId}".`,
  );
  assert.equal(body.instance, pathname);
}

async function assertFixtureDetail() {
  const pathname = `/api/traceability/mock-recalls/${fixtureId}`;
  const { response, body } = await fetchJson(pathname);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.equal(body.mockRecallId, fixtureId);
  assert.equal(body.status, "ready_for_human_review");
  assert.equal(body.scope.traceabilityLotCode, "TLC-FC-2026-05-READY");
  assert.equal(body.readinessSummary.humanReviewRequired, true);
  assert.deepEqual(body.readinessSummary.humanReviewReasons, [
    "supplier_kde_gap",
    "lot_code_ambiguity",
  ]);
  assert.equal(body.packet.csvAvailable, true);
  assert.equal(body.packet.csvHref, `${pathname}/packet.csv`);
  assert.equal(body.packet.format, "fda_style_sortable_csv");
}

async function assertFixturePacketCsv() {
  const response = await fetch(
    `${baseUrl}/api/traceability/mock-recalls/${fixtureId}/packet.csv`,
  );
  const bodyText = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/csv/);
  assert.equal(bodyText, expectedPacketCsv);
  assert.equal(bodyText.split("\r\n")[0], expectedPacketCsvHeader);
  assert.equal(bodyText.split("\r\n")[1], expectedPacketCsvRow);
  assert.doesNotMatch(
    bodyText,
    /compliance certification|legal advice|FDA endorsement/i,
  );
}

async function assertMissingDetailProblem() {
  const pathname = `/api/traceability/mock-recalls/${missingId}`;
  assertProblemDetails(await fetchJson(pathname), pathname, missingId);
}

async function assertMissingPacketProblem() {
  const pathname = `/api/traceability/mock-recalls/${missingId}/packet.csv`;
  assertProblemDetails(await fetchJson(pathname), pathname, missingId);
}

try {
  await waitForServer();
  await assertFixtureDetail();
  await assertFixturePacketCsv();
  await assertMissingDetailProblem();
  await assertMissingPacketProblem();
  console.log("MockRecall contract smoke check passed.");
} finally {
  await stopServer();
}
