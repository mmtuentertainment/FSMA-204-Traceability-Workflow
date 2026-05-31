import type { components } from "./generated/openapi-types";

type Problem = components["schemas"]["Problem"];

// Low-level primitive: serialize any RFC 9457 Problem to a Response. The catalog
// below is the seam callers reach for; problemResponse is the escape hatch under it.
export function problemResponse(problem: Problem): Response {
  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

// Named catalog of canonical Problem shapes (type/title/status). Each entry owns the
// fields a caller must not re-decide; per-call detail/instance are attached at the
// call site. One entry today; the request boundary adds auth entries behind this seam.
const PROBLEM_CATALOG = {
  notFound: { type: "about:blank", title: "Resource not found", status: 404 },
  unauthorized: {
    type: "about:blank",
    title: "Authentication required",
    status: 401,
  },
  forbidden: { type: "about:blank", title: "Forbidden", status: 403 },
} as const;

export function mockRecallNotFoundResponse(
  mockRecallId: string,
  instance: string,
): Response {
  return problemResponse({
    ...PROBLEM_CATALOG.notFound,
    detail: `No mock recall was found for mockRecallId "${mockRecallId}".`,
    instance,
  });
}

// Auth boundary errors, consumed by the request boundary. The contract declares
// Unauthorized (401) and Forbidden (403) responses; these construct them. They are
// dormant for the current public fixture (the policy allows the read actions) but
// are the boundary's vocabulary once a non-public resolver/policy is wired.
export function unauthorizedResponse(instance: string): Response {
  return problemResponse({ ...PROBLEM_CATALOG.unauthorized, instance });
}

export function forbiddenResponse(instance: string): Response {
  return problemResponse({ ...PROBLEM_CATALOG.forbidden, instance });
}
