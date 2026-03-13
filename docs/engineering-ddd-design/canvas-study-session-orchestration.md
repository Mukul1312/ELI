# Bounded Context Canvas — StudySessionOrchestration

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** StudySessionOrchestration
**Context Map reference:** [03-context-map.md](03-context-map.md)
**See also (cross-cutting):** [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — invariants, event catalog, data ownership, ACLs
**ADR:** [ADR-005 — Flow-Level Adaptation](decisions/adr-005-flow-level-adaptation.md)

---

## Name

StudySessionOrchestration

---

## Purpose

Decide **what the student sees and when** across the entire study-session journey — from app open through verification done. SSO owns the end-to-end screen sequence: which phases appear, in what order, with what text and layout, and how student context signals adapt both the step order and the presentation.

SSO is the "delivery wrapper" for AdaptiveCoaching: it never decides what coaching move to make (that's gate logic in EI Runtime), only **how to present it** and **which screens to show in what order**. When a student opens the app, SSO determines the initial execution path (resume an interrupted session, show the checkin form, or select a flow template). When a gate handler produces output, SSO transforms it into an SDUI component tree. When mid-session commands arrive (IntentSet, SessionEnd), SSO routes them to the appropriate gate and composes the resulting view.

> From [02-subdomains.md §6](02-subdomains.md): "Own the end-to-end student-facing study-session journey orchestration **across** gates (check-in → intent → activation → session → verification → done), including progressive disclosure and trust-preserving friction."

Key actors: **Students** (primary — every student interaction flows through SSO).

---

## Strategic Classification

| Dimension | Choice | Notes |
|-----------|--------|-------|
| **Domain** | Supporting | Not EI's differentiation (that's AdaptiveCoaching). Enables the core to reach students. |
| **Business model role** | Engagement | Drives perceived adaptiveness and student experience quality |
| **Evolution** | Custom built | SDUI architecture is product-specific; flow selection logic has no off-the-shelf equivalent |

---

## Domain Roles

SSO has four responsibilities, identified from the subdomain definition's Boundaries-In field. These form two internal modules (WHEN and WHAT) that share ubiquitous language and change together — one bounded context, not two.

### R1 — Flow Structure (WHEN module)

Determines **which phases** appear, **in what order**, and **which show UI** for this student's session. Subsumes the current 9-branch if-else tree in `ei-app-open.ts`.

- **On AppOpen (with topic):** FlowStrategy selects a FlowTemplate based on student context signals. The template's initial chain executes immediately (silent phases run handlers without UI; first UI phase returns SduiResponse).
- **Mid-session routing:** IntentSet→P2, SessionEnd→P3, onboarding skips P3, micro skips P1 — all are business rules about "when does what happen." These need a domain home, not infrastructure if-else.
- **Resume detection:** On AppOpen (initial: true), detects interrupted sessions (active P2, pending P3, pending P1 intent review) before flow selection runs.

### R2 — Input Collection & Event Emission

Collects student taps/inputs (Energy, Sleep, TimeCommitment, TaskType, skip reasons) and emits the corresponding domain commands/events. These are "UI-produced" events: `AppOpen`, `IntentSet`, `SessionEnd`, `FirstActionStarted`, `Replan`, `IntentResponse`, `RetrievalVerified`, `RetrievalScheduled`, `RetrievalSkipped`, `VerificationCompleted`.

SSO owns the semantic meaning of these commands — it knows *what the student did* and translates taps into domain commands that EI Runtime's gate handlers consume.

### R3 — Presentation (WHAT module)

After each gate handler produces its domain output, SSO transforms it into an SDUI component tree with microcopy, progressive disclosure, and presentation context. This includes:

- **ViewComposer:** Pure function. Maps gate outputs + PresentationContext → SduiResponse. Zero DB calls, zero side effects.
- **PresentationContext:** Value Object derived from domain output + student aggregates. Built by application layer (Mastra steps), consumed by ViewComposer.
- **Microcopy Resolver:** Resolves all student-facing text by gate/slot/mode/play. Priority chain: play-specific → mode-specific → default.
- **Progressive Disclosure:** "One Screen, No Scroll" — state-specific component trees; client-side morphing (P1: 1A→1B→1C vertical stack, P3: 3A→3B state replacement).
- **Identity Eligibility:** Pure check for weekly behavioral reflection card.
- **Component Inclusion:** Per phase — deal card, welcome-back, guardrails, shrunk card, identity moment, dynamic footer seed.

### R4 — Cross-Session Adaptation (spans WHEN + WHAT)

Consumes cross-session signals (pending checks, silence days, sessions total, streaks, dropout signals, cohort flags) to adapt **both** step order (R1 — e.g., verification-first for overdue students) **and** microcopy/defaults (R3 — e.g., greeting variant, component visibility). This responsibility is why WHEN and WHAT are modules within one BC rather than separate BCs — they share the same adaptation signals and change together.

---

## Ubiquitous Language (in this context)

### Shared terms (used across R1–R4 — confirms one BC)

| Term | Definition (in this context) |
|------|------------------------------|
| Flow | The sequence of screens a student sees from AppOpen through done. Different students may get different flows based on context signals. |
| Phase | A named step in the flow: `'checkin' \| 'intent' \| 'activation' \| 'session' \| 'verification' \| 'done'`. |
| Gate | A decision point where AdaptiveCoaching runs (P1/P2/P3). SSO sends commands to gates and receives their outputs. |
| Scene | A UX narrative unit spanning one or more phases (e.g., S7 "honest mirror" → deal → two-step card). |
| Step | An individual screen or interaction within a scene. |
| SduiResponse | The primary output: `{ schemaVersion, phase, view: { header, body, actions, footer }, actions, domain }`. Server-driven — client is a pure renderer. |
| SduiPhase | `'checkin' \| 'intent' \| 'activation' \| 'session' \| 'verification' \| 'done'` — marks which screen the response represents. |

### R1-specific terms (WHEN module)

| Term | Definition (in this context) |
|------|------------------------------|
| FlowTemplate | **Value Object:** Describes which phases are included and whether each shows UI. Immutable. Static factories for known templates (declared-standard, negotiated-standard, onboarding, micro). |
| FlowStrategy | **Domain Service:** Stateless, deterministic. Given student context signals, selects a FlowTemplate. Same pattern as ProtocolEngine. |
| FlowSelected | **Event (informational):** Records which template was selected for a session. Observability only — does not affect aggregate state. |
| Resume | An interrupted session detected on AppOpen. NOT a flow — it reconstructs the interrupted view from Ledger-derived state. Resume detection runs BEFORE flow selection. |

### R3-specific terms (WHAT module)

| Term | Definition (in this context) |
|------|------------------------------|
| ViewComposer | **Domain Service (pure function):** Maps gate outputs + PresentationContext → SduiResponse. Zero DB calls, zero side effects. |
| PresentationContext | **Value Object:** Derived from domain output + student aggregates. Built by Mastra steps (application layer), consumed by ViewComposer. Contains student-level signals for microcopy/component decisions. |
| Microcopy | All student-facing text, resolved by gate/slot/mode/play. Never hardcoded in ViewComposer. |
| Progressive Disclosure | "One Screen, No Scroll" — ViewComposer builds state-specific component trees; client-side morphing handles transitions. |
| ConfirmationStrip | P1 declared-intent screen element: "topic . taskType . ~time" reflecting student's own choices, not ELI prescription. |
| IdentityMoment | Weekly behavioral reflection card. Eligibility: verificationRate7d ≥ 0.70 AND pendingChecks ≤ 2 AND sessionsLast7d ≥ 4 AND 7+ days since last shown. |
| DropoutSignal | Per-topic: 3+ consecutive deferrals without verification. Triggers ShrunkCard variant. Presentation-only — does not affect gate routing. |
| ShrunkCard | Intervention-mode verification ask. Binary: Got it / Not yet. Fires when DropoutSignal active. |
| DynamicFooterSeed | P3 done screen: "Next: [Oldest Pending Topic] waiting since [Day X]" when pendingChecks > 0. |

---

## Inbound Communication

### Student commands (SSO-owned — R2)

| Collaborator | Message type | Message name | Key data | Integration style | Relationship |
|-------------|-------------|-------------|----------|-------------------|-------------|
| Student (via Mastra) | Command | AppOpen (initial: true, no topic) | studentId, isFirstOfDay | Sync | Direct user |
| Student (via Mastra) | Command | AppOpen (with topic) | studentId, topic, energy, sleep, taskType?, timebox?, isOnboarding?, isMicro? | Sync | Direct user |
| Student (via Mastra) | Command | IntentSet | studentId, topic, setAt | Sync | Direct user |
| Student (via Mastra) | Command | SessionEnd | studentId, topic, endedAt | Sync | Direct user |
| Student (via Mastra) | Command | FirstActionStarted | studentId, topic, startedAt | Sync | Direct user |
| Student (via Mastra) | Command | Replan | studentId, topic, replannedAt | Sync | Direct user |
| Student (via Mastra) | Command | IntentResponse | studentId, negotiatedIntentId, decision | Sync | Direct user |
| Student (via Mastra) | Command | RetrievalVerified / RetrievalScheduled / RetrievalSkipped / VerificationCompleted | studentId, topic, + type-specific fields | Sync | Direct user |

### Gate outputs (from EI Runtime — consumed by R3)

| Collaborator | Message type | Message name | Key data | Integration style | Relationship |
|-------------|-------------|-------------|----------|-------------------|-------------|
| EI Runtime | Gate output | SessionIntentIssuedOutput | intentSource, timebox, taskType, mode, playId, verificationFloor, constraints | Sync (after P1 gate) | Published Language |
| EI Runtime | Gate output | ActivationPlanIssuedOutput | mode, playId, firstAction, constraints (watchOnly) | Sync (after P2 gate) | Published Language |
| EI Runtime | Gate output | VerificationDecisionIssuedOutput | verificationDecision, verificationSpec, mode, playId, dropoutSignalActive | Sync (after P3 gate) | Published Language |

### Projection queries (for R1 flow selection + R3 presentation context)

| Collaborator | Message type | Message name | Key data | Integration style | Relationship |
|-------------|-------------|-------------|----------|-------------------|-------------|
| EI Projections | Query response | StudentAggregates | pendingChecks, silenceDays, verificationRate7d, stateTrend7d, openLoops, sessionsTotal | Sync query | Customer-Supplier |
| EI Projections | Query response | TopicState | session_phase (ADR-003), consecutive_deferrals, last_task_type | Sync query | Customer-Supplier |
| EI Projections | Query response | StudentPolicy | dials (cohortFlags for A/B), constraints | Sync query | Customer-Supplier |
| LoopHealthAssessment | Query response | LoopHealthSnapshot | mode (for PresentationContext) | Sync call | Published Language |
| CohortAccess | Auth claims | studentId | server-derived identity | Sync | ACL |
| CurriculumCatalog | Query response | TopicReference | topicId, topicName | Sync query | Published Language |

### Key insight — SSO sandwiches AdaptiveCoaching

```
Student → SSO collects inputs (R2) → SSO emits command → AC processes gate → gate output → SSO composes view (R3) → Student sees screen
```

SSO does NOT call gate handlers directly. The Mastra workflow coordinates:
```
Mastra step: run gate handler (EI Runtime) → compose view (SSO)
```

The only routing decision SSO makes directly is which gate handlers to invoke on AppOpen (R1: FlowStrategy), and where to route mid-session commands (R1: IntentSet→P2, SessionEnd→P3).

---

## Outbound Communication

### Primary output — SduiResponse

| Message type | Message name | Collaborator | Key data | Integration style | Relationship |
|-------------|-------------|-------------|----------|-------------------|-------------|
| Response | SduiResponse | Student (client) | phase, view (component tree), actions, domain output | Sync return | Direct user |

### SSO-owned events (appended to shared Ledger)

| Message type | Message name | Collaborator | Key data | Integration style | Relationship |
|-------------|-------------|-------------|----------|-------------------|-------------|
| Event | AppOpen | EI Event Ledger | studentId, energy, openedAt, timeCommitment?, taskType? | Sync append | Customer-Supplier |
| Event | IntentSet | EI Event Ledger | studentId, topic, setAt | Sync append | Customer-Supplier |
| Event | SessionEnd | EI Event Ledger | studentId, topic, endedAt | Sync append | Customer-Supplier |
| Event | FirstActionStarted | EI Event Ledger | studentId, topic, startedAt | Sync append | Customer-Supplier |
| Event | Replan | EI Event Ledger | studentId, topic, replannedAt | Sync append | Customer-Supplier |
| Event | IntentResponse | EI Event Ledger | studentId, negotiatedIntentId, decision | Sync append | Customer-Supplier |
| Event | RetrievalVerified / RetrievalScheduled / RetrievalSkipped / VerificationCompleted | EI Event Ledger | studentId, topic, type-specific | Sync append | Customer-Supplier |
| Event | FlowSelected | EI Event Ledger | templateId, selectionContext, sessionId | Sync append | Customer-Supplier |
| Event | IdentityMomentShown | EI Event Ledger | studentId, statement | Sync append | Customer-Supplier |

### Key insight — event ownership

Events split cleanly by producer identity from [05-cross-cutting-concerns.md §Internal Event Catalog](05-cross-cutting-concerns.md):

- **SSO-owned (producer: "UI" + "SSO"):** AppOpen, IntentSet, SessionEnd, FirstActionStarted, Replan, IntentResponse, RetrievalVerified, RetrievalScheduled, RetrievalSkipped, VerificationCompleted, FlowSelected, IdentityMomentShown
- **AdaptiveCoaching-owned (producer: "P1"/"P2"/"P3"):** SessionIntentIssued, ActivationPlanIssued, VerificationDecisionIssued

SSO does NOT need its own event store — it appends to the shared Ledger via the same Customer-Supplier relationship that EI Runtime uses.

---

## Business Decisions

### R1 decisions (WHEN — flow structure)

1. **Flow selection:** Given student context (payload signals + projection signals + cohort flags), which FlowTemplate to use. Deterministic. No randomness. A/B testing via cohortFlags set by Strategic Adjustment.
2. **Resume vs. new flow:** On first-touch AppOpen, detect interrupted sessions before flow selection runs. Resume takes priority.
3. **Mid-session routing:** IntentSet→P2, SessionEnd→P3, and special cases (onboarding skips P3, micro skips P1). These are SSO business rules about "what happens next," not infrastructure concerns.

### R3 decisions (WHAT — presentation)

4. **Microcopy selection:** Per gate/slot/mode/play, which text to show. Priority chain: play-specific → mode-specific → default.
5. **Component inclusion:** Per phase, which SDUI components to include (deal card, welcome-back, guardrails, shrunk card, identity moment, dynamic footer seed).
6. **Identity eligibility:** Whether to show the weekly behavioral reflection card. Pure eligibility check based on PresentationContext signals.
7. **Greeting variant:** On checkin, which resume-context-card variant (ONBOARDING, SILENCE_RE_ENTRY, HIGH_PRESSURE, RETURNING, etc.).

### What SSO does NOT decide

- Coaching posture (Rescue/Neutral/Boost) — LoopHealthAssessment + EI Runtime
- Play selection from the 24-play catalog — ProtocolEngine (EI Runtime)
- Verification floor, watch-only override, risk override — StudySession aggregate invariants (EI Runtime)
- Student-level metrics and labels — EI Projections + LoopHealthAssessment
- Policy dials — Strategic Adjustment

---

## Assumptions

- EI Runtime gate outputs are stable Published Language contracts (SessionIntentIssuedOutput, ActivationPlanIssuedOutput, VerificationDecisionIssuedOutput). Changes require coordination.
- PresentationContext is built by Mastra steps from DB-loaded data; ViewComposer never touches the database.
- Client is a pure SDUI renderer — zero routing logic client-side.
- StudentPolicy.dials provides cohort flags for A/B testing; Strategic Adjustment owns assignment.
- ADR-003's `session_phase` column in `ei_topic_state` is available for resume detection.
- ADR-004's fold/reconstitute means P3 can get `verificationFloor` and `watchOnlyFlag` from reconstituted aggregate — no Ledger queries needed. This invalidates the "P3 queries Ledger independently" threading analysis in the original ADR-005 draft.
- The shared Ledger accepts SSO-owned events via the same append path as AdaptiveCoaching events. No separate event store needed.

---

## Verification Metrics

- **Flow selection equivalence:** `FlowStrategy.select()` must produce identical routing as the current 9-branch if-else tree for all known input combinations.
- **ViewComposer purity:** Zero DB calls, zero side effects confirmed by unit tests.
- **SduiResponse schema compliance:** All responses validate against SduiResponseSchema.
- **Event ownership clarity:** Every event in `EventTypeEnum` has exactly one owning bounded context (SSO or AC). No ambiguity.
- **Mid-session routing coverage:** Every `commandType` in RunEiCommandHandler maps to exactly one SSO routing rule.
- **Boundary violation detection:** No SSO code imports from `src/ei/domain/study-session/` (that's EI Runtime). SSO consumes gate outputs only via Published Language contracts.

---

## Open Questions

### Q1: Micro aggregate lifecycle

Micro template has no P1. The aggregate lifecycle requires `negotiating → activating` before `issueActivationPlan`. Three possibilities:
- Micro bypasses the aggregate entirely (operates outside domain lifecycle)
- Micro has an implicit "micro intent" that transitions the aggregate
- Micro is a separate aggregate pattern (shorter lifecycle)

This is an EI Runtime (AdaptiveCoaching) question, not an SSO question. SSO just needs to know "micro skips P1" as a FlowTemplate definition. How the aggregate handles that is AC's domain.

### Q2: Onboarding and P3

Current onboarding branch never runs P3. The `onboarding` FlowTemplate includes `session(UI)` but no `p3-verification`. The self-validation invariant says "if session present, p3 must be present." Either:
- The invariant is wrong (some flows legitimately skip P3)
- Onboarding needs P3 (correctness fix)
- Onboarding has a different lifecycle (no aggregate lifecycle at all)

### Q3: FlowTemplate scope — initial chain only vs. full session metadata

**Option A (initial chain only):** Template lists only phases that execute immediately on AppOpen. Mid-session routing (IntentSet→P2, SessionEnd→P3) is handled separately by SSO's mid-session routing rules.

**Option B (full session metadata):** Template lists ALL phases including future ones. The `showUI` flags for future phases are consulted when those phases compose their views later. Enables experiments like "P2 is silent even though IntentSet triggered it."

Option A is simpler and matches the current reality. Option B enables future A/B experiments. Start with A; evolve to B when Product defines the requirement.

### Q4: Handler threading post-ADR-004

ADR-004 introduces `StudySession.fold(events)`. After fold, P3 gets `verificationFloor` and `watchOnlyFlag` from the reconstituted aggregate — no Ledger queries needed. Should the executor load the aggregate once and pass it through, or let each handler load independently? This affects SSO's flow executor design but the answer depends on EI Runtime's repository pattern.
