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
| TopicId               | Topic identifier. New events carry `topicId: UUID` (CurriculumCatalog reference). Legacy events carry `topic: string`; reconciled to UUID via CC alias lookup. See [05-cross-cutting-concerns.md § Topic ID evolution](../05-cross-cutting-concerns.md#topic-id-evolution-curriculumcatalog-integration). |
| OccurredAt            | ISO datetime when something happened                                                   |
| DueAt                 | ISO datetime when retrieval is scheduled                                               |
| last_effort_at        | Latest timestamp of effort completion (SessionEnd)                                     |
| last_retrieval_at     | Latest timestamp of verification completion (RetrievalVerified, VerificationCompleted) |
| last_scheduled_due_at | Latest scheduled due date (RetrievalScheduled)                                         |
| ScheduleMissed        | Derived event when a due date passes without verification                              |


---

## 3) State Model

TopicLoop composes two Value Objects with different temporal semantics (ADR-003 §Domain Model Design Decisions):

### TopicLoopState — Accumulated (monotonic, GREATEST semantics)

| Field                 | Type                 | Semantics                                                      |
| --------------------- | -------------------- | -------------------------------------------------------------- |
| studentId             | string               | Part of identity                                               |
| topicId               | string               | Part of identity                                               |
| last_effort_at        | ISO datetime or null | Monotonic; updated by SessionEnd                               |
| last_retrieval_at     | ISO datetime or null | Monotonic; updated by RetrievalVerified, VerificationCompleted |
| last_scheduled_due_at | ISO datetime or null | Monotonic; updated by RetrievalScheduled                       |
| consecutiveDeferrals  | integer              | Counter; incremented by RetrievalScheduled/Skipped, reset by RetrievalVerified/VerificationCompleted |

- **Lifecycle:** No explicit lifecycle states; state advances monotonically.
- **Initial:** Null timestamps, 0 counter until first applicable event.
- **Update rule:** Timestamps use GREATEST — a smaller timestamp from a late-arriving event is a no-op.

### SessionLifecycleState — Per-session (transient, resets each new session)

| Field                   | Type                 | Semantics                                                          |
| ----------------------- | -------------------- | ------------------------------------------------------------------ |
| session_phase           | string or null       | Current session phase: `'activating'` → `'active'` → `'verifying'` → `'closed'`. Null when no session exists. |
| current_session_id      | string or null       | The sessionId of the current/most-recent session for this topic    |
| verification_floor      | integer or null      | P1 verification floor (`minQuestions`); null for declared sessions  |
| watch_only_flag         | boolean              | P2 watch-only constraint; defaults `false`, set by ActivationPlanIssued |
| intent_source           | string or null       | `'declared'` or `'negotiated'` — how the current session was started |
| last_session_started_at | ISO datetime or null | When the student started active work (FirstActionStarted); GREATEST within session |

- **Lifecycle:** Resets on every new `SessionIntentIssued` for this (studentId, topicId).
- **Initial:** All null / false until first `SessionIntentIssued`.
- **Update rule:** `session_phase` advances forward only within a session cycle. On new `SessionIntentIssued`, full reset: phase → `'activating'`, `current_session_id` → new value, `watch_only_flag` → `false`, `verification_floor` and `intent_source` replaced, `last_session_started_at` → `null`.

### Why two VOs (not one)

The accumulated state uses **GREATEST semantics** (timestamps never regress). The session lifecycle state uses **latest-wins semantics** (resets each session). Mixing both in one VO would combine two different update invariants. Per the DDD VO rule: *"if two things have different invariants, they are different types."* See ADR-003 for the full options analysis.

### session_phase state machine

```
NULL ──[SessionIntentIssued]──→ 'activating' ──[ActivationPlanIssued]──→ 'active'
                                                                           │
                                                                     [SessionEnd]
                                                                           │
                                                                           ▼
                                                                      'verifying'
                                                                           │
                                                              [VerificationDecisionIssued]
                                                                           │
                                                                           ▼
                                                                       'closed'

On next SessionIntentIssued for same topic: full reset → 'activating' (new session cycle)
```

---

## 4) Invariants (Must Hold Atomically)

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md):

1. **Monotonic topic state (TopicLoopState):** `last_effort_at`, `last_retrieval_at`, `last_scheduled_due_at` must never move backward. Out-of-order or late events handled via GREATEST semantics.
2. **Forward-only session phase (SessionLifecycleState, ADR-003):** Within a session cycle, `session_phase` only advances: `activating → active → verifying → closed`. A `'verifying'` event never reverts to `'active'` within the same session.
3. **Session reset atomicity (SessionLifecycleState, ADR-003):** On `SessionIntentIssued`, ALL session lifecycle fields reset together — session_phase, current_session_id, intent_source, verification_floor, watch_only_flag, last_session_started_at. Partial reset is not valid.
4. **Replaceability:** State can be recomputed from events. No source of truth outside the event log for derived state.
5. **Idempotent event application:** Applying the same event twice (by idempotency key or deterministic event id) must yield the same final state.
6. **CC reconciliation (dual-read):** When projecting a legacy event with `topic: string`, the projector resolves it to a `catalogTopicId` via `ICatalogRepository.findTopicsByAlias()`. If no alias match, the raw string is used as-is (backward compatible). The `ei_topic_state` primary key remains `(student_id, topic_id)` where `topic_id` is the CC UUID for new events or the raw string for legacy events. New events carry `topicId: UUID` directly — no lookup needed.

---

## 5) Commands and Decisions

TopicLoop is a projection; it does not handle external commands. The "command" is the decision to apply an event. Each row is deterministic given the event payload and current state.

### Accumulated state events (TopicLoopState — GREATEST semantics)

| Event                 | Required fields (from schema)         | Decision logic                               | State change                                              |
| --------------------- | ------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| SessionEnd            | studentId, topic, endedAt             | Apply if (studentId, topic) matches          | last_effort_at ← max(last_effort_at, endedAt)             |
| RetrievalVerified     | studentId, topic, verifiedAt          | Apply if matches                             | last_retrieval_at ← max(last_retrieval_at, verifiedAt); consecutiveDeferrals ← 0 |
| RetrievalScheduled    | studentId, topic, dueAt, scheduledAt  | Apply if matches                             | last_scheduled_due_at ← max(last_scheduled_due_at, dueAt); consecutiveDeferrals ← consecutiveDeferrals + 1 |
| RetrievalSkipped      | studentId, topic, reason, skippedAt   | Apply if matches                             | consecutiveDeferrals ← consecutiveDeferrals + 1 (no timestamp update) |
| VerificationCompleted | studentId, topic, completedAt, result | Apply if matches                             | last_retrieval_at ← max(last_retrieval_at, completedAt); consecutiveDeferrals ← 0 |
| ScheduleMissed        | studentId, topic, missedAt            | Derived when due passes without verification | No direct timestamp; may influence openLoops elsewhere    |

### Session lifecycle events (SessionLifecycleState — latest-wins, per ADR-003)

| Event                      | Required fields                                   | Decision logic                              | State change                                              |
| -------------------------- | ------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| SessionIntentIssued        | payload.sessionId, payload.intentSource, payload.verificationFloor | Apply if (studentId, topicId) matches | **Full reset:** session_phase ← `'activating'`, current_session_id ← sessionId, intent_source ← intentSource, verification_floor ← minQuestions (null if declared), watch_only_flag ← `false`, last_session_started_at ← `null` |
| ActivationPlanIssued       | payload.constraints.enforceWatchOnlyVerification  | Apply if matches                            | session_phase ← `'active'`, watch_only_flag ← enforceWatchOnlyVerification |
| FirstActionStarted         | occurred_at or payload.startedAt                  | Apply if matches                            | last_session_started_at ← max(last_session_started_at, startedAt) |
| SessionEnd                 | _(occurrence)_                                    | Apply if matches                            | session_phase ← `'verifying'` *(also updates TopicLoopState.last_effort_at — dual VO update)* |
| VerificationDecisionIssued | _(occurrence)_                                    | Apply if matches                            | session_phase ← `'closed'` |

Note: `SessionEnd` is the single event that updates BOTH VOs — `TopicLoopState.last_effort_at` (accumulated) and `SessionLifecycleState.session_phase` (per-session). This dual update is why both concerns belong in the same aggregate.


---

## 6) Domain Events Consumed / Produced

### Consumed (from Ledger)

Exact event names and key fields from [events.ts](../../src/ei/schemas/events.ts):

#### Accumulated state events (existing — update TopicLoopState)

| Event type            | Schema                                                  | Key fields for TopicLoop              |
| --------------------- | ------------------------------------------------------- | ------------------------------------- |
| SessionEnd            | SessionEndSchema                                        | studentId, topic, endedAt             |
| RetrievalVerified     | RetrievalVerifiedSchema                                 | studentId, topic, verifiedAt          |
| RetrievalScheduled    | RetrievalScheduledSchema                                | studentId, topic, dueAt, scheduledAt  |
| RetrievalSkipped      | RetrievalSkippedSchema                                  | studentId, topic, reason, skippedAt   |
| VerificationCompleted | VerificationCompletedSchema                             | studentId, topic, completedAt, result |
| ScheduleMissed        | (in EventTypeEnum; payload: studentId, topic, missedAt) | studentId, topic, missedAt            |

#### Session lifecycle events (ADR-003 — update SessionLifecycleState)

| Event type                 | Schema (payload fields)                                       | Key fields for TopicLoop                                      |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| SessionIntentIssued        | SessionIntentIssued payload (from StudySession aggregate)     | payload.sessionId, payload.intentSource, payload.verificationFloor, payload.topicId |
| ActivationPlanIssued       | ActivationPlanIssued payload (from StudySession aggregate)    | payload.constraints.enforceWatchOnlyVerification              |
| FirstActionStarted         | FirstActionStartedSchema                                      | startedAt                                                     |
| VerificationDecisionIssued | VerificationDecisionIssued payload (from StudySession aggregate) | _(occurrence only — triggers phase transition)_            |

Note: These are StudySession aggregate events consumed by TopicLoop as a projection. Projections consuming cross-aggregate events is canonical — TopicLoop already consumes `SessionEnd` from the StudySession lifecycle. The event type list (`TOPIC_LOOP_EVENT_TYPES`) is an array of string literals matching `EventTypeEnum`; no import from the StudySession domain.

Session lifecycle events are handled directly in `TopicLoop.applyEvent()` with explicit per-event delegation to `SessionLifecycleState` methods — NOT via the `EVENT_TIMESTAMP_FIELD` map, because session events have richer update semantics than single-timestamp extraction. See ADR-003 §Domain Model Design Decisions.

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

### Accumulated state tests (TopicLoopState)

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

### Session lifecycle tests (SessionLifecycleState — ADR-003)

| Scenario | Input | Expected outcome |
| -------- | ----- | ---------------- |
| Full session cycle | SessionIntentIssued → ActivationPlanIssued → FirstActionStarted → SessionEnd → VerificationDecisionIssued | session_phase transitions: null → activating → active → active (no change) → verifying → closed |
| New session resets all fields | SessionIntentIssued(session-1) → ActivationPlanIssued(watchOnly=true) → SessionIntentIssued(session-2) | current_session_id = session-2, watch_only_flag = false (reset), session_phase = 'activating' |
| Declared intent — no verification floor | SessionIntentIssued(intentSource='declared') | verification_floor = null, intent_source = 'declared' |
| Negotiated intent — floor set | SessionIntentIssued(intentSource='negotiated', verificationFloor.minQuestions=3) | verification_floor = 3, intent_source = 'negotiated' |
| Watch-only flag set by P2 | SessionIntentIssued → ActivationPlanIssued(enforceWatchOnlyVerification=true) | watch_only_flag = true |
| Watch-only flag reset by new session | ActivationPlanIssued(watchOnly=true) → SessionIntentIssued(new session) | watch_only_flag = false |
| FirstActionStarted sets last_session_started_at | SessionIntentIssued → FirstActionStarted(startedAt=t1) | last_session_started_at = t1 |
| last_session_started_at uses GREATEST | FirstActionStarted(t2) then FirstActionStarted(t1) where t1 < t2 | last_session_started_at stays t2 |
| SessionEnd updates BOTH VOs | SessionEnd(endedAt=t1) | TopicLoopState.last_effort_at = t1 AND SessionLifecycleState.session_phase = 'verifying' |
| Unknown event type ignored | CustomEvent applied | No change to either VO |

### Cross-VO consistency tests

| Scenario | Input | Expected outcome |
| -------- | ----- | ---------------- |
| SessionEnd bridges both VOs | SessionIntentIssued → ActivationPlanIssued → SessionEnd(endedAt=t1) | _state.lastEffortAt = t1, _sessionLifecycle.sessionPhase = 'verifying' |
| Full cycle leaves accumulated state correct | Session 1: full cycle → Session 2: full cycle | lastEffortAt = session 2's endedAt (GREATEST); sessionPhase = 'closed' (latest) |
| Recompute from empty | Replay all events on empty TopicLoop | Same final state as incremental application |


---

## 11) Open Questions and Deferred Decisions

- Snapshot strategy for long-lived instances
- Archiving policy for old topic state
- ScheduleMissed derivation: where does it run? (Projection cron vs. on-demand)
- Performance thresholds for replay/recompute
- **Mastery phase tracking (future):** TopicLoop does not model the student's mastery arc (learning → practicing → mastered → decaying → re-learning). A student re-learning a topic after months of decay is distinguishable only via behavioral signals (`silenceDays`, `tms`/`delta_decay`), which LoopHealth interprets into coaching mode. If explicit mastery-phase labeling becomes a product requirement, evaluate whether it's a new VO on TopicLoop or a separate aggregate.

---

## References

- [agg-topic-loop.md](../aggregates/agg-topic-loop.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md)
- [src/ei/schemas/events.ts](../../src/ei/schemas/events.ts)
- [ADR-003: Projection Schema Evolution](../decisions/adr-003-projection-schema-evolution.md) — SessionLifecycleState VO design, domain model decisions
- [ADR-004: Session Lifecycle Persistence](../decisions/adr-004-session-lifecycle-persistence.md) — write-side event-sourced repository

