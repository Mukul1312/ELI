# Domain Service Design — LoopHealth

**Tactical spec:** [loop-health-assessment-tactical-spec.md](../tactical/loop-health-assessment-tactical-spec.md)

**Owned by bounded context:** LoopHealthAssessment
**Related subdomain(s):** LoopHealthAssessment
**Sources:** [02-subdomains.md](../02-subdomains.md), [03-context-map.md](../03-context-map.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [canvas-loop-health-assessment.md](../canvas-loop-health-assessment.md)
**Code pointers (current):** [src/ei/domain/loop-health/assess-loop-health.ts](../../src/ei/domain/loop-health/assess-loop-health.ts), [src/ei/domain/loop-health/tunables.ts](../../src/ei/domain/loop-health/tunables.ts)

---

## 1) Name

- **Domain Service:** LoopHealth
- **Scope:** Stateless — no identity, no persistence, no transactional boundary
- **Lifetime:** Per invocation only

---

## 2) Description

- **Responsibility:** Interpret aggregates + gate context into P1/P2/P3 labels and LoopHealthSnapshot (labels + key evidence). Single source of truth for "what is healthy" — thresholds, precedence rules, and label semantics.
- **Why domain service (not aggregate):** No mutable state; no consistency boundary; pure interpretation from inputs (signals + context). Same inputs always yield same output.
- **Trade-offs:** Does not store or project; callers (Runtime, SA, Radar) fetch signals from Projections and pass to AssessLoopHealth, or the use case fetches internally via port.

---

## 2b) Dependencies

- **EI Projections:** GetStudentSignals — aggregates (openLoops, verificationRate7d, silenceDays, etc.), topic state, policy. LHA consumes via port (driven); does not own storage.

---

## 3) Input/Output Contract

### Input (AssessLoopHealth)


| Field       | Type                              | Required | Description                                                                                                                             |
| ----------- | --------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| studentId   | string                            | Yes      | Student identifier                                                                                                                      |
| aggregates  | StudentAggregates                 | Yes      | openLoops, verificationRate7d, silenceDays, scheduleMisses7d, startLatencyMin, stateTrend7d, loopLatencyTrend, etc.                     |
| gateContext | P1Context \| P2Context \| P3Context | Yes | Input Value Objects — protocol-specific context shapes (immutable, passed by value): energy, sleepBucket, pressure for P1; startLatencyMin, replanCount for P2; hasRetrieval, hasSchedule for P3 |
| policy      | StudentPolicy                     | No       | Optional; influences mode resolution                                                                                                    |


### Output (LoopHealthSnapshot — Value Object)

`LoopHealthSnapshot` is a structural Value Object — immutable, produced fresh per invocation. Defined in [`loop-health-snapshot.ts`](../../src/ei/domain/loop-health/loop-health-snapshot.ts).

**Version:** 1 (schemaVersion when exposed as API/event)


| Field      | Type               | Required | Description                                                 |
| ---------- | ------------------ | -------- | ----------------------------------------------------------- |
| studentId  | string             | Yes      | Student identifier                                          |
| p1         | P1Label            | Yes      | LOW_ENERGY | HIGH_ENERGY | NEUTRAL                          |
| p2         | P2Label            | Yes      | STALLED | FLOWING | NEUTRAL                                 |
| p3         | P3Label            | Yes      | AVOIDANT | CONFIDENT | NEUTRAL                              |
| mode       | Mode               | Yes      | Rescue | Neutral | Boost (resolved from label + precedence) |
| evidence   | LoopHealthEvidence | Yes      | Privacy-safe aggregated numbers only                        |
| computedAt | ISO8601            | Yes      | Snapshot computation timestamp                              |


### LoopHealthEvidence (privacy-safe subset)


| Field              | Type                                  | Description                                  |
| ------------------ | ------------------------------------- | -------------------------------------------- |
| openLoops          | number                                | Topics with effort but no retrieval          |
| verificationRate7d | number                                | 7-day rolling verification compliance rate   |
| silenceDays        | number                                | Days since last meaningful activity          |
| scheduleMisses7d   | number                                | Missed schedules in last 7 days              |
| startLatencyMin    | number?                               | Minutes from intent set to first action (P2) |
| stateTrend7d       | 'improving' | 'flat' | 'worsening'    | Coarse state direction                       |
| loopLatencyTrend   | 'improving' | 'worsening' | 'stable'? | Per-topic latency trend                      |


No raw events, no private content. Aligns with [05-cross-cutting-concerns.md#privacy-invariants](../05-cross-cutting-concerns.md).

---

## 4) Invariants

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md):

- **Determinism:** Same inputs (aggregates + gateContext) → same output. No randomness in label assignment or mode resolution.
- **Risk overrides ambition:** OpenLoops high or SilenceDays elevated → no Boost even if mood taps look strong. Precedence rules from EI_Engine_Taxonomy §4.
- **Privacy-safe evidence:** Snapshot exposes only aggregated numbers and labels; never raw events or private text.
- **Single interpretation:** Thresholds and label logic live in LoopHealthAssessment; consumers (Runtime, SA, Radar) use snapshot only.

---

## 5) Supported Queries (Entry Points)


| Query            | Key params                                             | Returns            | Notes                                                                                       |
| ---------------- | ------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------- |
| AssessLoopHealth | studentId, gateContext (P1/P2/P3), aggregates, policy? | LoopHealthSnapshot | Primary entry point; use case fetches GetStudentSignals via port, then invokes domain logic |


---

## References

- [loop-health-assessment-tactical-spec.md](../tactical/loop-health-assessment-tactical-spec.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [src/ei/domain/loop-health/loop-health-snapshot.ts](../../src/ei/domain/loop-health/loop-health-snapshot.ts) — LoopHealthSnapshot, LoopHealthEvidence (output VOs)
- [src/ei/domain/loop-health/gate-context.ts](../../src/ei/domain/loop-health/gate-context.ts) — P1Context, P2Context, P3Context (input VOs)
- [src/ei/domain/loop-health/assess-loop-health.ts](../../src/ei/domain/loop-health/assess-loop-health.ts) — assignP1Label, assignP2Label, assignP3Label, resolveMode, classifyP1, classifyP2, classifyP3
- [src/ei/domain/loop-health/tunables.ts](../../src/ei/domain/loop-health/tunables.ts) — threshold constants (canonical)
- [src/ei/engine/classify.ts](../../src/ei/engine/classify.ts) (re-export bridge; backward compat only)
- [EI_Engine_Taxonomy.md](../../EI_Engine_Taxonomy.md) §3 (labels), §4 (precedence)

