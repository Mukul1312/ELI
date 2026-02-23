# TopicLoop — Tactical DDD Spec

> Docs-only specification for implementing TopicLoop as the first stable aggregate. Source: [agg-topic-loop.md](../aggregates/agg-topic-loop.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [src/ei/schemas/events.ts](../../src/ei/schemas/events.ts).

---

## 1) Purpose and Boundary

- **Aggregate root:** TopicLoop
- **Identity:** `(studentId, topicId)` — one instance per student per topic
- **Responsibility:** Maintain effort-to-verification lifecycle state; detect overdue scheduled retrievals. Single consistency boundary for topic-level state derived from the event stream.
- **Non-goals (outside TopicLoop):**
  - Cross-topic aggregates (openLoops count) — lives in StudentAggregates
  - Policy semantics — lives in StudentPolicy
  - Event production — events are appended by EI Runtime to Ledger; TopicLoop consumes

---

## 2) Ubiquitous Language (Tactical Terms)


| Term                  | Definition                                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| TopicLoopId           | Composite identity: `{ studentId, topicId }`                                           |
| StudentId             | Student identifier (string; server-derived)                                            |
| TopicId               | Topic identifier (string; maps to `topic` in events)                                   |
| OccurredAt            | ISO datetime when something happened                                                   |
| DueAt                 | ISO datetime when retrieval is scheduled                                               |
| last_effort_at        | Latest timestamp of effort completion (SessionEnd)                                     |
| last_retrieval_at     | Latest timestamp of verification completion (RetrievalVerified, VerificationCompleted) |
| last_scheduled_due_at | Latest scheduled due date (RetrievalScheduled)                                         |
| ScheduleMissed        | Derived event when a due date passes without verification                              |


---

## 3) State Model


| Field                 | Type                 | Semantics                                                      |
| --------------------- | -------------------- | -------------------------------------------------------------- |
| studentId             | string               | Part of identity                                               |
| topicId               | string               | Part of identity                                               |
| last_effort_at        | ISO datetime or null | Monotonic; updated by SessionEnd                               |
| last_retrieval_at     | ISO datetime or null | Monotonic; updated by RetrievalVerified, VerificationCompleted |
| last_scheduled_due_at | ISO datetime or null | Monotonic; updated by RetrievalScheduled                       |


- **Lifecycle:** No explicit lifecycle states; state advances monotonically.
- **Initial:** Null timestamps until first applicable event.

---

## 4) Invariants (Must Hold Atomically)

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md):

1. **Monotonic topic state:** `last_effort_at`, `last_retrieval_at`, `last_scheduled_due_at` must never move backward. Out-of-order or late events handled via GREATEST semantics.
2. **Replaceability:** State can be recomputed from events. No source of truth outside the event log for derived state.
3. **Idempotent event application:** Applying the same event twice (by idempotency key or deterministic event id) must yield the same final state.

---

## 5) Commands and Decisions

TopicLoop is a projection; it does not handle external commands. The "command" is the decision to apply an event. Each row is deterministic given the event payload and current state.


| Event                 | Required fields (from schema)         | Decision logic                               | State change                                              |
| --------------------- | ------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| SessionEnd            | studentId, topic, endedAt             | Apply if (studentId, topic) matches          | last_effort_at ← max(last_effort_at, endedAt)             |
| RetrievalVerified     | studentId, topic, verifiedAt          | Apply if matches                             | last_retrieval_at ← max(last_retrieval_at, verifiedAt)    |
| RetrievalScheduled    | studentId, topic, dueAt, scheduledAt  | Apply if matches                             | last_scheduled_due_at ← max(last_scheduled_due_at, dueAt) |
| RetrievalSkipped      | studentId, topic, reason, skippedAt   | Apply if matches                             | No timestamp update (record for audit if needed)          |
| VerificationCompleted | studentId, topic, completedAt, result | Apply if matches                             | last_retrieval_at ← max(last_retrieval_at, completedAt)   |
| ScheduleMissed        | studentId, topic, missedAt            | Derived when due passes without verification | No direct timestamp; may influence openLoops elsewhere    |


---

## 6) Domain Events Consumed / Produced

### Consumed (from Ledger)

Exact event names and key fields from [events.ts](../../src/ei/schemas/events.ts):


| Event type            | Schema                                                  | Key fields for TopicLoop              |
| --------------------- | ------------------------------------------------------- | ------------------------------------- |
| SessionEnd            | SessionEndSchema                                        | studentId, topic, endedAt             |
| RetrievalVerified     | RetrievalVerifiedSchema                                 | studentId, topic, verifiedAt          |
| RetrievalScheduled    | RetrievalScheduledSchema                                | studentId, topic, dueAt, scheduledAt  |
| RetrievalSkipped      | RetrievalSkippedSchema                                  | studentId, topic, reason, skippedAt   |
| VerificationCompleted | VerificationCompletedSchema                             | studentId, topic, completedAt, result |
| ScheduleMissed        | (in EventTypeEnum; payload: studentId, topic, missedAt) | studentId, topic, missedAt            |


### Produced

TopicLoop does not emit domain events. It updates `ei_topic_state` only.

---

## 7) Ports (Interfaces — Docs Level)


| Port                          | Role   | Responsibility                                                               |
| ----------------------------- | ------ | ---------------------------------------------------------------------------- |
| **TopicLoopRepository**       | Driven | Load by (studentId, topicId); save/upsert TopicLoop state                    |
| **EventStreamReader**         | Driven | Read events from Ledger for a student (and optionally topic filter)          |
| **Clock** (optional)          | Driven | Provide "now" for ScheduleMissed derivation; can be system clock abstraction |
| **TopicLoopProjectionWriter** | Driven | Persist TopicLoop state to ei_topic_state. Implemented by ITopicLoopRepository.save(). |


- Domain layer defines repository interface (load/save). Application layer orchestrates: read events → apply to TopicLoop → persist.

---

## 8) Application Use-Case Contract

**Use case:** `ApplyEventToTopicLoop`


| Aspect            | Specification                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Input**         | Event (one of SessionEnd, RetrievalVerified, RetrievalScheduled, RetrievalSkipped, VerificationCompleted, ScheduleMissed) with validated payload |
| **Output**        | Updated TopicLoop state persisted; or no-op if event does not affect this TopicLoop                                                              |
| **Errors**        | Invalid event payload (schema violation); missing studentId/topic (reject)                                                                       |
| **Idempotency**   | Same event id / idempotency key applied twice → same result; no duplicate side-effects                                                           |
| **Preconditions** | Event schema validated by Ledger before projection consumes                                                                                      |


---

## 9) Consistency and Concurrency Rules


| Rule              | Description                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| Single writer     | One projection job (or sync projection) writes per (studentId, topicId). No concurrent writers per instance.        |
| Conflict handling | Use GREATEST for timestamps; ignore events that would regress state.                                                |
| Ordering          | Events may arrive out of order; application logic must be order-independent for timestamps (idempotent, monotonic). |
| Recompute         | Full projection rebuild from Ledger event stream is the canonical repair.                                           |


---

## 10) Test Strategy (Spec Tests)


| Scenario           | Input                                                           | Expected outcome                                                  |
| ------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| In-order events    | SessionEnd(t1) → RetrievalScheduled(t2) → RetrievalVerified(t3) | last_effort_at=t1, last_scheduled_due_at=t2, last_retrieval_at=t3 |
| Out-of-order       | RetrievalVerified(t3) then SessionEnd(t1)                       | Same final state as in-order (GREATEST)                           |
| Duplicate event    | Same RetrievalVerified applied twice                            | Idempotent; final state unchanged after first apply               |
| Stale event        | SessionEnd(t1) then late SessionEnd(t0) where t0 < t1           | last_effort_at stays t1                                           |
| First event        | SessionEnd on new TopicLoop                                     | last_effort_at set; others null                                   |
| RetrievalSkipped   | RetrievalSkipped applied                                        | No timestamp update                                               |
| Wrong topic        | SessionEnd for topic A, TopicLoop for (student, topic B)        | No change to TopicLoop                                            |
| Boundary timestamp | endedAt = last_effort_at (equal)                                | last_effort_at unchanged (max is same)                            |


---

## 11) Open Questions and Deferred Decisions

- Snapshot strategy for long-lived instances
- Archiving policy for old topic state
- ScheduleMissed derivation: where does it run? (Projection cron vs. on-demand)
- Performance thresholds for replay/recompute

---

## References

- [agg-topic-loop.md](../aggregates/agg-topic-loop.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md)
- [src/ei/schemas/events.ts](../../src/ei/schemas/events.ts)

