# Fix: New users incorrectly get Rescue mode at P1 gate

## Context

A new user with excellent state (energy=4, sleepBucket="7-8", pressure=1, backlogPressure=1) gets `mode="Rescue"` and `playId="P1-R1"` instead of `mode="Boost"`. The P1 label correctly computes to `HIGH_ENERGY`, but a fabricated P3 default context forces the mode to Rescue before P1 ever gets evaluated.

## Root Cause

`assessLoopHealth()` in `src/ei/domain/loop-health/assess-loop-health.ts` always evaluates **all 3 labels** (P1, P2, P3), even when only one gate is active. Two issues combine:

1. **`defaultP3Context()` (line 189-191)** returns `{ hasRetrieval: false, hasSchedule: false }` — semantically "no evidence yet" but the P3 classifier treats it identically to "actively avoiding verification"
2. **Mode resolution loop (line 218-227)** iterates all 3 labels. `resolveMode('AVOIDANT')` returns `'Rescue'` immediately (line 133), breaking the loop before the `HIGH_ENERGY` P1 label can contribute `'Boost'`

**Execution trace proving the bug:**
- P1: `assignP1Label({energy:4, sleep:'7-8', pressure:1, backlog:1}, healthyAggs)` → `HIGH_ENERGY`
- P2: `assignP2Label(defaultP2Ctx, healthyAggs)` → `NEUTRAL`
- P3: `assignP3Label({hasRetrieval:false, hasSchedule:false}, healthyAggs)` → `AVOIDANT` (line 106: `!false && !false` = true)
- Mode loop: `resolveMode('HIGH_ENERGY')` → `Boost`, then `resolveMode('NEUTRAL')` → `Neutral`, then `resolveMode('AVOIDANT')` → **`Rescue`** — overrides everything

---

## Audit Against DDD Strategic Design Documents

### canvas-loop-health-assessment.md

| Contract/Decision | Fix compliance |
|---|---|
| "Single place for 'what is healthy' — own thresholds, precedence rules" | All threshold and label logic remains in assess-loop-health.ts. No changes to thresholds or label assignment functions. |
| "LoopHealthSnapshot contract: labels (p1, p2, p3) + mode + evidence" | Snapshot still contains all 3 labels + mode + evidence. Shape unchanged. No contract break. |
| "Risk overrides ambition: openLoops≥3 overrides HIGH_ENERGY" | Preserved — `resolveMode('HIGH_ENERGY', aggregates)` checks `hasRiskSignals` (openLoops>=3, silenceDays>=2, verificationRate<0.60). Risk flows through aggregates, not cross-protocol labels. |
| "Thresholds and labels owned here; changing thresholds doesn't require Runtime changes" | No change to ownership boundary. |
| **UL: "AVOIDANT: P3 label: verification avoidance; low rate, high openLoops"** | AVOIDANT still means this — but a fabricated default context with no observation shouldn't produce it. |
| **UL: "Precedence rules: AVOIDANT overrides CONFIDENT, openLoops≥3 overrides HIGH_ENERGY"** | Both preserved: (a) AVOIDANT still overrides CONFIDENT within P3 (assignP3Label checks AVOIDANT first). (b) openLoops≥3 overrides HIGH_ENERGY through aggregates in resolveMode, not through cross-protocol labels. |

### loop-health-assessment-tactical-spec.md

| Spec item | Fix compliance |
|---|---|
| **§4 Invariant 1: Determinism** | Same inputs → same output. With gatePhase='P1', same P1 context + aggregates always produce the same snapshot. |
| **§4 Invariant 2: Risk overrides ambition** | Preserved — `resolveMode()` risk-signal and stability checks still run on the active label. `resolveMode('HIGH_ENERGY', {openLoops:4})` still returns 'Neutral' (risk blocks Boost). |
| **§4 Invariant 3: Privacy-safe evidence** | No change to evidence shape. |
| **§4 Invariant 4: Single interpretation** | All interpretation stays in LoopHealthAssessment. |
| **§9 Open Question: "Gate-phase scoping: return full snapshot (p1, p2, p3) or only current gate label?"** | **This fix resolves this open question.** Answer: return full snapshot (all 3 labels for observability), but only use the active gate's label for mode resolution. |

### canvas-ei-runtime.md

| Contract/Decision | Fix compliance |
|---|---|
| **UL: "LOW_ENERGY / HIGH_ENERGY: assigned by LHA; consumed by P1 gate handler"** | P1 labels drive mode at P1 gate — exactly what the fix achieves. |
| **UL: "AVOIDANT / CONFIDENT: assigned by LHA; consumed by P3 gate handler"** | P3 labels drive mode at P3 gate, not at P1 gate. Fix corrects this violation. |
| "Risk over mood: High energy alone does not permit Boost when adherence risk is high (openLoops, scheduleMisses, silence)" | Risk signals are **aggregate-based** (openLoops, scheduleMisses, silence) not cross-protocol-label-based. `resolveMode()` still enforces this. |
| "Boost requires adherence" | `resolveMode()` `hasStability` check (openLoops<=2, scheduleMisses<=1, verificationRate>=0.75) still enforces this. |

### ei-runtime-tactical-spec.md

| Spec item | Fix compliance |
|---|---|
| **§10 Routing matrix:** AppOpen→P1, IntentSet→P2, SessionEnd→P3 | Each command maps to ONE protocol. Mode should be driven by that protocol's label. Fix aligns with this. |
| **§12 RunP1GateHandler algorithm:** "2. Assess loop health → LoopHealthSnapshot → 4. Resolve mode" | The mode still comes from the snapshot. Fix changes how mode is computed within the snapshot. |
| **§6 Invariant: "Lifecycle ordering"** | No change to session lifecycle or aggregate invariants. |

### ds-loop-health.md (Domain Service Design)

| Spec item | Fix compliance |
|---|---|
| "Input: gateContext: P1Context \| P2Context \| P3Context" — discriminated union, one at a time | Confirms design: one gate context per invocation. Non-active gates use fabricated defaults, which shouldn't override the actual gate. |
| "Stateless — no identity, no persistence" | No state introduced. Still pure function. |

### 09-tactical-ddd-candidates.md

| Spec item | Fix compliance |
|---|---|
| "LoopHealth: Domain Service; interpret metrics to labels + LoopHealthSnapshot" | Unchanged. Still a stateless domain service. |
| "LoopHealthSnapshot: Labels + evidence output contract; consumed by Runtime, SA, Radar" | Contract shape unchanged. All 3 labels still present. |

### canvas-ei-projections.md

| Spec item | Fix compliance |
|---|---|
| "Numeric evidence only: Projections supply numbers; interpretation (labels) belongs to LHA" | No change to boundary. |

### EI_Spec.md Precedence Rules

| Rule | Fix compliance |
|---|---|
| "AVOIDANT overrides CONFIDENT" | Within-P3 rule. Still enforced: `assignP3Label()` checks AVOIDANT before CONFIDENT. |
| "BOOST is never chosen from mood alone. Requires State + Evidence + Adherence" | `resolveMode()` enforces all three: State (the label), Evidence (hasStability), Adherence (hasRiskSignals). No change. |

### topic-loop-tactical-spec.md

| Spec item | Fix compliance |
|---|---|
| "TopicLoop: per (studentId, topicId) effort→verification lifecycle" | No change. TopicLoop feeds into StudentAggregates which feeds into LoopHealth. Fix is purely in LoopHealth mode resolution. |
| "Monotonic topic state; replaceability from events" | Unaffected. |
| "Cross-topic aggregates (openLoops count) — lives in StudentAggregates" | Confirmed: openLoops flows through aggregates → resolveMode, not through TopicLoop→P3 label. |

### student-policy-tactical-spec.md

| Spec item | Fix compliance |
|---|---|
| "Initial: No policy row until SA has run; protocols treat null policy as default (no constraints)" | Confirmed: `resolveMode()` accepts optional policy. For new users, policy is undefined. No change. |
| "Single writer: Only SA writes policy. P1/P2/P3 read; they never write" | No change to read/write boundary. |
| "SA influence flows through the policy record, not through StudentPolicy directly" | Confirmed: policy still flows through resolveMode as optional param. |

### student-aggregates-tactical-spec.md

| Spec item | Fix compliance |
|---|---|
| "Initial: Row absent until first recompute; protocols treat null as default zeroes" | Confirmed: RunP1GateHandler defaults (verificationRate7d=1.0, openLoops=0, silenceDays=0). These "safe defaults" should produce healthy assessment — fix ensures they do. |
| **§10 Test: "No events → All counts zero; rates 1.0 (safe defaults)"** | Safe defaults + HIGH_ENERGY state now correctly → Boost, not Rescue. This validates the fix intent. |
| "Replaceability: Aggregates can be fully recomputed from Ledger events" | Unaffected. |
| "Label computation — lives in LoopHealthAssessment" | Confirmed: our fix is in LoopHealthAssessment only. |

---

## Fix (Hybrid: gate-phase-primary + fix defaults)

### Change 1: Gate-phase-primary mode resolution

**File:** `src/ei/domain/loop-health/assess-loop-health.ts` — lines 218-227

When `gatePhase` is specified, resolve mode using ONLY the active gate's label. Other labels remain in the snapshot for observability/consumers. When `gatePhase` is undefined (background recompute), preserve current all-labels behavior.

```typescript
// BEFORE (lines 218-227):
const labels: (P1Label | P2Label | P3Label)[] = [p1, p2, p3];
let mode: Mode = 'Neutral';
for (const lbl of labels) {
  const m = resolveMode(lbl, aggregates, policy);
  if (m === 'Rescue') {
    mode = 'Rescue';
    break;
  }
  if (m === 'Boost') mode = 'Boost';
}

// AFTER:
let mode: Mode;
if (gatePhase) {
  const activeLabel = gatePhase === 'P1' ? p1 : gatePhase === 'P2' ? p2 : p3;
  mode = resolveMode(activeLabel, aggregates, policy);
} else {
  mode = 'Neutral';
  const labels: (P1Label | P2Label | P3Label)[] = [p1, p2, p3];
  for (const lbl of labels) {
    const m = resolveMode(lbl, aggregates, policy);
    if (m === 'Rescue') { mode = 'Rescue'; break; }
    if (m === 'Boost') mode = 'Boost';
  }
}
```

**Why correct per spec:** Each gate label is consumed by its own gate handler (canvas-ei-runtime.md UL). The adherence risk signals (openLoops, silenceDays, verificationRate, scheduleMisses) already feed into `resolveMode()` through aggregates — so genuine avoidance patterns still surface at P1 without needing a fabricated P3 label.

### Change 2: Fix `defaultP3Context()` (defense-in-depth)

**File:** `src/ei/domain/loop-health/assess-loop-health.ts` — lines 189-191

```typescript
// BEFORE:
function defaultP3Context(): P3Context {
  return { hasRetrieval: false, hasSchedule: false };
}

// AFTER:
function defaultP3Context(): P3Context {
  return { hasRetrieval: true, hasSchedule: true };
}
```

**Why correct:** `hasRetrieval`/`hasSchedule` are session-specific observations from SessionEnd (P3 gate). When P3 hasn't run yet, `true` means "we have no evidence of avoidance in a session that hasn't happened yet" — semantically correct. The aggregate-based conditions (`verificationRate7d < 0.60`, `openLoops >= 3`, `silenceDays >= 2`) still correctly catch historical avoidance patterns. This also ensures the stored `p3` label in the snapshot is more accurate for informational consumers (Radar, SA).

### Change 3: Comprehensive storyboard-based test suite

**File:** `src/ei/tests/unit/domain/loop-health/assess-loop-health.test.ts`

Add the following test blocks. These test the `assessLoopHealth` domain function directly with realistic data from all three storyboards.

#### 3a) Gate-phase-primary regression tests (4 tests)

```
describe('Gate-phase-primary mode resolution')
  - "P1: new user HIGH_ENERGY → Boost" (the exact reported bug)
  - "P2: FLOWING at P2 gate → not overridden by P1/P3 defaults"
  - "P3: AVOIDANT at actual P3 gate → still Rescue"
  - "undefined gatePhase: all labels contribute (background path)"
```

#### 3b) S2 Revenge Planning storyboard tests (4 tests)

Per `EI_Storyboard_S2_RevengePlanning_Day1-21.md`:

```
describe('S2 Revenge Planning — mode transition arc')

  Day 1 — P1 Rescue (high pressure overrides high energy):
    P1Context: { energy:4, sleepBucket:'6-7', pressure:5, backlogPressure:4 }
    aggregates: { openLoops:0, verificationRate7d:1.0, silenceDays:0, stateTrend7d:'flat', scheduleMisses7d:0, ... }
    gatePhase: 'P1'
    → p1: LOW_ENERGY (pressure >= 4)
    → mode: Rescue

  Day 2 — P1 Rescue (still high pressure):
    P1Context: { energy:4, sleepBucket:'7-8', pressure:4, backlogPressure:3 }
    aggregates: { openLoops:0, verificationRate7d:1.0, silenceDays:0, scheduleMisses7d:0, ... }
    gatePhase: 'P1'
    → p1: LOW_ENERGY (pressure >= 4)
    → mode: Rescue

  Day 5-7 — P1 Neutral (pressure normalizes):
    P1Context: { energy:3, sleepBucket:'7-8', pressure:2, backlogPressure:2 }
    aggregates: { openLoops:1, verificationRate7d:0.8, silenceDays:0, scheduleMisses7d:0, ... }
    gatePhase: 'P1'
    → p1: NEUTRAL (energy < 4 → not HIGH_ENERGY; nothing triggers LOW_ENERGY)
    → mode: Neutral

  Day 16-18 — P1 Boost (autonomy returns):
    P1Context: { energy:4, sleepBucket:'7-8', pressure:1, backlogPressure:1 }
    aggregates: { openLoops:1, verificationRate7d:0.85, silenceDays:0, scheduleMisses7d:0, stateTrend7d:'flat', ... }
    gatePhase: 'P1'
    → p1: HIGH_ENERGY
    → mode: Boost (stable aggregates, no risk)
```

#### 3c) S5 Burnout Runway storyboard tests (4 tests)

Per `EI_Storyboard_S5_BurnoutRunway_Day1-21.md`:

```
describe('S5 Burnout Runway — mode transition arc')

  Day 1 — P1 Rescue (critical state):
    P1Context: { energy:2, sleepBucket:'<6', pressure:4, backlogPressure:5 }
    aggregates: { silenceDays:0, stateTrend7d:'worsening', verificationRate7d:0.5, openLoops:2, ... }
    gatePhase: 'P1'
    → p1: LOW_ENERGY (energy<=2 AND sleep<6 AND pressure>=4 AND backlog>=4 AND worsening)
    → mode: Rescue

  Day 4 — P1 Rescue (re-entry after silence, still low energy):
    P1Context: { energy:2, sleepBucket:'6-7', pressure:3, backlogPressure:3 }
    aggregates: { silenceDays:3, openLoops:0, verificationRate7d:1.0, stateTrend7d:'worsening', ... }
    gatePhase: 'P1'
    → p1: LOW_ENERGY (energy<=2 AND stateTrend7d worsening)
    → mode: Rescue

  Day 8-10 — P1 Neutral (slow recovery):
    P1Context: { energy:3, sleepBucket:'7-8', pressure:2, backlogPressure:2 }
    aggregates: { silenceDays:0, openLoops:1, verificationRate7d:0.8, stateTrend7d:'flat', scheduleMisses7d:0, ... }
    gatePhase: 'P1'
    → p1: NEUTRAL
    → mode: Neutral

  Day 16-18 — P1 Boost (recovery complete):
    P1Context: { energy:4, sleepBucket:'7-8', pressure:1, backlogPressure:1 }
    aggregates: { openLoops:0, verificationRate7d:0.9, silenceDays:0, scheduleMisses7d:0, stateTrend7d:'improving', ... }
    gatePhase: 'P1'
    → p1: HIGH_ENERGY
    → mode: Boost
```

#### 3d) S7 Ambitious storyboard tests (5 tests)

Per `EI_Storyboard_S7_Day1-21.md`:

```
describe('S7 Ambitious — mode transition arc')

  Day 1 — P1 Boost (fresh ambitious student):
    P1Context: { energy:5, sleepBucket:'>=8', pressure:1, backlogPressure:1 }
    aggregates: { openLoops:0, verificationRate7d:1.0, silenceDays:0, scheduleMisses7d:0, stateTrend7d:'flat', ... }
    gatePhase: 'P1'
    → p1: HIGH_ENERGY
    → mode: Boost
    NOTE: This is the EXACT scenario that was broken before the fix

  Day 3 — P1 Boost (still high energy, checks deferred but aggregates not yet bad):
    P1Context: { energy:5, sleepBucket:'>=8', pressure:1, backlogPressure:2 }
    aggregates: { openLoops:1, verificationRate7d:1.0, silenceDays:0, scheduleMisses7d:1, stateTrend7d:'flat', ... }
    gatePhase: 'P1'
    → p1: HIGH_ENERGY
    → mode: Boost (scheduleMisses=1 ≤ 1, openLoops=1 ≤ 2 → stability holds)
    NOTE: verificationRate stays 1.0 because ScheduleVerify counts as commitment

  Day 4 — P1 risk blocks Boost (openLoops pile up):
    P1Context: { energy:5, sleepBucket:'>=8', pressure:1, backlogPressure:3 }
    aggregates: { openLoops:3, verificationRate7d:1.0, silenceDays:0, scheduleMisses7d:3, stateTrend7d:'flat', ... }
    gatePhase: 'P1'
    → p1: NEUTRAL (openLoops>=3 blocks HIGH_ENERGY in assignP1Label; energy still good)
    → mode: Neutral (risk blocks both label and Boost)
    NOTE: assignP1Label requires openLoops < threshold for HIGH_ENERGY; risk flows into label, not just mode

  Day 5 — P1 Neutral (student starts clearing):
    P1Context: { energy:5, sleepBucket:'>=8', pressure:1, backlogPressure:2 }
    aggregates: { openLoops:2, verificationRate7d:1.0, silenceDays:0, scheduleMisses7d:2, stateTrend7d:'flat', ... }
    gatePhase: 'P1'
    → p1: HIGH_ENERGY
    → mode: Neutral (scheduleMisses=2 > 1 → stability fails → no Boost)

  Day 8-10 — P1 Boost (sustained improvement):
    P1Context: { energy:5, sleepBucket:'>=8', pressure:1, backlogPressure:1 }
    aggregates: { openLoops:1, verificationRate7d:0.85, silenceDays:0, scheduleMisses7d:1, stateTrend7d:'flat', ... }
    gatePhase: 'P1'
    → p1: HIGH_ENERGY
    → mode: Boost (openLoops<=2, scheduleMisses<=1, verRate>=0.75 → stable)
```

#### 3e) S7 P3 avoidant at actual gate (1 test)

```
describe('S7 P3 — avoidant at SessionEnd')

  Day 3 SessionEnd — P3 AVOIDANT (student defers with no retrieval/schedule):
    P3Context: { hasRetrieval:false, hasSchedule:false }
    aggregates: { openLoops:3, verificationRate7d:0.5, silenceDays:0, avoidantExits7d:2, ... }
    gatePhase: 'P3'
    → p3: AVOIDANT
    → mode: Rescue
    NOTE: At P3 gate with real P3 context, AVOIDANT correctly produces Rescue
```

### Existing tests impact

| Test | Before fix | After fix | Assertion | Status |
|------|-----------|-----------|-----------|--------|
| S2 lowCapacity (P1, pressure=5) | mode=Rescue | mode=Rescue | `['Rescue','Neutral']` contains mode | PASS |
| S5 lowEnergy (P1, energy=2, worsening) | mode=Rescue | mode=Rescue | `toBe('Rescue')` | PASS |
| S7 avoidantRisk (P3, openLoops=4) | mode=Rescue | mode=Rescue | `toBe('Rescue')` | PASS |
| Precedence: risk overrides HIGH_ENERGY | resolveMode unit test | no change | `toBe('Neutral')` | PASS |
| AVOIDANT→Rescue | resolveMode unit test | no change | `toBe('Rescue')` | PASS |
| STALLED→Rescue | resolveMode unit test | no change | `toBe('Rescue')` | PASS |
| Determinism | `a.toEqual(b)` | `a.toEqual(b)` (mode changes from Rescue→Neutral but both calls produce same result) | PASS |
| Privacy | checks evidence keys | no change | PASS |

### Tactical spec open question (resolved)

The fix resolves the open question in `loop-health-assessment-tactical-spec.md §9`:
> "Gate-phase scoping: return full snapshot (p1, p2, p3) or only current gate label?"

**Answer:** Return full snapshot (all 3 labels) but only the active gate's label drives `mode`. Non-active labels are informational. When `gatePhase` is undefined, all labels contribute (backward compat for background jobs).

Optionally update §9 to mark this as resolved.

---

## Metric mapping (storyboard → engine)

For storyboard-aligned tests and product copy:

| Storyboard term | Engine aggregate | Notes |
|-----------------|------------------|-------|
| **Pending checks** | `pendingChecks` | Topics with effort (SessionEnd) but no retrieval yet. From TopicState: `lastEffortAt` set, `lastRetrievalAt` absent or older. |
| **openLoops** | `openLoops` | Topics with scheduled verification past due and not yet retrieved. Distinct from pendingChecks. |
| **verificationRate7d** | `verificationRate7d` | `verified / sessionEnds` (RetrievalVerified + VerificationCompleted only). RetrievalScheduled does **not** count toward the rate. |
| **assignP1Label HIGH_ENERGY** | `openLoops < OPEN_LOOPS_THRESHOLD` (3) | When openLoops ≥ 3, p1 is NEUTRAL even if energy/sleep/pressure are ideal. Risk blocks the label, not just mode. |

---

## Files Modified

| File | Change | Lines |
|------|--------|-------|
| `src/ei/domain/loop-health/assess-loop-health.ts` | Fix `defaultP3Context()` defaults | 189-191 |
| `src/ei/domain/loop-health/assess-loop-health.ts` | Gate-phase-primary mode resolution | 218-227 |
| `src/ei/tests/unit/domain/loop-health/assess-loop-health.test.ts` | Add ~18 regression + storyboard tests | new blocks |

**No changes to:** LoopHealthSnapshot contract, tunables, gate-context types, AssessLoopHealthCommand, RunP1GateHandler, RunP2GateHandler, RunP3GateHandler, ViewComposer, plays.ts, escalation.ts, TopicLoop, StudentPolicy, StudentAggregates.

## Verification

1. Run loop-health tests: `npx vitest run src/ei/tests/unit/domain/loop-health/`
2. Run full test suite: `npx vitest run`
3. Manual test: send AppOpen with `{energy:4, sleepBucket:"7-8", pressure:1, backlogPressure:1}` for a new user — should return `mode:"Boost"` not `"Rescue"`
4. Manual test: send AppOpen with `{energy:2, sleepBucket:"<6", pressure:4, backlogPressure:5}` — should still return `mode:"Rescue"` (LOW_ENERGY P1 label)
5. Check that a user with bad aggregates (openLoops=4, verificationRate=0.5) and energy=4 gets `mode:"Neutral"` (risk overrides ambition via aggregates, not via fabricated P3 label)
