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

function formatServerOutput() {
  return serverOutput.trim() || "(no server output captured)";
}

function truncateText(value, maxLength = 1000) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}... [truncated ${
    value.length - maxLength
  } chars]`;
}

function formatResponseContext({ url, response, bodyText }) {
  return [
    `URL: ${url}`,
    `Status: ${response.status} ${response.statusText}`,
    `Content-Type: ${response.headers.get("content-type") ?? "(missing)"}`,
    `Body: ${truncateText(JSON.stringify(bodyText))}`,
  ].join("\n");
}

async function waitForServer() {
  const probePath = `/api/traceability/mock-recalls/${missingId}`;
  const probeUrl = `${baseUrl}${probePath}`;
  let lastProbeError;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(
        [
          `Next server exited early with code ${server.exitCode} while waiting for ${probeUrl}.`,
          "Server output:",
          formatServerOutput(),
        ].join("\n"),
      );
    }

    try {
      await fetch(probeUrl);
      return;
    } catch (error) {
      lastProbeError = error;
      await delay(500);
    }
  }

  throw new Error(
    [
      `Timed out waiting for Next server at ${probeUrl}.`,
      `Last probe error: ${lastProbeError?.message ?? "(none)"}`,
      "Server output:",
      formatServerOutput(),
    ].join("\n"),
  );
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
  const url = `${baseUrl}${pathname}`;
  const response = await fetch(url);
  const bodyText = await response.text();

  try {
    return {
      url,
      response,
      bodyText,
      body: JSON.parse(bodyText),
    };
  } catch (error) {
    throw new Error(
      [
        `Expected JSON response for ${pathname}.`,
        formatResponseContext({ url, response, bodyText }),
        `Parse error: ${error.message}`,
      ].join("\n"),
    );
  }
}

function assertProblemDetails(result, pathname, mockRecallId) {
  const { response, body } = result;
  const context = formatResponseContext(result);

  assert.equal(
    response.status,
    404,
    `Expected 404 for ${pathname}.\n${context}`,
  );
  assert.match(
    response.headers.get("content-type") ?? "",
    /application\/problem\+json/,
    `Expected Problem Details content type for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.type,
    "about:blank",
    `Unexpected problem type for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.title,
    "Resource not found",
    `Unexpected problem title for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.status,
    404,
    `Unexpected problem status for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.detail,
    `No mock recall was found for mockRecallId "${mockRecallId}".`,
    `Unexpected problem detail for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.instance,
    pathname,
    `Unexpected problem instance for ${pathname}.\n${context}`,
  );
}

async function assertFixtureDetail() {
  const pathname = `/api/traceability/mock-recalls/${fixtureId}`;
  const result = await fetchJson(pathname);
  const { response, body } = result;
  const context = formatResponseContext(result);

  assert.equal(
    response.status,
    200,
    `Expected fixture detail 200 for ${pathname}.\n${context}`,
  );
  assert.match(
    response.headers.get("content-type") ?? "",
    /application\/json/,
    `Expected fixture detail JSON content type for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.mockRecallId,
    fixtureId,
    `Unexpected fixture mockRecallId for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.status,
    "ready_for_human_review",
    `Unexpected fixture status for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.scope?.traceabilityLotCode,
    "TLC-FC-2026-05-READY",
    `Unexpected fixture traceability lot for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.readinessSummary?.humanReviewRequired,
    true,
    `Unexpected fixture human-review flag for ${pathname}.\n${context}`,
  );
  assert.deepEqual(
    body?.readinessSummary?.humanReviewReasons,
    ["supplier_kde_gap", "lot_code_ambiguity"],
    `Unexpected fixture human-review reasons for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.packet?.csvAvailable,
    true,
    `Unexpected fixture packet availability for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.packet?.csvHref,
    `${pathname}/packet.csv`,
    `Unexpected fixture packet href for ${pathname}.\n${context}`,
  );
  assert.equal(
    body?.packet?.format,
    "fda_style_sortable_csv",
    `Unexpected fixture packet format for ${pathname}.\n${context}`,
  );
}

async function assertFixturePacketCsv() {
  const pathname = `/api/traceability/mock-recalls/${fixtureId}/packet.csv`;
  const url = `${baseUrl}${pathname}`;
  const response = await fetch(url);
  const bodyText = await response.text();
  const context = formatResponseContext({ url, response, bodyText });

  assert.equal(
    response.status,
    200,
    `Expected packet CSV 200 for ${pathname}.\n${context}`,
  );
  assert.match(
    response.headers.get("content-type") ?? "",
    /text\/csv/,
    `Expected packet CSV content type for ${pathname}.\n${context}`,
  );
  assert.equal(
    bodyText,
    expectedPacketCsv,
    `Unexpected packet CSV body for ${pathname}.\n${context}`,
  );
  assert.equal(
    bodyText.split("\r\n")[0],
    expectedPacketCsvHeader,
    `Unexpected packet CSV header for ${pathname}.\n${context}`,
  );
  assert.equal(
    bodyText.split("\r\n")[1],
    expectedPacketCsvRow,
    `Unexpected packet CSV fixture row for ${pathname}.\n${context}`,
  );
  assert.doesNotMatch(
    bodyText,
    /compliance certification|legal advice|FDA endorsement/i,
    `Packet CSV includes disallowed compliance language for ${pathname}.\n${context}`,
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
