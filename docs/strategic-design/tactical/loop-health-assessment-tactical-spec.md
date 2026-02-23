# LoopHealth — Tactical DDD Spec

> Docs-only specification for implementing LoopHealth as a stateless domain service. Source: [ds-loop-health.md](../domainService/ds-loop-health.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [src/ei/engine/classify.ts](../../src/ei/engine/classify.ts).

---

## 1) Purpose and Boundary

- **Domain service:** LoopHealth
- **Scope:** Stateless — no identity, no persistence, no consistency boundary
- **Responsibility:** Interpret aggregates + gate context into P1/P2/P3 labels and LoopHealthSnapshot (labels + evidence). Single source of truth for "what is healthy" — thresholds and precedence rules owned here.
- **Non-goals (outside LoopHealth):**
  - Aggregate computation (openLoops, verificationRate7d, etc.) — lives in StudentAggregates / EI Projections
  - Policy persistence — lives in StudentPolicy / Projections
  - Gate play selection — lives in EI Runtime; consumes snapshot only

---

## 2) Ubiquitous Language (Tactical Terms)


| Term               | Definition                                                                             |
| ------------------ | -------------------------------------------------------------------------------------- |
| LoopHealthSnapshot | Output contract: labels (p1, p2, p3) + mode + evidence; consumed by Runtime, SA, Radar |
| LoopHealthEvidence | Privacy-safe subset: openLoops, verificationRate7d, silenceDays, etc.; no raw events   |
| P1Label            | LOW_ENERGY | HIGH_ENERGY | NEUTRAL                                                     |
| P2Label            | STALLED | FLOWING | NEUTRAL                                                            |
| P3Label            | AVOIDANT | CONFIDENT | NEUTRAL                                                         |
| Mode               | Rescue | Neutral | Boost                                                               |
| Precedence rules   | Risk overrides ambition; AVOIDANT/STALLED → Rescue; openLoops/silenceDays block Boost  |
| P1Context          | energy, sleepBucket, pressure, backlogPressure                                         |
| P2Context          | startLatencyMin, replanCount, hasStartSignal, timeSinceIntentSet                       |
| P3Context          | hasRetrieval, hasSchedule                                                              |


---

## 3) Input/Output Contract

### Input (AssessLoopHealth)


| Field       | Type                              | Required | Description                                                                      |
| ----------- | --------------------------------- | -------- | -------------------------------------------------------------------------------- |
| studentId   | string                            | Yes      | Student identifier                                                               |
| aggregates  | StudentAggregates                 | Yes      | openLoops, verificationRate7d, silenceDays, scheduleMisses7d, stateTrend7d, etc. |
| gateContext | P1Context | P2Context | P3Context | Yes      | Protocol-specific context                                                        |
| policy      | StudentPolicy                     | No       | Optional; influences mode resolution                                             |


### Output (LoopHealthSnapshot)


| Field      | Type               | Required | Description       |
| ---------- | ------------------ | -------- | ----------------- |
| studentId  | string             | Yes      |                   |
| p1         | P1Label            | Yes      |                   |
| p2         | P2Label            | Yes      |                   |
| p3         | P3Label            | Yes      |                   |
| mode       | Mode               | Yes      |                   |
| evidence   | LoopHealthEvidence | Yes      | Privacy-safe only |
| computedAt | ISO8601            | Yes      |                   |


### LoopHealthEvidence


| Field              | Type                                  | Description |
| ------------------ | ------------------------------------- | ----------- |
| openLoops          | number                                |             |
| verificationRate7d | number                                |             |
| silenceDays        | number                                |             |
| scheduleMisses7d   | number                                |             |
| startLatencyMin    | number?                               |             |
| stateTrend7d       | 'improving' | 'flat' | 'worsening'    |             |
| loopLatencyTrend   | 'improving' | 'worsening' | 'stable'? |             |


---

## 4) Invariants (Must Hold Per Invocation)

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md):

1. **Determinism:** Same inputs → same output. No randomness.
2. **Risk overrides ambition:** OpenLoops high or SilenceDays elevated → no Boost.
3. **Privacy-safe evidence:** Snapshot exposes only aggregated numbers; never raw events.
4. **Single interpretation:** Thresholds and labels live in LoopHealthAssessment; consumers use snapshot only.

---

## 5) Domain Logic (Code Pointers)


| Operation                          | Location                                       | Responsibility                                                                   |
| ---------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| assignP1Label                      | [classify.ts](../../src/ei/engine/classify.ts) | Energy, sleep, pressure → P1 label                                               |
| assignP2Label                      | classify.ts                                    | Start latency, replans → P2 label                                                |
| assignP3Label                      | classify.ts                                    | Retrieval/schedule, verification rate → P3 label                                 |
| resolveMode                        | classify.ts                                    | Label + aggregates → Rescue/Neutral/Boost (6 precedence rules)                   |
| classifyP1, classifyP2, classifyP3 | classify.ts                                    | Combined label + mode + protocol-specific info                                   |
| Tunables                           | [tunables.ts](../../src/ei/engine/tunables.ts) | P1/P2/P3 thresholds (e.g. P1_LOW_ENERGY_THRESHOLD, P2_STALLED_LATENCY_THRESHOLD) |


Taxonomy reference: [EI_Engine_Taxonomy.md](../../EI_Engine_Taxonomy.md) §3 (labels), §4 (precedence).

---

## 6) Ports (Interfaces — Docs Level)


| Port                      | Role   | Responsibility                                                                                |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| **GetStudentSignalsPort** | Driven | Fetch aggregates + topic state + policy for a student from EI Projections (GetStudentSignals) |
| **Clock** (optional)      | Driven | Provide "now" for computedAt                                                                  |


- Application layer (AssessLoopHealth use case) invokes GetStudentSignalsPort, then passes data to domain logic.

---

## 7) Application Use-Case Contract

**Use case:** `AssessLoopHealth`


| Aspect            | Specification                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Input**         | studentId, gatePhase (P1/P2/P3), optional: caller passes pre-fetched aggregates; or handler fetches via GetStudentSignalsPort |
| **Output**        | LoopHealthSnapshot (labels + mode + evidence + computedAt)                                                                    |
| **Errors**        | Missing aggregates (student not found); invalid gateContext shape                                                             |
| **Preconditions** | Aggregates conform to StudentAggregates; gateContext conforms to P1/P2/P3Context                                              |
| **Idempotency**   | Stateless; no side effects; safe to call repeatedly with same input                                                           |


---

## 8) Test Strategy (Spec Tests)


| Scenario                            | Input                                                       | Expected outcome                      |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| S2 lowCapacity                      | Revenge planning; energy low, pressure high                 | P1 LOW_ENERGY; mode Rescue or Neutral |
| S5 lowEnergy                        | Burnout/silence; stateTrend worsening                       | P1 LOW_ENERGY; risk signals elevated  |
| S7 avoidantRisk                     | Pending checks pile up; no retrieval/schedule at SessionEnd | P3 AVOIDANT; mode Rescue              |
| Precedence: risk overrides ambition | HIGH_ENERGY label but openLoops≥3                           | mode Neutral or Rescue (no Boost)     |
| Precedence: AVOIDANT → Rescue       | P3 AVOIDANT                                                 | mode Rescue always                    |
| Precedence: STALLED → Rescue        | P2 STALLED                                                  | mode Rescue always                    |
| Determinism                         | Same aggregates + context twice                             | Identical LoopHealthSnapshot          |
| Privacy                             | Any snapshot                                                | evidence has no raw events, no PII    |


---

## 9) Open Questions and Deferred Decisions

- schemaVersion field when LoopHealthSnapshot exposed as API/event
- Gate-phase scoping: return full snapshot (p1, p2, p3) or only current gate label?

---

## References

- [ds-loop-health.md](../domainService/ds-loop-health.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [canvas-loop-health-assessment.md](../canvas-loop-health-assessment.md)
- [src/ei/engine/classify.ts](../../src/ei/engine/classify.ts)
- [src/ei/engine/tunables.ts](../../src/ei/engine/tunables.ts)
- [EI_Engine_Taxonomy.md](../../EI_Engine_Taxonomy.md)

