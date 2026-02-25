# LoopHealth — Tactical DDD Spec

> Docs-only specification for implementing LoopHealth as a stateless domain service. Source: [ds-loop-health.md](../domainService/ds-loop-health.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [src/ei/domain/loop-health/assess-loop-health.ts](../../src/ei/domain/loop-health/assess-loop-health.ts).

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


| Term               | Definition                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LoopHealthSnapshot | **Output Value Object (structural):** immutable interface — labels (p1, p2, p3) + mode + evidence + computedAt; consumed by Runtime, SA, Radar. `studentId` is a correlation field, not ORM identity. |
| LoopHealthEvidence | **Nested Value Object (structural):** immutable privacy-safe record embedded in LoopHealthSnapshot — openLoops, verificationRate7d, silenceDays, etc.; no raw events. |
| P1Label            | **Enum Value Object:** `LOW_ENERGY \| HIGH_ENERGY \| NEUTRAL` — immutable string union, equality by value.                                                           |
| P2Label            | **Enum Value Object:** `STALLED \| FLOWING \| NEUTRAL` — immutable string union, equality by value.                                                                  |
| P3Label            | **Enum Value Object:** `AVOIDANT \| CONFIDENT \| NEUTRAL` — immutable string union, equality by value.                                                               |
| Mode               | **Enum Value Object:** `Rescue \| Neutral \| Boost` — immutable string union, equality by value.                                                                     |
| Precedence rules   | Risk overrides ambition; AVOIDANT/STALLED → Rescue; openLoops/silenceDays block Boost.                                                                              |
| P1Context          | **Input Value Object (structural):** immutable gate-input shape — energy, sleepBucket, pressure, backlogPressure.                                                    |
| P2Context          | **Input Value Object (structural):** immutable gate-input shape — startLatencyMin, replanCount, hasStartSignal, timeSinceIntentSet.                                  |
| P3Context          | **Input Value Object (structural):** immutable gate-input shape — hasRetrieval, hasSchedule.                                                                         |


> **Value Object note:** Enum VOs (`P1Label`, `P2Label`, `P3Label`, `Mode`) are TypeScript string-union `type` aliases — immutable, equality by value, no lifecycle. Structural VOs (`P1Context`, `P2Context`, `P3Context`, `LoopHealthEvidence`, `LoopHealthSnapshot`) are TypeScript `interface` shapes — immutable by convention, passed by value across the domain boundary. None extend `ValueObject<Props>` from `domain/shared/value-object.ts`; this is intentional for a stateless domain service. Code: [`loop-health-snapshot.ts`](../../src/ei/domain/loop-health/loop-health-snapshot.ts), [`gate-context.ts`](../../src/ei/domain/loop-health/gate-context.ts).

---

## 3) Input/Output Contract

### Input (AssessLoopHealth)


| Field       | Type                              | Required | Description                                                                      |
| ----------- | --------------------------------- | -------- | -------------------------------------------------------------------------------- |
| studentId   | string                            | Yes      | Student identifier                                                               |
| aggregates  | StudentAggregates                 | Yes      | openLoops, verificationRate7d, silenceDays, scheduleMisses7d, stateTrend7d, etc. |
| gateContext | P1Context \| P2Context \| P3Context | Yes    | Input Value Objects — protocol-specific context shapes (immutable, passed by value) |
| policy      | StudentPolicy                     | No       | Optional; influences mode resolution                                             |


### Output (LoopHealthSnapshot — Value Object)

`LoopHealthSnapshot` is a structural Value Object: immutable, produced fresh per invocation, no mutable state. Consumers must not mutate it.

| Field      | Type               | Required | Description       |
| ---------- | ------------------ | -------- | ----------------- |
| studentId  | string             | Yes      | Correlation field (not ORM identity) |
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
| stateTrend7d       | 'improving' \| 'flat' \| 'worsening'  |             |
| loopLatencyTrend   | 'improving' \| 'worsening' \| 'stable'? |           |


---

## 4) Invariants (Must Hold Per Invocation)

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md):

1. **Determinism:** Same inputs → same output. No randomness.
2. **Risk overrides ambition:** OpenLoops high or SilenceDays elevated → no Boost.
3. **Privacy-safe evidence:** Snapshot exposes only aggregated numbers; never raw events.
4. **Single interpretation:** Thresholds and labels live in LoopHealthAssessment; consumers use snapshot only.

---

## 5) Domain Logic (Code Pointers)


| Operation                          | Location                                                                                   | Responsibility                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| assignP1Label                      | [assess-loop-health.ts](../../src/ei/domain/loop-health/assess-loop-health.ts)             | Energy, sleep, pressure → P1 label                                               |
| assignP2Label                      | assess-loop-health.ts                                                                      | Start latency, replans → P2 label                                                |
| assignP3Label                      | assess-loop-health.ts                                                                      | Retrieval/schedule, verification rate → P3 label                                 |
| resolveMode                        | assess-loop-health.ts                                                                      | Label + aggregates → Rescue/Neutral/Boost (6 precedence rules)                   |
| classifyP1, classifyP2, classifyP3 | assess-loop-health.ts                                                                      | Combined label + mode + protocol-specific info (legacy combined exports)          |
| Tunables                           | [tunables.ts](../../src/ei/domain/loop-health/tunables.ts)                                 | P1/P2/P3 thresholds (e.g. P1_LOW_ENERGY_THRESHOLD, P2_STALLED_LATENCY_THRESHOLD) |

> Canonical domain logic; `src/ei/engine/classify.ts` and `src/ei/engine/tunables.ts` re-export for backward compatibility only.

### Value Objects and Data Shapes

All types are immutable and equality-by-value; none have lifecycle or identity in the DDD sense.

| Name | Kind | Immutable | Equality rule | Code pointer |
| ---- | ---- | --------- | ------------- | ------------ |
| `P1Label` | Enum VO | Yes — `type` alias | By string value | `loop-health-snapshot.ts` |
| `P2Label` | Enum VO | Yes | By string value | `loop-health-snapshot.ts` |
| `P3Label` | Enum VO | Yes | By string value | `loop-health-snapshot.ts` |
| `Mode` | Enum VO | Yes | By string value | `loop-health-snapshot.ts` |
| `StateTrend` | Enum VO | Yes | By string value | `loop-health-snapshot.ts` |
| `SleepBucket` | Enum VO | Yes | By string value | `gate-context.ts` |
| `P1Context` | Structural VO | By convention | All fields equal | `gate-context.ts` |
| `P2Context` | Structural VO | By convention | All fields equal | `gate-context.ts` |
| `P3Context` | Structural VO | By convention | All fields equal | `gate-context.ts` |
| `LoopHealthEvidence` | Structural VO | By convention | All fields equal | `loop-health-snapshot.ts` |
| `LoopHealthSnapshot` | Structural VO | By convention | All fields equal (`studentId` = correlation field, not ORM identity) | `loop-health-snapshot.ts` |

Taxonomy reference: [EI_Engine_Taxonomy.md](../../EI_Engine_Taxonomy.md) §3 (labels), §4 (precedence).

---

## 6) Ports (Interfaces — Docs Level)


| Port                      | Role   | Responsibility                                                                                |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| **GetStudentSignalsPort** | Driven | Fetch aggregates + topic state + policy for a student from EI Projections (GetStudentSignals) |
| **Clock** (optional)      | Driven | Provide "now" for computedAt                                                                  |


- Application layer (AssessLoopHealth use case) invokes GetStudentSignalsPort, then passes data to domain logic. Port interface: [`application/assess-loop-health/port.ts`](../../src/ei/application/assess-loop-health/port.ts).

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
| S5 lowEnergy                        | Burnout/silence; energy ≤ 2, sleep '<6', pressure ≥ 4, or backlog ≥ 4 | P1 LOW_ENERGY; risk signals elevated |
| S7 avoidantRisk                     | Pending checks pile up; no retrieval/schedule at SessionEnd | P3 AVOIDANT; mode Rescue              |
| Precedence: risk overrides ambition | HIGH_ENERGY label but openLoops≥3                           | mode Neutral or Rescue (no Boost)     |
| Precedence: AVOIDANT → Rescue       | P3 AVOIDANT                                                 | mode Rescue always                    |
| Precedence: STALLED → Rescue        | P2 STALLED                                                  | mode Rescue always                    |
| Determinism                         | Same aggregates + context twice                             | Identical LoopHealthSnapshot          |
| Privacy                             | Any snapshot                                                | evidence has no raw events, no PII    |


---

## 9) Open Questions and Deferred Decisions

- schemaVersion field when LoopHealthSnapshot exposed as API/event
- Gate-phase scoping: ~~return full snapshot (p1, p2, p3) or only current gate label?~~ **Resolved:** return full snapshot (all 3 labels for observability), but only the active gate's label drives `mode`. Non-active labels are informational. When `gatePhase` is undefined (background path), all labels contribute.

### Resolved design decisions

| Decision | Resolution |
|----------|------------|
| **`stateTrend7d === 'worsening'` in `assignP1Label`** | Removed from LOW_ENERGY condition. Worsening trend **caps mode at Neutral** (via `resolveMode`'s `hasStability` check) but does **not force Rescue**. LOW_ENERGY is only triggered by energy ≤ 2, sleep '<6', pressure ≥ 4, or backlogPressure ≥ 4. A recovering student with good current context gets Neutral, not Rescue. |

---

## References

- [ds-loop-health.md](../domainService/ds-loop-health.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [canvas-loop-health-assessment.md](../canvas-loop-health-assessment.md)
- [src/ei/domain/loop-health/loop-health-snapshot.ts](../../src/ei/domain/loop-health/loop-health-snapshot.ts) — P1Label, P2Label, P3Label, Mode, StateTrend, LoopHealthEvidence, LoopHealthSnapshot
- [src/ei/domain/loop-health/gate-context.ts](../../src/ei/domain/loop-health/gate-context.ts) — P1Context, P2Context, P3Context, GateContext, SleepBucket
- [src/ei/domain/loop-health/assess-loop-health.ts](../../src/ei/domain/loop-health/assess-loop-health.ts) — assignP1Label, assignP2Label, assignP3Label, resolveMode (canonical domain logic)
- [src/ei/domain/loop-health/tunables.ts](../../src/ei/domain/loop-health/tunables.ts) — classification thresholds (canonical)
- [src/ei/engine/classify.ts](../../src/ei/engine/classify.ts) (re-export bridge; backward compat only)
- [src/ei/engine/tunables.ts](../../src/ei/engine/tunables.ts) (re-export bridge; backward compat only)
- [EI_Engine_Taxonomy.md](../../EI_Engine_Taxonomy.md)
