# ADR-005: Flow-Level Adaptation — StudySessionOrchestration Bounded Context Extraction + FlowStrategy

**Status:** Proposed
**Date:** 2026-03-13
**Deciders:** Product + Engineering (AI Study Brother core team)
**Supersedes:** None (new ADR)

---

## Context

### Root Cause — Two Subdomains Collapsed Into One Bounded Context

The [context map](../03-context-map.md) currently lists **EI Runtime** as a single bounded context serving two subdomains: AdaptiveCoaching and StudySessionOrchestration. The [EI Runtime canvas](../canvas-ei-runtime.md) line 5 confirms: `Subdomain(s): AdaptiveCoaching, StudySessionOrchestration`.

This is the **strategic root cause** of the problems described below. In DDD strategic terms: the context map collapsed two distinct subdomains — with different capabilities, change cadences, and business questions — into one bounded context. The "carpet" (BC boundary) doesn't fit the "floor" (subdomain boundaries).

The distinction is captured by a preposition: AdaptiveCoaching operates **"at"** each gate (point function — what coaching move to make), while StudySessionOrchestration operates **"across"** gates (end-to-end journey — what the student sees, and when).

### The Strategic Design Already Anticipated This

The subdomain definition in [02-subdomains.md §6](../02-subdomains.md) describes StudySessionOrchestration's capability:

> "Own the end-to-end student-facing study-session journey orchestration across gates (check-in → intent → activation → session → verification → done), including progressive disclosure and trust-preserving friction."

The Boundaries-In field identifies **four responsibilities**:

1. **R1 — Flow Structure (WHEN):** Orchestrating screens/steps and when they appear
2. **R2 — Input Collection:** Collecting taps/inputs and emitting corresponding domain events
3. **R3 — Presentation (WHAT):** Mapping protocol outputs into UI steps (ViewComposer, microcopy, progressive disclosure)
4. **R4 — Cross-Session Adaptation:** Consuming cross-session signals to adapt **both** step order (R1) AND microcopy/defaults (R3)

And explicitly scopes cross-session adaptation:

> "**Cross-session adaptation:** may consume cross-session summaries/signals to **adapt step order**, defaults, and microcopy in the current session — but does not compute those metrics or interpret them into labels."

"Adapt step order" IS flow-level adaptation. The subdomain was designed for this capability from the start. This ADR implements it.

### Why One Bounded Context, Not Two

R1 (WHEN) and R3 (WHAT) might appear to be separate bounded contexts, but ubiquitous language analysis confirms they are **modules within one BC**:

- **Shared language:** Flow, Phase, Gate — same meaning across R1–R4
- **Specialized language:** FlowTemplate, FlowSelectionContext (R1), PresentationContext (R3) — indicate modules, not separate BCs
- **R4 spans both:** Cross-session adaptation consumes the same signals to adapt both step order (R1) and microcopy/defaults (R3). Splitting them would fragment R4 across two BCs with no clear owner

The full SSO bounded context canvas is at [canvas-study-session-orchestration.md](../canvas-study-session-orchestration.md).

### The Canvas Open Question — Answered

The EI Runtime canvas ([canvas-ei-runtime.md §Open Questions](../canvas-ei-runtime.md)) asks:

> "When to split StudySessionOrchestration into a separate context if UX iteration cadence diverges from gate logic."

The answer is **now**. Evidence:

1. **Iteration cadence has diverged.** ViewComposer, microcopy, 31 SDUI components, presentation context, identity eligibility — all change at UX experimentation speed. Gate handlers (P1/P2/P3), aggregate invariants, ProtocolEngine — change at domain logic speed. They are already module-separated (`src/ei/sdui/` vs `src/ei/domain/study-session/`).

2. **Flow selection is not AdaptiveCoaching.** It doesn't decide what coaching move to make (that's gate logic). It decides which screens to show in what order. That's orchestration — a different concern with different owners.

3. **The dependency direction is one-way.** StudySessionOrchestration consumes AdaptiveCoaching outputs (NegotiatedIntent, ActivationPlan, VerificationDecision). It never feeds back. SSO "sandwiches" AdaptiveCoaching: `Student → SSO collects inputs → SSO emits command → AC processes gate → gate output → SSO composes view → Student`.

4. **Different data needs.** Gate handlers need `LoopHealthSnapshot`, `PlayContext`, `GateContext`. Flow selection needs `sessionsTotal`, `silenceDays`, `pendingChecks`, `cohortFlags` — student-level signals, not session-level. Different data needs usually signals different bounded contexts.

5. **Event ownership splits cleanly.** The [internal event catalog](../05-cross-cutting-concerns.md) already marks producer as "UI" vs "P1/P2/P3". UI-produced events (AppOpen, IntentSet, SessionEnd, etc.) are SSO-owned. Gate output events (SessionIntentIssued, ActivationPlanIssued, VerificationDecisionIssued) are AC-owned.

### The 430-Line Routing Monolith

`ei-app-open.ts` contains a single `appOpenBranchStep` function with 9 hardcoded branches that determine which screen sequence a student sees:

| Branch | Lines | Trigger | Flow |
|--------|-------|---------|------|
| Active session resume | 91–136 | `FirstActionStarted` without `SessionEnd` | → `composeSessionView` (P2 resume) |
| P3 resume | 138–174 | `VerificationDecisionIssued` without terminal | → `composeP3View` |
| Intent resume | 176–259 | Negotiated `SessionIntentIssued` without progression | → `composeP1View` |
| No active session | 261–265 | First touch, no session state | → `checkinViewWorkflow` |
| Onboarding | 268–285 | `isAppOpenOnboarding` | → `protocol1IgnitionWorkflow` + `composeOnboardingResponseView` |
| Micro | 287–310 | `isAppOpenMicro` | → `protocol2ActivationWorkflow` |
| Declared intent | 337–383 | `fullPayload.taskType` present | → `RunDeclaredIntentHandler` → silent P2 → `sessionStartWorkflow` |
| Negotiated P1 | 390–403 | `protocol === 1` | → `protocol1IgnitionWorkflow` |
| Negotiated P2 | 405–417 | `protocol === 2` | → `protocol2ActivationWorkflow` |

This routing logic lives in infrastructure (Mastra workflow step), not in the domain. It is untestable in isolation, unobservable (no Ledger trace of which flow was selected), and impossible for Product to extend without modifying the if-else tree.

### Two Concerns Conflated

The `appOpenBranchStep` conflates two distinct responsibilities:

1. **What business decision should we make?** (which flow, which handler) — this is domain logic belonging to StudySessionOrchestration
2. **How do we execute it?** (instantiate handlers, chain Mastra workflows, thread data) — this is infrastructure

### Why Now — Foundation Is Clean

ADR-001 through ADR-004 cleaned the domain:

| ADR | What it fixed |
|-----|--------------|
| ADR-001 | `DeclaredIntent` + `NegotiatedIntent` as sibling VOs; `SessionIntentIssued` unified event |
| ADR-002 | Both paths emit identical Ledger event sequences; silent P2 for declared path |
| ADR-003 | `session_phase` column in `ei_topic_state`; projection schema evolution |
| ADR-004 | Event-sourced repository; fold/reconstitute pattern |

The domain is clean. The routing layer is the remaining monolith. And the subdomain split, designed strategically but never implemented, is now the bottleneck.

### The Product Gap

Students perceive the app as "just a session tracker" because the interaction pattern (form → timer → checkbox → done) never changes regardless of session count or student history. Flow-level adaptation — different students getting different phase sequences — is the architectural foundation for making the experience feel adaptive. Product cannot experiment with flow variants without engineering changes to the 430-line branch tree.

---

## Decision

Two interrelated decisions:

### Decision 1: Extract StudySessionOrchestration as Its Own Bounded Context

Split EI Runtime into two bounded contexts:

- **EI Runtime** (keeps the name) — AdaptiveCoaching subdomain only. StudySession aggregate, gate handlers, ProtocolEngine, cross-protocol invariants.
- **StudySessionOrchestration** (new bounded context) — its own subdomain. All four responsibilities: flow structure (R1), input collection (R2), presentation (R3), cross-session adaptation (R4). Canvas: [canvas-study-session-orchestration.md](../canvas-study-session-orchestration.md).

**Relationship pattern:** EI Runtime → SSO is **Published Language** (gate output VOs are well-defined, versioned contracts that SSO consumes without influencing how they're produced). Same pattern as LoopHealthAssessment → EI Runtime.

### Decision 2: SSO Domain Concepts — Four Responsibilities With Domain Home

SSO is not just "flow selection + view composition." It encompasses four responsibilities that currently lack a domain home, leaking into infrastructure (Mastra workflows, API routes, `ei-app-open.ts` if-else tree).

#### R1 — Flow Structure (WHEN module)

Three new domain concepts:

1. **FlowTemplate** (Value Object): Describes a phase sequence with `showUI` flags. Immutable, self-validating.
2. **FlowStrategy** (Domain Service): Selects a FlowTemplate based on student context signals. Deterministic, stateless, no I/O.
3. **FlowSelected** (Domain Event): Emitted when a flow is selected. Observable in the Ledger.

Two new application-layer use cases:

4. **SelectFlowHandler**: Wraps FlowStrategy, builds context from loaded signals, returns template + event.
5. **DetectResumeHandler**: Extracts the 3 resume detection branches from `appOpenBranchStep`. Reads `session_phase` from projection (per ADR-003).

**Mid-session routing is application-layer dispatch.** IntentSet→P2, SessionEnd→P3 — code investigation revealed 100% mechanical dispatch (payload shape + projection state → handler). Zero business rules. This is application-layer coordination, not domain logic. The current `RunEiCommandHandler` routing by `commandType` is correctly placed in infrastructure. See [study-session-orchestration-tactical-spec.md §9](../tactical/study-session-orchestration-tactical-spec.md) for the audit finding.

#### R2 — Input Collection & Event Emission

SSO owns the student-facing command vocabulary: AppOpen, IntentSet, SessionEnd, FirstActionStarted, Replan, IntentResponse, RetrievalVerified, RetrievalScheduled, RetrievalSkipped, VerificationCompleted. These are "UI-produced" events — SSO translates student taps into domain commands.

**Event ownership split:** SSO-owned events (producer: "UI"/"SSO" in the [event catalog](../05-cross-cutting-concerns.md)) vs AdaptiveCoaching-owned events (producer: "P1"/"P2"/"P3": SessionIntentIssued, ActivationPlanIssued, VerificationDecisionIssued). Both append to the shared Ledger.

#### R3 — Presentation (WHAT module)

Existing code that moves into SSO's domain:

6. **ViewComposer** (Domain Service, pure function): Maps gate outputs + PresentationContext → SduiResponse. Zero DB calls. Microcopy resolution (priority chain: play-specific → mode-specific → default) is an internal capability of ViewComposer, not a standalone domain service — ViewComposer is the sole consumer.
7. **PresentationContext** (Value Object): Derived from domain output + student aggregates. Built by application layer, consumed by ViewComposer. **Needs `create()` factory** with domain validation (mode enum, non-negative counts, rate ∈ [0,1]) — currently built by application builders without validation. See [study-session-orchestration-tactical-spec.md §10](../tactical/study-session-orchestration-tactical-spec.md).
8. **IdentityEligibility** (Specification, function form): Pure eligibility check for weekly behavioral reflection card. Not a class — single predicate, no composition needed.

#### R4 — Cross-Session Adaptation (spans WHEN + WHAT)

Consumes signals (pending checks, silence days, sessions total, dropout signals, cohort flags) to adapt **both** R1 (step order — e.g., verification-first for overdue students) and R3 (microcopy/defaults — e.g., greeting variant, component visibility). This is why R1 and R3 are modules within one BC, not separate BCs.

---

## Options Considered

### Option A — Refactor `appOpenBranchStep` into smaller functions (Rejected)

Extract each branch into a named function, keep the if-else tree within EI Runtime.

**Rejected because:** The if-else tree is the structural problem. Each new flow variant adds a branch. No observability. No domain ownership. And it keeps routing logic in infrastructure rather than moving it to the correct subdomain.

### Option B — FlowStrategy in EI Runtime domain, no context split (Rejected)

Add FlowTemplate and FlowStrategy to `src/ei/domain/study-session/` alongside the aggregate.

**Rejected because:** Flow selection is not AdaptiveCoaching. Putting it in the same domain folder as the StudySession aggregate violates the subdomain boundary that [02-subdomains.md](../02-subdomains.md) already defined. The StudySession aggregate doesn't know about flows and shouldn't — it processes commands, enforces lifecycle invariants, emits events. Adding flow concepts there mixes two concerns with different change cadence and different owners.

### Option C — Bounded context extraction + FlowStrategy as SSO domain service (Chosen)

Extract StudySessionOrchestration as its own bounded context. FlowTemplate and FlowStrategy are domain concepts within that context. The context consumes AdaptiveCoaching outputs via Published Language.

**Chosen because:**
- Implements the split the strategic design anticipated ([canvas-ei-runtime.md §Open Questions](../canvas-ei-runtime.md))
- FlowStrategy is domain logic (business rules about which screens students see), not infrastructure
- Flow definitions become data (FlowTemplate VOs), not code branches
- `FlowSelected` event makes all flow decisions observable
- StudySession aggregate is unchanged — no risk to domain invariants
- The code is already module-separated (`src/ei/sdui/`); this makes the boundary explicit
- Follows the `ProtocolEngine` precedent: stateless domain service, deterministic, testable in isolation

### Option D — Full workflow engine / state machine framework (Deferred)

Introduce a generic workflow engine (like XState) that models the entire session lifecycle as a formal state machine.

**Deferred because:** Over-engineered for current needs. The number of distinct flow templates is small (5–8 foreseeable). A lightweight data-driven approach achieves the same composability. Revisit if template count exceeds 15 or if flow branching within a template becomes common.

---

## Bounded Context Extraction

### Context Map Update

**Before (current):**
```
EI Runtime
  Subdomains: AdaptiveCoaching + StudySessionOrchestration (co-located)
  Code: src/ei/domain/study-session/, src/ei/application/run-p{1,2,3}-gate/, src/ei/sdui/
```

**After:**
```
EI Runtime (AdaptiveCoaching only)
  Code: src/ei/domain/study-session/, src/ei/application/run-p{1,2,3}-gate/, src/ei/engine/

StudySessionOrchestration (new bounded context)
  Code: src/ei/study-session-orchestration/
```

### Context Map Relationship

```
EI Runtime ──Published Language──▶ StudySessionOrchestration
  (gate output VOs: NegotiatedIntent, ActivationPlan, VerificationDecision)

EI Projections ──Customer-Supplier──▶ StudySessionOrchestration
  (aggregates, topic state for FlowSelectionContext + PresentationContext)

LoopHealthAssessment ──Published Language──▶ StudySessionOrchestration
  (LoopHealthSnapshot — for flow selection signals like mode)

CohortAccess ──ACL──▶ StudySessionOrchestration
  (server-derived studentId)

CurriculumCatalog ──Published Language──▶ StudySessionOrchestration
  (TopicReference for topic picker and microcopy)
```

**Why Published Language (not Customer-Supplier) for EI Runtime → SSO:**

The gate output VOs (`NegotiatedIntent`, `ActivationPlan`, `VerificationDecision`) are well-defined, versioned contracts. StudySessionOrchestration consumes them without influencing how they're produced. Same pattern as LoopHealthAssessment → EI Runtime (already Published Language in the context map).

### Folder Structure

`src/ei/study-session-orchestration/` — context-first layout (not layer-first):

```
src/ei/study-session-orchestration/
├── domain/
│   ├── flow-template.ts              # FlowTemplate VO
│   ├── flow-strategy.ts              # FlowStrategy domain service
│   └── presentation-context.ts       # PresentationContext VO (derived, with business rules)
├── application/
│   ├── select-flow/
│   │   ├── handler.ts                # SelectFlowHandler
│   │   ├── command.ts                # SelectFlowCommand
│   │   └── port.ts                   # ISelectFlowUseCase (driver port)
│   ├── detect-resume/
│   │   ├── handler.ts                # DetectResumeHandler
│   │   ├── command.ts                # DetectResumeCommand
│   │   └── port.ts                   # IDetectResumeUseCase (driver port)
│   └── compose-view/
│       ├── handler.ts                # ComposeViewHandler (wraps ViewComposer as use case)
│       └── port.ts                   # IComposeViewUseCase (driver port)
├── view-composer.ts                  # Domain service: pure function, maps outputs → SduiResponse
├── microcopy/
│   ├── catalog.ts                    # All student-facing text by gate/slot/mode/play
│   ├── resolver.ts                   # Priority chain: play-specific → mode-specific → default
│   ├── p1.ts, p2.ts, p3.ts          # Phase-specific microcopy
│   └── identity.ts                   # Identity moment statements
├── identity/
│   └── compute-identity-eligibility.ts  # Pure eligibility check
├── types/
│   ├── sdui-contract.ts              # SduiResponse, SduiViewTree, SduiPhase, SduiAction
│   └── components.ts                 # SduiComponent discriminated union (31 types)
└── __tests__/
    ├── flow-strategy.test.ts         # Domain unit tests (no mocks)
    ├── flow-template.test.ts         # VO invariant tests
    └── view-composer.test.ts         # Pure function tests
```

**Why context-first instead of layer-first:**

The existing convention is layer-first (`src/ei/domain/{aggregate}/`, `src/ei/application/{use-case}/`). This works for small contexts like LoopHealthAssessment (one service + one handler). StudySessionOrchestration is much larger — ViewComposer, 8+ compose functions, microcopy system, identity eligibility, 31 component schemas, presentation context. It needs its own boundary.

`src/ei/sdui/` already broke the layer-first convention by existing at the `src/ei/` root level. Renaming it to `src/ei/study-session-orchestration/` and adding `domain/` + `application/` sublayers makes the existing reality explicit.

Other contexts (LoopHealthAssessment, EI Projections) stay layer-first. No migration needed for them.

### What Moves, What Stays

| Current Location | New Location | Context |
|-----------------|-------------|---------|
| `src/ei/sdui/view-composer.ts` | `src/ei/study-session-orchestration/view-composer.ts` | SSO |
| `src/ei/sdui/presentation-context.ts` | `src/ei/study-session-orchestration/domain/presentation-context.ts` | SSO |
| `src/ei/sdui/microcopy/` | `src/ei/study-session-orchestration/microcopy/` | SSO |
| `src/ei/sdui/identity/` | `src/ei/study-session-orchestration/identity/` | SSO |
| `src/ei/sdui/types/` | `src/ei/study-session-orchestration/types/` | SSO |
| `src/ei/domain/study-session/` | stays | EI Runtime |
| `src/ei/application/run-p{1,2,3}-gate/` | stays | EI Runtime |
| `src/ei/application/run-declared-intent/` | stays | EI Runtime |
| `src/ei/engine/` | stays | EI Runtime |
| (new) `flow-template.ts` | `src/ei/study-session-orchestration/domain/flow-template.ts` | SSO |
| (new) `flow-strategy.ts` | `src/ei/study-session-orchestration/domain/flow-strategy.ts` | SSO |
| (new) `select-flow/handler.ts` | `src/ei/study-session-orchestration/application/select-flow/handler.ts` | SSO |
| (new) `detect-resume/handler.ts` | `src/ei/study-session-orchestration/application/detect-resume/handler.ts` | SSO |

---

## Domain Concepts (StudySessionOrchestration)

### FlowTemplate — Value Object

**Location:** `src/ei/study-session-orchestration/domain/flow-template.ts`

```typescript
type FlowPhaseId = 'p1-intent' | 'p2-activation' | 'session' | 'p3-verification' | 'done';

interface PhaseStep {
  readonly phase: FlowPhaseId;
  readonly showUI: boolean;       // false = silent execution (handler runs, events emitted, no SDUI view)
}

interface FlowTemplateProps {
  readonly templateId: string;    // e.g., 'declared-standard', 'negotiated-standard'
  readonly label: string;         // human-readable for Ops dashboards
  readonly phases: readonly PhaseStep[];
  readonly applicableWhen: string; // human-readable description of selection criteria
}
```

**Key design decisions from discussion:**

1. **No `required` flag.** Every phase in a template runs — that's why it's in the template. If a phase shouldn't run, it's not in the template. Only `showUI` matters. Templates are deterministic and immutable; conditional phases = different templates.

2. **No `checkin` phase.** Checkin is the pre-flow state — student sends `AppOpen { initial: true }` with no topic, gets the checkin screen, fills it out, sends another `AppOpen` with topic/energy. FlowStrategy runs on that **second** AppOpen. Checkin is not a session flow; no aggregate lifecycle begins.

3. **FlowTemplate governs AppOpen only.** Subsequent transitions (IntentSet → P2, SessionEnd → P3) are command-driven by the client through `RunEiCommandHandler` routing by `commandType`. FlowTemplate describes the **initial execution chain on AppOpen** — which handlers run immediately (silently or with UI) and what SduiResponse to return. It does NOT govern the full session lifecycle.

**Self-validation invariants:**
- Phase order must follow the aggregate lifecycle: if `p1-intent` appears, it precedes `p2-activation`; if `p2-activation` appears, it precedes `session`
- If `session` is present, `p3-verification` must also be present (minimum viable loop)
- At least one phase must have `showUI: true` (otherwise nothing to return)

**Initial templates** (static factory methods):

| Template ID | Phases (UI visibility) | Current Branch |
|-------------|----------------------|----------------|
| `declared-standard` | p1(silent) → p2(silent) → session(UI) → p3(UI) → done(UI) | Branch 7 (lines 337–383) |
| `negotiated-standard` | p1(UI) → p2(UI) → session(UI) → p3(UI) → done(UI) | Branches 8+9 (lines 390–417) |
| `onboarding` | p1(silent) → p2(silent) → session(UI) | Branch 5 (lines 268–285) |
| `micro` | p2(UI) → session(UI) → p3(UI) → done(UI) | Branch 6 (lines 287–310) |

**Note:** Resume flows (branches 1–3) are NOT templates. They are handled by `DetectResumeHandler` before flow selection occurs — they reconstruct the interrupted view from Ledger-derived state, not select a new flow. The pre-flow checkin (branch 4) is also NOT a template — it's handled before FlowStrategy runs.

### FlowStrategy — Domain Service

**Location:** `src/ei/study-session-orchestration/domain/flow-strategy.ts`

**DDD justification (CHEATSHEET decision tree):**
```
Does it naturally belong to one entity? → NO (no aggregate in SSO)
Does it require multiple aggregates? → YES (StudentAggregates, StudentPolicy)
Is it stateless business logic? → YES → Domain Service ✓
```

Same pattern as `ProtocolEngine` in EI Runtime ([ei-runtime-tactical-spec.md §8](../tactical/ei-runtime-tactical-spec.md)) — stateless, spans multiple inputs, pure function.

```typescript
// FlowSelectionContext — Value Object (focused input to FlowStrategy)
// Needs create() factory with validation. See tactical spec §3.
interface FlowSelectionContext {
  // From AppOpen command payload
  readonly hasTaskType: boolean;          // declared-entry signal (taskType present)
  readonly isOnboarding: boolean;         // topic + taskType only, no energy
  readonly isMicro: boolean;              // micro task payload
  readonly hasTopic: boolean;             // topic present in payload

  // From EI Projections (loaded by SelectFlowHandler)
  readonly sessionsTotal: number;
  readonly silenceDays: number;
  readonly pendingChecks: number;
  readonly openLoops: number;

  // From StudentPolicy (loaded by SelectFlowHandler)
  readonly cohortFlags: Record<string, boolean>;  // from StudentPolicy.dials
}

class FlowStrategy {
  /**
   * Deterministic: same FlowSelectionContext → same FlowTemplate.
   * No I/O. No randomness. A/B testing via cohortFlags (set by Strategic Adjustment).
   */
  static select(ctx: FlowSelectionContext): FlowTemplate { ... }
}
```

**Selection precedence** (evaluated top-to-bottom, first match wins):

| Priority | Condition | Template |
|----------|-----------|----------|
| 1 | `isOnboarding` | `onboarding` |
| 2 | `isMicro` | `micro` |
| 3 | `hasTaskType` (declared-entry) | `declared-standard` |
| 4 | `hasTopic && !hasTaskType` | `negotiated-standard` |

**Key invariants:**
- **Deterministic:** Same inputs always produce the same output. No `Math.random()`, no `Date.now()`.
- **A/B testing via cohort flags:** `cohortFlags` come from `StudentPolicy.dials`. Strategic Adjustment sets `dials['flow.experiment.X'] = true`. FlowStrategy reads the flag. No random assignment inside the domain.
- **Resume detection is NOT flow selection:** Resume flows are detected by `DetectResumeHandler` before FlowStrategy runs.
- **Pre-flow checkin is NOT flow selection:** When AppOpen has no topic, the Mastra step returns the checkin view immediately — FlowStrategy is not called.

**Why `FlowSelectionContext` includes Projection signals:**

The Product features in the subdomain definition require student-level signals: "may consume cross-session summaries/signals to adapt step order." `sessionsTotal`, `silenceDays`, `pendingChecks` enable rules like "students with overdue verifications get verification-first flow." These signals are loaded by `SelectFlowHandler` (application layer, I/O) and passed to FlowStrategy (domain, pure).

### FlowSelected — Domain Event

```typescript
// Added to EventTypeEnum in src/ei/schemas/events.ts
'FlowSelected'

// Payload shape
{
  studentId: string;
  sessionId: string;
  templateId: string;               // e.g., 'declared-standard'
  selectionContext: {                // snapshot of inputs for debugging/analysis
    sessionsTotal: number;
    hasTaskType: boolean;
    isOnboarding: boolean;
    isMicro: boolean;
    silenceDays: number;
    pendingChecks: number;
    cohortFlags: Record<string, boolean>;
  };
  selectedAt: string;               // ISO8601
}
```

This event is **informational** (Ops/observability). It does NOT affect aggregate state. It exists for:
- Debugging flow selection decisions
- A/B test analysis ("which flow templates are students seeing?")
- Ops dashboards (flow template distribution, conversion rate per flow)
- Flow persistence: subsequent phases can read `templateId` from this event when building PresentationContext

---

## Execution Model

### What FlowTemplate Actually Governs

Looking at the routing matrix in [ei-runtime-tactical-spec.md §10](../tactical/ei-runtime-tactical-spec.md):

| Command | Routing | Needs FlowTemplate? |
|---------|---------|---------------------|
| `AppOpen` (with topic) | FlowStrategy selects template, executor walks phases | **Yes** |
| `AppOpen` (no topic) | Return checkin view immediately | No (pre-flow) |
| `IntentSet` | Always → P2 | No (command-driven) |
| `SessionEnd` | Always → P3 | No (command-driven) |
| `VerificationComplete` / `RetrievalSchedule` / `RetrievalSkip` | Always → post-P3 workflow | No (command-driven) |
| `Replan` | Always → P2 re-run | No (command-driven) |

**Only AppOpen with a topic requires flow routing.** All subsequent commands have deterministic routing by `commandType` through `RunEiCommandHandler`. FlowTemplate is specifically about the initial execution chain — not the full session lifecycle.

### Refactored `appOpenBranchStep`

```
1. IF AppOpen { initial: true, no topic }
   → return checkin view immediately (pre-flow; no FlowStrategy call)

2. detectResume(studentId, topicState)
   → reads session_phase from ei_topic_state (ADR-003)
   → if resume detected, return SDUI view immediately (short-circuit)

3. selectFlow(studentId, payload, aggregates, policy)
   → FlowStrategy.select(ctx) → FlowTemplate

4. appendFlowSelectedEvent(studentId, sessionId, template)
   → Ledger append (informational)

5. executeInitialChain(template, payload, handlers)
   → Walk template.phases in order:
     - If showUI: false → run handler silently, collect output, continue
     - If showUI: true → run handler, compose SDUI response, return (stop walking)
   → Subsequent phases triggered by client commands (IntentSet → P2, SessionEnd → P3)
```

### Handler Data Threading in Silent Execution

When the executor walks silent phases (e.g., `declared-standard`: silent P1 → silent P2 → session UI), data must flow between handlers:

| From | To | Data | How |
|------|-----|------|-----|
| P1 output | P2 command | `issuedAt` → `setAt` | Executor threads P1 output's `issuedAt` into P2 command's `setAt` field |
| P1 output | P2 command | `taskType` | Executor threads through |
| P1/P2 output | P3 | `verificationFloor`, `watchOnlyFlag` | **Via reconstituted aggregate ([ADR-004](adr-004-session-lifecycle-persistence.md)).** P3 handler loads the StudySession via `IStudySessionRepository.findById()`, which folds Ledger events into the aggregate. `verificationFloor` and `watchOnlyFlag` are available as VOs on the reconstituted aggregate — no separate Ledger queries needed. |

The only direct threading is P1 → P2 (`issuedAt` → `setAt`). P3 gets cross-protocol constraints from the reconstituted aggregate (ADR-004), not from output threading or independent Ledger queries. This is manageable because:
- The executor knows the handler output types (typed per handler)
- P2's `setAt` is always P1's `issuedAt` — a fixed mapping, not a generic data-passing problem
- P3 is fully decoupled — it loads the aggregate and reads VOs directly

**ADR-004 impact:** The original analysis said "P3 queries Ledger independently via `findP1VerificationFloorFromEvents()`." ADR-004's fold/reconstitute pattern supersedes this — P3 now gets these values from `session.negotiatedIntent.verificationPlan` and `session.activationPlan?.constraints?.enforceWatchOnlyVerification` on the reconstituted aggregate.

### Flow Persistence Across Subsequent Commands

The `flowTemplateId` must be available when subsequent phases compose their SDUI views (30+ minutes later, after the student finishes studying). Options:

| Approach | Pros | Cons |
|----------|------|------|
| Query `FlowSelected` event from Ledger | No schema change; single source of truth | Adds one query per subsequent phase |
| Project into `ei_topic_state.current_flow_id` | Fast read; no extra query | ADR-003 schema dependency; projection must handle new event |
| Don't persist; ViewComposer adapts without flowId | Zero cost | Product loses flow-aware microcopy/layout |

**Chosen:** Query `FlowSelected` event from Ledger. The query is cheap (single event lookup by `sessionId` + `eventType`), avoids schema coupling, and the `FlowSelected` event is already appended. If performance becomes an issue, add the projection column later (additive change).

---

## The StudySession Aggregate Does NOT Change

This is the critical DDD insight. The aggregate enforces the **domain lifecycle** ([ei-runtime-tactical-spec.md §4](../tactical/ei-runtime-tactical-spec.md)):

```
negotiating → activating → active → verifying → closed
```

FlowTemplate describes the **orchestration sequence** — which UI screens appear:

```
checkin → P1 UI → P2 UI → session UI → P3 UI → done UI
```

These are **two different things.** The domain lifecycle always completes (all states traversed, all events emitted) regardless of which UI screens were shown. This is already proven by ADR-002's silent P2 for declared sessions — the aggregate transitions through `activating → active` even though no P2 UI was shown.

Adding `flowId` to the aggregate would violate DDD-TACTICAL:

> "Aggregate carries only what it needs to enforce invariants."

Flow selection doesn't affect any of the 8 invariants in [ei-runtime-tactical-spec.md §6](../tactical/ei-runtime-tactical-spec.md). No lifecycle ordering change, no verification floor change, no watch-only override change. The aggregate is untouched.

---

## Cross-Protocol Invariant Analysis

**"Skip" means "no UI", not "no event."**

Every phase in a template runs its handler, which transitions the aggregate through its lifecycle and appends events to the Ledger. The `showUI` flag only controls whether an SduiResponse is returned to the client.

| Template | P1 Handler | P1 UI? | `SessionIntentIssued`? | P2 Handler | P2 UI? | `ActivationPlanIssued`? |
|----------|-----------|--------|----------------------|-----------|--------|----------------------|
| `declared-standard` | `RunDeclaredIntentHandler` | No | Yes (`intentSource: 'declared'`) | `RunP2GateHandler` | No | Yes |
| `negotiated-standard` | `RunP1GateHandler` | Yes | Yes (`intentSource: 'negotiated'`) | `RunP2GateHandler` | Yes | Yes |
| `onboarding` | Silent P1 | No | Yes | Silent P2 (**fix**) | No | Yes (**fixed**) |
| `micro` | — | — | — | `RunP2GateHandler` | Yes | Yes |

**Onboarding gap fixed:** The current onboarding branch calls `protocol1IgnitionWorkflow` but never runs P2. No `ActivationPlanIssued` is emitted. The `onboarding` FlowTemplate fixes this by including P2 with `showUI: false`. Needs verification: does any projection actually break without this event for onboarding sessions? If not, this is a correctness improvement rather than a bug fix.

**Preserved invariants:**
- **P1 `verificationFloor` → P3:** P3 reads from reconstituted aggregate's `session.negotiatedIntent.verificationPlan` ([ADR-004](adr-004-session-lifecycle-persistence.md)). Null for declared, populated for negotiated. Unaffected by flow selection.
- **P2 `watchOnlyFlag` → P3:** P3 reads from reconstituted aggregate's `session.activationPlan?.constraints?.enforceWatchOnlyVerification` ([ADR-004](adr-004-session-lifecycle-persistence.md)). Unaffected by flow selection.
- **Lifecycle ordering:** Aggregate state machine guards this. Silent phases still call aggregate command methods in the correct order.
- **`session_phase` column (ADR-003):** Event-driven, not UI-driven. Unaffected by flow selection.

---

## Migration Strategy

### Phase M0: Rename `src/ei/sdui/` → `src/ei/study-session-orchestration/` (pure rename)

Move existing SDUI files to the new bounded context folder. Add `domain/` and `application/` subdirectories. No behavioral change. All imports updated.

**Rollback:** Rename back.

### Phase M1: Extract Resume Detection (low risk, high value)

Move the 3 resume branches (lines 91–259) from `appOpenBranchStep` into `DetectResumeHandler` inside `src/ei/study-session-orchestration/application/detect-resume/`. Once ADR-003 is implemented, reads `session_phase` from projection instead of scanning 50 events.

**Result:** `appOpenBranchStep` drops from ~260 lines of resume logic to ~5 lines calling `detectResume()`.

**Rollback:** Inline the handler back (pure refactor).

### Phase M2: Introduce FlowTemplate + FlowStrategy (domain only)

Add the VO and domain service to `src/ei/study-session-orchestration/domain/`. Write exhaustive unit tests.

**Validation:** Assert that `FlowStrategy.select()` produces the same template ID as the current if-else tree for all known input combinations. This is the equivalence proof.

### Phase M3: Wire FlowExecutor to `ei-app-open.ts` with feature flag

Replace the remaining non-resume branches with: pre-flow checkin check → `selectFlow()` → `FlowSelected` event → phase-walking executor.

**Feature flag:** `StudentPolicy.dials['flow.executor.enabled']`. When `false`, fall through to old branches. Strategic Adjustment enables per-student.

**Rollback:** `dials['flow.executor.enabled'] = false`.

### Phase M4: Remove old branches

Once feature flag has been `true` for all students for 7+ days with no regressions, remove old branches, feature flag, and deprecate `ProtocolRouter`.

---

## SSO Extraction Implementation Risk Register

> Systematic code audit of `ei-app-open.ts`, `src/ei/sdui/`, gate handlers, and Mastra workflow patterns. Each challenge is classified by DDD layer, migration phase, and risk level. Decisions documented inline.

### Risk Heat Map

| Risk | Challenges | Why |
|------|-----------|-----|
| **High** | C7, C8 | Behavioral correctness — FlowStrategy equivalence and onboarding lifecycle gap affect live routing |
| **Low** | C1, C2, C3, C5, C6, C9, C10, C11, C12, C13, C14, C15, C16 | Mechanical or additive — no behavior change if done correctly. C3/C10/C11 downgraded from Medium after ADR-003/004 implementation de-risked orchestration complexity. C16 (FirstActionStarted dual emission paths) is pre-existing; FlowExecutor boundary excludes it. |
| **Zero** | C4 | Already handled in current code; just moves location |

### Domain Layer Challenges (pure, no I/O)

#### C2 — Internal Sublayer Restructure (M0, Low risk)

Current `src/ei/sdui/` is flat. Target `src/ei/study-session-orchestration/` needs DDD sublayers.

**Key placement decisions:**

| Item | Placement | Rationale |
|------|-----------|-----------|
| `view-composer.ts` | `domain/services/view-composer.ts` | Domain service (pure, stateless) |
| `presentation-context.ts` | `domain/value-objects/presentation-context.ts` | VO with `create()` factory |
| `identity/compute-identity-eligibility.ts` | `domain/specifications/identity-eligibility.ts` | Specification (function form) |
| `microcopy/` | BC root (`microcopy/`) — sibling to `domain/` | Catalog files are **data** (string literals), not behavior. `resolver.ts` is ~25 lines. Putting data catalogs inside `domain/services/` implies they're services, which they're not. Internal module consumed only by ViewComposer. |
| `types/components.ts` | `domain/types/components.ts` | SduiComponent vocabulary IS SSO's domain model ("what the student sees") |
| `types/sdui-contract.ts` | `types/sdui-contract.ts` (BC root) | Published Language boundary. SduiResponse wraps SduiComponents; ViewComposer builds `SduiComponent[]` internally, wraps in `SduiResponse` only at return. New components change `domain/types/` only — Published Language contract untouched. |

**Decision: Full restructure in M0** (Option A). One-time pain (~40 file moves), clean foundation for M1–M3. Option B (rename only, restructure later) causes two rounds of import churn.

**Target layout:**

```
study-session-orchestration/
├── domain/
│   ├── services/
│   │   ├── view-composer.ts           # Domain Service (existing, 1395 lines)
│   │   └── flow-strategy.ts           # Domain Service (new, M2)
│   ├── value-objects/
│   │   ├── presentation-context.ts    # VO with create() factory
│   │   ├── flow-template.ts           # VO (new, M2)
│   │   └── flow-selection-context.ts  # VO (new, M2)
│   ├── specifications/
│   │   └── identity-eligibility.ts    # Specification (existing)
│   ├── events/
│   │   └── events.ts                  # FlowSelected, IdentityMomentShown types
│   └── types/
│       └── components.ts              # SduiComponent (domain vocabulary, 30 schemas)
├── application/
│   ├── select-flow/                   # (new, M2–M3)
│   ├── detect-resume/                 # (new, M1)
│   └── compose-view/                  # (optional wrapper)
├── microcopy/                         # Internal to ViewComposer (7 files, 89 slots)
│   ├── catalog.ts, resolver.ts
│   └── p1.ts, p2.ts, p3.ts, identity.ts
├── types/
│   └── sdui-contract.ts               # Published Language (boundary)
└── __tests__/
```

#### C6 — FlowSelectionContext `create()` Factory (M2, Low risk)

**Validation rules:**

| Field | Rule | Why |
|-------|------|-----|
| `sessionsTotal` | `>= 0`, integer | Negative sessions is nonsensical; fractional is projection bug |
| `silenceDays` | `>= 0` | Negative silence is impossible |
| `pendingChecks` | `>= 0`, integer | Same |
| `openLoops` | `>= 0`, integer | Same |
| Mutual exclusion | `isOnboarding` and `isMicro` cannot both be true | Different payload shapes; client sends one or the other |
| `hasTopic` implication | If `isOnboarding` or `isMicro` or `hasTaskType`, then `hasTopic` must be true | Can't have task type without topic |

**Decision: `create()` throws domain errors, does not clamp.** Per [01-ei-tactical-conventions.md §7b](../tactical/01-ei-tactical-conventions.md): "Domain errors for invariants." If `pendingChecks` is `-3`, that's a projection bug — VO surfaces it early rather than propagating as wrong flow selection.

**Where it's built:** `SelectFlowHandler` (application layer) loads raw data from 3 driven ports, calls `FlowSelectionContext.create()`:

```
SelectFlowHandler.execute(command)
  ↓ [parallel I/O via driven ports]
  aggregates ← IStudentAggregatesQuery.get(studentId)
  policy     ← IStudentPolicyQuery.get(studentId)
  ↓
  ctx = FlowSelectionContext.create({
    hasTaskType:    command.taskType !== undefined,
    isOnboarding:   command.isOnboarding,
    isMicro:        command.isMicro,
    hasTopic:       command.topic !== undefined,
    sessionsTotal:  aggregates.sessionsTotal,
    silenceDays:    aggregates.silenceDays,
    pendingChecks:  aggregates.pendingChecks,
    openLoops:      aggregates.openLoops,
    cohortFlags:    policy?.dials ?? {},
  })
  ↓
  template = FlowStrategy.select(ctx)       // pure domain call
  return { template, ctx }                  // ctx snapshot for FlowSelected event
```

#### C7 — FlowStrategy Equivalence Proof (M2, High risk)

**Current type guard → FlowSelectionContext mapping (from code audit):**

| Type guard | Code condition | VO field |
|-----------|---------------|----------|
| `isAppOpenFirstTouch(p)` | `p.initial === true` | Pre-flow; not in FlowSelectionContext (handled before FlowStrategy) |
| `isAppOpenOnboarding(p)` | `'taskType' in p && !('energy' in p)` | `isOnboarding` |
| `isAppOpenMicro(p)` | `'timeboxMin' in p && p.timeboxMin === 1` | `isMicro` |
| `fullPayload.taskType` exists | `taskType` in payload + `energy` present | `hasTaskType` |

**Key insight:** `isOnboarding` = `taskType present AND energy absent`. `hasTaskType` = `taskType present AND energy present`. Mutually exclusive by payload shape. The VO's mutual exclusion validation follows naturally.

**`isMicro` uses `timeboxMin === 1`** — magic number in payload. FlowSelectionContext documents: `isMicro` means "client sent micro payload (timeboxMin=1)", not "student chose micro."

**After resume extraction (M1), remaining branches collapse to:**

```
if isOnboarding  → onboarding
if isMicro       → micro
if hasTaskType   → declared-standard
else             → negotiated-standard
```

This is exactly the selection precedence table in this ADR. The `protocol === 2` branch disappears once resume detection is separated (it was conflating resume with flow selection).

**Equivalence test strategy:**
- Lock down 4 current templates with explicit input→output tests
- Test that projection signals (`sessionsTotal`, `silenceDays`, etc.) don't affect current templates — proves forward compatibility
- Example: "changing `silenceDays` from 0 to 10 still produces `declared-standard` when `hasTaskType` is true"

**Decision: Wire all projection signals now, test that current templates ignore them.** Proves VO carries the right signals without coupling to specific template logic. Future templates (`verification-first`, `re-engagement`) will use these signals — they're already validated.

#### C8 — Onboarding Missing Silent P2 (M3, High risk)

**Current behavior:** Onboarding runs P1 only → no `ActivationPlanIssued` → aggregate stays in `activating`. P3 handler falls back to synthetic `StudySession.reconstitute(sessionId, studentId, topicId, 'active', null, null, null)` — hardcoded `'active'` state with null VOs.

**The fallback means:**
- `p1VerificationFloor` → null → no P1 constraint enforced
- `p2WatchOnlyFlag` → false → no watch-only override
- `session.issueVerificationDecision()` guard passes (status is `'active'`)

**Latent bug found:** TopicLoop projection consumes `ActivationPlanIssued` → sets `session_phase='active'`. Without P2, onboarding sessions stay `session_phase='activating'` in `ei_topic_state` even while student is actively studying. Resume detection (`getActiveSessionForStudent`) checks `session_phase`, so an onboarding student who closes and reopens the app hits the "activating" resume branch (P1 intent review) instead of the "active" resume branch (session resume).

**Consumers of `ActivationPlanIssued`:**

| Consumer | Impact of adding silent P2 to onboarding |
|----------|------------------------------------------|
| `TopicLoop.applyEvent()` | `session_phase` correctly transitions to `'active'` + `watch_only_flag` set (always `false` for onboarding Neutral mode). **Correctness fix.** |
| `StudySession.fold()` | Reconstitutes with real `ActivationPlan` VO instead of null. **Correctness fix.** |
| `compose-p2-view.ts` step | Not invoked (silent P2 = no UI). **No impact.** |
| Analytics queries filtering by `ActivationPlanIssued` | Onboarding sessions now emit this event. **Behavioral change — analytics gains visibility.** |

**Decision: Option B now (keep reconstitute fallback), Option A in M3 (add silent P2 to onboarding template).**

- M0–M2: Don't touch onboarding lifecycle. Fallback works.
- M3: `onboarding` FlowTemplate naturally includes silent P2 (template says `p1(silent) → p2(silent) → session(UI)`). Executor walks both phases. Fixes latent projection bug.
- Old sessions (created before M3): Still use reconstitute fallback — no migration needed.
- `onboarding` template's lack of `p3-verification` phase: FlowTemplate self-validation invariant ("if session present, p3 must be present") does NOT apply — onboarding has `session(UI)` but P3 is triggered later by `SessionEnd` command (command-driven, not template-driven). The invariant should be refined: it applies to the **initial execution chain**, and P3 comes later via client command.

### Application Layer Challenges (orchestration)

> **ADR-003/004 context:** The current `ei-app-open.ts` code is **post-ADR-003/004 implementation**. Resume detection already uses `session_phase` from `ei_topic_state` ([line 94](../../../src/mastra/workflows/ei-app-open.ts)), targeted event loads via `getEventBySessionId` using the JSONB partial index ([ADR-004 C1](adr-004-session-lifecycle-persistence.md)), and the P2 handler already injects `PostgresStudySessionRepository` ([line 314](../../../src/mastra/workflows/ei-app-open.ts)). The optimizations are live. These challenges are about **clean extraction into proper DDD layers**, not redesign.

#### C3 — Resume Detection Polymorphic Return (M1, Low risk — downgraded from Medium)

**Risk downgrade rationale:** ADR-004 D1 already implemented the optimized resume pattern. The 50-event scan is gone. `DetectResumeHandler` extracts already-working, already-optimized code — not a redesign.

Each resume branch loads different data and composes a different view:

| Resume case | Session phase | Event queried | Extra queries | View | Lines |
|-------------|--------------|--------------|---------------|------|-------|
| Active (P2 resume) | `'active'` | `ActivationPlanIssued` | None | `composeSessionView()` | [100–117](../../../src/mastra/workflows/ei-app-open.ts) |
| Verifying (P3 resume) | `'verifying'` | `VerificationDecisionIssued` | None | `composeP3View()` | [120–145](../../../src/mastra/workflows/ei-app-open.ts) |
| Activating (P1 resume) | `'activating'` + `intentSource='negotiated'` | `SessionIntentIssued` | aggregates, eventCounts7d, lastEnergy | `composeP1View()` | [148–215](../../../src/mastra/workflows/ei-app-open.ts) |

**Data flow (post-ADR-003/004):**

```
getActiveSessionForStudent(db, studentId)                              ← ADR-003 D1
  → { topic_id, topic_name, session_phase, current_session_id,
      last_session_started_at }

  session_phase === 'active'     → getEventBySessionId(sessionId,     ← ADR-004 C1 JSONB index
                                     'ActivationPlanIssued')              ~100ms per call
  session_phase === 'verifying'  → getEventBySessionId(sessionId,
                                     'VerificationDecisionIssued')
  session_phase === 'activating' → getEventBySessionId(sessionId,
                                     'SessionIntentIssued')
                                   + getAggregates + countStudentEventsLast7d
                                   + getLastAppOpenEnergy               ← P1 resume only
```

**Driven ports for DetectResumeHandler:**

| Port | Purpose | Existing? |
|------|---------|-----------|
| `IActiveSessionQuery` | `getActiveSessionForStudent(studentId)` — reads `ei_topic_state` | **New** — wraps existing `Q.getActiveSessionForStudent()` |
| `IQueryEventsPort` (extended) | `queryBySessionId(sessionId, eventType)` — targeted event load via JSONB index | **Extend** — current interface takes `(studentId, filter)` not `(sessionId, eventType)`. Add method; adapter uses same `getEventBySessionId` query as ADR-004 C5's repository. |
| `IGetStudentSignalsPort` | `getSignals(studentId)` — aggregates for P1 resume context | **Existing** — same port used by P1/P2/P3 handlers |

**Return type:** `{ resumed: false } | { resumed: true, response: SduiResponse }`. Mastra step short-circuits on `resumed: true`.

**P1 resume filter — declared sessions fall through:** [Line 151](../../../src/mastra/workflows/ei-app-open.ts): `if (intentEvent && intentEvent.payload?.intentSource === 'negotiated')` — only negotiated sessions show the P1 resume view. Declared sessions in `activating` phase are transient (student goes straight through P1→P2 silently per ADR-001); if they close and reopen, they get a fresh checkin, not a resume. This filter moves into `DetectResumeHandler` unchanged.

**Decision:** Handler is application-layer (needs I/O), not domain. Lives in `application/detect-resume/`. ViewComposer calls inside the handler are pure — no layer violation. Handler owns all 3 branches (not 3 separate handlers) — the polymorphism is internal; callers see one interface.

**Test strategy:** Per-case integration tests: mock `session_phase` + stored event payload → assert correct `SduiResponse.phase` returned.

#### C4 — Backward Compatibility for Event Shape (M1, Zero risk)

[Lines 160–188](../../../src/mastra/workflows/ei-app-open.ts) reconstruct `SessionIntentIssuedOutput` from stored event payload. The payload has two historical shapes:

**New shape (current):** Flat fields at payload root:
```
{ intentSource, timebox, taskType, energy, sleepBucket,
  verificationFloor: { minQuestions, preferVerifyNow }, ... }
```

**Old shape (pre-migration):** Nested under `scope` and `verificationPlan`:
```
{ intentSource, scope: { timeboxMin, questionCount, difficultyTier },
  verificationPlan: { minQuestions, preferVerifyNow }, ... }
```

**Fallback chains in current code:**

| Old field | New field | Fallback line |
|---|---|---|
| `p.scope.timeboxMin` | `p.timebox` | [173](../../../src/mastra/workflows/ei-app-open.ts) |
| `p.verificationPlan` | `p.verificationFloor` | [164–168](../../../src/mastra/workflows/ei-app-open.ts) |
| `p.scope.questionCount` | `p.questionCount` | [185](../../../src/mastra/workflows/ei-app-open.ts) |
| `p.scope.difficultyTier` | `p.difficultyTier` | [186](../../../src/mastra/workflows/ei-app-open.ts) |
| `p.negotiatedIntentId` | `p.sessionIntentId` | [187](../../../src/mastra/workflows/ei-app-open.ts) |

**ADR-004 connection:** The fold's `reconstructIntent()` ([ADR-004 lines 292–323](adr-004-session-lifecycle-persistence.md)) handles payload→VO mapping for the write side, but only for the new shape. The fold doesn't need backward compat because all NEW events use the new shape. Resume detection is read-side presentation — it reads stored event payloads directly into the output DTO. Different concern, correct to keep separate.

**Decision:** Mechanical move into `DetectResumeHandler`. Extract a `reconstructSessionIntentFromPayload(payload): SessionIntentIssuedOutput` helper for testability. Optionally add a log marker when old shape is encountered to track migration completion.

**Shelf life:** Every new `SessionIntentIssued` uses the flat shape. Old-shape events only exist for sessions started before the migration. Once every student has opened the app at least once since migration, old-shape events will never be the "latest" for any topic. Practically: 2–4 weeks post-deploy.

#### C10 — Phase-Walking Executor Data Threading (M3, Low risk — downgraded from Medium)

**Risk downgrade rationale:** ADR-004 fold guarantees P2 sees correct aggregate state. The data threading is two fixed mappings, not a generic pipeline. Timing is safe with sequential `await`s (standard Postgres transactional visibility).

For `declared-standard` (silent P1 → silent P2 → session UI), the exact current threading at [lines 291–338](../../../src/mastra/workflows/ei-app-open.ts):

```
Step 1: sessionId = crypto.randomUUID()                         // Line 292
Step 2: RunDeclaredIntentHandler.execute({                       // Line 296
          studentId, topicId, sessionId,
          timebox, taskType, energy, sleepBucket
        }) → SessionIntentIssuedOutput { issuedAt }
Step 3: RunP2GateHandler.execute({                               // Line 316
          studentId, topicId, sessionId,
          setAt: intentOutput.issuedAt                           // Line 320 — DATA DEPENDENCY
        }) → ActivationPlanIssuedOutput { mode }
Step 4: sessionStartWorkflow.start({                             // Line 326
          mode: p2Output.mode                                    // DATA DEPENDENCY
        }) → SduiResponse (session view)
```

**The two fixed mappings:**

| Source field | Target field | Type | Semantic meaning |
|---|---|---|---|
| `intentOutput.issuedAt` | P2 command `setAt` | `string` (ISO datetime) | "When intent was set" — anchors P2's temporal queries (`startLatencyMin`, event `since` filter) |
| `p2Output.mode` | Session view `mode` | `'Rescue' \| 'Neutral' \| 'Boost'` | Session screen shows mode-specific UI |

**ADR-004 fold timing safety:** Between Step 2 (P1 appends `SessionIntentIssued`) and Step 3 (P2 calls `sessionRepo.findById(sessionId)` at [run-p2-gate/handler.ts:122](../../../src/ei/application/run-p2-gate/handler.ts)), the event must be visible in the DB. Since both run in the same Node.js request with sequential `await`, and P1's handler uses `this.appendEvent.append()` which does `INSERT INTO ei_events ... RETURNING *`, the event is committed before P2's `findById` query runs. Standard Postgres transactional visibility — **no timing risk**.

**ADR-004 B2 impact:** The P2 handler's `sessionRepo.findById(sessionId)` folds the `SessionIntentIssued` event into a `StudySession` with the correct VO (`DeclaredIntent`) and status `'activating'`. The aggregate's `issueActivationPlan()` then checks `assertStatus('activating')` — guaranteed correct by the fold. The fallback `reconstitute(..., 'activating', null, null, null)` is for pre-migration sessions only.

**Side effect at [line 324](../../../src/mastra/workflows/ei-app-open.ts):** `Q.upsertTopicState(db, studentId, topicRef.topicId, { last_task_type: fullPayload.taskType })` persists last task type for pre-selection. This is infrastructure (projection write), not domain. Must stay in the Mastra step — the FlowExecutor's job is phase-walking and data threading, not projection maintenance. The Mastra step calls the executor, then does projection writes.

**FlowExecutor design:**

```typescript
// FlowExecutor — application layer
async executeDeclaredStandard(ctx: {
  studentId, topicId, topicName, sessionId,
  timebox, taskType, energy, sleepBucket,
}): Promise<{ p2Output: ActivationPlanIssuedOutput }> {

  // Phase 1: Declared P1 (silent)
  const intentOutput = await this.declaredIntentHandler.execute({
    studentId: ctx.studentId, topicId: ctx.topicId, sessionId: ctx.sessionId,
    timebox: ctx.timebox, taskType: ctx.taskType,
    energy: ctx.energy, sleepBucket: ctx.sleepBucket,
  });

  // Phase 2: P2 gate (silent) — ADR-004: sessionRepo.findById folds the P1 event
  const p2Output = await this.p2Handler.execute({
    studentId: ctx.studentId, topicId: ctx.topicId, sessionId: ctx.sessionId,
    setAt: intentOutput.issuedAt,  // fixed mapping: P1 issuedAt → P2 setAt
  });

  return { p2Output };
}
```

Mastra step then: `executor.executeDeclaredStandard(ctx)` → `upsertTopicState(last_task_type)` → `sessionStartWorkflow.start({ mode: p2Output.mode })`.

**Test strategy:** Integration test that runs declared-standard end-to-end and asserts: (1) P2's `setAt` matches P1's `issuedAt`, (2) session view's `mode` matches P2 output's `mode`, (3) both handlers receive the same `sessionId`.

#### C11 — Feature Flag Load Order (M3, Low risk — downgraded from Medium)

**Risk downgrade rationale:** ADR-003 signals port already returns all needed data (aggregates with 5 new columns + policy). Single pre-load solves ordering.

`StudentPolicy.dials['flow.executor.enabled']` determines old-vs-new path. Policy is also needed for `FlowSelectionContext.cohortFlags`. The question: when and where is policy loaded?

**Current signal loading timeline in `ei-app-open.ts`:**

```
Line 90:  isAppOpenFirstTouch? → resume detection (no signals needed)
Line 228: isAppOpenOnboarding? → no signals loaded
Line 247: isAppOpenMicro?      → no signals loaded
Line 291: declared-intent?     → signals loaded INSIDE P2 handler (line 307–310)
Line 342: negotiated-standard  → no signals loaded (P1 handler loads internally)
```

No branch loads policy early. M3 needs signals loaded **before** branching.

**Two strategies evaluated:**

| Strategy | Approach | Cost | Benefit |
|---|---|---|---|
| **A: Load signals at top** | `signalsPort.getSignals(studentId)` before any branching | ~50ms (single indexed query) | Policy + aggregates available for both feature flag and FlowSelectionContext. No redundant loads. |
| B: Load only policy | Query just `ei_student_policy` without aggregates | ~30ms | Lighter, but FlowSelectionContext also needs aggregates → redundant second load inside new path |

**Decision: Strategy A.** Load signals once at the top. The `getSignals` call costs ~50ms and provides everything the new path needs. Old path doesn't use the pre-loaded data (each branch loads independently), but the cost is negligible.

**ADR-003 B5 connection:** The aggregates returned by `getSignals` now include the 5 new columns from [ADR-003](adr-003-projection-schema-evolution.md) (`sessionsLast7d`, `loopsClosedLast7d`, `hasPriorAppOpen`, `lastIdentityShownAt`, `activeDays7d`). Some of these are needed for `FlowSelectionContext` — the ADR-003 extension means the signals port already returns the richer data FlowSelectionContext needs.

**Target M3 flow with feature flag:**

```typescript
const db = getDb();
const payload = command.payload as AppOpenPayload;

// ── 0. Resume detection (always first, no flag needed) ──
if (isAppOpenFirstTouch(payload)) {
  const resumeResult = await detectResumeHandler.execute({ studentId });
  if (resumeResult.resumed) return resumeResult.response;
  return checkinViewWorkflow.createRun().start(...);  // No resume → checkin
}

// ── 1. Load signals for feature flag + FlowSelectionContext ──
const signals = await signalsPort.getSignals(studentId);
const policy = signals?.policy ?? {};
const useNewFlow = policy.dials?.['flow.executor.enabled'] === true;

if (useNewFlow) {
  // ── NEW PATH: FlowStrategy ──
  const topicRef = await resolveTopicSafe(db, ...);     // Infrastructure (C14)
  const ctx = FlowSelectionContext.create({
    hasTaskType: !!payload.taskType,
    isOnboarding: isAppOpenOnboarding(payload),
    isMicro: isAppOpenMicro(payload),
    hasTopic: !!payload.topic,
    sessionsTotal: signals.aggregates?.sessionsTotal ?? 0,
    silenceDays: signals.aggregates?.silenceDays ?? 0,
    pendingChecks: signals.aggregates?.pendingChecks ?? 0,
    openLoops: signals.aggregates?.openLoops ?? 0,
    cohortFlags: policy.dials ?? {},
  });
  const template = FlowStrategy.select(ctx);
  return flowExecutor.execute(template, { studentId, topicRef, signals, ... });
}

// ── OLD PATH: existing branches (unchanged) ──
if (isAppOpenOnboarding(payload)) { ... }
if (isAppOpenMicro(payload)) { ... }
// declared-standard, negotiated-standard...
```

**Key ordering insight:** Resume detection (`isAppOpenFirstTouch`) runs **before** the feature flag check. Correct because: (1) resume has no topic — it's cross-topic detection, (2) resume doesn't need flow selection — it reconstructs the interrupted view, (3) resume is the same in old and new paths.

**Rollback:** `dials['flow.executor.enabled'] = false` → `useNewFlow` is false → falls through to old branches. Zero students affected by the new code.

### Infrastructure Layer Challenges (adapters, Mastra, wiring)

> **Full Mastra audit context:** All 12 Mastra workflows and 9 tools were audited. The `src/mastra/` layer contains **51 `new` adapter/handler constructions across 16 files**. The `AssessLoopHealthHandler` alone is duplicated 5 times with identical args. Side effects (display name persistence, task type upsert, projection recompute) are scattered across workflow steps. These are pre-existing patterns — SSO extraction doesn't change them, but the FlowExecutor must define a clear boundary with them.

#### C1 — Import Churn (M0, Low risk)

**Exact consumer inventory** (audited every `from '../../ei/sdui/'` and `from '../../../ei/sdui/'` import):

| Consumer file | Imports from `sdui/` | Count |
|--------------|---------------------|-------|
| [`ei-app-open.ts:27-28`](../../../src/mastra/workflows/ei-app-open.ts) | `view-composer` (5 named), `presentation-context` (1) | 6 |
| [`compose-checkin-view.ts:16-18`](../../../src/mastra/workflows/steps/compose-checkin-view.ts) | `sdui-contract`, `presentation-context`, `view-composer`, `identity/compute-identity-eligibility` | 4 |
| [`compose-p1-view.ts:16-19`](../../../src/mastra/workflows/steps/compose-p1-view.ts) | `outputs`, `sdui-contract`, `presentation-context`, `view-composer`, `aggregates-for-presentation` | 5 |
| [`compose-p2-view.ts:17-18`](../../../src/mastra/workflows/steps/compose-p2-view.ts) | `sdui-contract`, `view-composer` | 2 |
| [`compose-p3-view.ts:14-15`](../../../src/mastra/workflows/steps/compose-p3-view.ts) | `sdui-contract`, `view-composer` | 2 |
| [`verification-complete.ts:11-12`](../../../src/mastra/workflows/verification-complete.ts) | `view-composer`, `presentation-context` | 2 |
| [`retrieval-schedule.ts:11-12`](../../../src/mastra/workflows/retrieval-schedule.ts) | `view-composer`, `presentation-context` | 2 |
| [`retrieval-skip.ts:11`](../../../src/mastra/workflows/retrieval-skip.ts) | `view-composer` | 1 |
| `src/app/sdui/registry.tsx` (client, types only) | `types/components` | 1 |
| Test files (2) | `view-composer`, `microcopy` | ~3 |

**Total: ~28 import path changes across ~10 files.** TypeScript `--noEmit` catches 100% of missed paths. Single PR, mechanical.

**Cross-boundary type import:** [`compose-p1-view.ts:20-22`](../../../src/mastra/workflows/steps/compose-p1-view.ts) also imports `TopicStateSnapshot` and `StateTrend` from `src/ei/domain/student-aggregates/` — this is from EI Projections BC, not SSO. Type-only import, no runtime coupling. Stays unchanged.

**Client-side note:** `src/app/sdui/registry.tsx` imports component Zod schemas. After rename this becomes `study-session-orchestration/types/components.ts`. Must verify Next.js doesn't have issues with the longer path in the client bundle (unlikely but worth a build check).

#### C5 — Staleness Safety (M1, Low risk)

**Staleness pattern code trace** at [`compose-checkin-view.ts:77-82`](../../../src/mastra/workflows/steps/compose-checkin-view.ts):

```
let aggregates = aggregatesRaw;
const aggregatesStale = latestEventTs && (!aggregates || aggregates.updated_at < latestEventTs);
if (aggregatesStale) {
  await recomputeStudentAggregates(db, studentId, ...);
  aggregates = await Q.getAggregates(db, studentId);
}
```

**Who triggers recompute?** Two paths:
1. **Fire-and-forget** — after every P3/verification/retrieval workflow ([`protocol3-verification.ts:118`](../../../src/mastra/workflows/protocol3-verification.ts), [`verification-complete.ts:110`](../../../src/mastra/workflows/verification-complete.ts), [`retrieval-skip.ts:93`](../../../src/mastra/workflows/retrieval-skip.ts), [`retrieval-schedule.ts:93`](../../../src/mastra/workflows/retrieval-schedule.ts)) — all 4 use identical `Promise.all([recomputeTopicLoop, recomputeStudentAggregates]).catch(...)` pattern.
2. **On-demand safety net** — compose-checkin-view (above).

**Why DetectResumeHandler doesn't need this:**
- Resume detection reads `ei_topic_state.session_phase` (projection — staleness means wrong phase, but `session_phase` is updated synchronously by TopicLoop projector's fire-and-forget after every gate).
- Resume loads events via `getEventBySessionId()` — reads `ei_events` directly, append-only, never stale.
- P1 resume's aggregates load ([`ei-app-open.ts:154-158`](../../../src/mastra/workflows/ei-app-open.ts)) is display-only (greeting variant, footer stats) — acceptable staleness.

**Decision confirmed:** Staleness recompute stays in Mastra step. DetectResumeHandler uses event-sourced data (guaranteed fresh) + projection data (acceptably stale for display). No recompute in handler.

#### C9 — Handler Instantiation Scattered (M3, Low risk)

**Full adapter construction audit across 16 Mastra files:**

| Handler | Construction sites | Deps | Duplication |
|---------|-------------------|------|-------------|
| `RunP1GateHandler` | [`protocol1-ignition.ts:79`](../../../src/mastra/workflows/protocol1-ignition.ts) | 4 (signalsPort, assessLoopHealth, appendEvent, protocolEngine) | 1 site |
| `RunP2GateHandler` | [`ei-app-open.ts:308`](../../../src/mastra/workflows/ei-app-open.ts), [`protocol2-activation.ts:80`](../../../src/mastra/workflows/protocol2-activation.ts) | 6 (signalsPort, assessLoopHealth, appendEvent, queryEvents, protocolEngine, sessionRepo) | **2 sites, identical 6-line block** |
| `RunP3GateHandler` | [`protocol3-verification.ts:70`](../../../src/mastra/workflows/protocol3-verification.ts) | 6 (same graph as P2, different handler class) | 1 site |
| `RunDeclaredIntentHandler` | [`ei-app-open.ts:294`](../../../src/mastra/workflows/ei-app-open.ts), [`tools/declare-intent.ts:42`](../../../src/mastra/tools/declare-intent.ts) | 1 (appendEvent) | **2 sites** |
| `AssessLoopHealthHandler` | P1, P2 (×2), P3, SA workflows | 2 (signalsPort, clock) | **5 sites, identical** |
| `PostgresAppendEventAdapter` | Nearly every workflow | 1 (db) | **11 sites** |

**Handler factory design (refined from code):**

```typescript
// src/ei/infrastructure/handler-factories.ts
export function createP2GateHandler(db: EiDb, idempotencyKey?: string): RunP2GateHandler {
  const signalsPort = new PostgresGetStudentSignalsAdapter(db);
  const baseAdapter = new PostgresAppendEventAdapter(db);
  const appendEvent = idempotencyKey ? withIdempotencyKey(baseAdapter, idempotencyKey) : baseAdapter;
  return new RunP2GateHandler(
    signalsPort,
    new AssessLoopHealthHandler(signalsPort, { now: () => new Date() }),
    appendEvent,
    new PostgresQueryEventsAdapter(db),
    new ProtocolEngine(),
    new PostgresStudySessionRepository(db),
  );
}
// Similar for createP1GateHandler, createP3GateHandler, createDeclaredIntentHandler
```

**Adoption path:**
- **M3 (mandatory):** FlowExecutor uses factories
- **M4+ (optional):** Existing workflow steps adopt factories incrementally — non-breaking, reduces duplication but not a prerequisite

#### C12 — FlowSelected Event Idempotency (M3, Low risk)

Follows existing pattern. The [`withIdempotencyKey`](../../../src/ei/infrastructure/persistence/append-event.pg.ts) wrapper at `append-event.pg.ts:32-41` already handles `${baseKey}:${eventType}` derivation — `FlowSelected` can use the same wrapper.

**Event registration checklist** (3 places):
1. `EventTypeEnum` in [`events.ts`](../../../src/ei/schemas/events.ts) — add `'FlowSelected'` to Zod enum
2. `validateEventPayload` in `validate-event-payload.ts` — add payload schema
3. [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md) — add to event catalog

**Projection impact:** Zero. `FlowSelected` is not a TopicLoop event (doesn't change `session_phase`, timestamps, or counters). TopicLoop projector's event type filter skips it. Same for StudentAggregates. Observability-only.

**Latency:** ~5ms per `INSERT INTO ei_events ... ON CONFLICT DO NOTHING` with CTE. Runs after flow selection, before phase execution. Negligible against P1+P2 handler execution (~3000ms for declared-standard).

#### C13 — No DI Container (Cross-cutting, Low risk)

**Current adapter count:** 12 distinct adapter classes in `src/ei/infrastructure/persistence/`. SSO extraction adds ~1 new adapter (`IActiveSessionQuery` — wraps existing `Q.getActiveSessionForStudent()`). **Total post-extraction: ~13.** Well below the 15-adapter threshold for reconsidering DI.

**Why DI would be premature:**
- Each workflow step runs in its own request context — no shared adapter lifecycle
- Adapters are stateless (wrap a `db` reference) — no cleanup/disposal concern
- Test doubles are simple (1–3 methods per port interface)
- Factory functions are explicit and greppable

Solved by C9. Revisit if adapter count exceeds 15 or if testing requires complex stub graphs.

#### C14 — `resolveTopicSafe()` and Display Name Persistence (M3, Low risk)

**Two CurriculumCatalog boundary concerns that must stay in Mastra:**

1. **Topic resolution:** [`resolveTopicSafe()`](../../../src/mastra/workflows/ei-app-open.ts) at `ei-app-open.ts:44-56` — called in 3 branches (onboarding [line 232](../../../src/mastra/workflows/ei-app-open.ts), micro [line 258](../../../src/mastra/workflows/ei-app-open.ts), standard [line 285](../../../src/mastra/workflows/ei-app-open.ts)). FlowExecutor receives pre-resolved `topicRef: { topicId, topicName }`.

2. **Display name persistence:** [`protocol1-ignition.ts:74-77`](../../../src/mastra/workflows/protocol1-ignition.ts) and [`protocol2-activation.ts:69-72`](../../../src/mastra/workflows/protocol2-activation.ts) both call `displayNameWriter.upsertDisplayName()` BEFORE running the gate handler. For templates that skip P1 (micro), display name persists in P2's Mastra step. For templates with P1, it persists in P1's Mastra step.

**FlowExecutor boundary:** Executor receives resolved topic refs and runs gate handlers only. Topic resolution and display name persistence happen in the Mastra step wrapper, before the executor call.

**Post-extraction Mastra step shape:**

```
1. resolveTopicSafe(db, rawPayload.topic, studentId)          ← C14: Mastra boundary
2. displayNameWriter.upsertDisplayName(studentId, topic, name) ← C14: Mastra boundary
3. signals = signalsPort.getSignals(studentId)                 ← C11: pre-load
4. template = selectFlowHandler.execute(...)                   ← SSO domain
5. result = flowExecutor.execute(template, ...)                ← SSO application (gate handlers only)
6. upsertTopicState(db, studentId, topicId, { last_task_type })← Projection side effect
```

#### C15 — Side Effects in Compose Steps (Cross-cutting, Low risk)

**Two compose steps have side effects** — both follow the same pattern (Mastra step owns the append, SSO domain owns the pure logic):

| Step | Side effect | Pure domain function | Event |
|------|------------|---------------------|-------|
| [`compose-checkin-view.ts:103-111`](../../../src/mastra/workflows/steps/compose-checkin-view.ts) | `Q.insertIdentityMomentShownEvent()` | `computeIdentityEligibility(ctx)` → SSO domain specification | `IdentityMomentShown` |
| [`compose-p2-view.ts:46-53`](../../../src/mastra/workflows/steps/compose-p2-view.ts) | `appendEvent.append({ eventType: 'FirstActionStarted' })` | `composeP2View()` → SSO domain ViewComposer | `FirstActionStarted` |

**IdentityMomentShown ordering:** Persist runs BEFORE `composeCheckinView()` at [line 120](../../../src/mastra/workflows/steps/compose-checkin-view.ts). Correct: event must be committed before response, so refresh won't re-show the card.

**IdentityMomentShown uses `Q.*` directly** instead of `IAppendEventPort`. This is acceptable per Mastra layer rule #4 ("DB access via `queries.ts`"). Converting to `IAppendEventPort` would mean constructing an adapter for one call — unnecessary coupling. If a `ComposeCheckinHandler` use case is ever created (moving orchestration from Mastra to application), then port usage becomes required — but that's beyond ADR-005 scope.

#### C16 — `FirstActionStarted` Dual Emission Paths (M3, Low risk) — NEW

**Discovery:** `FirstActionStarted` is appended by two different code paths depending on the flow:

| Flow | Where `FirstActionStarted` is appended | Code |
|------|---------------------------------------|------|
| **Negotiated-standard** (P1 UI → P2 UI) | `compose-p2-view.ts` step — during P2 view composition | [`compose-p2-view.ts:46-53`](../../../src/mastra/workflows/steps/compose-p2-view.ts) |
| **Declared-standard** (silent P1 → silent P2 → session UI) | `session-start.ts` workflow — when student clicks "Start" | [`session-start.ts:42-49`](../../../src/mastra/workflows/session-start.ts) |

Both paths produce the same event (`FirstActionStarted`) with the same payload shape, but at different points in the flow. The event transitions `session_phase` from `'activating'` to `'active'` in projections.

**FlowExecutor impact:** The executor's scope is gate handler orchestration (P1 → P2 → return output). `FirstActionStarted` emission happens AFTER the executor returns — either in the compose step (negotiated) or the session-start workflow (declared). This is correct: the executor doesn't own session lifecycle transitions, only gate handler sequencing.

**For `negotiated-standard` template:** FlowExecutor runs P1 handler (with UI) → returns. Mastra workflow continues: compose-p1-view → user interaction → intent-response → P2 handler → compose-p2-view (appends `FirstActionStarted`). Executor is only involved in the P1 phase.

**For `declared-standard` template:** FlowExecutor runs P1 handler (silent) → P2 handler (silent) → returns `{ p2Output }`. Mastra step then calls `sessionStartWorkflow.start()` (appends `FirstActionStarted`). Executor is done before the event.

**Decision:** No change needed. The dual paths are a pre-existing pattern. FlowExecutor boundary excludes `FirstActionStarted` emission in both cases. Document for awareness.

**Note:** [`intentResponseWorkflow`](../../../src/mastra/workflows/intent-response.ts) (P1 accept/reject → P2 bridge for negotiated sessions) exists but is **not registered** in [`mastra/index.ts:59-72`](../../../src/mastra/index.ts). It may be invoked directly or be dead code. The `negotiated-standard` FlowTemplate must account for this workflow as the P1→P2 transition trigger (user-initiated, not executor-driven).

---

## Strategic Design Document Updates Required

This ADR requires updates to:

| Document | Change |
|----------|--------|
| [02-subdomains.md](../02-subdomains.md) | No change (subdomain already defined) |
| [03-context-map.md](../03-context-map.md) | Split EI Runtime row into two; add SSO bounded context; add Published Language relationship EI Runtime → SSO |
| [canvas-ei-runtime.md](../canvas-ei-runtime.md) | Remove StudySessionOrchestration from Subdomains; remove Gateway context role; close Open Question; update file structure |
| [canvas-study-session-orchestration.md](../canvas-study-session-orchestration.md) | **Done** — bounded context canvas for SSO (4 responsibilities, event ownership, WHEN+WHAT modules) |
| [ei-runtime-tactical-spec.md](../tactical/ei-runtime-tactical-spec.md) | Remove §16 (ViewComposer) — moves to SSO tactical spec; update §13 file structure |
| (new) `study-session-orchestration-tactical-spec.md` | New tactical spec for SSO: FlowTemplate VO, FlowStrategy domain service, ViewComposer, PresentationContext |
| [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md) | Add `FlowSelected` to event catalog |
| CLAUDE.md | Update Bounded Contexts → Code Locations table; extend Global Dependency Rule to cover SSO layers (`study-session-orchestration/domain/` imports nothing outside itself, `study-session-orchestration/application/` imports SSO domain + port interfaces only) |
| `.claude/rules/mastra-layer.md` | Refine Rule #1: distinguish EI Runtime domain (never import directly — go through gate handlers) from SSO domain pure functions (ViewComposer, PresentationContext — allowed, no side effects). Update import paths (`sdui/` → `study-session-orchestration/`). Add SSO use cases (`SelectFlowHandler`, `DetectResumeHandler`, `FlowExecutor`) to Workflow → EI Handler Map. |

---

## Consequences

### Positive

- **Bounded context boundary made explicit:** The module separation that already existed (`src/ei/sdui/`) becomes a proper bounded context with domain, application, and presentation layers.
- **Canvas Open Question resolved:** The trigger for splitting StudySessionOrchestration is Level 2 adaptation. Answered definitively.
- **430-line monolith eliminated:** `appOpenBranchStep` becomes ~60 lines (pre-flow check → detect resume → select flow → execute).
- **Flow decisions observable:** `FlowSelected` events in the Ledger enable Ops dashboards and A/B analysis.
- **Product enablement:** New flow templates defined as VOs; engineering implements selection rules in FlowStrategy. Product owns "what flows exist and when"; engineering owns "how they execute."
- **StudySession aggregate untouched:** Zero risk to domain invariants. Flow is a separate concern.
- **Testable:** FlowStrategy is pure domain (unit tests, no mocks). ViewComposer is pure function (unit tests, no mocks). Both follow the existing test strategy.
- **Routing logic in the correct layer:** From infrastructure (Mastra workflow) to domain (FlowStrategy in StudySessionOrchestration).

### Risks and Mitigations

> Detailed implementation risk register with per-challenge analysis: see §SSO Extraction Implementation Risk Register above.

| Risk | Mitigation | Challenges |
|------|-----------|------------|
| Two folder conventions (context-first for SSO, layer-first for others) | Acceptable: SSO is the only context large enough to justify it. Document in tactical conventions. | C2 |
| FlowTemplate proliferation | Cap at 10 templates pre-launch; each requires Product + Engineering sign-off. | — |
| FlowStrategy equivalence failure | Exhaustive unit tests mapping all 4 current branches. Lock down before M3 wiring. | C7 |
| Onboarding lifecycle gap (`session_phase` stays `'activating'`) | Option B now (keep reconstitute fallback), Option A in M3 (add silent P2). Fixes latent projection bug. | C8 |
| Resume detection reads stale projection | ADR-003 staleness is 1 event-fire. Acceptable. Staleness recompute stays in Mastra step. | C5 |
| Migration breaks existing flows | Feature flag per-student via `StudentPolicy.dials`. Rollback is one dial change. Signal loading de-risked: `getSignals()` already returns all needed data post-ADR-003. | C11 |
| Data threading between silent phases | Two fixed mappings (P1 `issuedAt` → P2 `setAt`, P2 `mode` → session view). ADR-004 fold guarantees aggregate correctness. Sequential `await`s ensure transactional visibility. | C10 |
| Resume detection polymorphism | ADR-003/004 already implemented the optimized pattern (`session_phase` + targeted event load). Extraction is mechanical. Per-case integration tests validate each branch. | C3 |
| `FlowSelected` event adds Ledger write latency | Single append (~5ms). Negligible vs P1+P2 handler execution (~3000ms). | C12 |
| Handler instantiation scattered across Mastra steps | Extract handler factories (5–10 lines each). Reused by FlowExecutor and existing steps. | C9, C13 |
| `ProtocolRouter` consumers during migration | Both coexist during M3. Deprecated in M4 only after FlowStrategy is proven. | — |
| Import churn from folder rename (M0) | Single PR, ~28 import changes across ~10 files. TypeScript `--noEmit` catches 100% of missed paths. | C1 |
| `FirstActionStarted` dual emission paths | Pre-existing pattern: compose-p2-view (negotiated) vs session-start (declared). FlowExecutor boundary excludes both — side effects stay in Mastra step. | C16 |
| Side effects in compose steps | Two compose steps have side effects (IdentityMomentShown, FirstActionStarted). Pure domain functions move to SSO; side effect emission stays in Mastra. | C15, C16 |
| CurriculumCatalog boundary concerns | Topic resolution + display name persistence stay in Mastra step wrapper. FlowExecutor receives pre-resolved `topicRef`. | C14 |

### Product Enablement

With FlowStrategy as infrastructure, Product defines flow templates and selection criteria:

| Feature | Template ID | Selection Signal | Engineering Work |
|---------|------------|-----------------|-----------------|
| Skip-P1 for returning students | `declared-returning` | `sessionsTotal ≥ 20 AND hasTaskType` | New template + FlowStrategy rule |
| Verification-first for overdue students | `verification-first` | `pendingChecks ≥ 3 AND silenceDays ≤ 1` | New template (P3 first, then session) |
| Extended warm re-entry | `re-engagement` | `silenceDays ≥ 5` | New template with simplified flow |
| A/B test: skip P2 activation screen | `negotiated-no-p2-ui` | `cohortFlags['flow.ab.skipP2']` | New template (P2 `showUI: false`) |
| Micro-session default for cohort | `micro` (existing) | `cohortFlags['flow.micro.default']` | Add cohort flag check |

---

## What This ADR Does NOT Cover

- **Level 3 (Protocol-level adaptation):** Different students getting fundamentally different gate logic. Requires changes to EI Runtime aggregate (parameterized or Specification Pattern). Depends on Level 2 as foundation.
- **Level 4 (Journey-level adaptation):** Cross-session learning about what works for each student. Requires new bounded context. Depends on Levels 2+3.
- **Config-driven template definitions:** FlowTemplate is currently code (static factories). Externalizing to config/database is a future concern when template count justifies it.
- **Client-side flow awareness:** The client remains a pure SDUI renderer. Flow context is available via `PresentationContext.flowTemplateId` for ViewComposer use, not for client-side decisions.
- **`review-loop` template (repeating phases):** The current FlowTemplate model is a linear phase sequence. Repeating phases (P3 → P3 → ... → done) would require a different template structure. Deferred until Product defines the requirement precisely.

---

## References

- [02-subdomains.md §6 StudySessionOrchestration](../02-subdomains.md) — subdomain capability, boundaries, key concepts (4 responsibilities)
- [03-context-map.md](../03-context-map.md) — current context map (EI Runtime contains both subdomains — to be updated)
- [canvas-study-session-orchestration.md](../canvas-study-session-orchestration.md) — **new** SSO bounded context canvas
- [canvas-ei-runtime.md §Open Questions](../canvas-ei-runtime.md) — "When to split StudySessionOrchestration" (answered: now)
- [ADR-001: Declared Intent — Two-VO Design](adr-001-declared-intent-design.md)
- [ADR-002: Declared-Intent Bypass Fix](adr-002-declared-intent-bypass-fix.md) — silent P2 pattern (precedent for `showUI: false`)
- [ADR-003: Projection Schema Evolution](adr-003-projection-schema-evolution.md) — `session_phase` column (resume detection dependency)
- [ADR-004: Session Lifecycle Persistence](adr-004-session-lifecycle-persistence.md) — event-sourced repository; fold/reconstitute
- [EI Runtime Tactical Spec §10 Routing Matrix](../tactical/ei-runtime-tactical-spec.md) — command × state → protocol routing
- [EI Runtime Tactical Spec §6 Invariants](../tactical/ei-runtime-tactical-spec.md) — 8 aggregate invariants (unaffected by flow selection)
- [01-ei-tactical-conventions.md](../tactical/01-ei-tactical-conventions.md) — layer rules, port placement, test strategy
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md) — Event Ledger invariants, event catalog
