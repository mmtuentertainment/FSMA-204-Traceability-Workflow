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
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}

export interface AuditSink {
  append(event: AuditEvent): Promise<void>;
}

// Idempotency enforcement scope for mutating writes.
export interface IdempotencyScope {
  tenantId: string;
  actorId: string;
  action: Action;
  resourceRef: string;
  key: string;
  requestFingerprint: string;
}

export type IdempotencyCheck<T = unknown> =
  | { status: "fresh" }
  | { status: "replayed"; storedResponse: T }
  | { status: "conflict" };

export interface IdempotencyStore<T = unknown> {
  check(scope: IdempotencyScope): Promise<IdempotencyCheck<T>>;
  storeSuccess(scope: IdempotencyScope, response: T): Promise<void>;
}

// Default no-op sink: accepts and discards. Never invoked by read routes; exists so
// the seam is concrete without enforcing anything yet.
export const noopAuditSink: AuditSink = {
  async append(_event: AuditEvent): Promise<void> {
    // no-op until an approved audit-storage batch provides a real sink.
  },
};

export class FixtureIdempotencyStore<T> implements IdempotencyStore<T> {
  private readonly entries = new Map<
    string,
    { requestFingerprint: string; response: T }
  >();

  async check(scope: IdempotencyScope): Promise<IdempotencyCheck<T>> {
    const stored = this.entries.get(this.scopeKey(scope));
    if (!stored) {
      return { status: "fresh" };
    }

    return stored.requestFingerprint === scope.requestFingerprint
      ? { status: "replayed", storedResponse: stored.response }
      : { status: "conflict" };
  }

  async storeSuccess(scope: IdempotencyScope, response: T): Promise<void> {
    this.entries.set(this.scopeKey(scope), {
      requestFingerprint: scope.requestFingerprint,
      response,
    });
  }

  reset(): void {
    this.entries.clear();
  }

  private scopeKey(scope: IdempotencyScope): string {
    return [
      scope.tenantId,
      scope.actorId,
      scope.action,
      scope.resourceRef,
      scope.key,
    ].join("|");
  }
}

export class FixtureAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push({
      ...event,
      beforeState: event.beforeState ? { ...event.beforeState } : undefined,
      afterState: event.afterState ? { ...event.afterState } : undefined,
    });
  }

  readEvents(): readonly AuditEvent[] {
    return this.events.map((event) => ({
      ...event,
      beforeState: event.beforeState ? { ...event.beforeState } : undefined,
      afterState: event.afterState ? { ...event.afterState } : undefined,
    }));
  }

  reset(): void {
    this.events.length = 0;
  }
}
