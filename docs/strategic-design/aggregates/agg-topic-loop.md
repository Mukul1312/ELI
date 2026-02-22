# Aggregate Design Canvas — TopicLoop

**Tactical spec:** [topic-loop-tactical-spec.md](../tactical/topic-loop-tactical-spec.md)

**Owned by bounded context:** EI Projections (DerivedSignals)
**Related subdomain(s):** DerivedSignals
**Sources:** [02-subdomains.md](../02-subdomains.md), [03-context-map.md](../03-context-map.md), [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
**Code pointers (current):** `ei_topic_state`, `appendEvent` side-effects

---

## 1) Name

- **Aggregate:** TopicLoop
- **Aggregate Type:** Projection — event-driven state; reacts to Ledger events
- **Instance identity:** studentId + topicId
- **Lifetime:** Long-lived (per student per topic; no fixed end)

---

## 2) Description

- **Responsibility:** Per (studentId, topicId): maintain effort-to-verification lifecycle state; detect overdue scheduled retrievals. Single consistency boundary for topic_state derived from the event stream.
- **Why these boundaries:** Topic is the natural unit for verification; one student can have many topics. Scoping by (studentId, topicId) keeps conflict low (one student typically acts on one topic per request).
- **Trade-offs:** We do NOT include cross-topic aggregates (openLoops count) here; that lives in ei_student_aggregates. TopicLoop is the projection-side consistency unit for topic-level state.

---

## 2b) Dependencies

- **EI Event Ledger:** Source of events (SessionEnd, RetrievalVerified, RetrievalScheduled, RetrievalSkipped, VerificationCompleted, ScheduleMissed). Projections conform to Ledger event schema.
- **TopicLoop instances:** None (per-topic isolation).

---

## 3) State Transitions

- **States:** Effectively continuous state (last_effort_at, last_retrieval_at, last_scheduled_due_at). No explicit lifecycle states; state advances monotonically.
- **Transitions:** Event application updates timestamps via GREATEST semantics. ScheduleMissed may be derived when due date passes without RetrievalVerified/VerificationCompleted.

---

## 4) Enforced Invariants

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md):

- **Monotonic topic state:** `last_effort_at`, `last_retrieval_at`, `last_scheduled_due_at` must never move backward. Out-of-order or late events handled via GREATEST semantics.
- **Replaceability:** State can be recomputed from events. No source of truth outside the event log for derived state.

---

## 5) Corrective Policies

- **Out-of-order events:** Use GREATEST for timestamps; ignore events that would regress state.
- **Recompute:** Full projection rebuild from Ledger event stream is the canonical repair.

---

## 6) Handled Commands

TopicLoop is a projection; it does not handle commands directly. It reacts to events from the Ledger. Conceptually, the "commands" are the decision to apply an event:

| Event (applied) | Preconditions | State changes |
|-----------------|---------------|---------------|
| SessionEnd | studentId, topic, endedAt | last_effort_at ← max(last_effort_at, endedAt) |
| RetrievalVerified | studentId, topic, verifiedAt | last_retrieval_at ← max(last_retrieval_at, verifiedAt) |
| RetrievalScheduled | studentId, topic, dueAt, scheduledAt | last_scheduled_due_at ← max(last_scheduled_due_at, dueAt) |
| RetrievalSkipped | studentId, topic, reason, skippedAt | — (no timestamp update) |
| VerificationCompleted | studentId, topic, completedAt, result | last_retrieval_at ← max(last_retrieval_at, completedAt) |
| ScheduleMissed | studentId, topic, missedAt | Derived when due passes without verification |

---

## 7) Created Events

TopicLoop is a projection/state aggregate; it does not emit new domain events. Events are appended by EI Runtime to the Ledger; Projections consume them.

| Event | Notes |
|-------|-------|
| (None) | Projection updates ei_topic_state only |

---

## 7b) Supported Queries

| Query | Key params | Returns | Notes |
|-------|------------|---------|-------|
| GetStudentSignals (topic state slice) | studentId | last_effort_at, last_retrieval_at, last_scheduled_due_at per topic | EI Runtime, LHA, SA consume via Projections |

---

## 8) Throughput (concurrency risk)

| Metric | Average | Maximum | Notes |
|--------|---------|---------|-------|
| Command handling rate | TBD | TBD | Per-topic, typically low |
| Total number of clients | 1 per instance | 1 | One student acts on one topic per request |
| Concurrency conflict chance | Low | Low | Single writer (projection job) per instance |

---

## 9) Size

| Metric | Average | Maximum | Notes |
|--------|---------|---------|-------|
| Event growth rate | TBD | TBD | Depends on SessionEnd, Retrieval*, ScheduleMissed frequency |
| Lifetime of a single instance | Long | Indefinite | Per student per topic |
| Number of events persisted | TBD | TBD | In Ledger, not in TopicLoop; TopicLoop holds current state |

---

## 9b) Storage & Projection

| Aspect | Value | Notes |
|--------|-------|-------|
| Table(s) / store | `ei_topic_state` | Per [05-cross-cutting-concerns.md#data-ownership](../05-cross-cutting-concerns.md#data-ownership) |
| Write path | Projection job (batch/recompute) or sync read from Ledger | Single writer per instance |
| Read path | EI Runtime, LHA, SA via GetStudentSignals | Sync query |
| Replay / recompute | Yes | Full projection rebuild from Ledger event stream is canonical repair |

---

## Open questions

- Snapshot strategy for long-lived instances?
- Archiving policy for old topic state?
