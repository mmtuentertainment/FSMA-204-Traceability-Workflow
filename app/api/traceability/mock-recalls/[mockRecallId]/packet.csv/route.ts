import { mockRecallNotFoundResponse } from "../../../../../../lib/api/problem";

type RouteContext = {
  params: Promise<{ mockRecallId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { mockRecallId } = await params;
  const instance = new URL(request.url).pathname;

  return mockRecallNotFoundResponse(mockRecallId, instance);
}
