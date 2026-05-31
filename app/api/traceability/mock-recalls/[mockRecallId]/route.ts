import { fixtureMockRecallSource } from "../../../../../lib/api/mock-recall-source";
import { handleReadAction } from "../../../../../lib/api/route-boundary";

type RouteContext = {
  params: Promise<{ mockRecallId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { mockRecallId } = await params;

  return handleReadAction({
    request,
    action: "mock_recall.read",
    resourceId: mockRecallId,
    load: (ctx) =>
      fixtureMockRecallSource.getDetail(ctx.tenant.tenantId, mockRecallId),
    render: (detail) => Response.json(detail),
  });
}
