import assert from "node:assert/strict";

import { PATCH } from "../app/api/traceability/exceptions/[exceptionId]/route.ts";
import {
  fixtureExceptionReviewAuditSink,
  resetExceptionReviewFixtures,
} from "../lib/api/exception-review.ts";

const exceptionId = "fixture-exception-ready-for-review";
const pathname = `/api/traceability/exceptions/${exceptionId}`;

type TestCase = {
  name: string;
  run: () => Promise<void>;
};

function routeContext(id = exceptionId): {
  params: Promise<{ exceptionId: string }>;
} {
  return { params: Promise.resolve({ exceptionId: id }) };
}

async function patchException(args: {
  body?: unknown;
  key?: string;
  token?: string;
  id?: string;
}): Promise<Response> {
  const id = args.id ?? exceptionId;
  const headers = new Headers({ "Content-Type": "application/json" });

  if (args.token !== undefined) {
    headers.set("Authorization", `Bearer ${args.token}`);
  }

  if (args.key !== undefined) {
    headers.set("Idempotency-Key", args.key);
  }

  return PATCH(
    new Request(`http://localhost/api/traceability/exceptions/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(args.body ?? {}),
    }),
    routeContext(id),
  );
}

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

async function assertProblem(response: Response, status: number): Promise<void> {
  const body = asRecord(await readJson(response));
  assert.equal(response.status, status);
  assert.match(response.headers.get("content-type") ?? "", /problem\+json/);
  assert.equal(body.status, status);
  assert.equal(body.type, "about:blank");
  assert.equal(body.instance, pathname);
}

function auditCount(): number {
  return fixtureExceptionReviewAuditSink.readEvents().length;
}

const reviewPatch = {
  status: "in_review",
  review_reason: "ambiguous_lot_code",
  review_notes: "Review started from the focused PATCH smoke test.",
  human_review_required: true,
};

const tests: TestCase[] = [
  {
    name: "missing Authorization returns 401 Problem Details",
    async run() {
      await assertProblem(
        await patchException({ body: reviewPatch, key: "missing-auth-key" }),
        401,
      );
      assert.equal(auditCount(), 0);
    },
  },
  {
    name: "unknown Authorization returns 401 Problem Details",
    async run() {
      await assertProblem(
        await patchException({
          body: reviewPatch,
          key: "unknown-auth-key",
          token: "not-a-fixture-token",
        }),
        401,
      );
      assert.equal(auditCount(), 0);
    },
  },
  {
    name: "same-tenant non-reviewer returns 403 Problem Details",
    async run() {
      await assertProblem(
        await patchException({
          body: reviewPatch,
          key: "viewer-denied-key",
          token: "fixture-viewer-token",
        }),
        403,
      );
      assert.equal(auditCount(), 0);
    },
  },
  {
    name: "cross-tenant reviewer receives leak-safe 404",
    async run() {
      await assertProblem(
        await patchException({
          body: reviewPatch,
          key: "other-tenant-key",
          token: "fixture-other-tenant-reviewer-token",
        }),
        404,
      );
      assert.equal(auditCount(), 0);
    },
  },
  {
    name: "missing Idempotency-Key returns 422 without audit",
    async run() {
      await assertProblem(
        await patchException({
          body: reviewPatch,
          token: "fixture-reviewer-token",
        }),
        422,
      );
      assert.equal(auditCount(), 0);
    },
  },
  {
    name: "invalid patch body returns 422 without audit",
    async run() {
      await assertProblem(
        await patchException({
          body: { status: "closed" },
          key: "invalid-body-key",
          token: "fixture-reviewer-token",
        }),
        422,
      );
      assert.equal(auditCount(), 0);
    },
  },
  {
    name: "client-supplied tenant field is rejected",
    async run() {
      await assertProblem(
        await patchException({
          body: { ...reviewPatch, tenantId: "fixture-tenant-b" },
          key: "client-tenant-key",
          token: "fixture-reviewer-token",
        }),
        422,
      );
      assert.equal(auditCount(), 0);
    },
  },
  {
    name: "reviewer PATCH updates fixture exception and appends audit",
    async run() {
      const response = await patchException({
        body: reviewPatch,
        key: "fixture-success-key-0001",
        token: "fixture-reviewer-token",
      });
      const body = asRecord(await readJson(response));
      const events = fixtureExceptionReviewAuditSink.readEvents();

      assert.equal(response.status, 200);
      assert.equal(body.id, exceptionId);
      assert.equal(body.status, "in_review");
      assert.equal(body.review_reason, "ambiguous_lot_code");
      assert.equal(body.human_review_required, true);
      assert.equal(events.length, 1);
      assert.equal(events[0]?.actorId, "fixture-reviewer");
      assert.equal(events[0]?.tenantId, "fixture-tenant-a");
      assert.equal(events[0]?.action, "exception.review.update");
      assert.equal(events[0]?.resourceRef, `traceability_exception:${exceptionId}`);
      assert.equal(events[0]?.idempotencyKey, "fixture-success-key-0001");
      assert.equal(events[0]?.beforeState?.status, "open");
      assert.equal(events[0]?.afterState?.status, "in_review");
    },
  },
  {
    name: "same Idempotency-Key and fingerprint replays stored response",
    async run() {
      const response = await patchException({
        body: reviewPatch,
        key: "fixture-success-key-0001",
        token: "fixture-reviewer-token",
      });
      const body = asRecord(await readJson(response));

      assert.equal(response.status, 200);
      assert.equal(body.status, "in_review");
      assert.equal(auditCount(), 1);
    },
  },
  {
    name: "same Idempotency-Key with different fingerprint returns 409",
    async run() {
      await assertProblem(
        await patchException({
          body: { ...reviewPatch, status: "resolved" },
          key: "fixture-success-key-0001",
          token: "fixture-reviewer-token",
        }),
        409,
      );
      assert.equal(auditCount(), 1);
    },
  },
];

resetExceptionReviewFixtures();

for (const test of tests) {
  await test.run();
  console.log(`PASS ${test.name}`);
}

console.log("Exception-review PATCH focused tests passed.");
