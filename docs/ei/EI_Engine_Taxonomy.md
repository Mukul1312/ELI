# EI Engine Taxonomy (Internal Contract)

This document defines the **internal routing taxonomy** and **output contracts** for EI. It is the shared contract for Engineering and Product.

## Boundary (MUST)

- **This document may define**: inputs, derived signals, derived labels, precedence rules, output shapes, tunable defaults.
- **This document must not define**: student-facing UI copy, prompt wording, or label meanings for scales.
  - Student-facing meanings live in `EI_UX_Scales.md`.
- **Storyboards must not invent scale meanings**; they must reference `EI_UX_Scales.md`.
- **Engine taxonomy must not invent UX copy**; it only defines logic and outputs.

---

## 1) Inputs (contracts)

### 1.1 Student-tapped inputs (from `EI_UX_Scales.md`)

Keys + allowed values (some are optional by design):

- `energy: 1|2|3|4|5` (required at `AppOpen`)
- `pressure: 1|2|3|4|5` (optional)
- `backlogPressure: 1|2|3|4|5` (optional)
- `sleepBucket: "<6"|"6-7"|"7-8"|">=8"` (optional)
- `difficultyTier: 1|2|3|4` (optional; only when the user selects difficulty)

Implementation note:
- Internally, `pressure` corresponds to the “anxiety/pressure” axis used in EI specs (naming differs; semantics are defined in `EI_UX_Scales.md`).

### 1.2 Core events (names + payload shapes)

These are the minimum events needed for routing and learning loop integrity.

Protocol 1 / ignition:
- `AppOpen(energy, pressure(optional), sleepBucket(optional), backlogPressure(optional), openedAt)`
- `BaselineIntentSeen(source, topic(optional), taskType(optional), scope(optional), difficultyTier(optional), seenAt)` (optional)
- `NegotiatedIntentIssued(mode, topic, taskType, scope, difficultyTier, verificationPlan, constraints(optional), rationale(optional), issuedAt)`
- `IntentResponse(decision, respondedAt, reason(optional))`
  - `decision ∈ { accepted, edited, rejected, ignored }`

Protocol 2 / activation:
- `IntentSet(topic, taskType, scope(optional), difficultyTier(optional), setAt)`
- `ActivationPlanIssued(mode, firstAction, timeboxMin(optional), focusContract(optional), replanCap(optional), allowedFallback(optional), rationale(optional), issuedAt)`
- `Replan(reason(optional), replannedAt)`
- `FirstActionStarted(startedAt)`
- `EffortStart(topic, startedAt)` (optional/inferred in v1)

Protocol 3 / verification:
- `SessionEnd(topic, endedAt)`
- `VerificationDecisionIssued(verificationDecision, verificationSpec(optional), deadlineSpec(optional), reason(optional), rationale(optional), issuedAt)`
- `VerificationCompleted(topic, completedAt, result(optional))` (optional; if captured)

Strategic adjustment (next-cycle):
- `StrategicAdjustmentDecision(adjustmentMode, nextCycleConstraints(optional), dials(optional), rationale(optional), issuedAt)`

---

## 2) Derived signals (definitions)

These are computed from events. Defaults are v1; tune later.

- `StartLatencyMin`: minutes from `IntentSet.setAt` to (`FirstActionStarted` or `EffortStart`)
- `VerificationRate7d`: rolling 7-day fraction of sessions that end in **retrieval now** OR in a **scheduled retrieval that is later honored**
- `ScheduleMisses7d`: rolling 7-day count of scheduled verifications that pass their deadline without completion
- `AvoidantExits7d`: rolling 7-day count of `SessionEnd` events with no retrieval now and no scheduled retrieval
- `skipCount7d`: rolling 7-day count of `VerificationDecisionIssued` events where `verificationDecision=SkipWithReason`
- `OpenLoops`: count of topics with Effort but Retrieval overdue (WIP debt)
- `LoopLatency(topic)`: time from Effort to Retrieval for the topic (use median/p50 in v1)
- `SilenceDays`: days since last meaningful event (`IntentSet` / `SessionEnd` / `VerificationCompleted`)
- `StateTrend7d`: coarse direction for state (e.g., improving/flat/worsening) based on available taps (energy/pressure/sleep/backlog)
- (Optional) `ScheduleHonoredRate7d`: schedules honored / schedules created (rolling 7d) using a fixed grace window

---

## 3) Derived labels (routing tags)

These labels are **routing bundles**, not traits. They exist to decide `mode ∈ {Rescue, Neutral, Boost}` at each gate.

### 3.1 Protocol 1 (Ignition) labels

**LOW_ENERGY** (v1 defaults; tunable) if any:
- `energy ≤ 2`, OR
- `sleepBucket = "<6"`, OR
- `pressure ≥ 4`, OR
- `backlogPressure ≥ 4`, OR
- `StateTrend7d = worsening` (if available)

**HIGH_ENERGY** (v1 defaults; tunable) if all:
- `energy ≥ 4`, AND
- `sleepBucket ∈ {"7-8", ">=8"}` (if known), AND
- `pressure ≤ 2` (if known), AND
- `backlogPressure ≤ 3` (if known), AND
- no active risk spike (e.g., `SilenceDays ≥ 2` or `OpenLoops ≥ 3`)

### 3.2 Protocol 2 (Activation) labels

**STALLED** (v1 defaults; tunable) if any:
- `StartLatencyMin ≥ 15`, OR repeated ≥10-minute stalls
- ≥2 `Replan` events before `FirstActionStarted`/`EffortStart`
- intent set but no start signal within a window (e.g., 20 minutes)

**FLOWING** (v1 defaults; tunable) if all:
- `StartLatencyMin ≤ 3`
- no repeated replans/switching during the start window
- not currently in a verification-avoidance pattern (see AVOIDANT)

### 3.3 Protocol 3 (Verification) labels

**AVOIDANT** (v1 defaults; tunable) if any:
- session ends with no retrieval now and no scheduled retrieval (`AvoidantExit`)
- `VerificationRate7d < 0.60`
- `OpenLoops ≥ 3` (or rising quickly)
- `SilenceDays ≥ 2`

**CONFIDENT** (v1 defaults; tunable) if all:
- session ends with retrieval now OR schedule is created within allowed window and is generally honored
- `VerificationRate7d ≥ 0.75`
- `OpenLoops ≤ 2`
- (if available) integrity signals are not worsening (e.g., efficiency trend not deteriorating)

### 3.4 NEUTRAL (fallback)

If none of the above labels are strongly met at a gate, route to **NEUTRAL** and enforce minimal integrity (especially at Protocol 3).

---

## 4) Precedence rules (MUST)

When signals conflict, apply in this order:

1) **Integrity-first**: at `SessionEnd`, if there is no retrieval now and no schedule, treat as AVOIDANT and route to Rescue.
2) **Risk overrides ambition**: if `OpenLoops` is high/rising or `SilenceDays` elevated, do not route to Boost even if state taps look strong.
3) **AVOIDANT overrides CONFIDENT**: “focus/effort” never counts as confidence if verification is skipped.
4) **Stall overrides mood**: at Protocol 2, STALLED routes to Rescue even if energy is high.
5) **Boost is never chosen from mood alone**: Boost eligibility requires stability + adherence (and ideally evidence).
6) **Quality-boost override**: if efficiency trend is poor or state trend is worsening, any boost should change method/format rather than increasing volume.

---

## 5) Gate contracts (outputs)

This section defines what each protocol must output. UI can render these outputs in many ways, but the **engine output shapes stay stable**.

### 5.1 Protocol 1 — Ignition (State → Intent)

**Trigger**: `AppOpen`

**Output**: `NegotiatedIntentIssued`

Fields:
- `mode ∈ { Rescue, Neutral, Boost }`
- `topic`
- `taskType ∈ { learn, practice, revise }`
- `scope` (coarse; timebox minutes or question-count)
- `difficultyTier ∈ { easy, med, hard, advanced }`
- `verificationPlan` (required; minimum verify or schedule window)
- `constraints(optional)` (e.g., close-loops-first constraints)
- `rationale(optional)` (internal explanation; not UI copy)

### 5.2 Protocol 2 — Activation (Intent → Effort)

**Trigger**: `IntentSet`

**Output**: `ActivationPlanIssued`

Fields:
- `mode ∈ { Rescue, Neutral, Boost }`
- `firstAction` (30–120s)
- `timeboxMin(optional)`
- `focusContract(optional)` (e.g., `noSwitchingUntil`, `distractionBlockLevel`)
- `replanCap(optional)`
- `allowedFallback(optional)` (e.g., when watch-only is permitted)
- `rationale(optional)` (internal explanation; not UI copy)

### 5.3 Protocol 3 — Verification (Effort → Retrieval)

**Trigger**: `SessionEnd`

**Output**: `VerificationDecisionIssued`

Fields:
- `verificationDecision ∈ { VerifyNow, ScheduleVerify, SkipWithReason }`
- `verificationSpec(optional)`:
  - `minQuestions`
  - `difficultyTier ∈ { easy, med, hard, advanced }`
  - `format ∈ { single_topic, mixed_set, recall, error_log }`
  - `timeboxSec(optional)`
- `deadlineSpec(optional)` (only if scheduled):
  - `dueInHours` or `dueAt`
  - `gracePolicy`
- `reason(optional)` (only if `verificationDecision=SkipWithReason`):
  - `reason ∈ { fatigue, time, confusion }` (v1 allowed set; tunable only with Product sign-off)
- `rationale(optional)` (internal explanation; not UI copy)

### 5.4 Strategic Adjustment (Next-cycle synthesis)

**Trigger**: scheduled weekly review OR risk-triggered wrap

**Output**: `StrategicAdjustmentDecision`

Fields:
- `adjustmentMode ∈ { Recovery, TechniquePivot, IntegrityClamp, DifficultyRaise, CloseLoopsFirst }`
- `nextCycleConstraints(optional)` (0–2):
  - examples: `maxOpenLoops=2`, `noNewTopicUntil=1LoopClosed`, `closeOldestOpenLoopFirst=true`
- `dials(optional)` (tunable defaults applied across Protocols 1–3):
  - examples: `minQuestionsDefault`, `dueInHoursDefault`, `scheduleAllowed`, `difficultyTierDelta`, `scopeMultiplier`
- `rationale(optional)` (internal explanation; not UI copy)

---

## 6) Tunables (Defaults v1; tune later)

Keep tunables centralized here so iteration doesn’t rewrite contracts.

### 6.0 Anti-gaming policy placeholders (v1; NOT UI)

These are **policy knobs** referenced in `Unified_Master_Doc.md`. They belong to the engine layer (and later to Strategic Adjustment), not to storyboards or UI copy.

- `writeOffTokensPerMonth = 2`
  - Purpose: allow a limited number of penalty-free drops without breaking trust.
  - Notes: token usage should be logged for integrity analysis, but raw reasons should remain private by default.
- `writeOffTokenConsumptionRules` (placeholder; define later with Product):
  - which `SkipWithReason.reason` values consume a token (if any)
  - whether tokens apply per calendar month or rolling 30 days
  - what happens when tokens are exhausted (e.g., tighter verification defaults; smaller scope; close-loops-first constraints)

### 6.1 Risk-trigger thresholds (v1 defaults)

| Signal | Default threshold | Expected effect (engine-side) |
| --- | --- | --- |
| `SilenceDays` | `≥ 2` | bias Protocol 1 to Rescue/Neutral; consider close-loops constraint |
| `OpenLoops` | `≥ 3` or rising | prefer `adjustmentMode=CloseLoopsFirst`; enforce close-one-before-new |
| `VerificationRate7d` | `< 0.60` or falling | bias Protocol 3 toward `VerifyNow` minimums; reduce scheduling freedom |
| `ScheduleMisses7d` | `≥ 2` | treat scheduling as weak adherence; prefer `VerifyNow(1–3)`; may set `scheduleAllowed=false` temporarily |
| `AvoidantExits7d` | `≥ 2` | next `SessionEnd` must output a Trojan Horse-style minimum proof |
| `skipCount7d` | `≥ 3` | tighten next Protocol 1/3: smaller scope + minimum verification (protect integrity, reduce load) |

### 6.2 Tightness policy (v1 defaults)

- `minQuestionsDefault ∈ {1, 3, 5}`
- `dueInHoursDefault ∈ {24, 48}`
- `scheduleAllowed: boolean`
- close-loops constraints:
  - `maxOpenLoops` (e.g., 2)
  - `noNewTopicUntil=1LoopClosed`
  - `closeOldestOpenLoopFirst=true`

---

## 7) Worked routing examples (v1; MAY)

Keep examples short and purely structural (no UX copy).

### Example A — S7 “risk overrides mood”

Inputs:
- `energy=5`, `pressure=1`, `OpenLoops=4`, `VerificationRate7d≈0.55`, `ScheduleMisses7d≥2`

Routing:
- Protocol 1: `mode=Rescue|Neutral` with close-loops constraint (no new topic until 1 loop closed)
- Protocol 3: `verificationDecision=VerifyNow` with `minQuestions=1` (or strict schedule window if low capacity)

### Example B — “revenge planning” (high energy, high pressure)

Inputs:
- `energy=4`, `pressure=5`, `backlogPressure=5`

Routing:
- Protocol 1: `mode=Rescue|Neutral` (pressure counts as low capacity); reduce scope; keep verification minimal but non-zero

### Example C — avoidant exit

Inputs:
- `SessionEnd` with no retrieval and no schedule OR `AvoidantExits7d≥2`

Routing:
- Protocol 3: `mode=Rescue`, output `verificationDecision=VerifyNow` with tiny `minQuestions` and near-term deadline policy if scheduled.

