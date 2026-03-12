# ADR-005: Flow-Level Adaptation (Level 2) — FlowStrategy + FlowTemplate

**Status:** Proposed
**Date:** 2026-03-12
**Deciders:** Product + Engineering (AI Study Brother core team)

---

## Context

### The 430-Line Routing Monolith

`ei-app-open.ts` contains a single `appOpenBranchStep` function with 9 hardcoded branches that determine which screen sequence a student sees. Each branch duplicates adapter instantiation, event scanning, presentation context building, and workflow delegation:

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

### Two Flow Patterns, Hardcoded

The system supports two main session flows:

- **Declared** (Sessions 1–8): checkin → [silent P1+P2] → session → P3 → done
- **Negotiated** (Session 9+): checkin → P1 scope → P2 activation → session → P3 → done

Plus 3 resume flows (active session, P3, intent), onboarding, and micro — all hardcoded as imperative branches. The phase sequence is baked into code, not expressed as data.

### Why Now

ADR-001 through ADR-004 cleaned the foundation:

| ADR | What it fixed |
|-----|--------------|
| ADR-001 | `DeclaredIntent` + `NegotiatedIntent` as sibling VOs; `SessionIntentIssued` unified event |
| ADR-002 | Both paths emit identical Ledger event sequences; silent P2 for declared path |
| ADR-003 | `session_phase` column in `ei_topic_state`; projection schema fulfills its purpose |
| ADR-004 | Event-sourced repository; fold/reconstitute pattern |

The domain is clean. The routing layer is the remaining monolith.

### SDUI Amplifies the Problem

The client is a pure SDUI renderer — it never decides which screen to show. Every phase transition is server-directed via `SduiResponse`. This means every flow variation must be expressed server-side. When the server decides all flows, the decision logic must be clean, composable, and observable. Currently it is none of these.

### The Product Gap

Students perceive the app as "just a session tracker" because the interaction pattern (form → timer → checkbox → done) never changes regardless of session count or student history. Level 2 adaptation — different students getting different phase sequences — is the architectural foundation for making the experience feel adaptive. Product cannot experiment with flow variants without engineering changes to the 430-line branch tree.

---

## Decision

Introduce three new domain concepts and two application-layer changes.

### Domain Layer (new)

1. **FlowTemplate** (Value Object): Describes a phase sequence with `showUI` and `required` flags per phase. Immutable, self-validating.
2. **FlowStrategy** (Domain Service): Selects a FlowTemplate based on student context signals. Deterministic (same inputs → same output). Stateless. No I/O.
3. **FlowSelected** (Domain Event): Emitted when a flow is selected, carrying the template ID and selection rationale. Observable in the Ledger.

### Application Layer (new)

4. **SelectFlowHandler** (Use Case): Wraps FlowStrategy, builds `FlowSelectionContext` from inputs loaded by the Mastra step, returns the template + `FlowSelected` event.
5. **DetectResumeHandler** (Use Case): Extracts the 3 resume detection branches (lines 91–259) from `appOpenBranchStep`. Reads `session_phase` from the TopicLoop projection (per ADR-003) instead of scanning 50 events.

---

## Options Considered

### Option A — Refactor `appOpenBranchStep` into smaller functions (Rejected)

Extract each branch into a named function, keep the if-else tree. Each function handles one flow path.

**Rejected because:** The if-else tree itself is the structural problem. Each new flow variant adds another branch. The number of branches grows linearly with Product requirements. No observability of flow decisions. No ability for Product to define templates without engineering code changes.

### Option B — FlowTemplate as data + FlowStrategy as deterministic selector (Chosen)

FlowTemplate is a VO describing the phase sequence. FlowStrategy is a pure domain service that takes student context and returns a FlowTemplate. The Mastra layer walks the template and executes phases.

**Chosen because:**
- Flow definitions become data, not code branches
- FlowStrategy is deterministic and testable in isolation (pure domain, no I/O)
- `FlowSelected` event makes all flow decisions observable in the Ledger
- Product can define new FlowTemplates; engineering implements selection rules in FlowStrategy
- Resume flows remain separate (they reconstruct from Ledger state, not "selected")
- Cross-protocol invariants preserved because the StudySession lifecycle state machine always completes regardless of which phases show UI
- The `showUI: false` + `required: true` pattern is already proven by ADR-002's silent P2

### Option C — Full workflow engine / state machine framework (Deferred)

Introduce a generic workflow engine (like XState) that models the entire session lifecycle as a formal state machine with guards, transitions, and effects.

**Deferred because:** Over-engineered for current needs. The number of distinct flow templates is small (5–8 in the foreseeable future). A lightweight data-driven approach achieves the same composability without the conceptual weight of a generic state machine framework. Revisit if template count exceeds 15 or if flow branching within a template becomes common.

---

## New Domain Concepts

### FlowTemplate — Value Object

**Location:** `src/ei/domain/study-session/value-objects/flow-template.ts`

```typescript
type FlowPhaseId = 'checkin' | 'p1-intent' | 'p2-activation' | 'session' | 'p3-verification' | 'done';

interface PhaseStep {
  readonly phase: FlowPhaseId;
  readonly showUI: boolean;       // false = silent execution (handler runs, events emitted, no SDUI view)
  readonly required: boolean;     // true = handler MUST run for aggregate lifecycle completeness
  readonly parameterOverrides?: Record<string, unknown>;
}

interface FlowTemplateProps {
  readonly templateId: string;    // e.g., 'declared-standard', 'negotiated-standard'
  readonly label: string;         // human-readable for Ops dashboards
  readonly phases: readonly PhaseStep[];
  readonly applicableWhen: string; // human-readable description of selection criteria
}
```

**Self-validation invariants:**
- Every template must contain `session` and `p3-verification` phases (minimum viable loop)
- `checkin` is optional (resume flows skip it)
- `p1-intent` and `p2-activation` can be `showUI: false` but must be `required: true` when present (ADR-002 establishes this pattern)
- Phase order must follow the aggregate lifecycle: if `p1-intent` appears, it precedes `p2-activation`; if `p2-activation` appears, it precedes `session`

**Initial templates** (static factory methods):

| Template ID | Phases (UI visibility) | Current Branch |
|-------------|----------------------|----------------|
| `declared-standard` | checkin(UI) → p1(silent) → p2(silent) → session(UI) → p3(UI) → done(UI) | Branch 7 (lines 337–383) |
| `negotiated-standard` | checkin(UI) → p1(UI) → p2(UI) → session(UI) → p3(UI) → done(UI) | Branches 8+9 (lines 390–417) |
| `onboarding` | p1(silent) → p2(silent, required) → session(UI) | Branch 5 (lines 268–285) |
| `micro` | p2(UI) → session(UI) → p3(UI) → done(UI) | Branch 6 (lines 287–310) |
| `checkin-only` | checkin(UI) | Branch 4 (lines 261–265) |

Note: Resume flows (branches 1–3) are NOT templates — they are handled by `DetectResumeHandler` before flow selection occurs.

### FlowStrategy — Domain Service

**Location:** `src/ei/domain/study-session/flow-strategy.ts`

```typescript
interface FlowSelectionContext {
  readonly sessionsTotal: number;
  readonly hasActiveSession: boolean;         // from ei_topic_state.session_phase
  readonly activeSessionPhase: string | null; // 'activating' | 'active' | 'verifying' | null
  readonly hasTaskType: boolean;              // declared-entry signal (taskType present in AppOpen payload)
  readonly isFirstTouch: boolean;             // AppOpen { initial: true }
  readonly isOnboarding: boolean;             // topic + taskType only, no energy
  readonly isMicro: boolean;                  // micro task payload
  readonly hasTopic: boolean;                 // topic present in payload
  readonly cohortFlags: Record<string, boolean>; // from StudentPolicy.dials
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
| 1 | `isFirstTouch && !hasTopic` | `checkin-only` |
| 2 | `isOnboarding` | `onboarding` |
| 3 | `isMicro` | `micro` |
| 4 | `hasTaskType` (declared-entry) | `declared-standard` |
| 5 | `hasTopic && !hasTaskType` | `negotiated-standard` |

**Key invariants:**
- **Deterministic:** Same inputs always produce the same output. No `Math.random()`, no `Date.now()`.
- **A/B testing via cohort flags:** `cohortFlags` come from `StudentPolicy.dials`. Strategic Adjustment sets `dials['flow.experiment.X'] = true`. FlowStrategy reads the flag. No random assignment inside the domain.
- **Resume detection is NOT flow selection:** Resume flows (active session, P3, intent) are detected by `DetectResumeHandler` before FlowStrategy runs. They reconstruct the interrupted view from Ledger-derived state, not select a new flow.

### FlowSelected — Domain Event

```typescript
// Added to EventTypeEnum in src/ei/schemas/events.ts
'FlowSelected'

// Payload shape
{
  studentId: string;
  templateId: string;               // e.g., 'declared-standard'
  selectionContext: {                // snapshot of inputs for debugging/analysis
    sessionsTotal: number;
    hasTaskType: boolean;
    isFirstTouch: boolean;
    isOnboarding: boolean;
    isMicro: boolean;
    cohortFlags: Record<string, boolean>;
  };
  selectedAt: string;               // ISO8601
}
```

This event is **informational** (Ops/observability). It does NOT affect aggregate state. It is NOT consumed by any projection. It exists solely for:
- Debugging flow selection decisions
- A/B test analysis ("which flow templates are students seeing?")
- Ops dashboards (flow template distribution, conversion rate per flow)

---

## Architecture Changes Per Layer

| Layer | Current | With Level 2 |
|-------|---------|-------------|
| **Domain** (`src/ei/domain/study-session/`) | No flow concept. `StudySession` processes commands agnostic of flow. | New `FlowTemplate` VO + `FlowStrategy` domain service. No aggregate changes. |
| **Application** (`src/ei/application/`) | `ProtocolRouter` decides P1 vs P2. No resume handler. | New `SelectFlowHandler` wraps FlowStrategy. New `DetectResumeHandler` extracts resume branches. `ProtocolRouter` eventually deprecated. |
| **Infrastructure** (`src/ei/infrastructure/`) | No changes needed. | No changes. `FlowSelected` uses existing `IAppendEventPort`. |
| **SDUI** (`src/ei/sdui/`) | `PresentationContext` has no flow awareness. | Gains `flowTemplateId: string | null` and `flowProgress: { currentPhase, totalPhases, completedPhases } | null`. |
| **Mastra** (`src/mastra/workflows/`) | 430-line `appOpenBranchStep` with 9 hardcoded branches. | Refactored to: `detectResume()` → `selectFlow()` → `appendFlowSelectedEvent()` → `executeFirstUIPhase()`. ~80 lines. |

### Flow Execution Model

The refactored `appOpenBranchStep` follows this sequence:

```
1. detectResume(studentId, topicState)
   → if resume detected, return SDUI view immediately (short-circuit)

2. selectFlow(studentId, payload, projections, policy)
   → FlowStrategy.select(ctx) → FlowTemplate

3. appendFlowSelectedEvent(studentId, template)
   → Ledger append (informational)

4. executeFirstUIPhase(template, handlers)
   → Walk template.phases in order:
     - If showUI: false AND required: true → run handler silently, collect events, continue
     - If showUI: true → run handler, return SDUI response (stop walking)
   → Subsequent phases triggered by client commands (IntentSet → P2, SessionEnd → P3)
```

---

## Cross-Protocol Invariant Analysis

The critical insight: **"skip" means "no UI", not "no event"**.

The `PhaseStep.required` flag ensures the StudySession aggregate's lifecycle state machine (`negotiating → activating → active → verifying → closed`) always completes the same transitions regardless of which phases showed UI.

| Template | P1 Handler Runs? | P1 UI? | `SessionIntentIssued`? | P2 Handler Runs? | P2 UI? | `ActivationPlanIssued`? |
|----------|-----------------|--------|----------------------|-----------------|--------|----------------------|
| `declared-standard` | Yes (`RunDeclaredIntentHandler`) | No | Yes (`intentSource: 'declared'`) | Yes (`RunP2GateHandler`) | No | Yes |
| `negotiated-standard` | Yes (`RunP1GateHandler`) | Yes | Yes (`intentSource: 'negotiated'`) | Yes (`RunP2GateHandler`) | Yes | Yes |
| `onboarding` | Yes (silent) | No | Yes | Yes (silent, **fix**) | No | Yes (**fixed**) |
| `micro` | — | — | — | Yes | Yes | Yes |
| `checkin-only` | — | — | — | — | — | — |

**Onboarding gap fixed:** The current onboarding branch (line 282) calls `protocol1IgnitionWorkflow` but never runs P2. This means no `ActivationPlanIssued` event is emitted for onboarding sessions. The `onboarding` FlowTemplate fixes this by making P2 `required: true` + `showUI: false`, ensuring event sequence completeness.

**Preserved invariants:**
- **P1 `verificationFloor` → P3:** Always present in `SessionIntentIssued` event (null for declared, populated for negotiated)
- **P2 `watchOnlyFlag` → P3:** Always present in `ActivationPlanIssued` event
- **`session_phase` column (ADR-003):** Transitions are event-driven, not UI-driven; unaffected by flow selection
- **PhaseDeriver:** Already being replaced by `session_phase` column per ADR-003; no dependency on flow

---

## Migration Strategy

### Phase M1: Extract Resume Detection (low risk, high value)

Move the 3 resume branches (lines 91–259) from `appOpenBranchStep` into `DetectResumeHandler`. Once ADR-003 is implemented, the handler reads `session_phase` from the TopicLoop projection instead of scanning 50 events.

**Result:** `appOpenBranchStep` drops from ~260 lines of resume logic to ~5 lines calling `detectResume()`.

**Rollback:** Inline the handler back into `appOpenBranchStep` (pure refactor, no behavioral change).

### Phase M2: Introduce FlowTemplate + FlowStrategy (domain only)

Add the VO and domain service. Write exhaustive unit tests covering all selection paths. No wiring to production routing yet.

**Validation:** Assert that `FlowStrategy.select()` produces the same template ID as the current if-else tree for all known input combinations. This is the equivalence proof that the migration preserves behavior.

### Phase M3: Wire FlowExecutor to `ei-app-open.ts` with feature flag

Replace the remaining 6 non-resume branches with: `selectFlow()` → `FlowSelected` event append → phase-walking executor.

**Feature flag:** `StudentPolicy.dials['flow.executor.enabled']`. When `false`, fall through to old branches. When `true`, use FlowExecutor. Strategic Adjustment enables per-student for gradual rollout.

**Rollback:** Set `dials['flow.executor.enabled'] = false` per-student or globally.

### Phase M4: Remove old branches

Once the feature flag has been `true` for all students for 7+ days with no regressions, remove the old if-else branches, the feature flag check, and deprecate `ProtocolRouter`.

---

## Consequences

### Positive

- **430-line monolith eliminated:** `appOpenBranchStep` becomes ~80 lines of orchestration (detect resume → select flow → execute)
- **Flow decisions observable:** `FlowSelected` events in the Ledger enable Ops dashboards and A/B analysis
- **Product enablement:** New flow templates defined as data; engineering implements selection rules
- **Resume detection centralized:** One handler, one code path, projection-backed (fast per ADR-003)
- **Cross-protocol invariants strengthened:** `required: true` flag makes event completeness explicit and enforceable
- **Onboarding gap fixed:** Onboarding template includes required silent P2, fixing the missing `ActivationPlanIssued`
- **Testable:** FlowStrategy is pure domain (unit tests, no mocks per test strategy). SelectFlowHandler uses in-memory fakes.
- **Routing logic moves to the correct layer:** From infrastructure (Mastra workflow) to domain (FlowStrategy)

### Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| FlowTemplate proliferation (too many templates) | Cap at 10 templates pre-launch; each requires Product + Engineering sign-off |
| FlowStrategy selection logic becomes complex | Selection rules are a simple precedence chain (5 rules currently). If >10 rules, refactor to a scoring model. |
| Resume detection reads stale projection data | Acceptable: ADR-003 projection staleness window is 1 event-fire. Worst case: one stale read, then next AppOpen reads correct state. |
| Migration breaks existing flow for some students | Feature-flag per-student via `StudentPolicy.dials`. Rollback is `dials['flow.executor.enabled'] = false`. |
| `FlowSelected` event adds Ledger write latency | Single append (~5ms). Negligible compared to P1+P2 handler execution (~3000ms). |
| `ProtocolRouter` consumers during migration | Both `ProtocolRouter` and `FlowStrategy` coexist during M3. `ProtocolRouter` deprecated in M4 only after FlowStrategy is proven. |

---

## Product Enablement

With FlowStrategy as infrastructure, Product defines flow templates and selection criteria. Engineering implements the selection rules and template definitions.

| Feature | Template ID | Selection Criteria | Engineering Work |
|---------|------------|-------------------|-----------------|
| Skip-P1 for returning students | `declared-returning` | `sessionsTotal ≥ 20 AND hasTaskType AND lastSessionWithin7d` | New template + FlowStrategy rule |
| Extended checkin for struggling students | `negotiated-extended` | `mode === 'Rescue' AND silenceDays ≥ 5` | New template with warm re-engagement checkin |
| Micro-session default for cohort | `micro` (existing) | `cohortFlags['flow.micro.default']` | Add cohort flag check to existing template selection |
| A/B test: skip P2 activation screen | `negotiated-no-p2-ui` | `cohortFlags['flow.ab.skipP2']` | New template (P2 `showUI: false`), SA sets flag |
| Pre-session recap phase | `negotiated-with-recap` | `cohortFlags['flow.recap.enabled']` | New `recap` FlowPhaseId + recap handler |
| Onboarding v2 with energy input | `onboarding-v2` | `isOnboarding AND cohortFlags['flow.onboarding.v2']` | New template + modified onboarding handler |
| Sequential review mode | `review-loop` | Student selects "review mode" from pending list | New template: p3-verify → p3-verify → ... → done |

---

## Implementation Order

| Step | What | Layer | Files | Depends on |
|------|------|-------|-------|-----------|
| 1 | `FlowTemplate` VO with static factories | Domain | `src/ei/domain/study-session/value-objects/flow-template.ts` | None |
| 2 | `FlowStrategy` domain service | Domain | `src/ei/domain/study-session/flow-strategy.ts` | Step 1 |
| 3 | Unit tests for FlowStrategy (all selection paths) | Domain | `src/ei/tests/domain/flow-strategy.test.ts` | Steps 1–2 |
| 4 | `FlowSelected` event type in EventTypeEnum | Schema | `src/ei/schemas/events.ts` | None |
| 5 | `DetectResumeHandler` (extract resume branches) | Application | `src/ei/application/detect-resume/handler.ts`, `port.ts` | ADR-003 (`session_phase` column) |
| 6 | `SelectFlowHandler` (wraps FlowStrategy) | Application | `src/ei/application/select-flow/handler.ts`, `port.ts` | Steps 1–2 |
| 7 | `PresentationContext` gains `flowTemplateId` + `flowProgress` | SDUI | `src/ei/sdui/presentation-context.ts` | Step 1 |
| 8 | Refactor `ei-app-open.ts` with feature flag | Mastra | `src/mastra/workflows/ei-app-open.ts` | Steps 5–6 |
| 9 | Integration tests (full flow) | Test | `src/ei/tests/integration/flow-executor.integration.test.ts` | Steps 5–8 |
| 10 | Remove old branches + feature flag + deprecate `ProtocolRouter` | Mastra | `src/mastra/workflows/ei-app-open.ts`, `src/ei/application/ei-protocol-router/` | Step 9 + 7d soak |

---

## Relationship to ProtocolRouter

`ProtocolRouter` (`src/ei/application/ei-protocol-router/router.ts`) currently makes a single decision: AppOpen → P1 or P2, based on recent `SessionIntentIssued` events.

FlowStrategy subsumes this decision. The `negotiated-standard` template selection (priority 5 in the precedence chain) replaces `ProtocolRouter.decideForAppOpen()`. The `declared-standard` template selection (priority 4) replaces the `fullPayload.taskType` check that currently short-circuits before `ProtocolRouter` is called.

During migration (M3), both coexist. `ProtocolRouter` is deprecated and removed in M4.

---

## What This ADR Does NOT Cover

- **Level 3 (Protocol-level adaptation):** Different students getting fundamentally different gate logic. Requires parameterized aggregate or Specification Pattern on StudySession. Depends on Level 2 as foundation.
- **Level 4 (Journey-level adaptation):** Cross-session learning about what works for each student. Requires new bounded context (`AdaptationLearning`). Depends on Levels 2+3.
- **Config-driven template definitions:** FlowTemplate is currently code (static factories). Externalizing to config/database is a future concern when template count justifies it.
- **Client-side flow awareness:** The client remains a pure SDUI renderer. Flow context is available via `PresentationContext.flowTemplateId` for ViewComposer use, not for client-side decisions.

---

## References

- [ADR-001: Declared Intent — Two-VO Design](adr-001-declared-intent-design.md) — `DeclaredIntent` + `NegotiatedIntent` VOs; `SessionIntentIssued` unified event
- [ADR-002: Declared-Intent Bypass Fix](adr-002-declared-intent-bypass-fix.md) — Silent P2 pattern (precedent for `showUI: false` + `required: true`)
- [ADR-003: Projection Schema Evolution](adr-003-projection-schema-evolution.md) — `session_phase` column (resume detection dependency)
- [ADR-004: Session Lifecycle Persistence](adr-004-session-lifecycle-persistence.md) — Event-sourced repository; fold/reconstitute pattern
- [EI Runtime Tactical Spec](../tactical/ei-runtime-tactical-spec.md) — StudySession aggregate lifecycle, gate handlers, routing matrix §10
- [01-ei-tactical-conventions.md](../tactical/01-ei-tactical-conventions.md) — Layer rules, port placement, test strategy
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md) — Event Ledger invariants, cross-protocol threading
- [canvas-ei-runtime.md](../canvas-ei-runtime.md) — Bounded context canvas, progressive disclosure, ubiquitous language
