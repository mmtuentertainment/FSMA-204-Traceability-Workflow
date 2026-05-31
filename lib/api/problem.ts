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
