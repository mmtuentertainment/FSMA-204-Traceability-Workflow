// Tenant-scoped data seam for MockRecall reads. Route handlers go through this seam
// rather than calling storage directly, so persistence ownership lives behind one
// interface. A cross-tenant miss returns null (leak-safe) and must not reveal whether
// another tenant's resource exists. The persistence adapter slots in here later
// without touching routes.

import type { components } from "./generated/openapi-types";
import { getMockRecallDetail, getMockRecallPacketCsv } from "./mock-recall";
import { PUBLIC_FIXTURE_TENANT_ID } from "../security/request-context";

type MockRecallDetail = components["schemas"]["MockRecallDetail"];

export interface MockRecallSource {
  getDetail(tenantId: string, mockRecallId: string): MockRecallDetail | null;
  getPacketCsv(tenantId: string, mockRecallId: string): string | null;
}

// Default adapter over the in-memory fixture. The tenant guard makes the ownership
// seam real while preserving identical behavior: the only resolver in play yields
// PUBLIC_FIXTURE_TENANT_ID, so live requests always pass the guard.
export const fixtureMockRecallSource: MockRecallSource = {
  getDetail(tenantId: string, mockRecallId: string): MockRecallDetail | null {
    if (tenantId !== PUBLIC_FIXTURE_TENANT_ID) {
      return null;
    }
    return getMockRecallDetail(mockRecallId);
  },
  getPacketCsv(tenantId: string, mockRecallId: string): string | null {
    if (tenantId !== PUBLIC_FIXTURE_TENANT_ID) {
      return null;
    }
    return getMockRecallPacketCsv(mockRecallId);
  },
};
