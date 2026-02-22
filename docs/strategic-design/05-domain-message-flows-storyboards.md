# Domain Message Flows - Storyboards (S2, S5, S7)

This document captures Domain Message Flow Modelling (DMF) for the three detailed storyboard journeys:

- `S2` Revenge planning after a bad mock
- `S5` Burnout runway plus silence
- `S7` High energy with rising pending checks

It follows the DMF guidance in [../domain-modelling-flow.md](../domain-modelling-flow.md) and maps interactions onto bounded contexts from [03-context-map.md](03-context-map.md).

---

## DMF notation and assumptions

- **Diagram type:** Mermaid `sequenceDiagram` (best fit for ordered message exchange).
- **Message kinds:** `C/` command, `Q/` query, `R/` response, `E/` domain event.
- **Payload hints:** each message includes only significant fields (not full schema).
- **Student-facing wording:** "Pending checks" corresponds to open retrieval loops (`openLoops` + schedule misses influence).
- **Scope level:** one canonical interaction loop per storyboard, with `alt/opt/loop` blocks for important branches.

### Participants used

- `Student` - user actor.
- `Runtime` - EI Runtime bounded context (gate orchestration and protocol outputs).
- `Projections` - EI Projections bounded context (aggregates/state/policy reads).
- `LoopHealth` - LoopHealthAssessment bounded context (labels and evidence synthesis).
- `StrategicAdj` - Strategic Adjustment bounded context (policy decisions to Projections).
- `Ledger` - EI Event Ledger bounded context (append-only source of truth).
- `Radar` - Institute Radar bounded context (privacy-safe risk signaling).

---

## S2 DMF - Revenge planning after a bad mock

Scenario intent: pressure is high despite decent energy, so Runtime must negotiate scope and force a tiny start plus tiny proof-of-learning.

```mermaid
sequenceDiagram
    autonumber
    participant Student
    participant Runtime
    participant Projections
    participant LoopHealth
    participant Ledger

    Note over Student,Runtime: Day1 trigger - bad mock result, high pressure
    Student->>Runtime: C/AppOpen {energy=4, pressure=5}
    Runtime->>Projections: Q/GetStudentSignals {studentId, horizon=7d}
    Projections-->>Runtime: R/Signals {startLatency, openLoops, verificationRate7d}
    Runtime->>LoopHealth: Q/AssessLoopHealth {state, signals}
    LoopHealth-->>Runtime: R/LoopHealthSnapshot {p1=lowCapacity, p2=stalledRisk}
    Runtime-->>Student: C/NegotiatedIntentIssued {scope=smaller, firstAction=2minStart}
    Runtime->>Ledger: E/NegotiatedIntentIssued {scope, verificationMinimum}

    Student->>Runtime: C/SessionEnd {topic, effortSummary}
    alt Verify now
        Student->>Runtime: C/VerifyNow {minQuestions=1}
        Runtime->>Ledger: E/RetrievalVerified {questions=1}
    else Remind in 24h
        Student->>Runtime: C/ScheduleVerify {dueInHours=24}
        Runtime->>Ledger: E/RetrievalScheduled {dueAt}
    else Skip with reason
        Student->>Runtime: C/SkipWithReason {reason}
        Runtime->>Ledger: E/RetrievalSkipped {reason}
    end

    loop Day2_to_Day21 pressure days
        Student->>Runtime: C/AppOpen {energy=3to4, pressure=3to4}
        Runtime-->>Student: C/ActivationPlanIssued {smallWin, oneSetOneCheck}
    end
```

---

## S5 DMF - Burnout runway plus silence

Scenario intent: re-entry and dignity preservation are primary. DMF emphasizes low-pressure rescue, silence handling, and minimal compliance asks.

```mermaid
sequenceDiagram
    autonumber
    participant Student
    participant Runtime
    participant Projections
    participant LoopHealth
    participant Radar
    participant Ledger

    Note over Student,Runtime: Day1 low energy + high pressure
    Student->>Runtime: C/AppOpen {energy=2, sleepDebt=true, pressure=4, backlogPressure=5}
    Runtime->>Projections: Q/GetStudentSignals {studentId, horizon=7d}
    Projections-->>Runtime: R/Signals {silenceDays, openLoops, verificationRate7d}
    Runtime->>LoopHealth: Q/AssessLoopHealth {state, signals}
    LoopHealth-->>Runtime: R/LoopHealthSnapshot {p1=lowEnergy, p3=avoidant}
    Runtime-->>Student: C/NegotiatedIntentIssued {mode=rescue, plan=fiveMinuteWin}
    Runtime->>Ledger: E/NegotiatedIntentIssued {mode=rescue, intent=tiny}

    opt SilenceDays >= 2
        LoopHealth->>Radar: E/LoopHealthSnapshotPublished {risk=disengagement, privacySafeEvidence}
    end

    Note over Student,Runtime: Re-entry day flow
    Student->>Runtime: C/SessionEnd {tinyEffortDone}
    alt Tiny verify now
        Student->>Runtime: C/VerifyNow {minQuestions=1}
        Runtime->>Ledger: E/RetrievalVerified {questions=1}
    else 24h reminder
        Student->>Runtime: C/ScheduleVerify {dueInHours=24}
        Runtime->>Ledger: E/RetrievalScheduled {dueAt}
    else Skip with reason
        Student->>Runtime: C/SkipWithReason {reason in [time,fatigue,confusion]}
        Runtime->>Ledger: E/RetrievalSkipped {reason}
    end
```

---

## S7 DMF - High energy with rising pending checks

Scenario intent: risk overrides mood. Even with high energy and fast starts, rising open loops and missed schedules force close-loop-first constraints.

```mermaid
sequenceDiagram
    autonumber
    participant Student
    participant Runtime
    participant Projections
    participant LoopHealth
    participant StrategicAdj
    participant Ledger

    Note over Student,Runtime: Day1-Day4 pattern - fast starts, delayed verification
    Student->>Runtime: C/AppOpen {energy=5, anxiety=1}
    Runtime->>Projections: Q/GetStudentSignals {studentId, horizon=7d}
    Projections-->>Runtime: R/Signals {openLoops=4, scheduleMisses7d=high, verificationRate7d=low}
    Runtime->>LoopHealth: Q/AssessLoopHealth {state, signals}
    LoopHealth-->>Runtime: R/LoopHealthSnapshot {p1=highEnergy, p3=avoidantRisk}

    opt Weekly or risk-trigger adjustment cycle
        StrategicAdj->>Ledger: E/StrategicAdjustmentDecision {closeLoopFirst=true, maxOpenLoops=2}
    end

    Runtime-->>Student: C/NegotiatedIntentIssued {closeOnePendingCheckFirst=true, noNewTopicUntilOneClosed}
    Runtime->>Ledger: E/NegotiatedIntentIssued {riskOverride=true, constraint=closeLoopFirst}

    Student->>Runtime: C/SessionEnd {effortDone}
    alt Verify now (preferred)
        Student->>Runtime: C/VerifyNow {minQuestions=1}
        Runtime->>Ledger: E/RetrievalVerified {questions=1}
    else Schedule in 24h
        Student->>Runtime: C/ScheduleVerify {dueInHours=24}
        Runtime->>Ledger: E/RetrievalScheduled {dueAt}
        opt Missed schedule
            Runtime->>Ledger: E/ScheduleMissed {incrementsOpenLoops=true}
        end
    else Skip with reason
        Student->>Runtime: C/SkipWithReason {reason}
        Runtime->>Ledger: E/RetrievalSkipped {reason}
    end
```

---

## Cross-scenario invariants reflected in DMFs

- **Risk over mood:** high energy alone does not permit Boost when adherence risk is high (`openLoops`, `scheduleMisses`, silence).
- **Tiny proof-of-learning:** every `SessionEnd` path preserves integrity through `VerifyNow`, bounded `ScheduleVerify`, or explicit `SkipWithReason`.
- **Ledger is source-of-truth:** protocol outputs and retrieval outcomes are appended as domain events.
- **Interpretation boundary:** `LoopHealth` owns labels and precedence; `Runtime` consumes snapshots for routing.
- **Student trust boundary:** rescue paths reduce friction and preserve dignity, especially in silence/burnout states.
