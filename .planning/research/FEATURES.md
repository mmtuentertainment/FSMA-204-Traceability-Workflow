---
created: 2026-05-28
sources: repo, FDA
---

# Feature Research

## Core Workflow Features

- Traceability lot normalization and review: capture TLC, normalized TLC, item description, source document reference, status, review status, and human-review flag.
- Traceability event linkage: capture receiving, transformation, and shipping events with linked lots, locations, counterparties, timestamps, and source document references.
- Exception handling: surface missing KDEs, ambiguous lot codes, document mismatches, supplier document gaps, shipping linkage gaps, and human-review-required cases.
- Supplier KDE requests: track supplier reference, requested KDEs, due dates, source document references, and request status.
- Mock recall readiness: start and inspect a mock recall run, summarize readiness, and point to a future FDA-style sortable CSV packet.

## Human Review Features

- Explicit `human_review_required` fields should remain first-class.
- Review reasons should cover ambiguous exemption, imported-food review, kill-step review, partial-exemption review, lot-code ambiguity, supplier KDE gaps, transformation linkage gaps, and shipping linkage gaps.
- Review notes should be captured without presenting the app as legal advice.

## Export Features

- FDA-style sortable CSV packet export should be an output workflow, not a certification claim.
- The packet can follow FDA template concepts such as CTE-specific sortable data while preserving the repo's conservative wording.
- CSV availability should be explicit, as modeled by `MockRecallDetail.packet.csvAvailable`.

## Table Stakes Before Production Use

- Authentication.
- Server-derived tenant isolation.
- RBAC checks.
- Idempotency for mutating writes.
- Append-only auditability.
- Contract and type checks in CI.

## Explicit Non-Features

- Compliance certification.
- FDA endorsement.
- Legal advice or exemption determinations.
- ERP replacement.
- Supplier portal.
- OCR/document ingestion.
- Blockchain traceability.
- Mobile scanning.
- Revenue or analytics dashboard.
