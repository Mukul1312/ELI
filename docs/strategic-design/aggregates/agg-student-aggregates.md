# Aggregate Design Canvas — StudentAggregates

**Tactical spec:** [student-aggregates-tactical-spec.md](../tactical/student-aggregates-tactical-spec.md)

**Owned by bounded context:** EI Projections (DerivedSignals)
**Related subdomain(s):** DerivedSignals
**Sources:** [02-subdomains.md](../02-subdomains.md), [03-context-map.md](../03-context-map.md), [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
**Code pointers (current):** `ei_student_aggregates`, projection logic

---

## 1) Name

- **Aggregate:** StudentAggregates
- **Aggregate Type:** Projection — event-driven state; rolled-up metrics per student
- **Instance identity:** studentId
- **Lifetime:** Long-lived (one aggregate row per student; updated as events apply)

---

## 2) Description

- **Responsibility:** Per student: maintain rolled-up metrics (openLoops, verificationRate7d, silenceDays, startLatencyMinMedian7d) over rolling 7d windows. Single consistency boundary for student-level signals derived from the event stream.
- **Why these boundaries:** Student is the natural unit for protocol gate decisions (risk overrides ambition, P1/P2/P3 gates). Cross-topic aggregates must be coherent per student; one row per student keeps conflict low.
- **Trade-offs:** We do NOT include per-topic state here; that lives in TopicLoop. We do NOT include policy; that lives in StudentPolicy. StudentAggregates is the projection-side consistency unit for student-level rolled metrics.

---

## 2b) Dependencies

- **EI Event Ledger:** Source of events. Aggregates computed from topic-level and protocol events (SessionEnd, RetrievalVerified, RetrievalScheduled, ScheduleMissed, FirstActionStarted, etc.). Projections conform to Ledger event schema.
- **TopicLoop:** openLoops count derived from topic state; other metrics from event timestamps and counts.

---

## 3) State Transitions

- **States:** Effectively continuous state (rolling 7d windows). No explicit lifecycle; state advances as events apply.
- **Transitions:** Event application updates metric values. Monotonic or idempotent semantics per metric (e.g. GREATEST for timestamps, recompute for rates).

---

## 4) Enforced Invariants

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md):

- **Replaceability:** Aggregates can be recomputed from events. No source of truth outside the event log for derived state.
- **Rolling windows:** 7d windows must be consistent with event timestamps; no backward movement for derived timestamps.

---

## 5) Corrective Policies

- **Recompute:** Full projection rebuild from Ledger event stream is the canonical repair.
- **Out-of-order events:** Projection logic handles late/out-of-order events per metric semantics (e.g. GREATEST for timestamps).

---

## 6) Handled Commands

StudentAggregates is a projection; it does not handle commands directly. It reacts to events from the Ledger. Conceptually, the "commands" are the decision to apply an event:


| Event (applied)                                                              | Preconditions                | State changes                                                                                    |
| ---------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| SessionEnd, FirstActionStarted, etc.                                         | studentId, timestamps        | openLoops, verificationRate7d, silenceDays, startLatencyMinMedian7d updated via rolling 7d logic |
| RetrievalVerified, VerificationCompleted, RetrievalScheduled, ScheduleMissed | studentId, topic, timestamps | Same                                                                                             |


---

## 7) Created Events

StudentAggregates is a projection; it does not emit new domain events.


| Event  | Notes                                         |
| ------ | --------------------------------------------- |
| (None) | Projection updates ei_student_aggregates only |


---

## 7b) Supported Queries


| Query                                | Key params | Returns                                                             | Notes                                              |
| ------------------------------------ | ---------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| GetStudentSignals (aggregates slice) | studentId  | openLoops, verificationRate7d, silenceDays, startLatencyMinMedian7d | EI Runtime, LHA, SA, Radar consume via Projections |


---

## 8) Throughput (concurrency risk)


| Metric                      | Average        | Maximum | Notes                                       |
| --------------------------- | -------------- | ------- | ------------------------------------------- |
| Command handling rate       | TBD            | TBD     | Projection job; per-student updates         |
| Total number of clients     | 1 per instance | 1       | One projection writer per student           |
| Concurrency conflict chance | Low            | Low     | Single writer (projection job) per instance |


---

## 9) Size


| Metric                        | Average | Maximum    | Notes                                                    |
| ----------------------------- | ------- | ---------- | -------------------------------------------------------- |
| Event growth rate             | TBD     | TBD        | Depends on student activity                              |
| Lifetime of a single instance | Long    | Indefinite | Per student                                              |
| Number of events persisted    | TBD     | TBD        | In Ledger; aggregates table holds current rolled metrics |


---

## 9b) Storage & Projection


| Aspect             | Value                                                     | Notes                                                                                             |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Table(s) / store   | `ei_student_aggregates`                                   | Per [05-cross-cutting-concerns.md#data-ownership](../05-cross-cutting-concerns.md#data-ownership) |
| Write path         | Projection job (batch/recompute) or sync read from Ledger | Single writer per instance                                                                        |
| Read path          | EI Runtime, LHA, SA, Radar via GetStudentSignals          | Sync query                                                                                        |
| Replay / recompute | Yes                                                       | Full projection rebuild from Ledger event stream is canonical repair                              |


---

## Open questions

- Exact rolling-window semantics for each metric (verificationRate7d, scheduleMisses7d)?
- Snapshot strategy for long-lived instances?

