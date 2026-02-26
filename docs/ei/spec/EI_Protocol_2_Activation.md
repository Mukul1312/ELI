# **EI Protocol 2 — Activation (Intent → Effort)**

### _Deep dive specification_

**Shared definitions (signals, modes, guardrails) live in** `EI_Protocols_Deep_Dive.md`.

---

## **Protocol 2: Activation (Intent → Effort)**

### **Objective**

- Convert intent into actual effort; reduce procrastination and friction.

### **Inputs (observable signals)**

- Start-latency
- Repeated switching / re-planning
- Prior compliance with verification (to avoid “avoidance disguised as flow”)

### **Classification (Rescue vs Boost)**

- **Rescue** when start-latency is high or repeated stalls occur.
- **Boost** when the student starts quickly and sustains focus (protect flow).
- **Neutral (fallback):** if neither triggers, provide a simple 30–120s `FirstAction` and proceed (no strict isolation, no “watch-only”).

### **Decision Contract (UI-agnostic output)**
At every Protocol 2 trigger (typically `IntentSet`), the system outputs an **ActivationPlan** that converts intent into effort with minimal friction, while preventing the “easy start → passive learning” loophole.

**Output:**
- `Mode ∈ { Rescue, Neutral, Boost }`
- `ActivationPlan`:
  - `firstAction` (30–120 seconds; impossible-to-refuse)
  - `timeboxMin` (optional; v1 defaults below)
  - `focusContract` (optional):
    - `noSwitchingUntil` (minutes)
    - `distractionBlockLevel ∈ { low, med, high }` (conceptual; UI later)
  - `replanCap` (optional): max allowed replans before forcing start
  - `allowedFallback` (optional): when “watch-only” is permitted (guarded)
- `Rationale` (short):
  - 1–2 lines referencing **State + Evidence + Adherence** (no shame language)

**Non-goal:** Protocol 2 does not “motivate” with speeches. It reduces activation energy and protects focus.

---

### **Precedence rules (conflict resolution)**
When signals conflict, follow this order:

1) **Stall overrides mood:** if StartLatency or replan-loop is high, route to Rescue even if Energy is high.  
2) **No passive loophole:** “watch-only” or ultra-easy starts are permitted only if Protocol 3 integrity remains healthy (minimum verification or near-term schedule).  
3) **Neutral by default:** if neither clearly stalled nor clearly flowing, issue a simple `firstAction` and proceed.  
4) **Boost protects flow (not volume):** Boost at Protocol 2 should primarily add isolation/timebox, not expand the day’s scope.  

---

### **Playbook (v1 implementable)**
Protocol 2 should select one play and emit the ActivationPlan accordingly.

#### **RESCUE plays (reduce activation energy)**
1) **P2-R1: Micro-start (default rescue)**
- **When:** STALLED or repeated stalls.
- **Output pattern:** `firstAction` that takes 30–120s and creates momentum:
  - “Open the exact resource and do step 1 only”
  - “Solve Q1 only”
  - “Write the first heading / derive the first formula”
- **Rationale:** “Start tiny. Motion creates motivation.”

2) **P2-R2: Two-minute rule**
- **When:** student is resisting starting; anxiety high; task feels heavy.
- **Output pattern:** `timeboxMin=2` with permission to stop after 2 minutes.
- **Guardrail:** if they stop, fall back to a smaller subtask, not a topic switch loop.
- **Rationale:** “We’re not committing to hours. Just 2 minutes.”

3) **P2-R3: Watch-only (guarded)**
- **When:** STALLED AND State is low OR student is overwhelmed.
- **Output pattern:** allow a low-friction effort form (video/reading) **only if**:
  - Protocol 3 will enforce `VerifyNow(minQuestions=1–3)` or `ScheduleVerify(24h)` at SessionEnd.
- **Rationale:** “If we go easy at the start, we still demand proof at the end.”

#### **NEUTRAL plays (default startability)**
4) **P2-N1: Standard firstAction (default neutral)**
- **When:** neither STALLED nor clearly FLOWING.
- **Output pattern:** `firstAction` + light `timeboxMin` (10–25) + no special constraints.
- **Rationale:** “Start clean. Keep it simple.”

5) **P2-N2: Anti-switch cap (break replan loops)**
- **When:** repeated switching/replanning is detected.
- **Output pattern:** `replanCap=2`; after 2 replans, force `P2-R1 Micro-start`.
- **Rationale:** “We plan once. Then we move.”

#### **BOOST plays (protect flow)**
6) **P2-B1: Isolation contract (default boost)**
- **When:** FLOWING and adherence is healthy.
- **Output pattern:** `focusContract` with `noSwitchingUntil=25–60` and higher distraction block level.
- **Rationale:** “You’re in flow. Protect it.”

7) **P2-B2: Hard-first start**
- **When:** BOOST eligible; want high-signal work without increasing volume.
- **Output pattern:** `firstAction` starts with the hardest 1–3 items (keep scope constant).
- **Rationale:** “Use willpower on the bottleneck first.”

8) **P2-B3: Continue-last (reduce context switching)**
- **When:** BOOST eligible and there is an active open thread (“last topic touched”).
- **Output pattern:** set `firstAction` to continue the last meaningful task to avoid re-warming costs.
- **Rationale:** “Continuation beats restarting.”

---

### **Defaults table (v1; tune later)**
| Mode | `timeboxMin` (default) | `replanCap` | FocusContract | AllowedFallback | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RESCUE** | 2–10 | 1–2 | low | watch-only allowed **only** with Protocol 3 enforcement | reduce friction; avoid shame |
| **NEUTRAL** | 10–25 | 2 | low/med | none | default startability |
| **BOOST** | 25–60 | 2 | med/high (`noSwitchingUntil`) | none | protect flow; don’t expand scope |

---

### **Tightness & escalation (v1 rules)**
Track counters over a rolling window (e.g., last 7 days):
- `stallCount7d` = # times `StartLatencyMin ≥ 15`
- `replanLoopCount7d` = # sessions with ≥2 replans before EffortStart
- `watchOnlyCount7d` = # rescue sessions using watch-only fallback

**Escalation rules (defaults):**
- If `stallCount7d ≥ 2` → default to **P2-R1 Micro-start** every IntentSet.
- If `replanLoopCount7d ≥ 2` → enforce `replanCap=2` and force start after cap.
- If `watchOnlyCount7d` rising AND Protocol 3 integrity drops → disallow watch-only; require Micro-start + minimum verification.

**De-escalation:**
- If StartLatency improves (≤3–5 min) for ~7 days, reduce constraints and allow Boost focus contracts more often.

---

### **Telemetry definitions (so Protocol 2 is measurable)**
#### **Core events**
- `IntentSet(topic, taskType, scope(optional), difficultyTier(optional), setAt)`
- `ActivationPlanIssued(mode, firstAction, timeboxMin(optional), focusContract(optional), replanCap(optional), issuedAt)`
- `Replan(reason(optional), replannedAt)`
- `FirstActionStarted(startedAt)`
- `EffortStart(topic, startedAt)` (may match FirstActionStarted; **optional/inferred in v1**)
- `SessionEnd(topic, endedAt)` (links to Protocol 3 integrity)

#### **Derived metrics (v1)**
- **StartLatencyMin** = `(EffortStart.startedAt OR FirstActionStarted.startedAt) - IntentSet.setAt`
- **ReplanRate** = `#Replan / #IntentSet` (rolling)
- **ActivationSuccessRate** = % intents that reach (EffortStart OR FirstActionStarted) within 15 minutes
- **Integrity guardrail check**: Start improvements must not reduce `VerificationRate7d`

---

### **Examples**
#### **Example A — Stalled start**
- Signals: StartLatencyMin=30, 2 replans
- Routing: RESCUE → **P2-R1 Micro-start** + enforce Protocol 3 minimum verification later

#### **Example B — Flowing start**
- Signals: StartLatencyMin=1–3, no replans, VerificationRate stable
- Routing: BOOST → **P2-B1 Isolation contract** (protect flow, don’t expand scope)

### **Interventions (menu)**
See the **Playbook (v1 implementable)** above (`P2-R*`, `P2-N*`, `P2-B*`).

### **Success metrics**
See **Derived metrics (v1)** under Telemetry definitions (`StartLatencyMin`, `ActivationSuccessRate`, `ReplanRate`) and the integrity guardrail check (VerificationRate must not drop).

### **Failure modes + guardrails**
See the shared guardrail **No passive learning loophole** and the Tightness/escalation rule that disables “watch-only” if Protocol 3 integrity drops.

### **Examples**
See the worked examples above in this Protocol 2 section.

