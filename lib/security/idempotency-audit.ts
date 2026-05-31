// Idempotency and append-only audit shapes for future mutating writes. SHAPE ONLY:
// the current traceability routes are read-only GETs, so nothing in this batch
// invokes these interfaces. They exist so the first approved mutating-write batch has
// a correctly scoped seam (tenant + actor + action + key) to implement against.

import type { Action } from "./authorization";

// Append-only audit evidence for accepted state transitions. A real sink is provided
// by a later approved audit-storage batch. Audit evidence supplements, but does not
// replace, source-document references.
export interface AuditEvent {
  requestId: string;
  tenantId: string;
  actorId: string;
  action: Action;
  resourceRef: string;
  occurredAt: string;
  source: string;
  reason?: string;
  idempotencyKey?: string;
}

export interface AuditSink {
  append(event: AuditEvent): Promise<void>;
}

// Idempotency enforcement scope for mutating writes.
export interface IdempotencyScope {
  tenantId: string;
  actorId: string;
  action: Action;
  key: string;
}

export type IdempotencyCheck =
  | { status: "fresh" }
  | { status: "replayed"; storedResponseRef: string };

export interface IdempotencyStore {
  check(scope: IdempotencyScope): Promise<IdempotencyCheck>;
}

// Default no-op sink: accepts and discards. Never invoked by read routes; exists so
// the seam is concrete without enforcing anything yet.
export const noopAuditSink: AuditSink = {
  async append(_event: AuditEvent): Promise<void> {
    // no-op until an approved audit-storage batch provides a real sink.
  },
};
