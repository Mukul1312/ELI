# Ubiquitous Language

> **How to fill:** Extract canonical terms from the domain-expert docs. **Student-facing scale meanings** come from [EI_UX_Scales.md](../../EI_UX_Scales.md). **Protocol/signal terms** come from [EI_Protocols_Deep_Dive.md](../../EI_Protocols_Deep_Dive.md) and [EI_Engine_Taxonomy.md](../../EI_Engine_Taxonomy.md).
>
> **Checklist item #1:** Identify ubiquitous language terms with domain experts.

---

## Glossary


| Term                    | Definition                                                                                              | Source                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **OpenLoops**           | Count of topics with Effort but Retrieval overdue (WIP debt).                                           | EI_Engine_Taxonomy §2            |
| **PendingChecks**       | Student-facing term for topics with scheduled verification due.                                         | Storyboards                      |
| **VerificationRate7d**  | Rolling 7-day fraction of sessions that end in retrieval now OR in a scheduled retrieval later honored. | EI_Engine_Taxonomy §2            |
| **AvoidantExit**        | SessionEnd with no retrieval now and no scheduled retrieval.                                            | EI_Engine_Taxonomy §2            |
| **LoopLatency**         | Time from Effort to Retrieval for a topic (median/p50).                                                 | EI_Engine_Taxonomy §2            |
| **SilenceDays**         | Days since last meaningful event (IntentSet / SessionEnd / VerificationCompleted).                      | EI_Engine_Taxonomy §2            |
| **StateTrend7d**        | Coarse direction for state (improving/flat/worsening) from energy/pressure/sleep/backlog taps.          | EI_Engine_Taxonomy §2            |
| **TightnessLevel**      | Loose / Normal / Tight — how strictly protocols enforce integrity (SA dial).                            | EI_Spec, EI_Engine_Taxonomy §6.2 |
| **Mode**                | Rescue (lower bar to keep loop moving) vs Boost (raise bar when evidence stable) vs Neutral (fallback). | EI_Protocols_Deep_Dive           |
| **Play**                | Protocol output pattern: e.g. "The Reduction," "The Stretch," "The Lubrication," "The Trojan Horse."    | EI_Protocol_1/2/3                |
| **VerificationFloor**   | P1 NegotiatedIntent sets a verification commitment; P3 honors it (cross-protocol floor).                | EI_Spec, cross-protocol          |
| **WatchOnlyConstraint** | P2 can flag "watch-only" topic; P3 treats as lower verification bar.                                    | EI_Protocol_2 → P3               |


---

## Student-facing scales (from EI_UX_Scales)


| Scale           | Values            | Labels (student sees)                                     |
| --------------- | ----------------- | --------------------------------------------------------- |
| Energy          | 1–5               | Exhausted, Low, Okay, Good, Sharp                         |
| Pressure        | 1–5               | Calm, Slightly tense, Uneasy, Very stressed, Panicky      |
| BacklogPressure | 1–5               | On track, Mostly on track, Some pending, Behind, Drowning |
| SleepBucket     | <6, 6-7, 7-8, >=8 | Sleep-debt, Low sleep, Okay sleep, Fully slept            |


---

## Protocol labels (routing tags)


| Label           | Protocol | Condition (v1 defaults)                                                                              |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| **LOW_ENERGY**  | P1       | energy ≤2, sleepBucket "<6", pressure ≥4, backlogPressure ≥4, or StateTrend7d worsening              |
| **HIGH_ENERGY** | P1       | energy ≥4, sleepBucket 7-8 or ≥8, pressure ≤2, backlogPressure ≤3; no SilenceDays ≥2 or OpenLoops ≥3 |
| **STALLED**     | P2       | StartLatencyMin ≥15, ≥2 Replans before start, or intent set but no start within ~20 min              |
| **FLOWING**     | P2       | StartLatencyMin ≤3, no repeated replans; not AVOIDANT                                                |
| **AVOIDANT**    | P3       | session ends without retrieval/schedule, VerificationRate7d <0.60, OpenLoops ≥3, or SilenceDays ≥2   |
| **CONFIDENT**   | P3       | session with retrieval now or schedule honored; VerificationRate7d ≥0.75; OpenLoops ≤2               |
| **NEUTRAL**     | All      | Fallback when no label strongly applies; enforce minimal integrity (especially at P3)                |


