import { mockRecallNotFoundResponse } from "../../../../../../lib/api/problem";
import { getMockRecallPacketCsv } from "../../../../../../lib/api/mock-recall";

type RouteContext = {
  params: Promise<{ mockRecallId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { mockRecallId } = await params;
  const instance = new URL(request.url).pathname;
  const packetCsv = getMockRecallPacketCsv(mockRecallId);

  if (packetCsv) {
    return new Response(packetCsv, {
      status: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  return mockRecallNotFoundResponse(mockRecallId, instance);
}
