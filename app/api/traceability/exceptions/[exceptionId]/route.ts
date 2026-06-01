import {
  exceptionNotFoundResponse,
  conflictResponse,
  forbiddenResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "../../../../../lib/api/problem.ts";
import {
  fixtureExceptionReviewAuditSink,
  fixtureExceptionReviewIdempotencyStore,
  fixtureExceptionReviewRepository,
  readExceptionPatch,
  requestFingerprint,
} from "../../../../../lib/api/exception-review.ts";
import {
  fixtureExceptionReviewPolicy,
  type Action,
} from "../../../../../lib/security/authorization.ts";
import { fixtureAuthContextResolver } from "../../../../../lib/security/request-context.ts";

type RouteContext = {
  params: Promise<{ exceptionId: string }>;
};

const ACTION: Action = "exception.review.update";

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { exceptionId } = await params;
  const ctx = await fixtureAuthContextResolver.resolve(request);
  const instance = ctx.route;

  const decision = fixtureExceptionReviewPolicy.authorize(ctx, ACTION);
  if (!decision.allowed) {
    return decision.reason === "unauthenticated"
      ? unauthorizedResponse(instance)
      : forbiddenResponse(instance);
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (
    !idempotencyKey ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 200
  ) {
    return validationErrorResponse(
      instance,
      "Idempotency-Key is required and must be between 8 and 200 characters.",
    );
  }

  const patchResult = await readExceptionPatch(request);
  if (!patchResult.ok) {
    return validationErrorResponse(instance, patchResult.detail);
  }

  const resourceRef = `traceability_exception:${exceptionId}`;
  const idempotencyScope = {
    tenantId: ctx.tenant.tenantId,
    actorId: ctx.principal.actorId,
    action: ACTION,
    resourceRef,
    key: idempotencyKey,
    requestFingerprint: requestFingerprint(patchResult.patch),
  };
  const idempotency =
    await fixtureExceptionReviewIdempotencyStore.check(idempotencyScope);

  if (idempotency.status === "replayed") {
    return Response.json(idempotency.storedResponse);
  }

  if (idempotency.status === "conflict") {
    return conflictResponse(
      instance,
      "Idempotency-Key was already used with a different request fingerprint.",
    );
  }

  const update = fixtureExceptionReviewRepository.applyReview(
    ctx.tenant.tenantId,
    exceptionId,
    patchResult.patch,
  );

  if (update.status === "not_found") {
    return exceptionNotFoundResponse(exceptionId, instance);
  }

  await fixtureExceptionReviewAuditSink.append({
    requestId: ctx.requestId,
    tenantId: ctx.tenant.tenantId,
    actorId: ctx.principal.actorId,
    action: ACTION,
    resourceRef,
    occurredAt: new Date().toISOString(),
    source: "fixture-exception-review-patch",
    reason: patchResult.patch.review_reason ?? patchResult.patch.review_notes,
    idempotencyKey,
    beforeState: {
      status: update.before.status,
      review_reason: update.before.review_reason,
      review_notes: update.before.review_notes,
      human_review_required: update.before.human_review_required,
    },
    afterState: {
      status: update.record.status,
      review_reason: update.record.review_reason,
      review_notes: update.record.review_notes,
      human_review_required: update.record.human_review_required,
    },
  });
  await fixtureExceptionReviewIdempotencyStore.storeSuccess(
    idempotencyScope,
    update.record,
  );

  return Response.json(update.record);
}
