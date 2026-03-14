---
paths:
  - "src/ei/study-session-orchestration/domain/**"
---

# SSO Domain Layer — Purity Rules (StudySessionOrchestration)

Full spec: `docs/engineering-ddd-design/tactical/study-session-orchestration-tactical-spec.md`, `docs/engineering-ddd-design/canvas-study-session-orchestration.md`

SSO is a **separate bounded context** from EI Runtime (ADR-005). It is a "domain services + VOs" context — no aggregate root.

## Import Rules (different from EI Runtime domain)

- `src/ei/study-session-orchestration/domain/` MUST NOT import `db/`, `mastra/`, `infrastructure/`
- `src/ei/study-session-orchestration/domain/` MUST NOT import `src/ei/domain/` (EI Runtime domain)
- `src/ei/study-session-orchestration/domain/` MAY import `src/ei/schemas/` for Published Language types (event schemas, gate output contracts)
- `src/ei/study-session-orchestration/application/` imports SSO domain + port interfaces only

**Validate yourself:** "Can I run this logic in a test with no DB and no HTTP?" If no — it doesn't belong here.

## Domain Services

### FlowStrategy (`services/flow-strategy.ts`)

- **Stateless, deterministic** — same signals → same FlowTemplate; no randomness
- Selects FlowTemplate from FlowSelectionContext (projection signals subset)
- A/B experiments via `cohortFlags` in FlowSelectionContext — not randomness
- Analogous to ProtocolEngine in EI Runtime

### ViewComposer (`services/view-composer.ts`)

- **Pure function** — ZERO DB calls, ZERO side effects, ZERO imports from `infrastructure/` or `db/`
- Maps gate outputs (Published Language VOs) + PresentationContext → SduiResponse component trees
- Microcopy resolution is an internal capability (not a standalone service)
- All data passed in via parameters; never fetches its own data

## Value Objects

| VO | Purpose | Key invariant |
|---|---|---|
| FlowTemplate | Which phases included, which show UI | Immutable; static factories (declared-standard, negotiated-standard, onboarding, micro) |
| FlowSelectionContext | Input for FlowStrategy | `create()` factory with validation; subset of projection signals |
| PresentationContext | Input for ViewComposer/IdentityEligibility | Needs `create()` factory with validation (mode enum, non-negative counts, rate in [0,1]) |

## Specifications

### IdentityEligibility (`identity/compute-identity-eligibility.ts`)

Pure eligibility check — function form (not class):
- `verificationRate7d >= 0.70`
- `pendingChecks <= 2`
- `sessionsLast7d >= 4`
- `7+ days since last shown`

NEVER add side effects here. The `IdentityMomentShown` event insertion happens in the Mastra compose step.

## SSO-Owned Events

These events are appended to the shared Ledger by SSO (not by EI Runtime):

**UI-produced (mechanical append, no domain logic):** `AppOpen`, `IntentSet`, `SessionEnd`, `FirstActionStarted`, `Replan`, `IntentResponse`, `RetrievalVerified`, `RetrievalScheduled`, `RetrievalSkipped`, `VerificationCompleted`

**SSO domain-produced (side effects):** `FlowSelected` (R1), `IdentityMomentShown` (R3), `ViewComposed` (observability)

## What SSO Does NOT Decide

- Coaching posture (Rescue/Neutral/Boost) — LoopHealthAssessment + EI Runtime
- Play selection (24-play catalog) — ProtocolEngine in EI Runtime
- Verification floor, watch-only, risk override — StudySession invariants
- Student metrics/labels — EI Projections + LoopHealthAssessment
- Policy dials — Strategic Adjustment

## Anti-Patterns to Avoid

| Anti-Pattern | Fix |
|---|---|
| Importing from `src/ei/domain/` (EI Runtime) | SSO consumes gate outputs via Published Language contracts only |
| DB call in ViewComposer or FlowStrategy | All data via parameters; DB access in Mastra steps |
| Threshold logic in SSO domain | Thresholds live in LoopHealthAssessment only |
| Side effects in IdentityEligibility | Pure function; side effects in Mastra step |
| Business rules about coaching moves in SSO | Coaching decisions belong in EI Runtime |
