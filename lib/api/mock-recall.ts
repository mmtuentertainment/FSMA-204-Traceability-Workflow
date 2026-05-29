import type { components } from "./generated/openapi-types";

export const MOCK_RECALL_CONTRACT_FIXTURE_ID =
  "contract-fixture-ready-for-review";

type MockRecallDetail = components["schemas"]["MockRecallDetail"];

const mockRecallContractFixture: MockRecallDetail = {
  mockRecallId: MOCK_RECALL_CONTRACT_FIXTURE_ID,
  status: "ready_for_human_review",
  scope: {
    productDescription: "Fresh-cut melon cup",
    traceabilityLotCode: "TLC-FC-2026-05-READY",
    dateRangeStart: "2026-05-01",
    dateRangeEnd: "2026-05-07",
  },
  readinessSummary: {
    affectedLotCount: 1,
    affectedShipmentCount: 2,
    openExceptionCount: 1,
    supplierRequestCount: 1,
    humanReviewRequired: true,
    humanReviewReasons: ["supplier_kde_gap", "lot_code_ambiguity"],
  },
  packet: {
    csvAvailable: true,
    csvHref:
      "/api/traceability/mock-recalls/contract-fixture-ready-for-review/packet.csv",
    format: "fda_style_sortable_csv",
  },
  createdAt: "2026-05-28T00:00:00Z",
  updatedAt: "2026-05-28T00:00:00Z",
};

const mockRecallPacketCsv = [
  "mock_recall_id,traceability_lot_code,product_description,human_review_required,readiness_status",
  "contract-fixture-ready-for-review,TLC-FC-2026-05-READY,Fresh-cut melon cup,true,ready_for_human_review",
  "",
].join("\r\n");

export function getMockRecallDetail(
  mockRecallId: string,
): MockRecallDetail | null {
  if (mockRecallId !== MOCK_RECALL_CONTRACT_FIXTURE_ID) {
    return null;
  }

  return mockRecallContractFixture;
}

export function getMockRecallPacketCsv(mockRecallId: string): string | null {
  if (mockRecallId !== MOCK_RECALL_CONTRACT_FIXTURE_ID) {
    return null;
  }

  return mockRecallPacketCsv;
}
