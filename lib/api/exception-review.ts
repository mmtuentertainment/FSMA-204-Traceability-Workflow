import type { components } from "./generated/openapi-types";
import { EXCEPTION_REVIEW_FIXTURE_TENANT_ID } from "../security/request-context.ts";
import {
  FixtureAuditSink,
  FixtureIdempotencyStore,
} from "../security/idempotency-audit.ts";
import { isPlainObject, stableStringify } from "../shared/canonical-json.ts";

export type ExceptionRecord = components["schemas"]["ExceptionRecord"];
export type ExceptionPatch = components["schemas"]["ExceptionPatch"];

type ReviewStatus = NonNullable<ExceptionPatch["status"]>;
type ReviewReason = NonNullable<ExceptionPatch["review_reason"]>;

const STATUSES: ReadonlySet<string> = new Set<ReviewStatus>([
  "open",
  "in_review",
  "resolved",
  "deferred",
]);
const REVIEW_REASONS: ReadonlySet<string> = new Set<ReviewReason>([
  "ambiguous_exemption",
  "kill_step_review",
  "imported_food_review",
  "partial_exemption_review",
  "ambiguous_lot_code",
  "other",
]);
const PATCH_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "review_reason",
  "review_notes",
  "human_review_required",
]);

export const FIXTURE_EXCEPTION_ID = "fixture-exception-ready-for-review";

const initialExceptionRecord: ExceptionRecord = {
  id: FIXTURE_EXCEPTION_ID,
  type: "missing_kde",
  status: "open",
  lot_id: "fixture-lot-ready-for-review",
  message: "Supplier KDE evidence requires human review.",
  review_reason: "ambiguous_lot_code",
  human_review_required: true,
  review_notes: "Fixture exception awaiting reviewer decision.",
  source_document_ref: "fixture-source-document",
};

function cloneRecord(record: ExceptionRecord): ExceptionRecord {
  return { ...record };
}

function recordKey(tenantId: string, exceptionId: string): string {
  return `${tenantId}|${exceptionId}`;
}

export class FixtureExceptionReviewRepository {
  private readonly records = new Map<string, ExceptionRecord>();

  constructor() {
    this.reset();
  }

  applyReview(
    tenantId: string,
    exceptionId: string,
    patch: ExceptionPatch,
  ):
    | { status: "applied"; before: ExceptionRecord; record: ExceptionRecord }
    | { status: "not_found" } {
    const key = recordKey(tenantId, exceptionId);
    const current = this.records.get(key);
    if (!current) {
      return { status: "not_found" };
    }

    const before = cloneRecord(current);
    const next = { ...current, ...patch };
    this.records.set(key, next);

    return { status: "applied", before, record: cloneRecord(next) };
  }

  reset(): void {
    this.records.clear();
    this.records.set(
      recordKey(EXCEPTION_REVIEW_FIXTURE_TENANT_ID, FIXTURE_EXCEPTION_ID),
      cloneRecord(initialExceptionRecord),
    );
  }
}

export const fixtureExceptionReviewRepository =
  new FixtureExceptionReviewRepository();
export const fixtureExceptionReviewIdempotencyStore =
  new FixtureIdempotencyStore<ExceptionRecord>();
export const fixtureExceptionReviewAuditSink = new FixtureAuditSink();

export function resetExceptionReviewFixtures(): void {
  fixtureExceptionReviewRepository.reset();
  fixtureExceptionReviewIdempotencyStore.reset();
  fixtureExceptionReviewAuditSink.reset();
}

export async function readExceptionPatch(
  request: Request,
): Promise<{ ok: true; patch: ExceptionPatch } | { ok: false; detail: string }> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    return { ok: false, detail: "Request body must be valid JSON." };
  }

  if (!isPlainObject(value)) {
    return { ok: false, detail: "Request body must be a JSON object." };
  }

  for (const key of Object.keys(value)) {
    if (!PATCH_FIELDS.has(key)) {
      return { ok: false, detail: `Unsupported exception patch field "${key}".` };
    }
  }

  const patch = value as Record<string, unknown>;

  if (patch.status !== undefined && !STATUSES.has(String(patch.status))) {
    return { ok: false, detail: "status is not a valid exception status." };
  }

  if (
    patch.review_reason !== undefined &&
    !REVIEW_REASONS.has(String(patch.review_reason))
  ) {
    return { ok: false, detail: "review_reason is not a valid review reason." };
  }

  if (
    patch.review_notes !== undefined &&
    typeof patch.review_notes !== "string"
  ) {
    return { ok: false, detail: "review_notes must be a string." };
  }

  if (
    patch.human_review_required !== undefined &&
    typeof patch.human_review_required !== "boolean"
  ) {
    return { ok: false, detail: "human_review_required must be a boolean." };
  }

  return { ok: true, patch: value as ExceptionPatch };
}

export function requestFingerprint(value: unknown): string {
  return stableStringify(value);
}
