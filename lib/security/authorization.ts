// Deny-by-default, action-oriented authorization for the traceability API. A policy
// authorizes an action class before any service or persistence work. This module
// defines the shape and a public-fixture default; role names and provider-specific
// claim mapping remain future implementation decisions.

import type { RequestContext } from "./request-context";

// Action classes authorized before a tenant-scoped load. Anything a policy does not
// explicitly allow is denied. Future write/review/supplier/export/admin actions
// extend this union.
export type Action =
  | "mock_recall.read"
  | "mock_recall.packet.read"
  | "exception.review.update";

export type AuthorizationDecision =
  | { allowed: true }
  | { allowed: false; reason: "forbidden" | "unauthenticated" };

export interface AuthorizationPolicy {
  authorize(ctx: RequestContext, action: Action): AuthorizationDecision;
}

// Default adapter: deny-by-default structure, with the two public fixture read
// actions explicitly allowed so the live routes are unchanged. Any future action not
// in this set is denied by the default branch.
const PUBLIC_ALLOWED: ReadonlySet<Action> = new Set<Action>([
  "mock_recall.read",
  "mock_recall.packet.read",
]);

export const publicFixturePolicy: AuthorizationPolicy = {
  authorize(_ctx: RequestContext, action: Action): AuthorizationDecision {
    return PUBLIC_ALLOWED.has(action)
      ? { allowed: true }
      : { allowed: false, reason: "forbidden" };
  },
};

export const fixtureExceptionReviewPolicy: AuthorizationPolicy = {
  authorize(ctx: RequestContext, action: Action): AuthorizationDecision {
    if (ctx.authState !== "authenticated") {
      return { allowed: false, reason: "unauthenticated" };
    }

    if (action !== "exception.review.update") {
      return { allowed: false, reason: "forbidden" };
    }

    return ctx.principal.roles?.includes("reviewer")
      ? { allowed: true }
      : { allowed: false, reason: "forbidden" };
  },
};
