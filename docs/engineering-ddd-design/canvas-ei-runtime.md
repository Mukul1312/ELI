# Bounded Context Canvas — EI Runtime

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** AdaptiveCoaching, StudySessionOrchestration  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md)
**See also (cross-cutting):** [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — invariants, event catalog, data ownership, ACLs

---

## Name

EI Runtime

---

## Purpose

At each decision gate (AppOpen, IntentSet, SessionEnd), EI Runtime negotiates or suggests the next step so the student's loop keeps moving with the right bar (Rescue vs Boost). It orchestrates the end-to-end study-session journey across gates: check-in → intent → activation → session → verification → done, with progressive disclosure and trust-preserving friction. The ViewComposer builds state-specific component trees for phases with progressive disclosure (Phase 1: 1A→1B→1C vertical stack, Phase 3: 3A→3B state replacement); client-side morphing handles transitions without additional server round-trips. Key actors: students (primary), coaching flows (via protocol outputs).

---

## Strategic Classification


| Dimension               | Choice       | Notes                                                                                              |
| ----------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| **Domain**              | core         | AdaptiveCoaching is EI's differentiation; StudySessionOrchestration is supporting but bundled here |
| **Business model role** | engagement   | Drives student value and retention via adaptive coaching                                           |
| **Evolution**           | custom built | EI-specific protocol and gate logic; no off-the-shelf equivalent                                   |


---

## Domain Roles

- **Execution context:** Gate decisions, protocol play selection (Rescue/Neutral/Boost), emits protocol outputs. Code: `src/ei/domain/study-session/`, `src/ei/application/run-p{1,2,3}-gate/`
- **Gateway context:** Student-facing orchestration; maps protocol outputs to UI steps and collects taps/inputs. Implemented as the **ViewComposer** (`src/ei/sdui/`) — a pure presenter chained as a Mastra workflow step after each gate handler. Returns `SduiResponse` (slot-based component tree + microcopy + action registry). Zero DB calls; derives `PresentationContext` entirely from domain output fields already resolved by the gate handler.

---

## Ubiquitous Language (in this context)


| Term                     | Definition (in this context)                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| Gate                     | A decision point in the study session (P1 State→Intent, P2 Intent→Effort, P3 Effort→Retrieval) |
| Protocol                 | Named gate logic (P1 Ignition, P2 Activation, P3 Verification)                                 |
| StudySession             | **Aggregate Root:** one student study session — from AppOpen to retrieval decision. Lifecycle: `negotiating → activating → active → verifying → closed`. Owns NegotiatedIntent, ActivationPlan, VerificationDecision as child Value Objects. Identity: `sessionId`. Code: `src/ei/domain/study-session/study-session.ts` |
| ProtocolEngine           | **Domain Service:** stateless play selection from the 24-play catalog (`engine/plays.ts`) given protocol (1/2/3), mode (Rescue/Neutral/Boost), and PlayContext. Code: `src/ei/domain/study-session/protocol-engine.ts` |
| NegotiatedIntent         | **Value Object (P1 output):** immutable — scope, verification plan, constraints. `scope.timeboxMin` = student's `timeCommitment` when provided; mode-range midpoint fallback when absent. `taskType` from AppOpen payload exposed as getter. Created by `StudySession.issueNegotiatedIntent()`. |
| ActivationPlan           | **Value Object (P2 output):** immutable — firstAction, replanCap, constraints. Created by `StudySession.issueActivationPlan()`. |
| VerificationDecision     | **Value Object (P3 output):** immutable — decision type (VerifyNow/ScheduleVerify/Skip) + parameters. Enforces P1 floor + watch-only overrides. Created by `StudySession.issueVerificationDecision()`. |
| Rescue                   | **Mode: Enum VO value** (`Rescue \| Neutral \| Boost`). Coaching posture when student needs friction reduction or scope negotiation. |
| Neutral                  | **Mode: Enum VO value.** Coaching posture when neither Rescue nor Boost conditions apply. |
| Boost                    | **Mode: Enum VO value.** Coaching posture when student can stretch (requires adherence evidence). |
| play                     | **Domain concept backed by PlaySelection Value Object:** named coaching move selected by `ProtocolEngine` from the 24-play catalog (`engine/plays.ts`). |
| LOW_ENERGY / HIGH_ENERGY | **Enum Value Object values (P1Label):** assigned by LoopHealthAssessment; consumed by P1 gate handler via LoopHealthSnapshot. |
| STALLED / FLOWING        | **Enum Value Object values (P2Label):** assigned by LoopHealthAssessment; consumed by P2 gate handler via LoopHealthSnapshot. |
| AVOIDANT / CONFIDENT     | **Enum Value Object values (P3Label):** assigned by LoopHealthAssessment; consumed by P3 gate handler via LoopHealthSnapshot. |
| TightnessLevel           | **Enum Value Object:** `Loose \| Normal \| Tight` — from SA policy; influences escalation context passed to gate handlers. |
| TimeCommitment           | **Value Object (student input):** student-declared study duration in minutes. Valid values: 10, 20, 45, 60. Feeds `NegotiatedIntent.scope.timeboxMin` when present; mode-based range midpoint is the fallback for variants that hide time chips (V1 SILENCE_RE_ENTRY, V3 HIGH_PRESSURE, V9 IDENTITY_MOMENT, V10 ONBOARDING). |
| ConfirmationStrip        | **Presentation element (StudySessionOrchestration):** replaces the prescriptive scope card on the P1 screen. Displays `topic . taskType . ~timeCommitment` — reflecting the student's own choices, not ELI's prescription. Single "Let's go" CTA below it. |
| ProgressiveDisclosure    | **Presentation pattern (StudySessionOrchestration):** "One Screen, No Scroll" — ViewComposer builds state-specific component trees; client-side morphing transitions between states. Phase 1: Vertical Stack (1A Anchor → 1B Unlock → 1C Focus). Phase 3: State Replacement (3A Ask → 3B Closure). Domain layer unaffected — morphing is client-driven by user taps. |
| DropoutSignal            | **Derived signal (Projections → PresentationContext):** true when a topic has 3+ consecutive deferrals/skips (RetrievalScheduled or RetrievalSkipped without intervening VerificationCompleted). Triggers Shrunk Card variant in P3 verification ask — binary "Got it / Not yet" replacing ternary options. Does not affect P3 gate routing (AVOIDANT label handles that). See [05-cross-cutting-concerns.md § Dropout Signal](05-cross-cutting-concerns.md#dropout-signal-per-topic-verification-avoidance-detection). |
| ShrunkCard               | **Presentation element (StudySessionOrchestration):** Intervention-mode verification ask. Fires when DropoutSignal active. Binary: Got it / Not yet. Escape hatches (Remind me tomorrow, Can't right now) demoted to low-visibility text links. "Not yet" fires ScheduleVerify (same domain event as standard deferral). |
| DynamicFooterSeed        | **Presentation element (StudySessionOrchestration):** Phase 3 close view shows "Next: [Oldest Pending Topic] waiting since [Day X]" when pendingChecks > 0 after loop closure. Data sourced from Projections (oldest open TopicLoop). |
| VerificationFloor        | Invariant (not a building block): P1 `NegotiatedIntent.verificationPlan.minQuestions` persisted in Ledger event; read back in P3 via `IStudentEventStreamReader` and passed through `P3GateContext`. |
| WatchOnlyConstraint      | Invariant (not a building block): `ActivationPlan.constraints.enforceWatchOnlyVerification` flag; read back in P3 via `P3GateContext.p2WatchOnlyFlag`; enforced in `VerificationDecision.create()`. |


> **Building block note:** `StudySession` is the **Aggregate Root** that enforces gate lifecycle ordering and cross-protocol invariants (P1 verification floor → P3, P2 watch-only → P3 override). `NegotiatedIntent`, `ActivationPlan`, `VerificationDecision`, and `PlaySelection` are **class-based Value Objects** (private constructor, `static create()`, validation on construction). `ProtocolEngine` is a **Domain Service** (stateless, spans 24 plays across 3 protocols). `LoopHealthSnapshot` is a **Published Language Value Object** consumed from LoopHealthAssessment. Tactical spec: [`ei-runtime-tactical-spec.md`](tactical/ei-runtime-tactical-spec.md).

### Student-facing scales

Source: [EI_UX_Scales.md](../ei/EI_UX_Scales.md)

| Scale           | Values            | Labels (student sees)                                     |
| --------------- | ----------------- | --------------------------------------------------------- |
| Energy          | 1–5               | Exhausted, Low, Okay, Good, Sharp                         |
| SleepBucket     | <6, 6-7, 7-8, >=8 | Sleep-debt, Low sleep, Okay sleep, Fully slept            |
| TimeCommitment  | 10, 20, 45, 60     | 10 min, 20 min, 45 min, 1h+ — collected on checkin screen (hidden for V1/V3/V9/V10 variants; system uses mode-based fallback) |
| TaskType        | Learn, Practice, Revise | Learn, Practice, Revise — collected on checkin screen (moved from P1 screen in scope redesign; hidden for same variants as TimeCommitment) |


---

## Inbound Communication


| Collaborator         | Message type   | Message name                              | Key data                                                              | Integration style  | Relationship (from context map) |
| -------------------- | -------------- | ----------------------------------------- | --------------------------------------------------------------------- | ------------------ | ------------------------------- |
| CohortAccess         | Command        | Auth session / user claims                | studentId, role, cohort scope                                         | Sync (per request) | ACL                             |
| EI Projections       | Query response | GetStudentSignals → R/Signals             | aggregates, topic state, policy (openLoops, verificationRate7d, etc.) | Sync query         | Customer-Supplier               |
| LoopHealthAssessment | Query response | AssessLoopHealth → R/LoopHealthSnapshot   | labels (p1, p2, p3) + key evidence                                    | Sync call          | Published Language              |
| Student              | Command        | AppOpen                                   | energy, sleep; `timeCommitment` (optional, int: 10\|20\|45\|60); `taskType` (optional, string: Learn\|Practice\|Revise) — both absent for V1/V3/V9/V10 variants | —                  | Direct user                     |
| CurriculumCatalog    | Query response | ResolveTopic → R/TopicReference           | topicId: UUID, topicName: string                                      | Sync query         | Published Language              |
| Student              | Command        | IntentSet                                 | topicId, topicName                                                    | —                  | Direct user                     |
| Student              | Command        | SessionEnd                                | topicId, topicName, effortSummary                                     | —                  | Direct user                     |
| Student              | Command        | VerifyNow, ScheduleVerify, SkipWithReason | minQuestions, dueInHours, reason                                      | —                  | Direct user                     |
| EI Projections       | Query response | GetTopicDeferralCount → R/count           | consecutiveDeferrals for a topic (DropoutSignal detection)            | Sync query         | Customer-Supplier               |
| EI Projections       | Query response | GetOldestPendingTopic → R/TopicSeed       | topicName, waitingSinceDays (DynamicFooterSeed)                       | Sync query         | Customer-Supplier               |


---

## Outbound Communication


| Message type | Message name                                                                                   | Collaborator    | Key data                                | Integration style | Relationship      |
| ------------ | ---------------------------------------------------------------------------------------------- | --------------- | --------------------------------------- | ----------------- | ----------------- |
| Event        | AppOpen, IntentSet, SessionEnd, FirstActionStarted, Replan, IntentResponse                     | EI Event Ledger | event payload per schema; topic-bearing events carry topicId (UUID) + topicName (string) from CC | Sync append       | Customer-Supplier |
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

- When to split StudySessionOrchestration into a separate context if UX iteration cadence diverges from gate logic. **Note:** The ViewComposer (`src/ei/sdui/`) is the first concrete instance of this divergence — it is module-separated but still co-located in EI Runtime. If UX experimentation velocity outpaces gate logic changes, extract to a separate context with an ACL consuming Published Language events from EI Runtime.

