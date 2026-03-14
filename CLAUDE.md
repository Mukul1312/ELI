Before any implementation, read the full tactical spec for the relevant bounded context:
- Strategic index: docs/engineering-ddd-design/00-index.md
- Subdomains: docs/engineering-ddd-design/02-subdomains.md
- Context map: docs/engineering-ddd-design/03-context-map.md
- Cross-cutting invariants: docs/engineering-ddd-design/05-cross-cutting-concerns.md
- Tactical conventions (READ THIS FIRST): docs/engineering-ddd-design/tactical/01-ei-tactical-conventions.md
- Tactical candidates: docs/engineering-ddd-design/09-tactical-ddd-candidates.md

---

## Global Dependency Rule — NEVER violate

```
Infrastructure → Application → Domain
```

- `src/ei/domain/` imports NOTHING outside itself (no db/, mastra/, schemas/, infrastructure/)
- `src/ei/application/` imports domain + port interfaces only — NO db/, mastra/, infrastructure/ imports
- `src/ei/infrastructure/` implements ports — NO domain logic
- `src/ei/study-session-orchestration/domain/` imports NOTHING outside itself (no db/, mastra/, infrastructure/; may import `src/ei/schemas/` for Published Language types)
- `src/ei/study-session-orchestration/application/` imports SSO domain + port interfaces only

**Violations to catch:** domain importing a DB library; application calling a repo implementation directly; use-case handler importing from mastra/.

---

## Bounded Contexts → Code Locations

| Context | Code |
|---------|------|
| EI Runtime (AdaptiveCoaching) | `src/ei/domain/study-session/`, `src/ei/application/run-p{1,2,3}-gate/`, `src/ei/application/run-declared-intent/`, `src/ei/engine/` |
| EI Event Ledger | `src/ei/schemas/events.ts`, `src/ei/db/queries.ts`, `src/ei/infrastructure/persistence/append-event.pg.ts` |
| EI Projections | `src/ei/domain/topic-loop/`, `src/ei/domain/student-aggregates/`, `src/ei/application/apply-event-to-topic-loop/`, `src/ei/application/recompute-student-aggregates/`, `src/ei/infrastructure/projector/` |
| LoopHealthAssessment | `src/ei/domain/loop-health/`, `src/ei/application/assess-loop-health/` |
| StudySessionOrchestration | `src/ei/study-session-orchestration/domain/` (ViewComposer, PresentationContext, FlowStrategy, FlowTemplate), `src/ei/study-session-orchestration/types/` (SduiResponse boundary) |
| Strategic Adjustment | `src/ei/application/apply-strategic-adjustment-decision/`, `src/mastra/workflows/strategic-adjustment.ts` |
| CohortAccess | ACL at API boundary — server-derived `studentId` only |
| OpsObservability | `src/mastra/tools/signal-compute.ts`, timeline reads in `src/ei/db/queries.ts` |
| CurriculumCatalog | `src/curriculum-catalog/` (planned) — domain/, application/, infrastructure/ |

---

## Hard Invariants (inviolable)

**Event Ledger:** Append-only — NEVER UPDATE or DELETE from `ei_events`. Every append requires idempotency key: `{context}:{eventType}:{studentId}:{timestamp}`.

**Projections:** GREATEST semantics — timestamps in `ei_topic_state` NEVER regress. All projected state recomputable from `ei_events`.

**Protocol gates:** Deterministic (same inputs → same output, no randomness). Risk overrides ambition: high `openLoops` or `silenceDays` → never Boost mode. LoopHealthAssessment owns ALL thresholds/labels — nowhere else.

**Identity/Privacy:** NEVER trust client-provided `studentId` — derive from auth session. Institute APIs NEVER expose raw events or private content.

---

## Aggregate Types

| Aggregate | Type | Semantics | Location |
|-----------|------|-----------|----------|
| StudySession | Command Handler | Receives commands, enforces invariants, emits events | `src/ei/domain/study-session/study-session.ts` |
| TopicLoop | Projection | Ledger-derived, GREATEST timestamps, idempotent recompute | `src/ei/domain/topic-loop/topic-loop.ts` |
| StudentAggregates | Projection | 7d rolled-up metrics, full recompute | `src/ei/domain/student-aggregates/student-aggregates.ts` |
| StudentPolicy | Hybrid | SA-written via StrategicAdjustmentDecision, Projections-persisted | `src/ei/domain/student-policy/student-policy.ts` |

---

## Architecture Decision Records

### ADR-001 — Two P1 paths (read: docs/engineering-ddd-design/decisions/adr-001-declared-intent-design.md)

- `DeclaredIntent` (`value-objects/declared-intent.ts`): student-driven, data integrity only, **primary (Sessions 1–8)**
- `NegotiatedIntent` (`value-objects/negotiated-intent.ts`): ELI engine, full business rules
- Both emit `SessionIntentIssued` with `intentSource: 'declared' | 'negotiated'` discriminator
- `ei_study_sessions` table removed; session state fully derived from Ledger events

### ADR-002 — Declared-Intent Bypass Fix (read: docs/engineering-ddd-design/decisions/adr-002-declared-intent-bypass-fix.md)

- Declared path now runs `RunDeclaredIntentHandler` → silent `RunP2GateHandler` (emits `ActivationPlanIssued`)
- Both paths produce identical Ledger event sequence; mode is LoopHealth-driven for declared sessions
- `PhaseDeriver` updated to accept `FirstActionStarted` as active-session evidence for declared path

### ADR-003 — Projection Schema Evolution (read: docs/engineering-ddd-design/decisions/adr-003-projection-schema-evolution.md)

- `ei_topic_state` gained 6 SessionLifecycleState columns: `session_phase`, `current_session_id`, `verification_floor`, `watch_only_flag`, `intent_source`, `last_session_started_at`
- `ei_student_aggregates` gained 5 columns: `sessions_last_7d`, `loops_closed_last_7d`, `has_prior_app_open`, `last_identity_shown_at`, `active_days_7d`
- Eliminates ~5000ms latency from raw event stream reads

### ADR-004 — Session Lifecycle Persistence (read: docs/engineering-ddd-design/decisions/adr-004-session-lifecycle-persistence.md)

- `IStudySessionRepository.findById()` folds Ledger events into reconstituted aggregate
- `save()` is no-op (events already appended to Ledger by handlers)
- Cross-protocol constraints (verificationFloor, watchOnlyFlag) available from aggregate without Ledger re-reads

### ADR-005 — SSO Extraction (read: docs/engineering-ddd-design/decisions/adr-005-flow-level-adaptation.md)

- StudySessionOrchestration extracted as separate bounded context from EI Runtime
- SSO owns: FlowStrategy, ViewComposer, FlowTemplate, PresentationContext, FlowSelectionContext, IdentityEligibility
- SSO is "domain services + VOs" context — no aggregate root
- SSO domain may import `src/ei/schemas/` (Published Language); MUST NOT import `src/ei/domain/`

---

## Port Placement

- **Driver ports (inbound):** `application/{use-case}/port.ts` → named `I{Action}UseCase`
- **Driven ports (outbound):** `domain/{aggregate}/repository.ts` OR `application/shared/port-*.ts`
- One repository per aggregate root — NEVER per DB table
- Repository interfaces use domain types only — no SQL/ORM types exposed

---

## Error Conventions

- **Domain errors** MUST extend `DomainError` from `src/ei/domain/shared/errors.ts` — invariant violations, invalid VO construction
- **Application errors** MUST extend `ApplicationError` — command shape validation, precondition failures at use-case boundary
- Domain validates domain concepts. Application validates command shape/input boundaries.
- Catch and map to API responses at the boundary (API routes), not inside handlers.

---

## Time Semantics

- **NEVER** call `Date.now()` or `new Date()` inside domain files
- "Now" is a parameter passed in by the application layer via `IClockPort` (`src/ei/application/shared/port-clock.ts`)
- ISO 8601 strings at port boundaries; `Date` objects only inside domain logic
- Projections use GREATEST semantics — timestamps never regress (monotonic update only)

---

## DDD Building Blocks (from skill)

| Block | Layer | Key rule |
|-------|-------|----------|
| Entity | Domain | Equality by identity; has behavior, not just data |
| Value Object | Domain | Immutable; equality by value; self-validates in `create()` |
| Aggregate Root | Domain | Single entry point; references other aggregates by ID only; one TX per aggregate |
| Domain Service | Domain | Stateless; when logic spans multiple aggregates |
| Repository | Domain (port) | Interface only; per aggregate root |
| Domain Event | Domain | Past-tense naming; immutable |
| Application Service | Application | Orchestrates domain + ports; no business logic |

---

## DDD-Lite Guardrails — What to Defer

**Do now:** pure domain aggregate roots, repository interfaces, thin Postgres adapters, use-case handlers, spec tests.

**Defer until proven needed:** full CQRS (separate read/write models), event sourcing framework, DI container, per-aggregate event buses, snapshot strategy.

---

## Event Ownership (ADR-005)

Every event in `EventTypeEnum` has exactly one owning bounded context:

**SSO-owned events (producer: UI/SSO):** `AppOpen`, `IntentSet`, `SessionEnd`, `FirstActionStarted`, `Replan`, `IntentResponse`, `RetrievalVerified`, `RetrievalScheduled`, `RetrievalSkipped`, `VerificationCompleted`, `FlowSelected`, `IdentityMomentShown`, `ViewComposed`

**AdaptiveCoaching-owned events (producer: P1/P2/P3):** `SessionIntentIssued`, `ActivationPlanIssued`, `VerificationDecisionIssued`, `ScheduleMissed`

**StrategicAdjustment-owned:** `StrategicAdjustmentDecision`

Both SSO and AC append to the shared Ledger. Ledger owns schema and idempotency.

---

## Test Strategy

| Layer | Test type | Rule |
|-------|-----------|------|
| `src/ei/domain/` | Unit, no mocks | Pure; test invariants by attempting violations |
| `src/ei/application/` | Unit, in-memory fakes | Implement port interfaces as fakes — never mock domain |
| `src/ei/infrastructure/` | Integration, real DB | Never mock Postgres |
