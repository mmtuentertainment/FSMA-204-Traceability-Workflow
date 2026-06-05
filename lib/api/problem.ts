import type { components } from "./generated/openapi-types";

type Problem = components["schemas"]["Problem"];

// Low-level primitive: serialize any RFC 9457 Problem to a Response. The catalog
// below is the seam callers reach for; problemResponse is the escape hatch under it.
export function problemResponse(
  problem: Problem,
  headers: HeadersInit = {},
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/problem+json");

  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: responseHeaders,
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
  conflict: { type: "about:blank", title: "Conflict", status: 409 },
  validationError: {
    type: "about:blank",
    title: "Request validation failed",
    status: 422,
  },
  rateLimited: {
    type: "about:blank",
    title: "Too Many Requests",
    status: 429,
  },
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
  return problemResponse(
    { ...PROBLEM_CATALOG.unauthorized, instance },
    { "WWW-Authenticate": "Bearer" },
  );
}

export function forbiddenResponse(instance: string): Response {
  return problemResponse({ ...PROBLEM_CATALOG.forbidden, instance });
}

export function exceptionNotFoundResponse(
  exceptionId: string,
  instance: string,
): Response {
  return problemResponse({
    ...PROBLEM_CATALOG.notFound,
    detail: `No traceability exception was found for exceptionId "${exceptionId}".`,
    instance,
  });
}

export function conflictResponse(instance: string, detail: string): Response {
  return problemResponse({ ...PROBLEM_CATALOG.conflict, detail, instance });
}

export function validationErrorResponse(
  instance: string,
  detail: string,
): Response {
  return problemResponse({
    ...PROBLEM_CATALOG.validationError,
    detail,
    instance,
  });
}

// Rate-limited (429) error. The contract's RateLimited response declares a Retry-After
// header (integer seconds, minimum 1); the value is clamped to a whole second >= 1 so a
// non-positive or fractional back-off never produces a non-conformant header.
export function rateLimitedResponse(
  instance: string,
  detail: string,
  retryAfterSeconds: number,
): Response {
  const retryAfter = Math.max(1, Math.ceil(retryAfterSeconds));
  return problemResponse(
    { ...PROBLEM_CATALOG.rateLimited, detail, instance },
    { "Retry-After": String(retryAfter) },
  );
}
