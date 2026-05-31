// Server-derived request identity for the traceability API. Tenant identity is a
// server-owned property: adapters must resolve it from trusted auth/session and
// membership state, never from request bodies, query strings, route parameters, or
// arbitrary headers. This module defines the shape only; no provider is selected.

export interface Principal {
  actorId: string;
  actorType: "user" | "service";
}

export interface TenantContext {
  // Server-derived only.
  tenantId: string;
  source: "fixture-public" | "authenticated";
}

export interface RequestContext {
  requestId: string;
  principal: Principal;
  tenant: TenantContext;
  route: string;
}

// Seam: resolve a server-owned RequestContext from an inbound Request. Adapters may
// reject by returning a context whose policy denies, or (in future) by throwing an
// auth failure the boundary maps to Problem Details.
export interface RequestContextResolver {
  resolve(request: Request): Promise<RequestContext>;
}

export const PUBLIC_FIXTURE_TENANT_ID = "public-fixture";

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
