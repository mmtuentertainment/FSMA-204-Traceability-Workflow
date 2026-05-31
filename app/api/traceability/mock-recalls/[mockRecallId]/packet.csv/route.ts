import { fixtureMockRecallSource } from "../../../../../../lib/api/mock-recall-source";
import { handleReadAction } from "../../../../../../lib/api/route-boundary";

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
    action: "mock_recall.packet.read",
    resourceId: mockRecallId,
    load: (ctx) =>
      fixtureMockRecallSource.getPacketCsv(ctx.tenant.tenantId, mockRecallId),
    render: (packetCsv) =>
      new Response(packetCsv, {
        status: 200,
        headers: { "Content-Type": "text/csv; charset=utf-8" },
      }),
  });
}
