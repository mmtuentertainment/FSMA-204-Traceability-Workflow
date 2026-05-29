import { mockRecallNotFoundResponse } from "../../../../../lib/api/problem";
import { getMockRecallDetail } from "../../../../../lib/api/mock-recall";

type RouteContext = {
  params: Promise<{ mockRecallId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { mockRecallId } = await params;
  const instance = new URL(request.url).pathname;
  const detail = getMockRecallDetail(mockRecallId);

  if (detail) {
    return Response.json(detail);
  }

  return mockRecallNotFoundResponse(mockRecallId, instance);
}
