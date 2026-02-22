# Bounded Context Canvas — EI Runtime

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** AdaptiveCoaching, StudySessionOrchestration  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md)

---

## Name

EI Runtime

---

## Purpose

At each decision gate (AppOpen, IntentSet, SessionEnd), EI Runtime negotiates or suggests the next step so the student's loop keeps moving with the right bar (Rescue vs Boost). It orchestrates the end-to-end study-session journey across gates: check-in → intent → activation → session → verification → done, with progressive disclosure and trust-preserving friction. Key actors: students (primary), coaching flows (via protocol outputs).

---

## Strategic Classification


| Dimension               | Choice       | Notes                                                                                              |
| ----------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| **Domain**              | core         | AdaptiveCoaching is EI's differentiation; StudySessionOrchestration is supporting but bundled here |
| **Business model role** | engagement   | Drives student value and retention via adaptive coaching                                           |
| **Evolution**           | custom built | EI-specific protocol and gate logic; no off-the-shelf equivalent                                   |


---

## Domain Roles

- **Execution context:** Gate decisions, protocol play selection (Rescue/Neutral/Boost), emits protocol outputs
- **Gateway context:** Student-facing orchestration; maps protocol outputs to UI steps and collects taps/inputs

---

## Ubiquitous Language (in this context)


| Term                     | Definition (in this context)                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| Gate                     | A decision point in the study session (P1 State→Intent, P2 Intent→Effort, P3 Effort→Retrieval) |
| Protocol                 | Named gate logic (P1 Ignition, P2 Activation, P3 Verification)                                 |
| NegotiatedIntent         | P1 output: scope, difficulty, verification minimum                                             |
| ActivationPlan           | P2 output: first action, focus contract, timebox                                               |
| VerificationDecision     | P3 output: VerifyNow / ScheduleVerify / Skip with rules                                        |
| Rescue                   | Mode when student needs friction reduction or scope negotiation                                |
| Neutral                  | Mode when neither Rescue nor Boost                                                             |
| Boost                    | Mode when student can stretch (requires adherence)                                             |
| play                     | Named coaching move (e.g. The Reduction, The Trojan Horse)                                     |
| LOW_ENERGY / HIGH_ENERGY | P1 labels from LoopHealthSnapshot                                                              |
| STALLED / FLOWING        | P2 labels from LoopHealthSnapshot                                                              |
| AVOIDANT / CONFIDENT     | P3 labels from LoopHealthSnapshot                                                              |


---

## Inbound Communication


| Collaborator         | Message type   | Message name                              | Key data                                                              | Integration style  | Relationship (from context map) |
| -------------------- | -------------- | ----------------------------------------- | --------------------------------------------------------------------- | ------------------ | ------------------------------- |
| CohortAccess         | Command        | Auth session / user claims                | studentId, role, cohort scope                                         | Sync (per request) | ACL                             |
| EI Projections       | Query response | GetStudentSignals → R/Signals             | aggregates, topic state, policy (openLoops, verificationRate7d, etc.) | Sync query         | Customer-Supplier               |
| LoopHealthAssessment | Query response | AssessLoopHealth → R/LoopHealthSnapshot   | labels (p1, p2, p3) + key evidence                                    | Sync call          | Published Language              |
| Student              | Command        | AppOpen                                   | energy, pressure, sleep, backlogPressure                              | —                  | Direct user                     |
| Student              | Command        | IntentSet                                 | topic, taskType, difficultyTier                                       | —                  | Direct user                     |
| Student              | Command        | SessionEnd                                | topic, effortSummary                                                  | —                  | Direct user                     |
| Student              | Command        | VerifyNow, ScheduleVerify, SkipWithReason | minQuestions, dueInHours, reason                                      | —                  | Direct user                     |


---

## Outbound Communication


| Message type | Message name                                                                                   | Collaborator    | Key data                                | Integration style | Relationship      |
| ------------ | ---------------------------------------------------------------------------------------------- | --------------- | --------------------------------------- | ----------------- | ----------------- |
| Event        | AppOpen, IntentSet, SessionEnd, FirstActionStarted, Replan, IntentResponse                     | EI Event Ledger | event payload per schema                | Sync append       | Customer-Supplier |
| Event        | NegotiatedIntentIssued, ActivationPlanIssued, VerificationDecisionIssued                       | EI Event Ledger | scope, mode, verificationDecision, etc. | Sync append       | Customer-Supplier |
| Event        | RetrievalVerified, RetrievalScheduled, RetrievalSkipped, VerificationCompleted, ScheduleMissed | EI Event Ledger | questions, dueAt, reason                | Sync append       | Customer-Supplier |
| Command      | NegotiatedIntentIssued, ActivationPlanIssued, VerificationDecisionIssued                       | Student         | scope, firstAction, verify options      | —                 | Direct user       |


---

## Business Decisions

- **Risk over mood:** High energy alone does not permit Boost when adherence risk is high (openLoops, scheduleMisses, silence).
- **Tiny proof-of-learning:** Every SessionEnd path preserves integrity through VerifyNow, bounded ScheduleVerify, or explicit SkipWithReason.
- **Rescue reduces friction:** Rescue mode aims to reduce start friction and preserve dignity, not shame.
- **Boost requires adherence:** Boost is only chosen when evidence and adherence support it.
- **One request, one flow:** A single student action triggers one synchronous processing path across gates.

---

## Assumptions

- CohortAccess provides server-derived studentId before any EI logic runs; we never trust client-provided identity.
- LoopHealthSnapshot contract (labels + evidence) is stable enough for gate routing; threshold tuning stays in LoopHealthAssessment.
- Policy written by Strategic Adjustment is available via Projections when Runtime queries; Runtime does not trigger SA.

---

## Verification Metrics

- Gate routing correctness (Rescue/Neutral/Boost) matches scenario expectations in EI_Scenarios.
- Protocol output schema changes are backward-compatible.
- Latency of gate decisions stays within SLO for student-facing flows.

---

## Open Questions

- When to split StudySessionOrchestration into a separate context if UX iteration cadence diverges from gate logic.

