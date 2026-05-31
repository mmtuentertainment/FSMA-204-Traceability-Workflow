// Read-path request boundary. A route handler supplies its action, the resource id,
// a tenant-scoped load, and a success render; the boundary owns the rest: resolve a
// server-owned context, authorize the action class, perform the load, and map every
// failure to RFC 9457 Problem Details.
//
// The ordering is leak-safe: authorize the action class first (401/403), then a
// tenant-scoped miss becomes 404 (notFound) — never 403 — so resource existence is
// not leaked across tenants. With the public-fixture defaults this resolves to the
// same responses as before; the auth branches are dormant until a non-public
// resolver/policy is wired.

import {
  publicFixtureContextResolver,
  type RequestContext,
  type RequestContextResolver,
} from "../security/request-context";
import {
  publicFixturePolicy,
  type Action,
  type AuthorizationPolicy,
} from "../security/authorization";
import {
  forbiddenResponse,
  mockRecallNotFoundResponse,
  unauthorizedResponse,
} from "./problem";

export interface BoundaryDeps {
  resolver: RequestContextResolver;
  policy: AuthorizationPolicy;
}

export const defaultBoundaryDeps: BoundaryDeps = {
  resolver: publicFixtureContextResolver,
  policy: publicFixturePolicy,
};

export async function handleReadAction<T>(args: {
  request: Request;
  action: Action;
  resourceId: string;
  load: (ctx: RequestContext) => T | null;
  render: (value: T, ctx: RequestContext) => Response;
  deps?: Partial<BoundaryDeps>;
}): Promise<Response> {
  const { resolver, policy } = { ...defaultBoundaryDeps, ...args.deps };
  const ctx = await resolver.resolve(args.request);
  const instance = ctx.route;

  const decision = policy.authorize(ctx, args.action);
  if (!decision.allowed) {
    return decision.reason === "unauthenticated"
      ? unauthorizedResponse(instance)
      : forbiddenResponse(instance);
  }

  const value = args.load(ctx);
  if (value === null) {
    return mockRecallNotFoundResponse(args.resourceId, instance);
  }

  return args.render(value, ctx);
}
