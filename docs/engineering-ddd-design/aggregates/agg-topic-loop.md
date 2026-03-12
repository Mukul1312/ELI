# Aggregate Design Canvas — TopicLoop

**Tactical spec:** [topic-loop-tactical-spec.md](../tactical/topic-loop-tactical-spec.md)

**Owned by bounded context:** EI Projections (DerivedSignals)
**Related subdomain(s):** DerivedSignals
**Sources:** [02-subdomains.md](../02-subdomains.md), [03-context-map.md](../03-context-map.md), [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
**Code pointers (current):** `ei_topic_state`; [src/ei/domain/topic-loop/](../../../src/ei/domain/topic-loop/), [src/ei/application/apply-event-to-topic-loop/](../../../src/ei/application/apply-event-to-topic-loop/), [src/ei/infrastructure/projector/topic-loop-projector.ts](../../../src/ei/infrastructure/projector/topic-loop-projector.ts), [src/ei/infrastructure/persistence/topic-loop-repository.pg.ts](../../../src/ei/infrastructure/persistence/topic-loop-repository.pg.ts)

---

## 1) Name

- **Aggregate:** TopicLoop
- **Aggregate Type:** Projection — event-driven state; reacts to Ledger events
- **Instance identity:** studentId + topicId
- **Lifetime:** Long-lived (per student per topic; no fixed end)

---

## 2) Description

- **Responsibility:** Per (studentId, topicId): maintain effort-to-verification lifecycle state; track current session lifecycle phase; detect overdue scheduled retrievals. Single consistency boundary for topic_state derived from the event stream.
- **Why these boundaries:** Topic is the natural unit for verification; one student can have many topics. Scoping by (studentId, topicId) keeps conflict low (one student typically acts on one topic per request).
- **Trade-offs:** We do NOT include cross-topic aggregates (openLoops count) here; that lives in ei_student_aggregates. TopicLoop is the projection-side consistency unit for topic-level state.
- **Two temporal concerns in one aggregate (ADR-003):** TopicLoop composes two VOs: `TopicLoopState` (accumulated, GREATEST semantics — effort/retrieval timestamps) and `SessionLifecycleState` (per-session, latest-wins — session phase, intent source, constraints). Both are keyed by (studentId, topicId) and written by the same projection job. `SessionEnd` updates both VOs, which is why they belong in the same aggregate boundary.
- **Naming: "Loop" is the effort-to-verification cycle.** `TopicLoopState` tracks completed loops. `SessionLifecycleState` tracks the current loop in progress. The mastery arc (learn → practice → revise → decay → re-learn) is emergent from loop sequences and interpreted by LoopHealth, not modeled explicitly by TopicLoop.

---

## 2b) Dependencies

- **EI Event Ledger:** Source of events. Projections conform to Ledger event schema.
  - **Accumulated state events:** SessionEnd, RetrievalVerified, RetrievalScheduled, RetrievalSkipped, VerificationCompleted, ScheduleMissed.
  - **Session lifecycle events (ADR-003):** SessionIntentIssued, ActivationPlanIssued, FirstActionStarted, VerificationDecisionIssued. These are StudySession aggregate events consumed by TopicLoop as a projection — canonical for projection aggregates that materialize cross-aggregate state.
- **TopicLoop instances:** None (per-topic isolation).

---

## 3) State Transitions

### TopicLoopState (accumulated)

- **States:** Effectively continuous state (last_effort_at, last_retrieval_at, last_scheduled_due_at, consecutiveDeferrals). No explicit lifecycle states; state advances monotonically.
- **Transitions:** Event application updates timestamps via GREATEST semantics. ScheduleMissed may be derived when due date passes without RetrievalVerified/VerificationCompleted.

### SessionLifecycleState (per-session, ADR-003)

- **States:** `null → 'activating' → 'active' → 'verifying' → 'closed'`. Explicit session phase state machine.
- **Transitions:** Each session lifecycle event advances the phase forward. New `SessionIntentIssued` resets all fields to start a new session cycle.
- **Reset rule:** On `SessionIntentIssued`: session_phase → `'activating'`, current_session_id → new value, watch_only_flag → `false`, verification_floor and intent_source replaced from payload, last_session_started_at → `null`.

---

## 4) Enforced Invariants

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md):

- **Monotonic topic state (TopicLoopState):** `last_effort_at`, `last_retrieval_at`, `last_scheduled_due_at` must never move backward. Out-of-order or late events handled via GREATEST semantics.
- **Forward-only session phase (SessionLifecycleState):** Within a session cycle, `session_phase` only advances: `activating → active → verifying → closed`. A `'verifying'` event never reverts to `'active'` within the same session.
- **Session reset atomicity:** On `SessionIntentIssued`, ALL session lifecycle fields reset together — session_phase, current_session_id, intent_source, verification_floor, watch_only_flag, last_session_started_at. Partial reset is not valid.
- **Replaceability:** State can be recomputed from events. No source of truth outside the event log for derived state.

---

## 5) Corrective Policies

- **Out-of-order events:** Use GREATEST for timestamps; ignore events that would regress state.
- **Recompute:** Full projection rebuild from Ledger event stream is the canonical repair.

---

## 6) Handled Commands

TopicLoop is a projection; it does not handle commands directly. It reacts to events from the Ledger. Conceptually, the "commands" are the decision to apply an event:

### Accumulated state events → TopicLoopState

| Event (applied)       | Preconditions                         | State changes                                             |
| --------------------- | ------------------------------------- | --------------------------------------------------------- |
| SessionEnd            | studentId, topic, endedAt             | last_effort_at ← max(last_effort_at, endedAt) **+ session_phase ← 'verifying'** |
| RetrievalVerified     | studentId, topic, verifiedAt          | last_retrieval_at ← max(last_retrieval_at, verifiedAt); consecutiveDeferrals ← 0 |
| RetrievalScheduled    | studentId, topic, dueAt, scheduledAt  | last_scheduled_due_at ← max(last_scheduled_due_at, dueAt); consecutiveDeferrals ← consecutiveDeferrals + 1 |
| RetrievalSkipped      | studentId, topic, reason, skippedAt   | consecutiveDeferrals ← consecutiveDeferrals + 1 (no timestamp update) |
| VerificationCompleted | studentId, topic, completedAt, result | last_retrieval_at ← max(last_retrieval_at, completedAt); consecutiveDeferrals ← 0 |
| ScheduleMissed        | studentId, topic, missedAt            | Derived when due passes without verification              |

### Session lifecycle events → SessionLifecycleState (ADR-003)

| Event (applied)            | Preconditions                                          | State changes                                             |
| -------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| SessionIntentIssued        | payload.sessionId, payload.intentSource, payload.topicId | **Full reset:** session_phase ← 'activating', current_session_id ← sessionId, intent_source ← intentSource, verification_floor ← minQuestions (null if declared), watch_only_flag ← false, last_session_started_at ← null |
| ActivationPlanIssued       | payload.constraints                                    | session_phase ← 'active', watch_only_flag ← enforceWatchOnlyVerification |
| FirstActionStarted         | startedAt                                              | last_session_started_at ← max(last_session_started_at, startedAt) |
| VerificationDecisionIssued | _(occurrence)_                                         | session_phase ← 'closed'                                 |


---

## 7) Created Events

TopicLoop is a projection/state aggregate; it does not emit new domain events. Events are appended by EI Runtime to the Ledger; Projections consume them.


| Event  | Notes                                  |
| ------ | -------------------------------------- |
| (None) | Projection updates ei_topic_state only |


---

## 7b) Supported Queries


| Query                                 | Key params          | Returns                                                            | Notes                                       |
| ------------------------------------- | ------------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| GetStudentSignals (topic state slice) | studentId           | last_effort_at, last_retrieval_at, last_scheduled_due_at per topic | EI Runtime, LHA, SA consume via Projections |
| GetTopicState (ADR-003)               | studentId, topicId  | All TopicLoopState fields + all SessionLifecycleState fields       | AppOpen routing (session_phase), P2/P3 sessionId sourcing (current_session_id), P3 cross-protocol (verification_floor, watch_only_flag, intent_source) |
| GetSessionPhase (ADR-003)             | studentId, topicId  | session_phase                                                      | Replaces PhaseDeriver 4-query fan + AppOpen 9-type event scan |


---

## 8) Throughput (concurrency risk)


| Metric                      | Average        | Maximum | Notes                                       |
| --------------------------- | -------------- | ------- | ------------------------------------------- |
| Command handling rate       | TBD            | TBD     | Per-topic, typically low                    |
| Total number of clients     | 1 per instance | 1       | One student acts on one topic per request   |
| Concurrency conflict chance | Low            | Low     | Single writer (projection job) per instance |


---

## 9) Size


| Metric                        | Average | Maximum    | Notes                                                       |
| ----------------------------- | ------- | ---------- | ----------------------------------------------------------- |
| Event growth rate             | TBD     | TBD        | Depends on SessionEnd, Retrieval*, ScheduleMissed frequency |
| Lifetime of a single instance | Long    | Indefinite | Per student per topic                                       |
| Number of events persisted    | TBD     | TBD        | In Ledger, not in TopicLoop; TopicLoop holds current state  |


---

## 9b) Storage & Projection


| Aspect             | Value                                                     | Notes                                                                                             |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Table(s) / store   | `ei_topic_state`                                          | Per [05-cross-cutting-concerns.md#data-ownership](../05-cross-cutting-concerns.md#data-ownership) |
| Write path         | Projection job (batch/recompute) or sync read from Ledger | Single writer per instance                                                                        |
| Read path          | EI Runtime, LHA, SA via GetStudentSignals                 | Sync query                                                                                        |
| Replay / recompute | Yes                                                       | Full projection rebuild from Ledger event stream is canonical repair                              |


---

## Open questions

- Snapshot strategy for long-lived instances?
- Archiving policy for old topic state?
- **Mastery phase tracking (future):** TopicLoop does not model the student's mastery arc (learning → practicing → mastered → decaying → re-learning). A student re-learning "Carnot Engine" after months of decay looks the same as first-time learning — both emit `SessionIntentIssued` with `taskType: 'Learn'`. The difference is derivable from behavioral signals (`silenceDays`, `tms`/`delta_decay`), which LoopHealth interprets. If explicit mastery-phase labeling becomes a product requirement, evaluate whether it's a new VO on TopicLoop or a separate aggregate.

---

## References

- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md)
- [src/ei/schemas/events.ts](../../src/ei/schemas/events.ts)
- [ADR-003: Projection Schema Evolution](../decisions/adr-003-projection-schema-evolution.md) — SessionLifecycleState VO design, 4 new consumed event types
- [ADR-004: Session Lifecycle Persistence](../decisions/adr-004-session-lifecycle-persistence.md) — write-side event-sourced repository (complementary)
- [topic-loop-tactical-spec.md](../tactical/topic-loop-tactical-spec.md) — detailed state model and test scenarios

