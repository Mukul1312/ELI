---
paths:
  - "src/ei/sdui/**"
  - "src/ei/study-session-orchestration/**"
---

# SDUI Layer — Presentation Rules (StudySessionOrchestration)

Full spec: `docs/engineering-ddd-design/canvas-study-session-orchestration.md`, `docs/engineering-ddd-design/tactical/study-session-orchestration-tactical-spec.md`

**ADR-005:** SSO is a separate bounded context from EI Runtime. See `docs/engineering-ddd-design/decisions/adr-005-flow-level-adaptation.md`.

## Core Rules

**1. `view-composer.ts` is a pure function.** ZERO DB calls, ZERO side effects, ZERO imports from `infrastructure/` or `db/`. If you need data, it must be passed in via `PresentationContext` or function parameters.

**2. PresentationContext is pre-built by Mastra compose steps.** ViewComposer receives it as a parameter — it never builds it. All DB loading happens upstream in the Mastra step.

**3. No business logic in ViewComposer.** Mode/variant/routing decisions belong in the domain layer. ViewComposer maps already-decided domain outputs → SDUI component trees.

**4. All UI text via microcopy.** Use `resolveMicrocopy(microcopyCatalog, key, vars)` from `microcopy/resolver.ts`. Never hardcode display strings in view-composer.ts.

## Key Files

| File | Purpose |
|---|---|
| `view-composer.ts` | All composer functions: `composeP1View`, `composeP2View`, `composeP3View`, `composePhase3View`, `composeCheckinView`, `composeSessionView`, onboarding views |
| `presentation-context.ts` | 4 builder functions: `buildP1/P2/P3/CheckinPresentationContext()` — called by Mastra steps |
| `types/sdui-contract.ts` | `SduiResponse`, `SduiViewTree`, `SduiAction`, `SduiPhase`, wrapped response schemas |
| `types/components.ts` | ALL SDUI component Zod schemas — add new components here ONLY |
| `types/aggregates-for-presentation.ts` | Typed DTO mapping DB rows to presentation fields |
| `microcopy/catalog.ts` | Master microcopy catalog |
| `identity/compute-identity-eligibility.ts` | Pure eligibility check — no DB reads, no writes |

## SSO Domain Services & Value Objects (`src/ei/study-session-orchestration/domain/`)

SSO domain is a **domain services + VOs** context (no aggregate root). Different import rules than EI Runtime domain:
- May import `src/ei/schemas/` for Published Language types (event schemas, output contracts)
- MUST NOT import `src/ei/domain/` (EI Runtime domain), `db/`, `mastra/`, `infrastructure/`

| File | Purpose |
|---|---|
| `domain/services/flow-strategy.ts` | Stateless FlowTemplate selection from student context signals |
| `domain/services/view-composer.ts` | Pure per-phase functions → SduiResponse |
| `domain/value-objects/flow-template.ts` | Which phases included, which show UI (static factories) |
| `domain/value-objects/flow-selection-context.ts` | Input VO for FlowStrategy (projection signals subset) |
| `domain/value-objects/presentation-context.ts` | Signals consumed by ViewComposer/IdentityEligibility |

**SSO-owned events:** `FlowSelected`, `IdentityMomentShown`, `ViewComposed` — informational, appended to shared Ledger.

## PresentationContext — Use the Correct Builder

| Phase | Builder | Called when |
|---|---|---|
| Initial app open | `buildCheckinPresentationContext()` | `AppOpen { initial: true }` |
| P1 intent | `buildP1PresentationContext()` | After P1 gate runs |
| P2 activation | `buildP2PresentationContext()` | After P2 gate runs |
| P3 verification | `buildP3PresentationContext()` | After P3 gate runs |

## SDUI Response Shape

```typescript
SduiResponse {
  schemaVersion: 1,
  phase: SduiPhase,  // 'checkin' | 'intent' | 'activation' | 'session' | 'verification' | 'done'
  view: {
    header: SduiSlotEntry[],
    body: SduiSlotEntry[],
    actions: SduiSlotEntry[],
    footer: SduiSlotEntry[],
  },
  actions: Record<string, SduiAction>,  // keyed by action ID
  domain: unknown,                       // raw domain output for client-side state
}
```

## Progressive Disclosure

Use the `grouped(component, visibilityGroup, initiallyVisible?, hiddenWhenGroup?)` helper (view-composer.ts) for reveal-on-input components.

Groups: `'1A'` (energy — always visible), `'1B'` (revealed after energy input), `'1C'` (revealed after topic input)

## Adding a New SDUI Component (exact order)

1. Add Zod schema to `types/components.ts` — add to `SduiComponentSchema` discriminated union
2. Implement React component in `src/app/sdui/components/{component-name}.tsx`
3. Register in `src/app/sdui/registry.tsx`

Never define component shapes inline in view-composer.ts or anywhere else.

## Identity Moment Side Effect

`computeIdentityEligibility()` in `identity/compute-identity-eligibility.ts` is a PURE check — reads nothing, writes nothing.

The actual `IdentityMomentShown` event insertion happens in `src/mastra/workflows/steps/compose-checkin-view.ts` — NOT in ViewComposer.

## Anti-Patterns to Avoid

| Anti-Pattern | Fix |
|---|---|
| DB call inside view-composer.ts | All data passed in via PresentationContext |
| Hardcoded strings in view-composer.ts | Use `resolveMicrocopy()` |
| Business rule in view-composer.ts | Move decision to domain; pass result via PresentationContext |
| Inline component schema in view-composer.ts | Add schema to `types/components.ts` |
| Side effect inside computeIdentityEligibility | Pure function; side effects go in Mastra step |
| PresentationContext built inside ViewComposer | Built by Mastra step, passed as parameter |
