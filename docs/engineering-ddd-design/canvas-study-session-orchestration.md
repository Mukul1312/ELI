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


| Dimension               | Choice       | Notes                                                                                       |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| **Domain**              | Supporting   | Not EI's differentiation (that's AdaptiveCoaching). Enables the core to reach students.     |
| **Business model role** | Engagement   | Drives perceived adaptiveness and student experience quality                                |
| **Evolution**           | Custom built | SDUI architecture is product-specific; flow selection logic has no off-the-shelf equivalent |


---

## Domain Roles

SSO has four responsibilities, identified from the subdomain definition's Boundaries-In field. These form two internal modules (WHEN and WHAT) that share ubiquitous language and change together — one bounded context, not two.

### R1 — Flow Structure (WHEN module)

Determines **which phases** appear, **in what order**, and **which show UI** for this student's session. Subsumes the current 9-branch if-else tree in `ei-app-open.ts`.

R1 answers the overarching question **"what happens next?"** but decomposes into three distinct sub-responsibilities that don't share domain concepts:

#### R1.1 — SelectFlow (use case)

On AppOpen (with topic), **FlowStrategy** selects a **FlowTemplate** based on student context signals. The template's initial chain executes immediately (silent phases run handlers without UI; first UI phase returns SduiResponse).

- **Domain concepts used:** FlowStrategy (domain service), FlowTemplate (value object)
- **Business question:** "Given this student's context, which flow shape applies?"
- **Deterministic:** Same inputs → same template. No randomness. A/B via cohortFlags.

#### R1.2 — RouteCommand (use case)

Mid-session routing: IntentSet→P2, SessionEnd→P3, onboarding skips P3, micro skips P1.

- **Domain concepts used:** None — code investigation revealed 100% **mechanical dispatch** (payload shape + projection state → handler). Zero threshold checks, zero eligibility evaluations, zero signal inspection. Lives in the **application layer** as a dispatcher.
- **Business question:** "Given this command and the current session state, which handler runs next?"
- **Template exceptions:** Some routing rules depend on the template (e.g., onboarding skips P3). The template ID is an input, but the routing logic itself is separate from template selection.
- **Tactical finding:** Originally proposed as a domain service ("CommandRouter"). Demoted to application-layer dispatch after code investigation confirmed no business rules. See [tactical spec §9](tactical/study-session-orchestration-tactical-spec.md).

#### R1.3 — DetectResume (use case)

On AppOpen (initial: true), detects interrupted sessions (active P2, pending P3, pending P1 intent review) **before** flow selection runs. Resume takes priority over new flow.

- **Domain concepts used:** None — this is a **read-side query** against projections (ADR-003's `session_phase` column). Lives in the application layer.
- **Business question:** "Is there an interrupted session that should resume?"
- **Key insight:** No domain concept needed. The query result drives a routing decision, but the query itself is infrastructure/application concern.

### R2 — Input Collection & Event Emission (application-layer glue)

Collects student taps/inputs (Energy, Sleep, TimeCommitment, TaskType, skip reasons) and emits the corresponding domain commands/events. These are "UI-produced" events: `AppOpen`, `IntentSet`, `SessionEnd`, `FirstActionStarted`, `Replan`, `IntentResponse`, `RetrievalVerified`, `RetrievalScheduled`, `RetrievalSkipped`, `VerificationCompleted`.

> **Audit conclusion: R2 is application-layer glue, not a domain responsibility.**
>
> When decomposed, every sub-piece is owned elsewhere or is mechanical:
>
>
> | Sub-piece                 | What it does                      | Actual owner                                                 |
> | ------------------------- | --------------------------------- | ------------------------------------------------------------ |
> | Input validation          | "Is this payload well-formed?"    | Boundary concern — Zod schemas / self-validating command VOs |
> | Command construction      | Tap → typed command object        | Direct mapping — no business reasoning                       |
> | Command routing           | "Which handler receives this?"    | R1.2 (RouteCommand)                                          |
> | UI-event append           | Record facts in Ledger            | Infrastructure (append-event.pg.ts)                          |
> | FlowSelected event        | Observability for R1.1's decision | Side effect of R1.1                                          |
> | IdentityMomentShown event | Track R3's side effect            | Side effect of R3                                            |
>
>
> **No genuine business logic remains.** Every tap→command case today is a direct mapping. R2 owns the command schemas (what fields, what types) but makes no decisions.
>
> **Promotion path:** If non-trivial interpretation logic emerges (e.g., "in context Y, tap X means Z not W"), promote that specific case into a domain service. Starting as application glue is safe — promoting up is easy, demoting down from over-engineered domain concepts is hard.

### R3 — Presentation (WHAT module)

After each gate handler produces its domain output, SSO transforms it into an SDUI component tree with microcopy, progressive disclosure, and presentation context.

R3 answers the overarching question **"what does the student see?"** and is **SSO's heaviest domain surface** — three of four sub-responsibilities contain genuine business logic. ViewComposer is to SSO what ProtocolEngine is to EI Runtime.

#### R3.1 — View Composition (domain service)

Per-phase pure functions (composeCheckinView, composeP1View, composeP3View, etc.) that decide which components to include, how to arrange them in header/body/actions/footer slots, and produce SduiResponse.

- **DDD building block:** Domain Service — stateless, deterministic, pure. Same pattern as ProtocolEngine.
- **Business decisions embedded:** Show ShrunkCard when DropoutSignal active. Show deal card in P1. Show dynamic footer seed when pendingChecks > 0. Progressive disclosure — which state maps to which component tree (P1: 1A→1B→1C stack, P3: 3A→3B replacement).
- **Business question:** "Given this gate output and student context, what component tree does the student see?"
- **SduiResponse as domain output:** SduiResponse IS SSO's Published Language output — it's the thing SSO exists to produce. The component tree structure is the domain model of "what the student sees," not infrastructure serialization.

#### R3.2 — Microcopy Resolution (internal to ViewComposer)

Resolves all student-facing text by gate/slot/mode/play. Priority chain: play-specific → mode-specific → default.

- **DDD building block:** Internal capability of ViewComposer (not a standalone domain service). The priority chain is a genuine business rule (~25 lines), but ViewComposer is the only consumer. Promote to standalone service if a second consumer emerges.
- **Business question:** "Given this gate/slot/mode/play, which text does the student read?"
- **Domain data:** The microcopy catalog (`catalog.ts`, `p1.ts`, `p2.ts`, `p3.ts`, `identity.ts`) contains product decisions — "what do we say to a Rescue-mode student in P1?" These are domain value catalogs, not config or i18n.

#### R3.3 — Identity Eligibility (domain — specification pattern)

Pure check: verificationRate7d ≥ 0.70 AND pendingChecks ≤ 2 AND sessionsLast7d ≥ 4 AND 7+ days since last shown.

- **DDD building block:** Specification pattern / pure function producing a Value Object `{ eligible, statement? }`.
- **Business question:** "Has this student earned the weekly behavioral reflection?"
- **Domain invariants:** The thresholds (0.70, 2, 4, 7 days) are business rules. If configurable in future, they'd come from StudentPolicy. Today they're hardcoded domain rules.
- **Already separated in code:** `compute-identity-eligibility.ts`.

#### R3.4 — PresentationContext Assembly (application layer)

Gathers signals from projections (StudentAggregates, TopicState, StudentPolicy) + gate outputs into a typed VO consumed by ViewComposer.

- **DDD building block:** Application Service (orchestration/data gathering). The **VO type definition** (PresentationContext) lives in domain — it defines what signals matter for presentation. The **assembly** (query DB → populate VO) is application layer.
- **Business question:** None — this is data gathering, not decision-making.
- **Pattern:** Same as how Mastra steps build PresentationContext today. Domain defines the shape; application fills it.

> **R3 audit summary:**
>
>
> | Sub-responsibility                | DDD Building Block                     | Layer       | Business logic?                                           |
> | --------------------------------- | -------------------------------------- | ----------- | --------------------------------------------------------- |
> | R3.1 View Composition             | Domain Service (pure, stateless)       | Domain      | Yes — component inclusion, layout, progressive disclosure |
> | R3.2 Microcopy Resolution         | Internal capability of R3.1 ViewComposer | Domain      | Yes — priority chain is business rule                     |
> | R3.3 Identity Eligibility         | Specification / pure function → VO     | Domain      | Yes — threshold rules are domain invariants               |
> | R3.4 PresentationContext Assembly | Application Service; VO type in domain | Application | No — data gathering only                                  |
>

### R4 — Cross-Session Adaptation (spans WHEN + WHAT)

Consumes cross-session signals (pending checks, silence days, sessions total, streaks, dropout signals, cohort flags) to adapt **both** step order (R1 — e.g., verification-first for overdue students) **and** microcopy/defaults (R3 — e.g., greeting variant, component visibility). This responsibility is why WHEN and WHAT are modules within one BC rather than separate BCs — they share the same adaptation signals and change together.

> **Subdomain check (A+B+C+D): R4 is NOT a separate subdomain.**
>
> - ❌ A (distinct output): R4 produces no output of its own — it modifies R1's flow selection and R3's presentation.
> - ❌ B (independent change cadence): R4 changes when R1 or R3 changes — same cadence.
> - ❌ C (external consumers): No other BC consumes R4's "adaptation decisions."
> - ✅ D (distinct language): Partially — "adaptation signals" is its own vocabulary, but it's consumed entirely within SSO.
>
> **Conclusion:** R4 is the mechanism that **binds R1 and R3 into one BC**. It's what makes SSO a single bounded context rather than two separate "WHEN" and "WHAT" contexts. The three-subdomain signal chain is: DerivedSignals COMPUTES → LoopHealthAssessment INTERPRETS → SSO (R4) CONSUMES for presentation adaptation.

> **DDD audit: R4 is a design rationale, not a building block.**
>
> R4 has no independent code — every signal lands in either R1.1 or R3.1/R3.3:
>
>
> | Signal                         | Consumed by                                                                                 | What it affects                      |
> | ------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------ |
> | pendingChecks                  | R1.1 FlowStrategy (verification-first?) + R3.1 ViewComposer (DynamicFooterSeed, ShrunkCard) | Flow selection + component inclusion |
> | silenceDays                    | R1.1 FlowStrategy (re-entry flow?) + R3.1 ViewComposer (SILENCE_RE_ENTRY greeting)          | Flow selection + variant             |
> | sessionsTotal / sessionsLast7d | R3.3 Identity Eligibility (≥ 4 threshold)                                                   | Eligibility check                    |
> | verificationRate7d             | R3.3 Identity Eligibility (≥ 0.70 threshold)                                                | Eligibility check                    |
> | consecutiveDeferrals           | R3.1 ViewComposer (DropoutSignal → ShrunkCard)                                              | Component inclusion                  |
> | cohortFlags                    | R1.1 FlowStrategy (A/B template selection)                                                  | Flow selection                       |
> | streaks                        | R3.1 ViewComposer (greeting variant, microcopy)                                             | Presentation                         |
>
>
> **R4 materializes as:**
>
> - Fields on PresentationContext VO (domain type) — the signals R3.1/R3.3 consume
> - Parameters to FlowStrategy.select() (domain service) — the signals R1.1 consumes
> - No separate domain service, no separate VO, no separate use case
>
> **Why document R4 at all?** It's the architectural justification for SSO being one BC. Without R4, R1 (WHEN) and R3 (WHAT) could be separate contexts. R4 is the shared signal dependency that makes splitting them wrong. Do NOT create a `CrossSessionAdapter` or similar — the adaptation logic lives inside R1.1 and R3.1 where the signals are consumed.

---

## Ubiquitous Language (in this context)

> **Audit note:** Terms cross-referenced against R1–R4 sub-responsibility audit and tactical building block inventory ([tactical spec](tactical/study-session-orchestration-tactical-spec.md)). Removed `Scene` and `Step` (UX design vocabulary). CommandRouter demoted to application dispatcher (not a domain service). MicrocopyResolver folded into ViewComposer as internal capability (not a standalone service).

### Shared terms (used across R1–R3 — confirms one BC)

| Term | DDD role | Definition (in this context) |
|------|----------|------------------------------|
| Flow | Concept | The sequence of screens a student sees from AppOpen through done. Different students may get different flows based on context signals. |
| Phase | Concept | A named step in the flow: `'checkin' \| 'intent' \| 'activation' \| 'session' \| 'verification' \| 'done'`. |
| Gate | Concept | A decision point where AdaptiveCoaching runs (P1/P2/P3). SSO sends commands to gates and receives their outputs. |
| SduiResponse | **Published Language output** | SSO's primary domain output: `{ schemaVersion, phase, view: { header, body, actions, footer }, actions, domain }`. The component tree IS the domain model of "what the student sees." Server-driven — client is a pure renderer. |
| SduiPhase | Enum (in SduiResponse) | `'checkin' \| 'intent' \| 'activation' \| 'session' \| 'verification' \| 'done'` — marks which screen the response represents. |

### R1-specific terms (WHEN module)

| Term | DDD role | Definition (in this context) | Sub-responsibility |
|------|----------|------------------------------|--------------------|
| FlowTemplate | **Value Object** | Describes which phases are included and whether each shows UI. Immutable. Static factories for known templates (declared-standard, negotiated-standard, onboarding, micro). Self-validates on `create()`. | R1.1 |
| FlowStrategy | **Domain Service** | Stateless, deterministic. Given student context signals, selects a FlowTemplate. Same pattern as ProtocolEngine. | R1.1 |
| FlowSelected | **Event (informational)** | Records which template was selected for a session. Observability only — does not affect aggregate state. | R1.1 |
| ~~CommandRouter~~ | ~~Domain Service~~ → **Application dispatcher** | Originally proposed as a domain service. Code investigation revealed 100% mechanical dispatch — no business rules. Demoted to application-layer concern. See [tactical spec §9](tactical/study-session-orchestration-tactical-spec.md). | R1.2 |
| Resume | Application concept | An interrupted session detected on AppOpen. NOT a flow — it reconstructs the interrupted view from Ledger-derived state. Resume detection runs BEFORE flow selection. No domain building block — read-side query. | R1.3 |

### R3-specific terms (WHAT module)

**Domain services and value objects:**

| Term | DDD role | Definition (in this context) | Sub-responsibility |
|------|----------|------------------------------|--------------------|
| ViewComposer | **Domain Service (pure)** | Per-phase pure functions mapping gate outputs + PresentationContext → SduiResponse. Zero DB calls, zero side effects. SSO's core domain service — analogous to ProtocolEngine in EI Runtime. | R3.1 |
| MicrocopyResolver | **Internal capability of ViewComposer** (not a standalone domain service) | Resolves student-facing text by gate/slot/mode/play. Priority chain: play-specific → mode-specific → default. The priority chain is a business rule, but the resolver (~25 lines) is ViewComposer's only consumer. Folded into ViewComposer as internal sub-function. Promote to standalone service if a second consumer emerges. See [tactical spec §9](tactical/study-session-orchestration-tactical-spec.md). | R3.2 |
| IdentityEligibility | **Specification (pure function → VO)** | Evaluates whether the student has earned the weekly behavioral reflection. Produces `{ eligible: boolean, statement?: string }`. Thresholds: verificationRate7d ≥ 0.70 AND pendingChecks ≤ 2 AND sessionsLast7d ≥ 4 AND 7+ days since last shown. | R3.3 |
| PresentationContext | **Value Object** (type in domain, assembly in application) | Derived from domain output + student aggregates. Built by Mastra steps (R3.4, application layer), consumed by ViewComposer (R3.1) and IdentityEligibility (R3.3). Contains student-level signals for microcopy/component decisions. Also carries R4 cross-session adaptation signals. | R3.4 / R3.1 / R3.3 |

**Domain data catalogs:**

| Term | DDD role | Definition (in this context) |
|------|----------|------------------------------|
| Microcopy | Domain data catalog | All student-facing text, organized by gate/slot/mode/play. Product decisions — "what do we say to a Rescue-mode student in P1?" Not config or i18n. Never hardcoded in ViewComposer. |

**Component-level domain terms** (referenced in R3.1 business rules — "show X when Y"):

| Term | Definition (in this context) |
|------|------------------------------|
| IdentityMoment | Weekly behavioral reflection card. Shown when IdentityEligibility check passes. |
| DropoutSignal | Per-topic: 3+ consecutive deferrals without verification. Triggers ShrunkCard variant. Presentation-only — does not affect gate routing. |
| ShrunkCard | Intervention-mode verification ask. Binary: Got it / Not yet. Component inclusion rule: DropoutSignal active. |
| DynamicFooterSeed | P3 done screen: "Next: [Oldest Pending Topic] waiting since [Day X]." Component inclusion rule: pendingChecks > 0. |
| ConfirmationStrip | P1 declared-intent screen element: "topic . taskType . ~time" reflecting student's own choices, not ELI prescription. |
| GreetingVariant | Checkin resume-context-card variant (ONBOARDING, SILENCE_RE_ENTRY, HIGH_PRESSURE, RETURNING, etc.). Selected by ViewComposer from PresentationContext signals. |

**UX principles** (inform ViewComposer design but are not building blocks):

| Term | Definition |
|------|------------|
| Progressive Disclosure | "One Screen, No Scroll" — ViewComposer builds state-specific component trees; client-side morphing handles transitions (P1: 1A→1B→1C vertical stack, P3: 3A→3B state replacement). |

> **Removed terms:**
> - **Scene** — UX narrative unit from docs/ux/. Not referenced in any R1–R4 sub-responsibility. Lives in UX design vocabulary, not SSO's domain language.
> - **Step** — Individual screen within a scene. Same reasoning — UX vocabulary, not a domain concept SSO's code uses.


---

## Inbound Communication

### Student commands (SSO-owned schemas — R2 application glue)

SSO defines the command schemas (what fields, what types). Processing is mechanical: validate → construct → route (R1.2) → dispatch. No domain logic in the translation. See R2 audit.

| Message name | Key data | Routed to | Integration style |
|---|---|---|---|
| AppOpen (initial: true, no topic) | studentId, isFirstOfDay | R1.3 DetectResume → R3.1 composeCheckinView | Sync |
| AppOpen (with topic) | studentId, topic, energy, sleep, taskType?, timebox?, isOnboarding?, isMicro? | R1.1 SelectFlow → gate handler → R3.1 ViewComposer | Sync |
| IntentSet | studentId, topic, setAt | R1.2 CommandRouter → P2 gate → R3.1 composeP2View | Sync |
| SessionEnd | studentId, topic, endedAt | R1.2 CommandRouter → P3 gate → R3.1 composeP3View | Sync |
| FirstActionStarted | studentId, topic, startedAt | R2 event append only (no gate, no view) | Sync |
| Replan | studentId, topic, replannedAt | R1.2 CommandRouter → P2 gate → R3.1 composeP2View | Sync |
| IntentResponse | studentId, negotiatedIntentId, decision | R1.2 CommandRouter → P1 gate → R3.1 composeP1View | Sync |
| RetrievalVerified / RetrievalScheduled / RetrievalSkipped | studentId, topic, + type-specific | R1.2 CommandRouter → verification workflow → R3.1 composePhase3View | Sync |
| VerificationCompleted | studentId, topic | R1.2 CommandRouter → verification-complete workflow → R3.1 composePhase3View | Sync |

### Gate outputs (from EI Runtime — consumed by R3.1 ViewComposer)

All three gate outputs feed directly into R3.1 ViewComposer per-phase functions. R3.2 (MicrocopyResolver) is called internally by R3.1. R3.3 (IdentityEligibility) does NOT consume gate outputs — it reads PresentationContext only.

| Message name | Consumed by | Key data | Relationship |
|---|---|---|---|
| SessionIntentIssuedOutput | R3.1 composeP1View | intentSource, timebox, taskType, mode, playId, verificationFloor, constraints | Published Language |
| ActivationPlanIssuedOutput | R3.1 composeP2View | mode, playId, firstAction, constraints (watchOnly) | Published Language |
| VerificationDecisionIssuedOutput | R3.1 composeP3View | verificationDecision, verificationSpec, mode, playId, dropoutSignalActive | Published Language |

### Projection queries (traced to sub-responsibilities)

| Query source | Data | Consumed by | Sub-responsibility |
|---|---|---|---|
| EI Projections: StudentAggregates | pendingChecks, silenceDays, sessionsTotal, openLoops | FlowStrategy inputs | R1.1 SelectFlow |
| EI Projections: StudentAggregates | pendingChecks, verificationRate7d, sessionsLast7d | PresentationContext → IdentityEligibility | R3.4 assembly → R3.3 |
| EI Projections: StudentAggregates | pendingChecks, silenceDays, stateTrend7d, streaks | PresentationContext → ViewComposer | R3.4 assembly → R3.1 |
| EI Projections: TopicState | session_phase (ADR-003) | Resume detection query | R1.3 DetectResume |
| EI Projections: TopicState | consecutive_deferrals | PresentationContext → DropoutSignal check | R3.4 assembly → R3.1 |
| EI Projections: TopicState | last_task_type | PresentationContext → default task type | R3.4 assembly → R3.1 |
| EI Projections: StudentPolicy | dials (cohortFlags) | FlowStrategy A/B selection | R1.1 SelectFlow |
| EI Projections: StudentPolicy | constraints | FlowStrategy + ViewComposer | R1.1 + R3.1 |
| LoopHealthAssessment | LoopHealthSnapshot.mode | PresentationContext.mode | R3.4 assembly → R3.1 |
| CohortAccess | studentId (server-derived) | All queries — identity boundary | Cross-cutting (ACL) |
| CurriculumCatalog | topicId, topicName | Topic display in views | R3.1 ViewComposer |

### Key insight — SSO decides, Mastra executes

```
Student → R2 validates/constructs command → R1 decides which handler (FlowStrategy or CommandRouter) → Mastra executes gate handler (EI Runtime) → R3 composes view (ViewComposer) → Student sees screen
```

SSO **decides** which gate handlers run (R1.1 FlowStrategy on AppOpen, R1.2 CommandRouter mid-session). Mastra is the **execution mechanism** — it coordinates the actual calls. The decision logic is SSO domain; the call orchestration is Mastra infrastructure.

```
SSO domain decision (R1)  →  Mastra executes  →  EI Runtime gate  →  SSO domain composition (R3)
```

---

## Outbound Communication

### Primary output — SduiResponse (produced by R3.1 ViewComposer)

SSO's Published Language output. Every SSO code path terminates by producing an SduiResponse — it's the thing SSO exists to produce.

| Produced by | Collaborator | Key data | Integration style |
|---|---|---|---|
| R3.1 ViewComposer (composeCheckinView, composeP1View, composeP2View, composeP3View, composePhase3View) | Student (client) | phase, view (component tree: header/body/actions/footer), actions, domain output | Sync return |

### SSO-owned events (appended to shared Ledger)

Events traced to producing sub-responsibility and downstream consumers:

**UI-produced events** (R2 application glue — mechanical append, no domain logic):

| Event | Key data | Produced by | Downstream consumers |
|---|---|---|---|
| AppOpen | studentId, energy, openedAt, timeCommitment?, taskType? | R2 glue | EI Projections (StudentAggregates recompute) |
| IntentSet | studentId, topic, setAt | R2 glue | EI Projections (TopicLoop phase transition) |
| SessionEnd | studentId, topic, endedAt | R2 glue | EI Projections (TopicLoop, StudentAggregates) |
| FirstActionStarted | studentId, topic, startedAt | R2 glue | EI Projections (TopicLoop phase tracking) |
| Replan | studentId, topic, replannedAt | R2 glue | EI Projections (TopicLoop) |
| IntentResponse | studentId, negotiatedIntentId, decision | R2 glue | EI Projections (TopicLoop) |
| RetrievalVerified / RetrievalScheduled / RetrievalSkipped | studentId, topic, type-specific | R2 glue | EI Projections (TopicLoop close/defer, StudentAggregates) |
| VerificationCompleted | studentId, topic | R2 glue | EI Projections (TopicLoop, StudentAggregates) |

**SSO domain-produced events** (side effects of domain decisions):

| Event | Key data | Produced by | Downstream consumers |
|---|---|---|---|
| FlowSelected | templateId, selectionContext, sessionId | R1.1 SelectFlow (side effect of FlowStrategy decision) | Ops & Observability (flow distribution dashboards) |
| IdentityMomentShown | studentId, statement | R3 (side effect of IdentityEligibility check + ViewComposer inclusion) | R3.3 IdentityEligibility (lastShownAt for 7-day cooldown) |

### Key insight — event ownership and the feedback loop

Events split cleanly by producer identity from [05-cross-cutting-concerns.md §Internal Event Catalog](05-cross-cutting-concerns.md):

- **SSO-owned (producer: "UI" + "SSO"):** AppOpen, IntentSet, SessionEnd, FirstActionStarted, Replan, IntentResponse, RetrievalVerified, RetrievalScheduled, RetrievalSkipped, VerificationCompleted, FlowSelected, IdentityMomentShown
- **AdaptiveCoaching-owned (producer: "P1"/"P2"/"P3"):** SessionIntentIssued, ActivationPlanIssued, VerificationDecisionIssued

SSO does NOT need its own event store — it appends to the shared Ledger via the same Customer-Supplier relationship that EI Runtime uses.

> **Feedback loop:** SSO's outbound events feed EI Projections, which SSO's inbound queries read back. This is the adaptation cycle:
>
> ```
> SSO emits event → EI Projections recompute → SSO queries projections (R1.1/R3.4) → SSO adapts flow/presentation
> ```
>
> SSO never reads its own events directly — it reads the projections derived from them. This is consistent with the Ledger's append-only invariant and the projection recompute model.

---

## Business Decisions

### R1 decisions (WHEN — flow structure)

1. **R1.1 Flow selection:** Given student context (payload signals + projection signals + cohort flags), which FlowTemplate to use. Deterministic. No randomness. A/B testing via cohortFlags set by Strategic Adjustment.
2. **R1.3 Resume vs. new flow:** On first-touch AppOpen, detect interrupted sessions before flow selection runs. Resume takes priority. Application-layer read query — no domain logic.
3. **R1.2 Mid-session routing:** IntentSet→P2, SessionEnd→P3, and special cases (onboarding skips P3, micro skips P1). These are SSO business rules about "what happens next," not infrastructure concerns.

### R3 decisions (WHAT — presentation)

1. **R3.1 Component inclusion:** Per phase, which SDUI components to include (deal card, welcome-back, guardrails, shrunk card, identity moment, dynamic footer seed). Progressive disclosure rules (P1: 1A→1B→1C, P3: 3A→3B).
2. **R3.1 Greeting variant:** On checkin, which resume-context-card variant (ONBOARDING, SILENCE_RE_ENTRY, HIGH_PRESSURE, RETURNING, etc.).
3. **R3.2 Microcopy selection:** Per gate/slot/mode/play, which text to show. Priority chain: play-specific → mode-specific → default.
4. **R3.3 Identity eligibility:** Whether to show the weekly behavioral reflection card. Pure eligibility check based on PresentationContext signals.

### What SSO does NOT decide

- Coaching posture (Rescue/Neutral/Boost) — LoopHealthAssessment + EI Runtime
- Play selection from the 24-play catalog — ProtocolEngine (EI Runtime)
- Verification floor, watch-only override, risk override — StudySession aggregate invariants (EI Runtime)
- Student-level metrics and labels — EI Projections + LoopHealthAssessment
- Signal computation (pendingChecks, silenceDays, verificationRate7d, etc.) — EI Projections computes, SSO consumes
- Policy dials — Strategic Adjustment

---

## Assumptions

> Traced to sub-responsibilities where applicable.

- EI Runtime gate outputs are stable Published Language contracts (SessionIntentIssuedOutput, ActivationPlanIssuedOutput, VerificationDecisionIssuedOutput). Changes require coordination. *(R3.1 ViewComposer depends on these shapes.)*
- PresentationContext is built by Mastra steps (R3.4) from DB-loaded data; ViewComposer (R3.1) never touches the database.
- Client is a pure SDUI renderer — zero routing logic client-side. SSO's SduiResponse is the complete instruction set.
- StudentPolicy.dials provides cohort flags for A/B testing; Strategic Adjustment owns assignment. *(R1.1 FlowStrategy consumes these.)*
- ADR-003's `session_phase` column in `ei_topic_state` is available for resume detection. *(R1.3 DetectResume depends on this.)*
- ADR-004's fold/reconstitute means P3 can get `verificationFloor` and `watchOnlyFlag` from reconstituted aggregate — no Ledger queries needed. This invalidates the "P3 queries Ledger independently" threading analysis in the original ADR-005 draft.
- The shared Ledger accepts SSO-owned events via the same append path as AdaptiveCoaching events. No separate event store needed.
- **Determinism:** FlowStrategy (R1.1), ViewComposer (R3.1, includes microcopy resolution), and IdentityEligibility (R3.3) are all **deterministic** — same inputs → same output. This enables spec-style unit tests with no mocks. R1.2 dispatch is also deterministic but lives in the application layer.
- **Static catalogs:** Microcopy catalogs (`catalog.ts`, `p1.ts`, `p2.ts`, `p3.ts`, `identity.ts`) are static at deploy time — not loaded from DB. If that changes, the domain/infrastructure boundary for R3.2 shifts.

---

## Verification Metrics

> Aligned with audit sub-responsibilities and UL terms.

### R1 metrics (WHEN)

- **R1.1 Flow selection equivalence:** `FlowStrategy.select()` must produce identical routing as the current 9-branch if-else tree for all known input combinations. Spec tests: given inputs → expected FlowTemplate.
- **R1.2 CommandRouter completeness:** Every `commandType` maps to exactly one routing rule in CommandRouter. Template exception coverage: onboarding, micro, declared-standard, negotiated-standard all tested.
- **R1.3 Resume detection:** DetectResume correctly identifies all interrupted session states (active P2, pending P3, pending intent review) from `session_phase` projection.

### R3 metrics (WHAT)

- **R3.1 ViewComposer purity:** Zero DB calls, zero side effects confirmed by unit tests. Every per-phase function tested with representative PresentationContext inputs.
- **R3.1 SduiResponse schema compliance:** All responses validate against SduiResponseSchema.
- **R3.2 MicrocopyResolver priority chain:** For every gate/slot/mode/play combination, play-specific wins over mode-specific wins over default. No missing keys at runtime.
- **R3.3 IdentityEligibility spec tests:** Threshold boundary tests — eligible at exactly 0.70/2/4/7d, ineligible at 0.69/3/3/6d. Cooldown enforced.

### Cross-cutting metrics

- **Event ownership clarity:** Every event in `EventTypeEnum` has exactly one owning bounded context (SSO or AC). No ambiguity.
- **Boundary violation detection:** No SSO code imports from `src/ei/domain/study-session/` (that's EI Runtime). SSO consumes gate outputs only via Published Language contracts.
- **Feedback loop consistency:** Projections that SSO reads (StudentAggregates, TopicState) are recomputable from the events SSO writes. No circular dependency — only eventual consistency via Ledger → Projections → SSO queries.

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

**Option A (initial chain only):** Template lists only phases that execute immediately on AppOpen. Mid-session routing (IntentSet→P2, SessionEnd→P3) is handled separately by CommandRouter (R1.2).

**Option B (full session metadata):** Template lists ALL phases including future ones. The `showUI` flags for future phases are consulted when those phases compose their views later. Enables experiments like "P2 is silent even though IntentSet triggered it."

> **Audit update:** The R1 audit supports Option A. R1.1 (SelectFlow) and R1.2 (RouteCommand) are **separate use cases with separate domain concepts** — FlowTemplate/FlowStrategy vs CommandRouter. They don't share domain objects. This clean separation means FlowTemplate naturally owns only the initial chain, and CommandRouter independently owns mid-session routing. Option B would force FlowTemplate to leak into CommandRouter's concern.
>
> **Resolution:** Start with Option A. If Product requires per-phase `showUI` experiments, promote by having CommandRouter consult the template's phase flags — but only when the requirement exists.

### Q4: Handler threading post-ADR-004

ADR-004 introduces `StudySession.fold(events)`. After fold, P3 gets `verificationFloor` and `watchOnlyFlag` from the reconstituted aggregate — no Ledger queries needed. Should the executor load the aggregate once and pass it through, or let each handler load independently? This affects SSO's flow executor design but the answer depends on EI Runtime's repository pattern.

### Q5: SSO aggregate — does it need one? (surfaced by audit, answered)

The full R1–R4 audit found **no aggregate root** in SSO. All domain logic is in stateless domain services (FlowStrategy, ViewComposer) and value objects (FlowTemplate, PresentationContext, FlowSelectionContext). SSO has no mutable state to guard, no lifecycle to enforce, no invariants that span multiple writes.

This is unusual but valid for a Supporting subdomain. SSO is a **"domain services + value objects" bounded context** — it makes decisions but doesn't own state. The Ledger owns events, Projections own derived state, EI Runtime owns aggregate lifecycle.

If a future requirement introduces SSO-owned mutable state (e.g., "remember the student's preferred flow template"), that would warrant an aggregate. Until then, no aggregate is correct — don't create one for symmetry with EI Runtime.

**Tactical spec:** [tactical/study-session-orchestration-tactical-spec.md](tactical/study-session-orchestration-tactical-spec.md) — full building block inventory, ports, audit findings.