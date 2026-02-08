# **Execution Intelligence (EI) — Scenarios**

### _Realistic student journeys for sanity-checking protocols_

---

## **How to use this document**

This doc is a **reality harness** for EI. It keeps the system “human-correct” by stress-testing:

- The **Protocol Matrix** labels (LOW/HIGH ENERGY, STALLED/FLOWING, AVOIDANT/CONFIDENT)
- The **mode routing** (Rescue vs Boost) using **State + Evidence + Adherence**
- The **guardrails** (no learned helplessness; no burnout-by-boosting; no passive loopholes)

**Source of truth:**
- Canonical definitions live in `EI_Spec.md`.
- Protocol shared definitions + index live in `EI_Protocols_Deep_Dive.md` (full deep dives are in `EI_Protocol_1_Ignition.md`, `EI_Protocol_2_Activation.md`, `EI_Protocol_3_Verification.md`).

---

## **Scenario Template (copy/paste)**

### **Scenario ID / Name**

### **Student archetype**
- (e.g., topper / average / drifting / burnout-risk / anxious-high-energy / inconsistent-but-talented)

### **BaselineIntent (planning style)**
- **Cadence:** weekly / monthly / daily improviser
- **Ownership:** self-planned / coaching-driven / mixed
- **Notes:** any constraints (school hours, coaching tests, commute)

### **Week timeline (7–10 events)**
Write events as structured bullets. Prefer EI event names where possible.

- **Day 1**
  - `AppOpen`: Energy=?, Anxiety=?, SleepHours=? (optional)
  - `IntentSet`: Topic=?, TaskType=learn|practice|revise, DifficultyTier=?
  - `EffortStart`
  - `SessionEnd`: Duration=?, Focus proxy=? (optional)
  - `Retrieval`: `VerifyNow` or `ScheduleVerify(+1d/+2d)` or `SkipWithReason(reason)`
- **Day 2**
  - ...
- **Day 3**
  - ...

### **Observed signals (what EI can compute)**
- **State**: Energy/Anxiety/Sleep/BacklogPressure (+ trend if visible)
- **Adherence**:
  - `StartLatencyMin` (per session + trend)
  - `VerificationRate7d` (or a short rolling estimate for week)
  - `SilenceDays`
  - `OpenLoops` (and whether rising)
- **Evidence**:
  - Deltas (if available): Ambition Δ, Execution Δ, Efficiency Δ, Perception Δ
  - Latency: `LoopLatency(topic)`, `AvoidanceLatency(subject)`
  - Topic memory: `TMS(topic)`, `ΔDecay`

### **Matrix classification (with why)**
Classify only when relevant to the gate(s) that fired.

- **Protocol 1 (Ignition)**: LOW ENERGY or HIGH ENERGY — why?
- **Protocol 2 (Activation)**: STALLED or FLOWING — why?
- **Protocol 3 (Verification)**: AVOIDANT or CONFIDENT — why?

### **Expected protocol routing (Rescue/Boost)**
For each gate that occurs in the timeline, specify the expected response.

- **Protocol 1 (State → Intent)**:
  - Mode: Rescue/Boost
  - Expected output: `NegotiatedIntent` (scope/difficulty + verification minimum)
- **Protocol 2 (Intent → Effort)**:
  - Mode: Rescue/Boost
  - Expected output: `FirstAction` / focus contract / timebox
- **Protocol 3 (Effort → Retrieval)**:
  - Mode: Rescue/Boost
  - Expected output: `VerifyNow` vs `ScheduleVerify` rules; difficulty tier; error-log requirement

### **Failure risk (misclassification traps + guardrail invoked)**
- **Trap**: (e.g., “FLOWING but actually avoiding retrieval”)
- **Guardrail**: (e.g., “AVOIDANT overrides CONFIDENT”; “Boost becomes quality boost when Efficiency Δ is poor”)
- **What EI should do instead**: (one line)

### **Success criteria (what should move)**
Choose 2–4 metrics for the scenario.

- `VerificationRate` ↑
- `LoopLatency(topic)` ↓
- `OpenLoops` ↓ / bounded
- `StartLatencyMin` ↓
- (Optional) Efficiency Δ improves; StateTrend stabilizes

---

## **Scenario Library (index)**

- **S1:** Topper, high integrity (Boost-eligible)
- **S2:** Anxious-high-energy overplanner (pressure → negotiate; avoid volume-boost)
- **S3:** Stalled starter (Activation rescue)
- **S4:** Flowing-but-avoidant (AVOIDANT overrides)
- **S5:** Burnout runway + silence (minimal prompts; rescue)
- **S6:** Grinder: verifies but learns inefficiently (quality boost / technique pivot)

---

## **S1 — Topper, high integrity**

### **Student archetype**
- topper / high autonomy / high adherence

### **BaselineIntent (planning style)**
- **Cadence:** weekly
- **Ownership:** self-planned (coaching provides constraints)

### **Week timeline (7–10 events)**
- **Day 1**
  - `AppOpen`: Energy=5, Anxiety=1, SleepHours=7.5
  - `IntentSet`: Topic=Physics_Rotation, TaskType=practice, DifficultyTier=hard
  - `EffortStart` (StartLatencyMin=1)
  - `SessionEnd`
  - `Retrieval`: `VerifyNow` (mixed set)
- **Day 3**
  - `IntentSet`: Topic=Math_Calc, TaskType=practice, DifficultyTier=hard
  - `EffortStart` (StartLatencyMin=2)
  - `SessionEnd`
  - `Retrieval`: `VerifyNow`
- **Day 6**
  - `IntentSet`: Topic=Chem_Organic, TaskType=revise, DifficultyTier=med
  - `EffortStart` (StartLatencyMin=1)
  - `SessionEnd`
  - `Retrieval`: `ScheduleVerify(+1d)`

### **Observed signals**
- **State**: stable high
- **Adherence**: StartLatency low; VerificationRate7d ~0.85–0.95; SilenceDays=0; OpenLoops ≤ 1
- **Evidence**: integrity strong; no rising latency/WIP

### **Matrix classification (with why)**
- **P1:** HIGH ENERGY (Energy high, Anxiety low, no risk spike)
- **P2:** FLOWING (starts immediately, no replans)
- **P3:** CONFIDENT (verifies now/schedules; OpenLoops bounded; rate high)

### **Expected protocol routing**
- **P1:** BOOST (stretch difficulty/challenge density, not nagging)
- **P2:** BOOST (protect flow via isolation/timebox)
- **P3:** BOOST (harder tier / mixed set / error-log when appropriate)

### **Failure risk**
- **Trap**: over-Rescue feels patronizing → disengagement
- **Guardrail**: Boost requires Evidence+Adherence (which they have)

### **Success criteria**
- Maintain VerificationRate high; LoopLatency low; OpenLoops bounded

---

## **S2 — Anxious-high-energy overplanner (revenge planning)**

### **Student archetype**
- anxious-high-energy / guilt-driven planning

### **BaselineIntent (planning style)**
- **Cadence:** monthly (but reacts daily after mocks)
- **Ownership:** coaching-driven syllabus + self-added backlog

### **Week timeline (7–10 events)**
- **Day 1 (after bad mock)**
  - `AppOpen`: Energy=4, Anxiety=5, SleepHours=7
  - `IntentSet`: Topic=Physics_Waves, TaskType=learn, DifficultyTier=hard (overscoped)
  - No `EffortStart` for 20m (StartLatencyMin=20)
- **Day 2**
  - `AppOpen`: Energy=4, Anxiety=4
  - `IntentSet`: Topic=Math_Algebra, TaskType=practice, DifficultyTier=med
  - `EffortStart` (StartLatencyMin=8)
  - `SessionEnd`
  - `Retrieval`: `ScheduleVerify(+2d)`

### **Observed signals**
- **State**: energy okay but pressure high (anxiety/backlog)
- **Adherence**: start latency moderate; VerificationRate mid; OpenLoops 1–2
- **Evidence**: Ambition Δ risk (intent overshoots capacity)

### **Matrix classification (with why)**
- **P1:** LOW ENERGY (triggered via Anxiety/BacklogPressure high → low capacity)
- **P2:** STALLED (day 1 start latency ≥ 15)
- **P3:** NEUTRAL early (not avoidant, not confident yet)

### **Expected protocol routing**
- **P1:** RESCUE/NEUTRAL negotiation (reduce scope; keep dignity; set verification minimum)
- **P2:** RESCUE (micro-start)
- **P3:** NEUTRAL (minimum verify 1–3Q or schedule within 24–48h)

### **Failure risk**
- **Trap**: treating “Energy=4” as Boost → burnout spiral
- **Guardrail**: Boost not chosen from mood alone; pressure counts as LOW ENERGY/low capacity

### **Success criteria**
- StartLatency ↓; OpenLoops bounded; VerificationRate ↑ without increasing anxiety

---

## **S3 — Stalled starter (procrastination loop)**

### **Student archetype**
- average / inconsistent starts / decent once engaged

### **BaselineIntent (planning style)**
- **Cadence:** weekly
- **Ownership:** mixed

### **Week timeline (7–10 events)**
- **Day 1**
  - `AppOpen`: Energy=3, Anxiety=3, SleepHours=6.5
  - `IntentSet`: Topic=Chem_Physical, TaskType=practice, DifficultyTier=med
  - `EffortStart` (StartLatencyMin=35)
  - `SessionEnd`
  - `Retrieval`: `VerifyNow` (1–3 Q)
- **Day 4**
  - `IntentSet`: Topic=Physics_Electro, TaskType=learn, DifficultyTier=med
  - No `EffortStart` for 25m → replan → `EffortStart` (StartLatencyMin=30)
  - `SessionEnd`
  - `Retrieval`: `ScheduleVerify(+1d)`

### **Observed signals**
- **State**: mid
- **Adherence**: StartLatency high; VerificationRate ~0.6–0.75; OpenLoops 1–2

### **Matrix classification (with why)**
- **P2:** STALLED (StartLatency ≥ 15, replans)
- **P3:** NEUTRAL/CONFIDENT depending on verification consistency

### **Expected protocol routing**
- **P2:** RESCUE (friction-lowering first action)
- **P3:** NEUTRAL (minimum verify or schedule within 24–48h)

### **Failure risk**
- **Trap**: mislabeling as “lazy” and tightening too hard
- **Guardrail**: Rescue evolves; focus on start friction, not shame

### **Success criteria**
- StartLatencyMin ↓; Session completion ↑; VerificationRate stable/rising

---

## **S4 — Flowing-but-avoidant (avoidance disguised as productivity)**

### **Student archetype**
- drifting / starts fast / avoids verification and weak subjects

### **BaselineIntent (planning style)**
- **Cadence:** weekly
- **Ownership:** self-planned

### **Week timeline (7–10 events)**
- **Day 1**
  - `AppOpen`: Energy=4, Anxiety=2, SleepHours=7
  - `IntentSet`: Topic=Chem_Inorganic, TaskType=learn, DifficultyTier=easy
  - `EffortStart` (StartLatencyMin=2)
  - `SessionEnd`
  - `Retrieval`: (none) exits
- **Day 2**
  - repeats “study” + exit without retrieval
- **Day 4**
  - `SilenceDays` grows; OpenLoops=4; VerificationRate7d ~0.4

### **Observed signals**
- **Adherence**: starts quickly but verification avoidance; OpenLoops rising

### **Matrix classification (with why)**
- **P2:** NOT FLOWING (blocked by “verification-avoidance pattern” rule)
- **P3:** AVOIDANT (no verify; VerificationRate low; OpenLoops ≥ 3)

### **Expected protocol routing**
- **P3:** RESCUE (trojan horse: 1 question now / schedule verify) + tighten integrity

### **Failure risk**
- **Trap**: treating “starts immediately” as Boost → accelerates avoidance
- **Guardrail**: AVOIDANT overrides; Boost requires adherence

### **Success criteria**
- VerificationRate ↑; OpenLoops ↓; LoopLatency ↓

---

## **S5 — Burnout runway + silence**

### **Student archetype**
- burnout-risk / disappearing behavior

### **BaselineIntent (planning style)**
- **Cadence:** coaching-driven weekly plan
- **Ownership:** low

### **Week timeline (7–10 events)**
- **Day 1**
  - `AppOpen`: Energy=2, Anxiety=4, SleepHours=5.5, BacklogPressure=5
  - `IntentSet`: Topic=Math_Trigo, TaskType=practice, DifficultyTier=easy
  - no `EffortStart`
- **Day 2–3**
  - `SilenceDays=3`
  - OpenLoops=5 (from prior effort without retrieval)

### **Observed signals**
- **State**: LOW ENERGY triggers (sleep low, anxiety high)
- **Adherence**: SilenceDays ≥ 2; OpenLoops high; VerificationRate collapsing

### **Matrix classification (with why)**
- **P1:** LOW ENERGY
- **P3:** AVOIDANT (silence + WIP)

### **Expected protocol routing**
- **P1:** RESCUE (minimum viable win; protect sleep)
- **P3:** RESCUE but low-pressure (minimum verify or schedule; avoid over-testing)

### **Failure risk**
- **Trap**: too many prompts → dropout
- **Guardrail**: Rescue aims to reduce friction; verification minimum adapts to State

### **Success criteria**
- SilenceDays ↓ (re-engagement); OpenLoops bounded; gentle VerificationRate recovery

---

## **S6 — Grinder: verifies but learns inefficiently (technique pivot)**

### **Student archetype**
- hardworking grinder / high effort / poor technique

### **BaselineIntent (planning style)**
- **Cadence:** monthly plan
- **Ownership:** mixed

### **Week timeline (7–10 events)**
- **Day 1**
  - `AppOpen`: Energy=3, Anxiety=2, SleepHours=6.5
  - `IntentSet`: Topic=Physics_Current, TaskType=learn, DifficultyTier=med
  - `EffortStart` (StartLatencyMin=3)
  - `SessionEnd`
  - `Retrieval`: `VerifyNow` (score low)
- **Day 3**
  - repeats: effort + verify; still low retrieval

### **Observed signals**
- **Adherence**: healthy (VerificationRate high; OpenLoops low)
- **Evidence**: Efficiency Δ deteriorating (effort not converting to retrieval)

### **Matrix classification (with why)**
- **P3:** neither AVOIDANT nor CONFIDENT (verification integrity is fine, but Efficiency Δ is deteriorating)
- Route should be **NEUTRAL + quality boost** (technique pivot, not volume)

### **Expected protocol routing**
- **P3:** NEUTRAL (keep minimum verification) + **quality boost** (error-log, retrieval-first, PYQ-first), not quantity

### **Failure risk**
- **Trap**: interpreting low retrieval as laziness → “study more” → burnout
- **Guardrail**: when Efficiency Δ is poor, Boost becomes quality boost (method), not volume

### **Success criteria**
- Efficiency Δ improves; LoopLatency stays low; StateTrend stable

---

## **S7 — High energy + high OpenLoops (risk overrides mood)**

### **Student archetype**
- high energy / ambitious / but “learning debt” accumulating (does a lot, closes little)

### **BaselineIntent (planning style)**
- **Cadence:** weekly
- **Ownership:** self-planned
- **Notes:** tends to start new topics when excited

### **Week timeline (7–10 events)**
- **Day 1**
  - `AppOpen`: Energy=5, Anxiety=1, SleepHours=8
  - `IntentSet`: Topic=Math_Integration, TaskType=learn, DifficultyTier=hard
  - `EffortStart` (StartLatencyMin=2)
  - `SessionEnd`
  - `Retrieval`: `ScheduleVerify(+2d)` (does not complete later)
- **Day 2**
  - `AppOpen`: Energy=4, Anxiety=2, SleepHours=7.5
  - `IntentSet`: Topic=Physics_Electro, TaskType=learn, DifficultyTier=hard
  - `EffortStart` (StartLatencyMin=1)
  - `SessionEnd`
  - `Retrieval`: `ScheduleVerify(+2d)` (missed)
- **Day 3**
  - repeats new topic + schedules verify; misses again
- **Day 4**
  - `OpenLoops=4` (rising), `VerificationRate7d~0.40–0.55`, `SilenceDays=0` (still active)
- **Day 5**
  - `AppOpen`: Energy=5, Anxiety=1
  - Student sets a big intent again (new topic)

### **Observed signals**
- **State**: HIGH ENERGY (Energy≥4, Anxiety low, sleep okay)
- **Adherence**:
  - StartLatencyMin low (starts immediately)
  - **OpenLoops ≥ 3 and rising**
  - ScheduleMisses7d elevated (missed scheduled verifies)
  - VerificationRate7d depressed
- **Evidence**:
  - Latency/WIP worsening (LoopLatency and OpenLoops)
  - (Optional) Efficiency Δ unknown early

### **Matrix classification (with why)**
- **P1:** HIGH ENERGY by mood, but **risk spike present** (OpenLoops≥3) → cannot treat as “Boost day”
- **P2:** FLOWING (StartLatency≤3, no replans) but must be guarded by adherence risk
- **P3:** AVOIDANT/at-risk-by-scheduling (verification not happening; schedules missed → open loops)

### **Expected protocol routing (Rescue/Boost)**
- **Protocol 1 (Ignition)**:
  - Mode: **RESCUE/NEUTRAL (risk override)**
  - Expected output: `NegotiatedIntent` with **closeOpenLoop=true** or “close-first constraint”
  - Constraint: “No new topic until 1 open loop is closed”
- **Protocol 2 (Activation)**:
  - Mode: **NEUTRAL/BOOST-lite**
  - Expected output: still protect flow, but do **not** expand scope; keep start friction low
- **Protocol 3 (Verification)**:
  - Mode: **RESCUE**
  - Expected output: prefer `VerifyNow(minQuestions=1)` or `ScheduleVerify(dueInHours=24)` with strict miss consequences

### **Failure risk (misclassification traps + guardrail invoked)**
- **Trap**: “High energy + starts fast” misread as Boost → more new topics → OpenLoops explode
- **Guardrail**: **Risk overrides ambition**; “Boost requires adherence; OpenLoops bounded”
- **What EI should do instead**: convert energy into **debt paydown** (close one loop) + minimum verification

### **Success criteria**
- `OpenLoops` ↓ / bounded
- `ScheduleMisses7d` ↓
- `VerificationRate7d` ↑
- LoopLatency(topic) ↓

---

## **S8 — ScheduleVerify spammer (scheduling only counts if later honored)**

### **Student archetype**
- avoids discomfort by “promising later”
- appears compliant on paper (always schedules) but rarely honors

### **BaselineIntent (planning style)**
- **Cadence:** daily improviser
- **Ownership:** self-planned
- **Notes:** good at “looking busy”; weak follow-through on verification

### **Week timeline (7–10 events)**
- **Day 1**
  - `AppOpen`: Energy=3, Anxiety=2, SleepHours=7
  - `IntentSet`: Topic=Chem_Organic, TaskType=learn, DifficultyTier=med
  - `EffortStart` (StartLatencyMin=5)
  - `SessionEnd`
  - `Retrieval`: `ScheduleVerify(+1d)` (not honored)
- **Day 2**
  - `ScheduleMissed` (derived)
  - New session on different topic
  - `SessionEnd` → `ScheduleVerify(+1d)` again (missed)
- **Day 3**
  - repeats schedule; misses again
- **Day 4**
  - `scheduleMisses7d=3`, `OpenLoops=3–5`, `VerificationRate7d` looks “okay” if you incorrectly count scheduling as success
- **Day 5**
  - still schedules, still doesn’t verify

### **Observed signals**
- **State**: mid/okay (not LOW ENERGY)
- **Adherence**:
  - `RetrievalScheduled` is frequent
  - **ScheduleMissed is frequent**
  - `OpenLoops` rising
  - `LoopLatency(topic)` worsening
- **Evidence**:
  - Adherence integrity is low despite “commitments”

### **Matrix classification (with why)**
- **P3:** should be treated as **AVOIDANT-like** behavior because “schedule” is being used as an exit hatch
- **Key rule**: scheduling counts only if honored at a reasonable rate (misses increase risk weight)

### **Expected protocol routing (Rescue/Boost)**
- **Protocol 3 (Verification)**:
  - Mode: **RESCUE**
  - Expected output after `scheduleMisses7d ≥ 2`:
    - prefer `VerifyNow(minQuestions=1–3)` over scheduling
    - if scheduling allowed: `dueInHours=24` + explicit grace policy; missed → OpenLoop + tighten next time
- **Protocol 1 (Ignition)** (secondary effect):
  - Mode: **RESCUE/NEUTRAL**
  - Expected output: smaller scope + “close-one-open-loop” bias until OpenLoops bounded
- **Protocol 2 (Activation)**:
  - Mode: NEUTRAL (start friction isn’t the issue)
  - Expected output: standard first action; no extra pressure needed here

### **Failure risk (misclassification traps + guardrail invoked)**
- **Trap**: counting `ScheduleVerify` as compliance forever → system thinks adherence is good → never tightens
- **Guardrail**: “Scheduling only counts as adherence if later honored”; misses increase risk weight; escalation ladder shifts to VerifyNow
- **What EI should do instead**: convert schedule spam into minimum VerifyNow or a stricter window

### **Success criteria**
- `ScheduleMisses7d` ↓
- `OpenLoops` ↓ / bounded
- `LoopLatency(topic)` ↓
- `VerificationRate7d` ↑ (counting verified + honored schedules)