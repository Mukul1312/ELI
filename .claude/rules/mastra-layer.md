---
paths:
  - "src/mastra/**"
---

# Mastra Layer — Workflow Orchestration Rules

Full spec: `docs/engineering-ddd-design/tactical/01-ei-tactical-conventions.md` §2

Mastra is the **outermost shell**. It handles I/O, orchestrates EI use cases, and composes SDUI responses. It is NOT part of the EI domain.

## Core Rules

**1. Never import from `src/ei/domain/` (EI Runtime domain) in workflow or tool files.**
Always go through application handlers:
- `RunP1GateHandler`, `RunDeclaredIntentHandler`, `RunP2GateHandler`, `RunP3GateHandler`
- `AssessLoopHealthHandler`, `ApplyStrategicAdjustmentDecisionHandler`

**Exception:** SSO domain pure functions are allowed — ViewComposer, PresentationContext builders, IdentityEligibility are pure (zero I/O, zero side effects). Import from `src/ei/study-session-orchestration/domain/` is safe in compose steps.

**2. No domain logic in workflow steps.** Steps are thin orchestration; delegate everything to `src/ei/application/`.

**3. Compose steps must call ViewComposer — never build SDUI trees manually.**
Pattern: `load DB rows → map to AggregatesForPresentation → buildXxxPresentationContext() → composeXxxView() → wrap response`

**4. DB access via `src/ei/db/queries.ts`.** Workflows use `store.db` (PostgresStore) for raw queries. Application handlers use port interfaces instead.

**5. Tools are single-purpose.** Each Mastra tool wraps exactly one EI use case or DB operation.
- `tools/declare-intent.ts` → `RunDeclaredIntentHandler` only
- `tools/event-store.ts` → Ledger read/write only

## Workflow → EI Handler Map

| Workflow | EI handler / function |
|---|---|
| `ei-app-open.ts` | `DetectResumeHandler` → `SelectFlowHandler` → `FlowExecutor` (via handler factories) |
| `protocol1-ignition.ts` | `RunP1GateHandler` |
| `protocol2-activation.ts` | `RunP2GateHandler` |
| `protocol3-verification.ts` | `RunP3GateHandler` |
| `verification-complete.ts` | DB queries + `composePhase3View` |
| `retrieval-schedule.ts` | DB queries + `composePhase3View` |
| `retrieval-skip.ts` | DB queries + `composePhase3View` |
| `checkin-view.ts` | DB queries + `composeCheckinView` |
| `strategic-adjustment.ts` | `ApplyStrategicAdjustmentDecisionHandler` |

## Compose Step Pattern (exact order)

```
1. Load aggregates from DB using queries.ts helpers
2. Map DB rows → AggregatesForPresentation (typed DTO from src/ei/study-session-orchestration/domain/types/aggregates-for-presentation.ts)
3. Call build{Phase}PresentationContext() from src/ei/study-session-orchestration/domain/value-objects/presentation-context.ts
4. Call compose{Phase}View(output, ctx) from src/ei/study-session-orchestration/domain/services/view-composer.ts
5. Return wrapped SDUI response (P1WrappedResponse / P2WrappedResponse / P3WrappedResponse)
```

Compose steps: `steps/compose-p1-view.ts`, `steps/compose-p2-view.ts`, `steps/compose-p3-view.ts`, `steps/compose-checkin-view.ts`

## Side Effects

`IdentityMomentShown` event insertion happens in `steps/compose-checkin-view.ts` ONLY.
NEVER put side effects inside `view-composer.ts` — ViewComposer is a pure function.

## SDUI Response Shape

```typescript
{ schemaVersion: 1, phase, view: { header, body, actions, footer }, actions: Record<string, SduiAction>, domain }
```

Phase-specific wrappers defined in `src/ei/study-session-orchestration/types/sdui-contract.ts`:
`P1WrappedResponse`, `P2WrappedResponse`, `P3WrappedResponse`

## Anti-Patterns to Avoid

| Anti-Pattern | Fix |
|---|---|
| Workflow importing from `src/ei/domain/` | Import handler class from `src/ei/application/` |
| Building SDUI component arrays inline in a workflow | Create a compose step; call ViewComposer |
| Domain logic (thresholds, mode decisions) in a workflow | Move to domain service or use-case handler |
| Multiple DB round-trips when one query suffices | Consolidate via `queries.ts` helpers |
| Side effects in ViewComposer | Side effects go in the Mastra step, not ViewComposer |
