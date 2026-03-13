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

- **Shared language:** Flow, Phase, Gate, Scene, Step — same meaning across R1–R4
- **Specialized language:** FlowTemplate (R1), PresentationContext (R3) — indicate modules, not separate BCs
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

**Mid-session routing is business logic.** IntentSet→P2, SessionEnd→P3, onboarding skips P3, micro skips P1 — these are all business rules about "what happens next" that currently live in infrastructure. They need a domain home in SSO's R1 module. The current `RunEiCommandHandler` routing by `commandType` is a thin infrastructure layer; the routing *rules* belong to SSO.

#### R2 — Input Collection & Event Emission

SSO owns the student-facing command vocabulary: AppOpen, IntentSet, SessionEnd, FirstActionStarted, Replan, IntentResponse, RetrievalVerified, RetrievalScheduled, RetrievalSkipped, VerificationCompleted. These are "UI-produced" events — SSO translates student taps into domain commands.

**Event ownership split:** SSO-owned events (producer: "UI"/"SSO" in the [event catalog](../05-cross-cutting-concerns.md)) vs AdaptiveCoaching-owned events (producer: "P1"/"P2"/"P3": SessionIntentIssued, ActivationPlanIssued, VerificationDecisionIssued). Both append to the shared Ledger.

#### R3 — Presentation (WHAT module)

Existing code that moves into SSO's domain:

6. **ViewComposer** (Domain Service, pure function): Maps gate outputs + PresentationContext → SduiResponse. Zero DB calls.
7. **PresentationContext** (Value Object): Derived from domain output + student aggregates. Built by application layer, consumed by ViewComposer.
8. **Microcopy Resolver**: Resolves student-facing text by gate/slot/mode/play. Priority chain: play-specific → mode-specific → default.
9. **Identity Eligibility**: Pure check for weekly behavioral reflection card.

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
| CLAUDE.md | Update Bounded Contexts → Code Locations table |

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

| Risk | Mitigation |
|------|-----------|
| Two folder conventions (context-first for SSO, layer-first for others) | Acceptable: SSO is the only context large enough to justify it. Document the convention choice in tactical conventions. |
| FlowTemplate proliferation | Cap at 10 templates pre-launch; each requires Product + Engineering sign-off. |
| Resume detection reads stale projection | ADR-003 staleness is 1 event-fire. Acceptable. |
| Migration breaks existing flows | Feature flag per-student via `StudentPolicy.dials`. Rollback is one dial change. |
| `FlowSelected` event adds Ledger write latency | Single append (~5ms). Negligible vs P1+P2 handler execution (~3000ms). |
| `ProtocolRouter` consumers during migration | Both coexist during M3. Deprecated in M4 only after FlowStrategy is proven. |
| Import churn from folder rename (M0) | Single PR, mechanical changes. No behavioral risk. |

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
