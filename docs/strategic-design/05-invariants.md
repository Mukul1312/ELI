# Invariants

> **How to fill:** List system invariants—things that must never break. These are your "constitution." When adding features or refactoring, check that no invariant is violated.

---

## Event ledger invariants

| Invariant | Description |
|-----------|-------------|
| **Immutability** | Events are append-only. No updates or deletes. |
| **Idempotency** | Retries must not create duplicate events. Every write endpoint supports idempotency key or deterministic event id. |
| **Schema strictness** | Every event payload validates against strict schema per event type. Unknown keys rejected. |

---

## Projection invariants

| Invariant | Description |
|-----------|-------------|
| **Monotonic topic state** | `last_effort_at`, `last_retrieval_at`, `last_scheduled_due_at` must never move backward (out-of-order or late events handled via GREATEST semantics). |
| **Replaceability** | Aggregates, policy, radar can be recomputed from events. No source of truth outside event log for derived state. |

---

## Protocol invariants

| Invariant | Description |
|-----------|-------------|
| **Determinism** | Same inputs + same projections → same protocol output. No randomness in gate decisions. |
| **Integrity-first** | At SessionEnd, no retrieval + no schedule → AVOIDANT → Rescue. (Precedence rule 1.) |
| **Risk overrides ambition** | OpenLoops high or SilenceDays elevated → no Boost even if state taps look strong. |

---

## Privacy invariants

| Invariant | Description |
|-----------|-------------|
| **Privacy boundary** | Institute APIs never expose raw events, journaling, or private content. Only aggregated signals + alert types. |
| **Server-derived identity** | Server derives `student_id` from auth session. Never trust client-provided `studentId` for authorization. |
