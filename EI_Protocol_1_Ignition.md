# **EI Protocol 1 — Ignition (State → Intent)**

### _Deep dive specification_

**Shared definitions (signals, modes, guardrails) live in** `EI_Protocols_Deep_Dive.md`.

---

## **Protocol 1: Ignition (State → Intent)**

### **Objective**

- Prevent unrealistic intent under low State; reduce Ambition Δ extremes; preserve momentum.

### **Inputs (observable signals)**

- State tags: energy, anxiety, sleep, backlog pressure
- Recent evidence: OpenLoops, VerificationRate trend, recent misses

### **Classification (Rescue vs Boost)**

- **Rescue** when State is low OR risk signals are elevated (e.g., OpenLoops rising).
- **Boost** when State is stable AND evidence supports increasing difficulty without harming integrity.
- **Neutral (fallback):** if neither triggers, apply a small margin negotiation (±10–20% scope) and set a light verification minimum.

### **Decision Contract (UI-agnostic output)**
At every Protocol 1 trigger (typically `AppOpen` / pre-session planning), the system outputs a **NegotiatedIntent** that is startable today and protects loop integrity.

**Output:**
- `Mode ∈ { Rescue, Neutral, Boost }`
- `NegotiatedIntent`:
  - `topic` (or `closeOpenLoop=true` for “close-first” days)
  - `taskType ∈ { learn, practice, revise }`
  - `scope` (timebox minutes or question-count; keep coarse in v1)
  - `difficultyTier ∈ { easy, med, hard, advanced }`
  - `verificationPlan` (minimum verification or schedule window; must not be omitted)

**Note (contract linkage):** `verificationPlan` is a **constraint**, not the verification UI itself. Protocol 3 implements it at `SessionEnd` via `VerificationDecision + VerificationSpec` (e.g., `VerifyNow(minQuestions=1–3)` or `ScheduleVerify(dueInHours=24–48)`).
- `Constraints` (optional):
  - e.g., “no new topic until 1 open loop is closed”
- `Rationale` (short):
  - 1–2 lines referencing **State + Evidence + Adherence** (no shame language)

**Non-goal:** Protocol 1 is not a task manager. It does not rewrite the week/month plan; it negotiates only the margin.

---

### **Precedence rules (conflict resolution)**
When signals conflict, follow this order:

1) **Risk overrides ambition:** if `OpenLoops` is high/rising or `SilenceDays` elevated, do not Boost even if Energy is high.  
2) **Pressure counts as low capacity:** high `Anxiety` / `BacklogPressure` routes toward Rescue/Neutral negotiation even if “Energy” is not low.  
3) **Integrity protection:** if adherence is weak (`VerificationRate7d` low), today’s intent must include a tighter `verificationPlan` (minimum verify or near-term schedule).  
4) **Boost requires evidence:** Boost is allowed only when State is stable and adherence is already healthy; otherwise use Neutral or Rescue.

---

### **Playbook (v1 implementable)**
Protocol 1 should select one play and emit the NegotiatedIntent accordingly.

#### **RESCUE plays (low capacity / elevated risk)**
1) **P1-R1: Minimum Viable Win (MVW)**
- **When:** LOW ENERGY or high pressure; goal is momentum without guilt.
- **Output pattern:** small scope (10–30 min), tier easy/med, `verificationPlan=minVerify(1–2Q)` or schedule within 24h.
- **Rationale:** “Tiny wins keep the loop alive.”

2) **P1-R2: Close-one-open-loop (integrity-first day)**
- **When:** `OpenLoops ≥ 3` or rising; verification debt accumulating.
- **Output pattern:** `closeOpenLoop=true` (choose the oldest/highest priority open loop), small scope, enforce Protocol 3 minimum verify.
- **Constraint:** “No new topic until 1 open loop is closed.”
- **Rationale:** “We clear learning debt before adding new debt.”

3) **P1-R3: Anxiety-safe negotiation (reduce scope, protect sleep)**
- **When:** Anxiety/backlog pressure high (revenge planning risk).
- **Output pattern:** reduce scope (cap), keep tier med, keep topic direction if possible, add verification minimum, add calm rationale.
- **Rationale:** “We match today’s plan to today’s capacity.”

#### **NEUTRAL plays (middle band)**
4) **P1-N1: Margin negotiation (±10–20%)**
- **When:** neither clear Rescue nor Boost.
- **Output pattern:** keep BaselineIntent direction, adjust scope slightly, keep tier med, `verificationPlan=minVerify(1–3Q)` or schedule 24–48h.
- **Rationale:** “Same direction, cleaner execution.”

5) **P1-N2: Integrity-first constraint (when adherence drifting)**
- **When:** State okay but `VerificationRate7d` drifting downward or LoopLatency rising.
- **Output pattern:** keep topic/scope mostly same, tighten verification plan (minimum verify or schedule window).
- **Rationale:** “Today’s priority is proof, not more hours.”

#### **BOOST plays (stable + high integrity)**
6) **P1-B1: Tier boost (difficulty > duration)**
- **When:** HIGH ENERGY + adherence strong + OpenLoops bounded.
- **Output pattern:** keep scope, raise `difficultyTier`, keep verification plan strong.
- **Rationale:** “Convert high energy into higher-signal work.”

7) **P1-B2: Challenge density boost (mixed/harder set)**
- **When:** BOOST eligible; want growth without burnout.
- **Output pattern:** same timebox, higher challenge density (harder problems, mixed set), verify now preferred.
- **Guardrail:** if `Efficiency Δ` is poor, convert this into a quality boost (method), not volume.
- **Rationale:** “Harder questions, not longer hours.”

8) **P1-B3: Weak-topic-first boost (only if integrity is stable)**
- **When:** BOOST eligible and AvoidanceLatency is rising on a weak/high-priority subject.
- **Output pattern:** re-route to weak topic with a tight scope + strong verification plan.
- **Rationale:** “Use your best state to attack the real bottleneck.”

---

### **Defaults (v1)**
- **Scope caps:** Rescue (10–30m), Neutral (30–60m), Boost (45–90m) — tune later.
- **VerificationPlan required:** every NegotiatedIntent must include either `minVerify` or `ScheduleVerify(24–48h)` (no “study-only intent”).
- **OpenLoops policy:** if `OpenLoops ≥ 3`, prefer P1-R2 before any Boost play.

### **Defaults table (v1; tune later)**
These are engine defaults; UI can expose them or keep them implicit.

| Mode | Scope (default) | `difficultyTier` | VerificationPlan (required) | Constraints (optional) | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RESCUE** | 10–30m (or 1–5Q) | easy/med | `minVerify(1–2Q)` or `ScheduleVerify(24h)` | if `OpenLoops ≥ 3` → close one first | protect State; reduce guilt; keep integrity |
| **NEUTRAL** | 30–60m (or 5–10Q) | med | `minVerify(1–3Q)` or `ScheduleVerify(24–48h)` | none by default | margin negotiation; low pressure |
| **BOOST** | 45–90m (or 10–20Q) | hard/advanced | prefer `minVerify(3–5Q+)` or VerifyNow bias | avoid new topics if open-loop debt rising | boost difficulty/density, not volume |

**Global v1 rules:**
- Every `NegotiatedIntent` must include a `verificationPlan` (no “study-only intent”).
- If `Efficiency Δ` is poor or `StateTrend` is declining, Boost becomes a **quality boost** (method), not “more work”.

---

### **BaselineIntentSeen interpretation (v1, “elder brother” constraint)**
If a BaselineIntent exists (week/month plan), EI does not rewrite it. It negotiates **at the margin**.

**Allowed adjustments (defaults):**
- Scope: ±10–20% (Neutral), larger only in Rescue (down) or in Boost (tier/density up).
- Difficulty: may shift tier by ±1 step if evidence supports it.
- Verification: may tighten the verification plan even when topic/scope stays the same.

**Not allowed (v1):**
- Re-allocating the entire week/month portfolio.
- Large topic reshuffles unless risk is high (e.g., OpenLoops spike) or AvoidanceLatency is critical.

**Override condition:**
- If risk is elevated (`OpenLoops ≥ 3`, `SilenceDays ≥ 2`, `VerificationRate7d < 0.60`), EI may temporarily enforce “close-one-open-loop first” before starting new intent.

---

### **Failure handling + escalation (v1 rules)**
Protocol 1 should adapt when it detects repeated breakdown patterns.

#### **Pattern A: Revenge planning / overreach**
Signals:
- high Anxiety/backlog + repeated high `ΔA` (IntentScore >> StateScore)
- repeated misses after high intent

Response:
- escalate to **P1-R3 (Anxiety-safe negotiation)** and cap scope for 1–2 sessions
- tighten verification plan to minimum proof (avoid “hours-only” plans)

#### **Pattern B: Repeated rejection / ignored intent**
Signals:
- `IntentResponse` frequently `rejected` or `ignored`
- StartLatency not improving or SilenceDays rising after issuance

Response:
- reduce negotiation complexity (switch to **P1-R1 MVW** or **P1-N1 margin**)
- shorten rationale, remove “stretch” language
- if ignored twice in a row → stop issuing Boost intents; issue Neutral intents with minimal constraints

#### **Pattern C: Open-loop debt accumulation**
Signals:
- `OpenLoops` rising or `LoopLatency` worsening

Response:
- enforce **P1-R2 close-one-open-loop** until OpenLoops is bounded
- temporary constraint: “no new topic until 1 open loop is closed”

#### **De-escalation (return autonomy)**
If `VerificationRate7d ≥ 0.75` AND `OpenLoops ≤ 2` for ~7 days:
- reduce constraints
- allow Boost plays again (tier/density first, volume last)

### **Interventions (menu)**
See the **Playbook (v1 implementable)** above (`P1-R*`, `P1-N*`, `P1-B*`) and the Defaults table for v1 parameters.

### **Success metrics**

- Ambition Δ reduces
- Start-latency decreases
- Intent completion improves without reducing verification

### **Telemetry definitions (so Protocol 1 is measurable)**
Protocol 1 is only “working” if it improves realism **and** makes starting easier. These events make that measurable.

#### **Core events**
- `AppOpen(energy, anxiety, sleepHours(optional), backlogPressure(optional), openedAt)`
- `BaselineIntentSeen(source, topic(optional), taskType(optional), scope(optional), difficultyTier(optional), seenAt)` (optional; only if a week/month plan exists)
- `NegotiatedIntentIssued(mode, topic, taskType, scope, difficultyTier, verificationPlan, constraints(optional), rationale(optional), issuedAt)`
- `IntentResponse(decision, respondedAt, reason(optional))`
  - `decision ∈ { accepted, edited, rejected, ignored }`
- `EffortStart(topic, startedAt)` (can be inferred from first meaningful study action)
- (Linkage) `SessionEnd(topic, endedAt)` and Protocol 3 events, when available

#### **Derived metrics (v1)**
- **IntentAcceptanceRate7d** = \(\frac{\#accepted + \#edited}{\#issued}\) (rolling 7d)
- **StartLatencyMin** = `EffortStart.startedAt - IntentResponse.respondedAt` (or `issuedAt` if ignored)
- **NegotiationFriction** increases when `rejected/ignored` rises or when StartLatency worsens after issuance
- **Ambition Δ (realism)** uses the appendix mapping below:
  - `StateScore` (1–10) derived from State taps
  - `IntentScore` (1–10) derived from scope + difficulty tier
  - \(\Delta_A = IntentScore - StateScore\)
  - Track `AmbitionΔ_baseline` (if BaselineIntentSeen exists) and `AmbitionΔ_negotiated` (after NegotiatedIntentIssued)

#### **How it ties to Protocol 2 and Protocol 3**
- Protocol 1 success should reduce **Protocol 2 stalls** (StartLatencyMin ↓).
- Protocol 1 success should not reduce **Protocol 3 integrity** (VerificationRate stable/rising; OpenLoops bounded).

### **Appendix: StateScore and IntentScore mapping (v1, coarse)**
This mapping exists only to make **Ambition Δ** measurable in early versions. It is intentionally coarse; tune later. Use it for **trend analysis**, not for shaming or hard-blocking by default.

#### **StateScore (capacity proxy; 1–10)**
Compute `StateScore` from a small number of taps.

- Start from `StateScore = 5`.
- **Energy (1–5):** add `(-2, -1, 0, +1, +2)` respectively.
- **SleepHours (optional):** add:
  - `<6h: -2`, `6–7h: -1`, `7–8h: 0`, `>=8h: +1`
- **Anxiety (1–5):** add `(+1, 0, -1, -2, -3)` respectively.
- **BacklogPressure (1–5):** add `(+1, 0, -1, -2, -3)` respectively.

Clamp to `[1..10]`.

#### **IntentScore (demand proxy; 1–10)**
Compute `IntentScore` from the negotiated plan output.

**If scope is a timebox:**
- `10–30m → 3`
- `31–60m → 5`
- `61–90m → 7`
- `>90m → 9`

**If scope is question-count (practice):**
- `1–3Q → 3`
- `4–10Q → 5`
- `11–20Q → 7`
- `>20Q → 9`

**DifficultyTier add-on:**
- `easy: +0`, `med: +1`, `hard: +2`, `advanced: +3`

Clamp to `[1..10]`.

#### **Ambition Δ (v1)**
Compute:

\(\Delta_A = IntentScore - StateScore\)

Interpretation (defaults):
- `ΔA ≥ +3`: likely overreach / guilt-planning risk → prefer Rescue/Neutral negotiation
- `ΔA ≤ -3`: likely sandbagging / under-aiming → Boost may be appropriate *if adherence is healthy*

### **Failure modes + guardrails**

- Over-reduction → learned helplessness (cap rescue streaks; require a climb-back plan)
- Over-stretch → burnout risk (use StateTrend + Efficiency Δ as brakes)

### **Examples (with StateScore / IntentScore)**
These are worked examples to make **Ambition Δ** tangible. Numbers use the v1 coarse mapping in the appendix.

#### **Example A — “Revenge planning” (high energy, high pressure)**
**Inputs (`AppOpen`):** Energy=4, SleepHours=7, Anxiety=5, BacklogPressure=5  

**StateScore (v1):**
- Start 5
- Energy=4 → +1 → 6
- Sleep 7h → +0 → 6
- Anxiety=5 → -3 → 3
- BacklogPressure=5 → -3 → 0 → clamp to **1**
- **StateScore = 1**

**Baseline intent (student):** “2 hours + hard tier problems”  

**NegotiatedIntentIssued:** Play **P1-R3 (Anxiety-safe negotiation)**
- Scope: 30m
- difficultyTier: med
- verificationPlan: `minVerify(1–2Q)` or `ScheduleVerify(24h)`

**IntentScore (v1):**
- 30m → 3
- med tier add-on → +1 → **4**

**Ambition Δ:** \(\Delta_A = 4 - 1 = +3\) → overreach risk → Rescue/Neutral negotiation.

---

#### **Example B — “Sandbagging topper” (under-aiming under high capacity)**
**Inputs (`AppOpen`):** Energy=5, SleepHours=8, Anxiety=1, BacklogPressure=2  

**StateScore (v1):**
- Start 5
- Energy=5 → +2 → 7
- Sleep ≥8h → +1 → 8
- Anxiety=1 → +1 → 9
- BacklogPressure=2 → +0 → **9**
- **StateScore = 9**

**Baseline intent (student):** “revise easy notes for 30m”  

**NegotiatedIntentIssued:** Play **P1-B1 (Tier boost)**
- Scope: keep 30m
- difficultyTier: hard
- verificationPlan: prefer `minVerify(3–5Q+)` / VerifyNow bias

**IntentScore (v1):**
- 30m → 3
- hard tier add-on → +2 → **5**

**Ambition Δ:** \(\Delta_A = 5 - 9 = -4\) → under-aiming → Boost is appropriate **if adherence is healthy**.

---

#### **Example C — “Open-loop debt day” (integrity-first constraint)**
**Inputs:** Energy=3, SleepHours=6.5, Anxiety=3, BacklogPressure=3, `OpenLoops=4`, `VerificationRate7d=0.55`  

**StateScore (v1):**
- Start 5
- Energy=3 → +0 → 5
- Sleep 6–7h → -1 → 4
- Anxiety=3 → -1 → 3
- BacklogPressure=3 → -1 → **2**
- **StateScore = 2**

**Routing:** Risk overrides ambition → enforce **P1-R2 (Close-one-open-loop)** until OpenLoops is bounded.
- Constraint: “No new topic until 1 open loop is closed.”
- verificationPlan: minimum proof required (ties into Protocol 3)

---

#### **Micro-example D — NEUTRAL (P1-N1 margin negotiation)**
**Inputs:** Energy=3, SleepHours=7, Anxiety=2, BacklogPressure=2  

**StateScore (v1):**
- Start 5
- Energy=3 → +0 → 5
- Sleep 7–8h → +0 → 5
- Anxiety=2 → +0 → 5
- BacklogPressure=2 → +0 → **5**
- **StateScore = 5**

**Baseline intent:** “45m medium practice”  

**NegotiatedIntentIssued:** Play **P1-N1 (±10–20% margin)**
- Scope: 40–50m (small adjustment)
- difficultyTier: med
- verificationPlan: `minVerify(1–3Q)` or `ScheduleVerify(24–48h)`

**IntentScore (v1):**
- 31–60m → 5
- med tier add-on → +1 → **6**

**Ambition Δ:** \(\Delta_A = 6 - 5 = +1\) → NEUTRAL is appropriate (keep direction, protect integrity).
