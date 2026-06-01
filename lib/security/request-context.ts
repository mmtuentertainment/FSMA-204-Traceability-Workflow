// Server-derived request identity for the traceability API. Tenant identity is a
// server-owned property: adapters must resolve it from trusted auth/session and
// membership state, never from request bodies, query strings, route parameters, or
// arbitrary headers. This module defines the shape only; no provider is selected.

export interface Principal {
  actorId: string;
  actorType: "user" | "service";
  roles?: readonly PrincipalRole[];
}

export type PrincipalRole = "viewer" | "reviewer" | "admin";

export interface TenantContext {
  // Server-derived only.
  tenantId: string;
  source: "fixture-public" | "authenticated" | "unauthenticated";
}

export interface RequestContext {
  requestId: string;
  principal: Principal;
  tenant: TenantContext;
  route: string;
  authState?: "authenticated" | "unauthenticated";
}

// Seam: resolve a server-owned RequestContext from an inbound Request. Adapters may
// reject by returning a context whose policy denies, or (in future) by throwing an
// auth failure the boundary maps to Problem Details.
export interface RequestContextResolver {
  resolve(request: Request): Promise<RequestContext>;
}

export const PUBLIC_FIXTURE_TENANT_ID = "public-fixture";

export const EXCEPTION_REVIEW_FIXTURE_TENANT_ID = "fixture-tenant-a";
export const OTHER_FIXTURE_TENANT_ID = "fixture-tenant-b";

type FixtureAuthPrincipal = {
  actorId: string;
  tenantId: string;
  roles: readonly PrincipalRole[];
};

const FIXTURE_AUTH_TOKENS: Record<string, FixtureAuthPrincipal> = {
  "fixture-reviewer-token": {
    actorId: "fixture-reviewer",
    tenantId: EXCEPTION_REVIEW_FIXTURE_TENANT_ID,
    roles: ["reviewer"],
  },
  "fixture-viewer-token": {
    actorId: "fixture-viewer",
    tenantId: EXCEPTION_REVIEW_FIXTURE_TENANT_ID,
    roles: ["viewer"],
  },
  "fixture-other-tenant-reviewer-token": {
    actorId: "fixture-other-tenant-reviewer",
    tenantId: OTHER_FIXTURE_TENANT_ID,
    roles: ["reviewer"],
  },
};

// Default adapter: preserves current public fixture behavior. No authentication; a
// single implicit, server-derived tenant. It never throws, so it introduces no new
// failure path — the live routes behave exactly as before.
export const publicFixtureContextResolver: RequestContextResolver = {
  async resolve(request: Request): Promise<RequestContext> {
    return {
      requestId: crypto.randomUUID(),
      principal: { actorId: "anonymous", actorType: "service" },
      tenant: { tenantId: PUBLIC_FIXTURE_TENANT_ID, source: "fixture-public" },
      route: new URL(request.url).pathname,
    };
  },
};

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

// Local/test fixture auth for the first approved mutating write. It derives tenant
// and role state only from known fixture bearer tokens; client-provided tenant
// values in bodies, routes, queries, or arbitrary headers are ignored.
export const fixtureAuthContextResolver: RequestContextResolver = {
  async resolve(request: Request): Promise<RequestContext> {
    const route = new URL(request.url).pathname;
    const token = readBearerToken(request);
    const fixture = token ? FIXTURE_AUTH_TOKENS[token] : undefined;

    if (!fixture) {
      return {
        requestId: crypto.randomUUID(),
        principal: { actorId: "unauthenticated", actorType: "user", roles: [] },
        tenant: { tenantId: "unauthenticated", source: "unauthenticated" },
        route,
        authState: "unauthenticated",
      };
    }

    return {
      requestId: crypto.randomUUID(),
      principal: {
        actorId: fixture.actorId,
        actorType: "user",
        roles: fixture.roles,
      },
      tenant: { tenantId: fixture.tenantId, source: "authenticated" },
      route,
      authState: "authenticated",
    };
  },
};
