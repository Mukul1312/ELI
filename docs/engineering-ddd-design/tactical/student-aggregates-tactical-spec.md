# StudentAggregates — Tactical DDD Spec

> Docs-only specification for implementing StudentAggregates. Source: [agg-student-aggregates.md](../aggregates/agg-student-aggregates.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md).

---

## 1) Purpose and Boundary

- **Aggregate root:** StudentAggregates
- **Aggregate type:** Projection — event-driven, rolled-up metrics per student over rolling 7-day windows.
- **Identity:** `studentId` — one instance per student.
- **Responsibility:** Maintain student-level rolled-up metrics (openLoops, verificationRate7d, silenceDays, etc.) derived from the Ledger event stream. Single consistency boundary for cross-topic student-level signals consumed by P1/P2/P3 gate decisions, LHA, SA, and Radar.
- **Non-goals (outside StudentAggregates):**
  - Per-topic state — lives in TopicLoop.
  - Policy semantics — lives in StudentPolicy.
  - Label computation or health assessment — lives in LoopHealthAssessment.
  - Protocol gate execution — lives in EI Runtime.

---

## 2) Ubiquitous Language (Tactical Terms)

| Term | Definition |
|------|------------|
| StudentAggregatesId | Identity: `{ studentId }` |
| StudentId | Student identifier (string; server-derived) |
| OpenLoops | Count of unclosed topic loops: **(1)** topics where `last_scheduled_due_at` has passed the grace period without retrieval (broken commitment), OR **(2)** topics where `last_effort_at` is set and `last_scheduled_due_at` is null and no retrieval has occurred and the grace period has passed (absent commitment — studied without ever entering the retrieval cycle) |
| PendingChecks | Count of topics where `last_effort_at > last_retrieval_at` (effort without retrieval) |
| VerificationRate7d | Ratio of verified/scheduled sessions over last 7 days |
| ScheduleMisses7d | Count of topics with overdue schedules in last 7 days |
| AvoidantExits7d | Count of SessionEnd events without retrieval or schedule in last 7 days |
| SkipCount7d | Count of `RetrievalSkipped` events in last 7 days |
| SilenceDays | Days since last meaningful event (`IntentSet`, `SessionEnd`, `RetrievalVerified`, `VerificationCompleted`) |
| StartLatencyMinMedian7d | Median start latency (minutes from `IntentSet` to `FirstActionStarted`) over last 7 days |
| IntentAcceptanceRate7d | Ratio of accepted/edited `IntentResponse` events over issued `NegotiatedIntentIssued` in last 7 days |
| ReplanLoopCount7d | Count of `Replan` events in last 7 days |
| StateTrend7d | Coarse direction derived from AppOpen energy taps: `improving`, `flat`, `worsening` |
| LoopLatencyTrend | Coarse trend of loop closure latency: derived |
| RollingWindow7d | 7-day window from "now" backwards; events outside window excluded from rate/count metrics |
| GraceMs | Buffer added to `last_scheduled_due_at` before marking overdue (from tunables) |

---

## 3) State Model

| Field | Type | Semantics |
|-------|------|-----------|
| studentId | string | Identity |
| pendingChecks | integer | Topics with effort but no retrieval |
| openLoops | integer | Unclosed topic loops: overdue scheduled retrievals (broken commitments) + topics studied but never scheduled for retrieval past grace period (absent commitments) |
| verificationRate7d | float [0,1] | Verification completions / session ends in 7d |
| scheduleMisses7d | integer | Overdue due-dates within 7d window |
| avoidantExits7d | integer | SessionEnds without retrieval/schedule in 7d |
| skipCount7d | integer | RetrievalSkipped count in 7d |
| silenceDays | integer | Days since last meaningful event |
| startLatencyMinMedian7d | float or null | Median session start latency in minutes, 7d |
| intentAcceptanceRate7d | float [0,1] or null | Intent accepted/edited ratio in 7d |
| replanLoopCount7d | integer | Replan count in 7d |
| stateTrend7d | `improving` \| `flat` \| `worsening` | Coarse energy direction from AppOpen events |
| loopLatencyTrend | string or null | Coarse loop latency direction |
| updatedAt | ISO datetime | When last recomputed |

- **Lifecycle:** No explicit lifecycle states; state is replaced on each recompute.
- **Initial:** Row absent until first recompute; protocols treat null as default zeroes.

---

## 4) Invariants (Must Hold Atomically)

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md):

1. **Replaceability:** Aggregates can be fully recomputed from Ledger events. No source of truth outside the event log.
2. **Rolling window consistency:** All 7d metrics use the same "now" reference point for a given recompute run; no mixing of different window boundaries within one update.
3. **Non-negative counts:** `openLoops`, `pendingChecks`, `scheduleMisses7d`, etc. are always ≥ 0; clamp negative intermediate results to zero.
4. **Rate clamping:** `verificationRate7d` and `intentAcceptanceRate7d` are clamped to [0, 1].

---

## 5) Commands and Decisions

StudentAggregates is a projection; it does not handle external commands. The "command" is the decision to recompute for a student.

| Trigger | Required inputs | Decision logic | State change |
|---------|-----------------|----------------|--------------|
| RecomputeStudentAggregates | studentId, "now" timestamp | Query 7d events + topic states → compute all metrics per spec | Replace all metric fields atomically |

---

## 6) Domain Events Consumed / Produced

### Consumed (from Ledger)

| Event type | Key fields for StudentAggregates |
|------------|----------------------------------|
| AppOpen | studentId, energy, openedAt |
| IntentSet | studentId, topic, setAt |
| SessionEnd | studentId, topic, endedAt |
| FirstActionStarted | studentId, topic, startedAt |
| Replan | studentId, topic, replannedAt |
| NegotiatedIntentIssued | studentId, issuedAt |
| IntentResponse | studentId, decision, respondedAt |
| RetrievalVerified | studentId, topic, verifiedAt |
| RetrievalScheduled | studentId, topic, dueAt, scheduledAt |
| RetrievalSkipped | studentId, topic, skippedAt |
| VerificationCompleted | studentId, topic, completedAt |
| ScheduleMissed | studentId, topic, missedAt |

Also reads **topic state** from `ei_topic_state` (TopicLoop projection) to derive `openLoops` and `pendingChecks`.

### Produced

StudentAggregates does not emit new domain events. It updates `ei_student_aggregates` only.

---

## 7) Ports (Interfaces — Docs Level)

| Port | Role | Responsibility |
|------|------|----------------|
| **StudentAggregatesRepository** | Driven | Load by `studentId`; save/upsert computed metrics |
| **EventStreamReader** | Driven | Read events from Ledger for a student within a time window |
| **TopicStateReader** | Driven | Read all `ei_topic_state` rows for a student (to derive openLoops/pendingChecks) |
| **Clock** | Driven | Provide consistent "now" for rolling window boundary |

- Repository interface lives in `domain/student-aggregates/repository.ts`.
- Application handler lives in `application/recompute-student-aggregates/handler.ts`.
- Adapter uses `queryEvents`, `getAllTopicStates`, and `upsertAggregates` from `db/queries.ts`.

---

## 8) Application Use-Case Contract

**Use case:** `RecomputeStudentAggregates`

| Aspect | Specification |
|--------|---------------|
| **Input** | `{ studentId: string; now?: Date }` (now defaults to wall clock if not provided) |
| **Output** | Updated StudentAggregates persisted; returns computed metrics |
| **Errors** | Missing `studentId` (reject) |
| **Idempotency** | Idempotent: same events + same "now" → same metrics. Running twice has no harmful side-effect. |
| **Preconditions** | TopicLoop rows up-to-date (run TopicLoop projection before StudentAggregates if recomputing from scratch) |

---

## 9) Consistency and Concurrency Rules

| Rule | Description |
|------|-------------|
| Single writer | One projection job per student; no concurrent recompute writers per student. |
| Conflict handling | Full replace: each recompute atomically overwrites all metric fields. |
| Ordering | Events within the 7d window are queried in descending `occurred_at`; the recompute is order-independent per metric (counts/rates are aggregations). |
| Recompute | Full rebuild from Ledger events is the canonical repair for any metric inconsistency. |

---

## 10) Test Strategy (Spec Tests)

| Scenario | Input | Expected outcome |
|----------|-------|------------------|
| No events | Empty event log for student | All counts zero; rates 1.0 (safe defaults) |
| Simple session with verification | SessionEnd + RetrievalVerified same day | pendingChecks=0, openLoops=0, verificationRate7d=1.0 |
| Avoidant exit | SessionEnd without retrieval/schedule | avoidantExits7d=1; pendingChecks ≥ 1 |
| Overdue schedule | last_scheduled_due_at past grace, no retrieval | openLoops ≥ 1; scheduleMisses7d ≥ 1 |
| Absent commitment | last_effort_at set, last_scheduled_due_at null, no retrieval, past grace | openLoops ≥ 1; scheduleMisses7d unchanged (0) |
| Silence detection | Last meaningful event 5 days ago | silenceDays ≥ 5 |
| Energy trend improving | AppOpen events with rising energy | stateTrend7d = `improving` |
| Events outside 7d window | Old events beyond window | Not counted in 7d metrics |
| Rate clamping | Computed rate > 1.0 | Clamped to 1.0 |
| Recompute idempotency | Same inputs applied twice | Same final state |

---

## 11) Open Questions and Deferred Decisions

- Exact rolling-window semantics per metric (some may use different windows in future).
- `loopLatencyTrend` derivation algorithm (currently null in implementation).
- Snapshot strategy for long-lived student instances.
- Trigger model: sync-on-append vs. scheduled batch vs. on-demand.

---

## References

- [agg-student-aggregates.md](../aggregates/agg-student-aggregates.md)
- [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [canvas-ei-projections.md](../canvas-ei-projections.md)
- [src/mastra/tools/signal-compute.ts](../../src/mastra/tools/signal-compute.ts)
