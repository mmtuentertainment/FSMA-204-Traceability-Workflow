// Per-action rate-limit seam for mutating writes. SHAPE ONLY in this batch: the live
// traceability routes do not inject a limiter, so an absent (or permissive) limiter
// leaves every existing path byte-identical. The seam mirrors the idempotency/audit
// seam in lib/security/idempotency-audit.ts — an interface contract, a status-
// discriminated decision union, an in-memory fixture for tests, and a no-op default.
// A real limiter (e.g. a persistent fixed-window store) is provided by a later approved
// batch when the live route is wired.

import type { Action } from "./authorization";

// Rate-limit enforcement scope. Mirrors IdempotencyScope's keying so a limiter and the
// idempotency store agree on what identifies a caller's request stream (tenant + actor +
// action + resource).
export interface RateLimitScope {
  tenantId: string;
  actorId: string;
  action: Action;
  resourceRef: string;
}

// Status-discriminated decision, mirroring IdempotencyCheck. A deny carries an integer
// Retry-After (seconds, >= 1) so the caller can emit a conformant 429 — the contract's
// RateLimited response declares Retry-After as an integer with minimum 1
// (api/openapi.yaml). The in_flight idempotency outcome already carries retryAfterSeconds
// the same way (lib/db/exception-review-provider.ts).
export type RateLimitDecision =
  | { status: "allow" }
  | { status: "deny"; retryAfterSeconds: number };

// A limiter resolves `check` to allow or deny; it does NOT model its own failure. A real
// implementation that cannot reach its backing store must still RESOLVE a decision,
// because the live checkpoint (lib/db/exception-review-provider.ts) does not catch a
// rejected check(): a rejection propagates out of the review transaction, rolls it back,
// and fails the write CLOSED. That fail-closed default is intentional for a compliance
// write path; a future batch wanting availability-over-enforcement must add an explicit
// try/catch at the checkpoint rather than rely on this emergent behavior.
export interface RateLimiter {
  check(scope: RateLimitScope): Promise<RateLimitDecision>;
}

// Default permissive limiter: always allows. Mirrors noopAuditSink — a concrete seam
// that enforces nothing, so injecting it is equivalent to injecting no limiter at all.
export const noopRateLimiter: RateLimiter = {
  async check(_scope: RateLimitScope): Promise<RateLimitDecision> {
    return { status: "allow" };
  },
};

// In-memory fixed-window limiter for tests. Mirrors FixtureIdempotencyStore: Map-backed
// per-scope state and a private scopeKey serializer. The window clock is injected so
// tests are deterministic. Fixed-window is intentionally simple and has a known
// boundary-burst weakness — up to 2x the limit can pass across a window edge. That
// weakness is documented (see the A5-12 test), not prevented, at this stage.
export class FixtureFixedWindowRateLimiter implements RateLimiter {
  private readonly windows = new Map<
    string,
    { windowStartMs: number; count: number }
  >();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly clock: () => number;

  constructor(
    limit: number,
    windowMs: number,
    clock: () => number = () => Date.now(),
  ) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.clock = clock;
  }

  async check(scope: RateLimitScope): Promise<RateLimitDecision> {
    const nowMs = this.clock();
    const key = this.scopeKey(scope);
    const existing = this.windows.get(key);

    let windowStartMs: number;
    let count: number;
    if (existing !== undefined && nowMs - existing.windowStartMs < this.windowMs) {
      windowStartMs = existing.windowStartMs;
      count = existing.count + 1;
    } else {
      windowStartMs = nowMs;
      count = 1;
    }
    this.windows.set(key, { windowStartMs, count });

    if (count > this.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowStartMs + this.windowMs - nowMs) / 1000),
      );
      return { status: "deny", retryAfterSeconds };
    }

    return { status: "allow" };
  }

  private scopeKey(scope: RateLimitScope): string {
    return JSON.stringify({
      tenantId: scope.tenantId,
      actorId: scope.actorId,
      action: scope.action,
      resourceRef: scope.resourceRef,
    });
  }
}
