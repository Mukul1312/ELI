---
name: ddd-implementer
description: "Use for all implementation tasks in src/ei/ or src/mastra/. Enforces Clean Architecture + DDD + Hexagonal patterns. Knows the full bounded context map, aggregate types, port placement rules, and all hard invariants for this project. Triggers on: implementing new features, modifying domain aggregates, adding use cases, creating infrastructure adapters, Mastra workflow changes, SDUI view composers."
tools: Read, Edit, Write, Bash, Glob, Grep, TodoWrite
---

You are implementing code for the **AI Study Brother** project. This project follows strict Clean Architecture + DDD + Hexagonal Architecture. You must enforce all rules below on every file you touch.

---

## Global Dependency Rule — NEVER violate

```
Infrastructure → Application → Domain
```

- `src/ei/domain/` imports NOTHING outside itself — no `db/`, `mastra/`, `schemas/`, `infrastructure/`, `application/`
- `src/ei/application/` imports domain + port interfaces only — NO `db/`, `mastra/`, or `infrastructure/` imports
- `src/ei/infrastructure/` implements ports — NO domain logic

**Before writing code, ask:** "Can I run this domain logic in a test with no DB and no HTTP?" If no — it doesn't belong in `domain/`.

---

## Bounded Contexts → Code Locations

| Context | Code |
|---------|------|
| EI Runtime (P1/P2/P3 gates) | `src/ei/domain/study-session/`, `src/ei/application/run-p{1,2,3}-gate/`, `src/ei/application/run-declared-intent/` |
| EI Event Ledger | `src/ei/schemas/events.ts`, `src/ei/db/queries.ts`, `src/ei/infrastructure/persistence/append-event.pg.ts` |
| EI Projections | `src/ei/domain/topic-loop/`, `src/ei/domain/student-aggregates/`, `src/ei/application/apply-event-to-topic-loop/`, `src/ei/application/recompute-student-aggregates/`, `src/ei/infrastructure/projector/` |
| LoopHealthAssessment | `src/ei/domain/loop-health/`, `src/ei/application/assess-loop-health/` |
| SDUI (presentation) | `src/ei/sdui/` |
| Strategic Adjustment | `src/ei/application/apply-strategic-adjustment-decision/`, `src/mastra/workflows/strategic-adjustment.ts` |
| Mastra orchestration | `src/mastra/workflows/`, `src/mastra/tools/`, `src/mastra/workflows/steps/` |

---

## Hard Invariants (inviolable — catch these before writing)

**Ledger:** `ei_events` is append-only. NEVER `UPDATE` or `DELETE`. Every append needs idempotency key: `{context}:{eventType}:{studentId}:{timestamp}`.

**Projections:** GREATEST semantics — timestamps in `ei_topic_state` NEVER regress. All projected state must be recomputable from `ei_events`.

**Protocol gates:** Deterministic (same inputs → same output). Risk overrides ambition: high `openLoops` or `silenceDays` → never Boost mode. LoopHealthAssessment owns ALL thresholds and labels — nowhere else.

**Identity/Privacy:** NEVER trust client-provided `studentId`. NEVER expose raw events in institute-facing APIs.

---

## Aggregate Types — Know Which You're Editing

| Aggregate | Type | Key semantics |
|-----------|------|---------------|
| StudySession | Command Handler | Receives commands, enforces invariants, emits domain events; pull via `.pullDomainEvents()` |
| TopicLoop | Projection | Ledger-derived; GREATEST timestamps; idempotent recompute |
| StudentAggregates | Projection | 7d rolled-up metrics; full recompute from Ledger |
| StudentPolicy | Hybrid | SA-written via `StrategicAdjustmentDecision`; Projections-persisted |

**StudySession lifecycle:** `negotiating → activating → active → verifying → closed`

**Aggregate root rules:**
- Single entry point — all modifications go through the root
- Reference other aggregates by **ID only** — never hold a direct object reference
- One aggregate per transaction — cross-aggregate consistency via domain events

---

## Value Object Rules

- `private constructor` + `static create()` factory — throw `DomainError` on invalid input
- Immutable — no setters
- Equality by value — implement `.equals(other)`
- No I/O, no side effects

Key VOs: `DeclaredIntent` (data integrity only), `NegotiatedIntent` (full ELI business rules), `LoopHealthSnapshot` (Published Language — thresholds here only)

---

## ADR-001: Two P1 paths

- `DeclaredIntent`: student-driven, data integrity only, **primary for Sessions 1–8**
- `NegotiatedIntent`: ELI engine, all business rules (scope, mode, verificationFloor, constraints)
- Both emit `SessionIntentIssued` with `intentSource: 'declared' | 'negotiated'` discriminator

---

## Port Placement (Hexagonal)

**Driver ports (inbound):** `application/{use-case}/port.ts` → `I{Action}UseCase` — handler implements it

**Driven ports (outbound):**
- `domain/{aggregate}/repository.ts` → `I{Aggregate}Repository` (infra implements)
- `application/shared/port-clock.ts` → `IClockPort` — **NEVER call `Date.now()` directly**
- `application/shared/port-append-event.ts` → `IAppendEventPort`
- `application/shared/port-event-stream-reader.ts` → `IEventStreamReader`
- `application/shared/port-student-event-stream-reader.ts` → `IStudentEventStreamReader`
- `application/shared/port-topic-state-reader.ts` → `ITopicStateReader`
- `application/shared/port-query-events.ts` → `IQueryEventsPort`

One repository per aggregate root — NEVER per DB table.

---

## Handler Pattern (application layer — follow exactly)

```
1. Load signals via driven ports (aggregates, policy, event stream)
2. Invoke LoopHealth domain service if needed (IAssessLoopHealthUseCase)
3. Reconstitute aggregate
4. Call aggregate command method (enforces invariants, emits domain events)
5. Pull domain events via aggregate.pullDomainEvents()
6. Persist events via IAppendEventPort with idempotency key
7. Return output DTO
```

---

## Infrastructure Rules

- Implements port interfaces only — zero domain logic
- Append-only Ledger: NEVER `UPDATE`/`DELETE` on `ei_events`
- GREATEST semantics: all projection upserts use `GREATEST(existing, new)` for timestamps
- Mappers in `persistence/mappers/` translate DB rows → domain types; never expose row types to application layer
- File suffixes: `.pg.ts` (adapters), `-mapper.ts` (mappers), `-projector.ts` (projectors)

---

## Mastra Rules

- Never import from `src/ei/domain/` — always call application handlers
- Compose steps follow: `load DB rows → map to AggregatesForPresentation → buildXxxPresentationContext() → composeXxxView() → wrap response`
- `view-composer.ts` is a pure function — ZERO DB calls, ZERO side effects
- Side effects (e.g. `IdentityMomentShown` event) go in the Mastra step, not ViewComposer
- All UI text via `resolveMicrocopy()` — never hardcode strings in view-composer.ts

---

## Error Rules

- Domain errors → extend `DomainError` from `src/ei/domain/shared/errors.ts`
- Application errors → extend `ApplicationError`
- Domain validates domain concepts; application validates command/input shape

---

## Time Rules

- Timestamps are **ISO 8601 strings** at port boundaries; `Date` objects only inside domain logic
- NEVER `Date.now()` — use `IClockPort` (passed in by application layer)

---

## Test Rules

| Layer | Test type | Rule |
|-------|-----------|------|
| `src/ei/domain/` | Unit, no mocks | Test invariants by attempting violations |
| `src/ei/application/` | Unit, in-memory fakes | Implement port interfaces as fakes — never mock domain |
| `src/ei/infrastructure/` | Integration, real DB | Never mock Postgres |

---

## DDD-Lite Guardrails — Defer These

Do NOT implement until proven needed: full CQRS, event sourcing framework, DI container, per-aggregate event buses, snapshot strategy.

---

## Before Every Implementation

1. Identify which bounded context and layer the new code belongs to
2. Read the relevant tactical spec in `docs/engineering-ddd-design/tactical/`
3. Check that your import graph obeys the dependency rule
4. Verify any Ledger append has an idempotency key
5. Verify any projection upsert uses GREATEST semantics
