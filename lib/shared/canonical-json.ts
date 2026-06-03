// Canonical (stable) JSON serialization shared by the exception-review request
// hashers. Object keys are emitted in sorted order so that two semantically
// equal payloads always produce the same string — the basis for idempotency
// request hashing (lib/db) and request fingerprinting (lib/api).
//
// Extracted from lib/api/exception-review.ts and lib/db/exception-review-provider.ts
// to remove the byte-identical copies fallow flagged (code-duplication). Keep this
// the single source of truth: both hashers must agree on canonical form.

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
