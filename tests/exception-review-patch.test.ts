import assert from "node:assert/strict";

import { PATCH } from "../app/api/traceability/exceptions/[exceptionId]/route.ts";
import {
  fixtureExceptionReviewAuditSink,
  resetExceptionReviewFixtures,
} from "../lib/api/exception-review.ts";
import {
  FixtureIdempotencyStore,
  type IdempotencyScope,
} from "../lib/security/idempotency-audit.ts";

const exceptionId = "fixture-exception-ready-for-review";
const pathname = exceptionPath(exceptionId);

type TestCase = {
  name: string;
  run: () => Promise<void>;
};

function routeContext(id = exceptionId): {
  params: Promise<{ exceptionId: string }>;
} {
  return { params: Promise.resolve({ exceptionId: id }) };
}

function exceptionPath(id = exceptionId): string {
  return `/api/traceability/exceptions/${id}`;
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
  return assertProblemInstance(response, status, pathname);
}

async function assertProblemInstance(
  response: Response,
  status: number,
  expectedInstance: string,
): Promise<void> {
  const body = asRecord(await readJson(response));
  assert.equal(response.status, status);
  assert.match(response.headers.get("content-type") ?? "", /problem\+json/);
  assert.equal(body.status, status);
  assert.equal(body.type, "about:blank");
  assert.equal(body.instance, expectedInstance);
}

function auditCount(): number {
  return fixtureExceptionReviewAuditSink.readEvents().length;
}

async function withNodeEnv(
  value: string | undefined,
  run: () => Promise<void>,
): Promise<void> {
  const previous = process.env["NODE_ENV"];

  try {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV");
    } else {
      Reflect.set(process.env, "NODE_ENV", value);
    }

    await run();
  } finally {
    if (previous === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV");
    } else {
      Reflect.set(process.env, "NODE_ENV", previous);
    }
  }
}

function idempotencyScope(
  overrides: Partial<IdempotencyScope> = {},
): IdempotencyScope {
  return {
    tenantId: "fixture-tenant-a",
    actorId: "fixture-reviewer",
    action: "exception.review.update",
    resourceRef: "traceability_exception:fixture-exception",
    key: "fixture-key",
    requestFingerprint: "fingerprint-a",
    ...overrides,
  };
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
    name: "fixture Authorization returns 401 when NODE_ENV is production",
    async run() {
      await withNodeEnv("production", async () => {
        await assertProblem(
          await patchException({
            body: reviewPatch,
            key: "production-disabled-key",
            token: "fixture-reviewer-token",
          }),
          401,
        );
      });
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
    name: "same-tenant reviewer receives 404 for unknown exception ID",
    async run() {
      const unknownExceptionId = "fixture-exception-not-found";

      await assertProblemInstance(
        await patchException({
          body: reviewPatch,
          key: "unknown-exception-key",
          token: "fixture-reviewer-token",
          id: unknownExceptionId,
        }),
        404,
        exceptionPath(unknownExceptionId),
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
  // These replay/conflict cases intentionally share the prior success state.
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
  {
    name: "idempotency scope serialization does not collide on pipe characters",
    async run() {
      const store = new FixtureIdempotencyStore<{ marker: string }>();
      const scopeA = idempotencyScope({
        resourceRef: "traceability_exception:fixture",
        key: "review|key",
        requestFingerprint: "fingerprint-a",
      });
      const scopeB = idempotencyScope({
        resourceRef: "traceability_exception:fixture|review",
        key: "key",
        requestFingerprint: "fingerprint-b",
      });

      assert.equal((await store.check(scopeA)).status, "fresh");
      await store.storeSuccess(scopeA, { marker: "scope-a" });
      assert.equal((await store.check(scopeB)).status, "fresh");
      await store.storeSuccess(scopeB, { marker: "scope-b" });

      const replayA = await store.check(scopeA);
      const replayB = await store.check(scopeB);

      assert.equal(replayA.status, "replayed");
      assert.equal(replayB.status, "replayed");

      if (replayA.status === "replayed") {
        assert.equal(replayA.storedResponse.marker, "scope-a");
      }

      if (replayB.status === "replayed") {
        assert.equal(replayB.storedResponse.marker, "scope-b");
      }
    },
  },
];

resetExceptionReviewFixtures();

for (const test of tests) {
  await test.run();
  console.log(`PASS ${test.name}`);
}

console.log("Exception-review PATCH focused tests passed.");
