---
paths:
  - "src/ei/sdui/**"
---

# SDUI Layer — Presentation Rules (StudySessionOrchestration)

Full spec: `docs/engineering-ddd-design/canvas-ei-runtime.md` (Gateway context)

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
