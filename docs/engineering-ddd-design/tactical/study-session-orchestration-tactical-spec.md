# Tactical Spec — StudySessionOrchestration

> Consolidated from the R1–R4 sub-responsibility audit ([canvas-study-session-orchestration.md](../canvas-study-session-orchestration.md)) and validated against Clean Architecture + DDD + Hexagonal patterns (Evans Blue Book, Vernon IDDD, Cockburn Hexagonal).

**Bounded context:** StudySessionOrchestration (Supporting subdomain)
**Canvas:** [canvas-study-session-orchestration.md](../canvas-study-session-orchestration.md)
**ADR:** [ADR-005 — Flow-Level Adaptation](../decisions/adr-005-flow-level-adaptation.md)
**Cross-cutting:** [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)

---

## 1. Architectural Shape

SSO is a **"domain services + value objects" bounded context** — no aggregate root, no mutable state, no repository. This is unusual but valid for a Supporting subdomain (see canvas Q5). All domain logic is pure and stateless; the Cockburn test passes: SSO's domain runs without DB or UI.

Directory structure uses `domain/services/` and `domain/value-objects/` (not `domain/{aggregate}/`) since there is no aggregate root.

**Building block summary:**

| Category | Count | Items |
|----------|-------|-------|
| Domain Services | 2 | FlowStrategy, ViewComposer |
| Value Objects | 3 | FlowTemplate, PresentationContext, FlowSelectionContext |
| Specifications | 1 | IdentityEligibility |
| Domain Events | 2 | FlowSelected, IdentityMomentShown |
| Published Language | 2 | SduiResponse, SduiComponent |
| Aggregate Roots | 0 | — |
| Repositories | 0 | — |
| Driver Ports | 3 | ISelectFlowUseCase, IDetectResumeUseCase, IComposeViewUseCase |
| Driven Ports | 4 | IStudentAggregatesQuery, ITopicStateQuery, IStudentPolicyQuery, IEventAppender |

---

## 2. Domain Services (stateless, deterministic, pure — domain layer)

| Service | Sub-resp | Input | Output | Business question | Analogous to |
|---------|----------|-------|--------|-------------------|-------------|
| **FlowStrategy** | R1.1 | FlowSelectionContext (VO) | FlowTemplate (VO) | "Which flow shape applies?" | ProtocolEngine |
| **ViewComposer** | R3.1 | Gate output + PresentationContext (VO) | SduiResponse (Published Language) | "What component tree does the student see?" | ProtocolEngine (presentation side) |

**ViewComposer includes microcopy resolution as an internal capability** (R3.2). The priority chain (play → mode → default) is a business rule, but the resolver is a sub-function of ViewComposer — not a peer domain service. ViewComposer is SSO's only consumer of microcopy resolution. If a second consumer emerges, promote to standalone service.

**Audit notes:**
- Both services pass the domain service test: stateless, no I/O, encode business rules a domain expert recognizes.
- ViewComposer depends on `SduiComponent` types. In SSO's domain, the component tree IS the domain model — "what the student sees" — so component types are domain types, not infrastructure. SduiResponse (the boundary envelope) is Published Language (see §6).
- **FlowStrategy input constraint:** Must receive a VO (`FlowSelectionContext`), not raw projection fields. The application layer assembles the VO from DB queries; FlowStrategy never touches infrastructure-shaped data.

---

## 3. Value Objects (immutable, self-validating — domain layer)

| Value Object | Sub-resp | Attributes | Created by | Self-validates |
|-------------|----------|-----------|-----------|---------------|
| **FlowTemplate** | R1.1 | Phase list + showUI flags per phase | Static factories (`FlowTemplate.negotiatedStandard()`, `.declaredStandard()`, `.onboarding()`, `.micro()`) | Yes — `create()` enforces "if session present, p3 must be present" (pending canvas Q2 resolution) |
| **PresentationContext** | R3.4 / R3.1 / R3.3 | Student-level signals: mode, pendingChecks, silenceDays, verificationRate7d, sessionsLast7d, consecutiveDeferrals, streaks, cohortFlags, dropoutSignalActive, highPressureDetected, etc. | Application layer (4 builder functions in `presentation-context.ts`) | **Needs `create()` factory** — currently built by application builders without domain validation. Should validate: mode ∈ {Rescue, Neutral, Boost}, pendingChecks ≥ 0, verificationRate7d ∈ [0, 1], sessionsLast7d ≥ 0. Without validation, PresentationContext risks being a data bag (anemic VO anti-pattern). |
| **FlowSelectionContext** | R1.1 (input to FlowStrategy) | Subset of projection signals relevant to flow selection: pendingChecks, silenceDays, sessionsTotal, openLoops, cohortFlags, isOnboarding, isMicro | Application layer (assembled from projections) | Yes — same validation concern as PresentationContext |

**Audit notes:**
- FlowTemplate uses the **static factory** variant of the VO pattern (Evans Blue Book Ch. 5) — valid for a small fixed set of known templates.
- PresentationContext is an **actionable finding**: it needs a `create()` factory with range/enum validation to avoid the anemic VO anti-pattern. The domain defines the shape and invariants; the application layer calls `PresentationContext.create(...)` instead of building raw objects.
- FlowSelectionContext is new — surfaced by the audit finding that FlowStrategy must not receive raw projection data. It's a focused VO carrying only the signals FlowStrategy needs (subset of PresentationContext's fields).

---

## 4. Specification (domain layer)

| Specification | Sub-resp | Predicate | Input | Output |
|--------------|----------|-----------|-------|--------|
| **IdentityEligibility** | R3.3 | verificationRate7d ≥ 0.70 AND pendingChecks ≤ 2 AND sessionsLast7d ≥ 4 AND 7+ days since last shown | PresentationContext fields + lastShownAt | `{ eligible: boolean, statement?: string }` |

**Audit notes:**
- Implemented as a pure function (`computeIdentityEligibility`), not a class with `isSatisfiedBy`. Function form is appropriate — there's exactly one predicate, no composition needed. Class form would over-engineer.
- Thresholds (0.70, 2, 4, 7d) are hardcoded domain rules. If configurable in future, they'd come from StudentPolicy — but the Specification pattern still holds.

---

## 5. Domain Events (internal — appended to shared Ledger)

| Event | Sub-resp | Trigger | Key data | Downstream consumers | Category |
|-------|----------|---------|----------|---------------------|----------|
| **FlowSelected** | R1.1 | After FlowStrategy.select() returns | templateId, selectionContext, sessionId | EI Projections → Ops & Observability | Internal event |
| **IdentityMomentShown** | R3.3 | After eligibility passes + card rendered | studentId, statement | EI Projections → R3.3 (cooldown via lastShownAt) | Internal event |

**Audit notes:**
- These are **internal domain events** — same category as `SessionIntentIssued`, `ActivationPlanIssued`, `VerificationDecisionIssued` in [05-cross-cutting-concerns.md §Internal Event Catalog](../05-cross-cutting-concerns.md). They flow through the shared EI Event Ledger and are consumed by EI Projections. They are NOT integration events (those are for external consumers like Institute Radar — see §Integration Event Schemas in cross-cutting concerns).
- Emitted by the **application layer** (use case handlers), not by an aggregate root — valid for an aggregate-less BC. Vernon (IDDD Ch. 8) covers "domain events published by application services" for exactly this case.
- Both events are informational — they don't trigger command-side state changes in SSO. FlowSelected feeds observability dashboards. IdentityMomentShown feeds back into R3.3's cooldown check via Projections.
- **Must be added to** [05-cross-cutting-concerns.md §Internal Event Catalog](../05-cross-cutting-concerns.md) when implemented.

---

## 6. Published Language (boundary contracts — NOT domain VOs)

| Contract | Location | Validated by | Notes |
|----------|----------|-------------|-------|
| **SduiResponse** | `src/ei/study-session-orchestration/types/sdui-contract.ts` (currently `src/ei/sdui/types/sdui-contract.ts`) | SduiResponseSchema (Zod) | SSO's primary output. Boundary DTO, not a domain VO. ViewComposer builds `SduiComponent[]` arrays internally and wraps them in SduiResponse only at the final return. |
| **SduiComponent** | `src/ei/study-session-orchestration/domain/types/components.ts` (currently `src/ei/sdui/types/components.ts`) | Component Zod schemas | **Domain types** — the building blocks ViewComposer thinks in. The component vocabulary IS SSO's domain model. Currently co-located with SduiResponse in the boundary types directory. |

**Audit finding — separation concern:** SduiComponent types (domain) and SduiResponse (boundary) are currently co-located in `src/ei/sdui/types/`. This is a documentation-level note, not a blocking issue — the code works correctly. If SSO gets its own `domain/` directory, SduiComponent types move to domain; SduiResponse stays at the boundary.

---

## 7. Application Layer (orchestration, not domain)

| Concern | Sub-resp | Why not domain | Layer |
|---------|----------|---------------|-------|
| **DetectResume** | R1.3 | Read query against projections — no business rules, no domain concepts | Application (use case) |
| **Input Collection & Event Emission** | R2 | Mechanical: validate → construct → route → append. No interpretation logic. | Application (glue) |
| **PresentationContext Assembly** | R3.4 | DB reads + VO construction. Domain defines the VO shape; application fills it. | Application (use case step) |
| **Command Routing** | R1.2 | Code investigation revealed 100% mechanical dispatch — payload shape + projection state → handler. Zero threshold checks, zero eligibility evaluations, zero signal inspection. | Application (dispatcher) |
| **Flow Execution** | — | Mastra workflow orchestration — coordinates gate calls and compose steps in sequence. | Application / Infrastructure |

---

## 8. Port Placement (Hexagonal)

### Driver ports (inbound)

`application/{use-case}/port.ts` → `I{Action}UseCase`

| Port | Direction | Sub-resp | Notes |
|------|-----------|----------|-------|
| `ISelectFlowUseCase` | Driver | R1.1 | AppOpen (with topic) → FlowTemplate selection |
| `IDetectResumeUseCase` | Driver | R1.3 | AppOpen (initial: true) → interrupted session check |
| `IComposeViewUseCase` | Driver | R3.1 | Post-gate → SDUI component tree |

### Driven ports (outbound)

`application/shared/port-*.ts`

| Port | Direction | Consumer | Notes |
|------|-----------|----------|-------|
| `IStudentAggregatesQuery` | Driven | R1.1 (FlowSelectionContext), R3.4 (PresentationContext) | Read projection data |
| `ITopicStateQuery` | Driven | R1.3 (resume detection), R3.4 (PresentationContext) | Read projection data |
| `IStudentPolicyQuery` | Driven | R1.1 (cohortFlags), R3.1 (constraints) | Read policy data |
| `IEventAppender` | Driven | R2 (UI events), R1.1 (FlowSelected), R3.3 (IdentityMomentShown) | Append to shared Ledger |

**Audit notes:**
- **No repository port** — correct, because SSO has no aggregate to persist.
- Driven ports use domain types only — no SQL/ORM types exposed. Query ports return domain-shaped data (VOs or plain objects matching VO fields).
- All port placements follow CLAUDE.md conventions: driver in `application/{use-case}/port.ts`, driven in `application/shared/port-*.ts`.

---

## 9. Removed from Inventory (with rationale)

| Candidate | Originally classified as | Removal reason |
|-----------|------------------------|----------------|
| ~~CommandRouter~~ | Domain Service (R1.2) | Code investigation revealed 100% mechanical dispatch — payload shape + projection state → handler. Zero threshold checks, zero eligibility evaluations, zero signal inspection. Application-layer concern, not domain. |
| ~~MicrocopyResolver~~ | Domain Service (R3.2) | The priority chain (play → mode → default) is a genuine business rule, but the resolver is ViewComposer's internal sub-function (~25 lines). ViewComposer is the only consumer. Folded into ViewComposer as internal capability. Promote if a second consumer emerges. |
| ~~SduiResponse as VO~~ | Value Object | Code investigation confirmed ViewComposer builds `SduiComponent[]` arrays internally and wraps them in SduiResponse only at the boundary. SduiResponse is defined as a Zod schema ("the API between EI Runtime and the client renderer"). Published Language DTO, not a domain VO. |

---

## 10. Actionable Findings (for implementation)

1. **FlowStrategy input must be a VO** — Create `FlowSelectionContext` with `create()` factory. FlowStrategy never receives raw projection data.
2. **PresentationContext needs validation** — Add `create()` factory enforcing: mode ∈ {Rescue, Neutral, Boost}, pendingChecks ≥ 0, verificationRate7d ∈ [0, 1], sessionsLast7d ≥ 0. Current builder functions should call `PresentationContext.create(...)`.
3. **SduiComponent vs SduiResponse separation** — SduiComponent types are domain (ViewComposer's building blocks). SduiResponse is boundary (Published Language). Currently co-located in `types/`. When the `domain/` subdirectory is created, SduiComponent moves to `domain/types/`; SduiResponse stays at `types/sdui-contract.ts` (boundary).
4. **Rename `sdui/` → `study-session-orchestration/`** — directory name should reflect the bounded context, not the output format. `sdui` is infrastructure vocabulary; the domain concern is session orchestration. See §11.

---

## 11. Naming Decision — `study-session-orchestration/`, not `sdui/`

Current code lives in `src/ei/sdui/`. The directory name describes the **output format** (Server-Driven UI), not the **domain concern** (orchestrating what the student sees). This is a UL violation — like naming EI Runtime `json-responses/` because that's what the API returns.

**Canonical name:** `study-session-orchestration` — matches the bounded context name in the canvas, context map, and this spec.

| Term | What it is | Where it belongs |
|------|-----------|-----------------|
| `study-session-orchestration/` | The bounded context directory | Top-level code directory |
| `sdui` | The output format (component tree serialization) | Contract types within the BC (`types/sdui-contract.ts`) |
| `SSO` | Design doc shorthand | Never in code or file paths |

**SDUI is infrastructure vocabulary.** SduiResponse, SduiComponent — these describe the wire format. The domain concepts are Flow, ViewComposer, PresentationContext, FlowTemplate. The directory should reflect the domain, not the delivery mechanism.

## 12. Planned File Layout

```
src/ei/
├── study-session-orchestration/   # Bounded context (renamed from sdui/)
│   ├── domain/
│   │   ├── services/
│   │   │   ├── flow-strategy.ts           # R1.1 — selects FlowTemplate
│   │   │   └── view-composer.ts           # R3.1 — gate output + ctx → SduiResponse
│   │   ├── value-objects/
│   │   │   ├── flow-template.ts           # R1.1 — immutable, static factories
│   │   │   ├── flow-selection-context.ts  # R1.1 — input VO for FlowStrategy
│   │   │   └── presentation-context.ts    # R3.4 — type + create() factory
│   │   ├── specifications/
│   │   │   └── identity-eligibility.ts    # R3.3 — pure eligibility check
│   │   ├── events/
│   │   │   └── events.ts                  # FlowSelected, IdentityMomentShown
│   │   └── types/
│   │       └── components.ts              # SduiComponent types (domain vocabulary)
│   ├── types/
│   │   └── sdui-contract.ts       # SduiResponse Published Language (boundary — "sdui" is correct HERE)
│   ├── microcopy/                 # Static data catalogs
│   │   ├── catalog.ts
│   │   ├── resolver.ts            # Internal to ViewComposer
│   │   ├── p1.ts, p2.ts, p3.ts
│   │   └── identity.ts
│   └── __tests__/
│       └── view-composer.test.ts
├── application/
│   ├── select-flow/               # R1.1 use case (NEW)
│   │   ├── command.ts
│   │   ├── handler.ts
│   │   └── port.ts                # ISelectFlowUseCase
│   ├── detect-resume/             # R1.3 use case (NEW)
│   │   ├── query.ts
│   │   ├── handler.ts
│   │   └── port.ts                # IDetectResumeUseCase
│   ├── compose-view/              # R3.1 use case (wraps ViewComposer call)
│   │   └── port.ts                # IComposeViewUseCase
│   └── shared/
│       ├── port-student-aggregates.ts    # IStudentAggregatesQuery (driven)
│       ├── port-topic-state.ts           # ITopicStateQuery (driven)
│       ├── port-student-policy.ts        # IStudentPolicyQuery (driven)
│       └── port-event-appender.ts        # IEventAppender (driven)
```

> **Migration note:** Current code lives in `src/ei/sdui/` without the `domain/` subdirectory. Rename `sdui/` → `study-session-orchestration/` when SSO work begins in earnest. The rename is non-blocking — current code works correctly.

---

## 13. Test Strategy

| Layer | Test type | Rule |
|-------|-----------|------|
| Domain services (FlowStrategy, ViewComposer) | Unit, no mocks | Pure — test with representative inputs. Spec-style: given inputs → expected output. |
| Value objects (FlowTemplate, PresentationContext, FlowSelectionContext) | Unit, no mocks | Test `create()` validation: valid inputs succeed, invalid inputs throw. Test equality by value. |
| Specification (IdentityEligibility) | Unit, no mocks | Boundary tests: eligible at exactly 0.70/2/4/7d, ineligible at 0.69/3/3/6d. |
| Application layer (use case handlers) | Unit, in-memory fakes | Implement driven port interfaces as fakes — never mock domain services. |
| Infrastructure (Postgres adapters for driven ports) | Integration, real DB | Never mock Postgres. |

---

## References

- Canvas: [canvas-study-session-orchestration.md](../canvas-study-session-orchestration.md)
- ADR-005: [decisions/adr-005-flow-level-adaptation.md](../decisions/adr-005-flow-level-adaptation.md)
- Cross-cutting: [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- EI Runtime tactical spec: [ei-runtime-tactical-spec.md](ei-runtime-tactical-spec.md)
- Tactical conventions: [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md)
- Clean DDD skill: `.claude/skills/clean-ddd-hexagonal/`
