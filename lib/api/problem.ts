import type { components } from "./generated/openapi-types";

type Problem = components["schemas"]["Problem"];

export function problemResponse(problem: Problem): Response {
  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

export function mockRecallNotFoundResponse(
  mockRecallId: string,
  instance: string,
): Response {
  return problemResponse({
    type: "about:blank",
    title: "Resource not found",
    status: 404,
    detail: `No mock recall was found for mockRecallId "${mockRecallId}".`,
    instance,
  });
}
