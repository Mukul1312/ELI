# StudentPolicy — Tactical DDD Spec

> Docs-only specification for implementing StudentPolicy. Source: [agg-student-policy.md](../aggregates/agg-student-policy.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md).

---

## 1) Purpose and Boundary

- **Aggregate root:** StudentPolicy
- **Aggregate type:** Hybrid — Strategic Adjustment emits `StrategicAdjustmentDecision` (command); Projections persist the resulting policy state.
- **Identity:** `studentId` — one instance per student.
- **Responsibility:** Hold next-cycle policy semantics: tightness level, dials, and constraints. Written by Strategic Adjustment; read by P1/P2/P3 for gate decisions.
- **Non-goals (outside StudentPolicy):**
  - Per-topic policy — not here; policy applies across all topics for the student.
  - Policy computation logic — lives in Strategic Adjustment (SA owns semantics).
  - Storage implementation — lives in EI Projections (`ei_student_policy`).
  - Protocol gate decisions — SA influence flows through the policy record, not through StudentPolicy directly.

---

## 2) Ubiquitous Language (Tactical Terms)

| Term | Definition |
|------|------------|
| StudentPolicyId | Identity of this aggregate: `{ studentId }` |
| StudentId | Student identifier (string; server-derived) |
| TightnessLevel | Enum: `Loose`, `Normal`, `Tight` — how strictly protocols enforce integrity |
| AdjustmentMode | SA decision mode: `Recovery`, `TechniquePivot`, `IntegrityClamp`, `DifficultyRaise`, `CloseLoopsFirst` |
| Dials | Numeric adjustment factors (e.g. `scopeMultiplier`, `difficultyTierDelta`) |
| Constraints | Hard guardrails (e.g. `maxOpenLoops`, `noNewTopicUntil`, `closeOldestOpenLoopFirst`) |
| StrategicAdjustmentDecision | The command/event that carries new policy values; emitted by SA |
| IssuedAt | ISO datetime when SA decision was made |

---

## 3) State Model

| Field | Type | Semantics |
|-------|------|-----------|
| studentId | string | Identity |
| tightnessLevel | `Loose` \| `Normal` \| `Tight` | How strictly protocols enforce integrity |
| adjustmentMode | string or null | Current SA mode |
| dials | `{ scopeMultiplier?, difficultyTierDelta? }` | Adjustment factors |
| constraints | `{ maxOpenLoops?, noNewTopicUntil?, closeOldestOpenLoopFirst? }` | Hard guardrails |
| updatedAt | ISO datetime | When policy was last replaced |

- **Lifecycle:** No explicit lifecycle states. Each `StrategicAdjustmentDecision` atomically replaces the previous policy.
- **Initial:** No policy row until SA has run at least once; protocols treat null policy as default (no constraints applied).

---

## 4) Invariants (Must Hold Atomically)

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md) and [agg-student-policy.md](../aggregates/agg-student-policy.md):

1. **Atomic write:** Policy is written atomically (all fields replaced together). No partial updates.
2. **Single writer:** Only Strategic Adjustment writes policy. P1/P2/P3 read; they never write.
3. **Replaceability:** Policy can be recomputed from `StrategicAdjustmentDecision` events in the Ledger.
4. **Projections own storage:** EI Projections own the `ei_student_policy` table; SA owns semantics. SA does not write to Projections DB directly.

---

## 5) Commands and Decisions

StudentPolicy accepts one command type: `ApplyStrategicAdjustmentDecision`.

| Command | Required fields | Decision logic | State change |
|---------|-----------------|----------------|--------------|
| ApplyStrategicAdjustmentDecision | studentId, tightnessLevel, adjustmentMode, dials, constraints, issuedAt | Always apply (replace); validate required fields present | Replace all policy fields atomically |

---

## 6) Domain Events Consumed / Produced

### Consumed

| Event type | Key fields for StudentPolicy |
|------------|------------------------------|
| StrategicAdjustmentDecision | studentId, tightnessLevel, adjustmentMode, dials, constraints, issuedAt |

### Produced

StudentPolicy does not emit new domain events. It updates `ei_student_policy` only.

---

## 7) Ports (Interfaces — Docs Level)

| Port | Role | Responsibility |
|------|------|----------------|
| **StudentPolicyRepository** | Driven | Load by `studentId`; save/upsert policy state |
| **IStrategicAdjustmentDecisionEventReader** | Driven | Read latest `StrategicAdjustmentDecision` from Ledger for a student (used for replay/recompute) |

- Repository interface lives in `domain/student-policy/repository.ts`.
- Event reader interface lives in `application/apply-strategic-adjustment-decision/port.ts`.
- `PostgresStrategicAdjustmentDecisionEventReader` implements the reader over `ei_events` via `queryEvents`.
- Application handler lives in `application/apply-strategic-adjustment-decision/handler.ts`.
- Adapter implements `IStudentPolicyRepository` over `ei_student_policy` using `upsertPolicy` from `db/queries.ts`.

---

## 8) Application Use-Case Contract

**Use case:** `ApplyStrategicAdjustmentDecision`

| Aspect | Specification |
|--------|---------------|
| **Input** | `StrategicAdjustmentDecision` event payload with validated fields |
| **Output** | Updated StudentPolicy persisted to `ei_student_policy` |
| **Errors** | Missing `studentId` (reject); invalid `tightnessLevel` enum (reject) |
| **Idempotency** | Same decision applied twice → same result (upsert semantics; last-write-wins per `issuedAt`) |
| **Preconditions** | Decision schema validated by Ledger before projection consumes |

---

## 9) Consistency and Concurrency Rules

| Rule | Description |
|------|-------------|
| Single writer | Only SA writes policy. No concurrent writers per `studentId`. |
| Conflict handling | Full replace: newer `StrategicAdjustmentDecision` overwrites older. |
| Ordering | SA decisions are infrequent (weekly / risk-triggered); ordering by `issuedAt` is sufficient. |
| Recompute | Replay all `StrategicAdjustmentDecision` events in Ledger order → same final policy. |

---

## 10) Test Strategy (Spec Tests)

| Scenario | Input | Expected outcome |
|----------|-------|------------------|
| First decision | `StrategicAdjustmentDecision` on new student | Policy created with given fields |
| Replace existing | Second decision with different tightnessLevel | Policy fully replaced; old dials/constraints gone |
| Idempotent apply | Same decision applied twice | Same final state; no duplicate side-effects |
| Null policy read | No decision yet for student | Repository returns null; protocols use defaults |
| Invalid tightnessLevel | Unknown enum value | Reject at use-case boundary; no state change |
| Missing studentId | Decision without studentId | Reject; no state change |
| Recompute from Ledger | Replay all decisions in order | Final policy matches last decision |

---

## 11) Open Questions and Deferred Decisions

- Policy versioning / history for audit (currently only current state is stored).
- Behavior during SA recompute: should protocols see stale policy or wait?
- `issuedAt` as tiebreaker: if two decisions have the same `issuedAt`, which wins?

---

## References

- [agg-student-policy.md](../aggregates/agg-student-policy.md)
- [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [canvas-strategic-adjustment.md](../canvas-strategic-adjustment.md)
