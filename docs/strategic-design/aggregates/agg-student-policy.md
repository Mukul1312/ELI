# Aggregate Design Canvas — StudentPolicy

**Tactical spec:** [student-policy-tactical-spec.md](../tactical/student-policy-tactical-spec.md)

**Owned by bounded context:** Strategic Adjustment
**Related subdomain(s):** StrategicAdjustment
**Sources:** [02-subdomains.md](../02-subdomains.md), [03-context-map.md](../03-context-map.md), [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
**Code pointers (current):** `ei_student_policy`, `engine/strategic-adjustment`

---

## 1) Name

- **Aggregate:** StudentPolicy
- **Aggregate Type:** Hybrid — SA emits StrategicAdjustmentDecision (command); Projections consume and persist (projection)
- **Instance identity:** studentId
- **Lifetime:** Long-lived (one policy per student; updated weekly or on risk trigger)

---

## 2) Description

- **Responsibility:** Hold next-cycle policy semantics: dials, tightness level, constraints (maxOpenLoops, noNewTopicUntil, closeOldestOpenLoopFirst). Produced by Strategic Adjustment (appended to Ledger); persisted by Projections; read by P1/P2/P3 protocols for gate decisions.
- **Why these boundaries:** Policy is per student; protocols need a single coherent policy view. SA owns semantics; Projections own storage. One aggregate per student keeps write conflicts low (SA runs per student, not per topic).
- **Trade-offs:** We do NOT model per-topic policy here; policy applies across topics for the student. Wrong SA affects a week; wrong gate play affects a session.

---

## 2b) Dependencies

- **Strategic Adjustment:** Sole writer; emits StrategicAdjustmentDecision. SA consumes GetStudentSignals (aggregates, topic state, policy) from Projections and LoopHealthSnapshot from LHA to decide policy.
- **EI Event Ledger:** StrategicAdjustmentDecision flows to Ledger; Projections consume and persist to ei_student_policy.
- **EI Projections:** Own storage; SA does not write Projections directly.

---

## 3) State Transitions

- **States:** Single current policy state. No explicit lifecycle; each StrategicAdjustmentDecision overwrites/replaces previous policy.
- **Transitions:** SA emits new decision → policy updated atomically. No intermediate states.

---

## 4) Enforced Invariants

- **Atomic write:** Policy is written atomically by SA. No partial updates.
- **Projections own storage:** EI Projections persist policy; SA owns semantics. Consistency boundary is the policy row for (studentId).
- **Single writer:** Strategic Adjustment is sole producer of StrategicAdjustmentDecision events; Projections persist policy; protocols read.

---

## 5) Corrective Policies

- **Recompute from events:** Policy can be recomputed from StrategicAdjustmentDecision events in the Ledger if needed.
- **Replaceability:** Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md), aggregates can be recomputed from events.

---

## 6) Handled Commands


| Command                     | Preconditions                                           | State changes                                         | Notes                              |
| --------------------------- | ------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| StrategicAdjustmentDecision | studentId, adjustmentMode, dials, constraints, issuedAt | Replace policy with new dials, tightness, constraints | From SA; persisted via Projections |


---

## 7) Created Events

StudentPolicy is a state aggregate. The StrategicAdjustmentDecision is emitted by SA and appended to the Ledger; Projections consume it and persist policy. The aggregate does not create additional events.


| Event            | Triggered by                                | Key fields | Consumers           |
| ---------------- | ------------------------------------------- | ---------- | ------------------- |
| (Internal: none) | StrategicAdjustmentDecision flows to Ledger | —          | Ledger, Projections |


---

## 7b) Supported Queries

| Query | Key params | Returns | Notes |
|-------|------------|---------|-------|
| GetStudentSignals (policy slice) | studentId | dials, tightnessLevel, constraints (maxOpenLoops, noNewTopicUntil, closeOldestOpenLoopFirst) | EI Runtime (P1/P2/P3), LHA, SA consume via Projections |

---

## 8) Throughput (concurrency risk)


| Metric                      | Average                  | Maximum  | Notes                            |
| --------------------------- | ------------------------ | -------- | -------------------------------- |
| Command handling rate       | Weekly or risk-triggered | Low      | SA runs infrequently per student |
| Total number of clients     | 1                        | 1        | SA is sole writer                |
| Concurrency conflict chance | Very low                 | Very low | Single writer, low frequency     |


---

## 9) Size


| Metric                        | Average | Maximum    | Notes                                            |
| ----------------------------- | ------- | ---------- | ------------------------------------------------ |
| Event growth rate             | Low     | Low        | One StrategicAdjustmentDecision per run          |
| Lifetime of a single instance | Long    | Indefinite | One policy per student                           |
| Number of events persisted    | TBD     | TBD        | In Ledger; policy table holds current state only |

---

## 9b) Storage & Projection

| Aspect | Value | Notes |
|--------|-------|-------|
| Table(s) / store | `ei_student_policy` | Per [05-cross-cutting-concerns.md#data-ownership](../05-cross-cutting-concerns.md#data-ownership) |
| Write path | SA → Ledger → Projections | StrategicAdjustmentDecision appended to Ledger; Projections consume and persist |
| Read path | EI Runtime, LHA, SA via GetStudentSignals | Sync query |
| Replay / recompute | Yes | Policy can be recomputed from StrategicAdjustmentDecision events in Ledger |

---

## Open questions

- Policy versioning/history for audit?
- How to handle policy read during SA recompute?

