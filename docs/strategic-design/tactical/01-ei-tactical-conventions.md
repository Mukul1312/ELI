# EI Tactical Conventions

> Shared implementation standards for the EI bounded-context family. Read this before reading or writing any aggregate tactical spec. All tactical specs under this folder follow these conventions.

---

## 1) Purpose

This document fixes the structural and behavioral standards that every EI aggregate implementation must follow. It prevents each aggregate spec from re-inventing rules that should be consistent across the codebase.

---

## 2) Strategic → Tactical Mapping

The 9 bounded contexts from [03-context-map.md](../03-context-map.md) map to modules as follows. Per the context map: *"Today: Bounded contexts are implemented as modules within a monolith."*

| Module (folder) | Bounded contexts | Rationale |
|-----------------|------------------|-----------|
| `src/ei/` | EI Event Ledger, EI Projections, EI Runtime, LoopHealthAssessment, Strategic Adjustment | Shared db, schemas, engine |
| `src/cohort-access/` | CohortAccess | Separate when implemented |
| `src/billing/` | BillingEntitlements | Separate when implemented |
| `src/mastra/tools/` | Institute Radar, Ops & Observability | radar-store, event-store, replay tools |

**Within `src/ei/`, context-to-code placement:**

| Context | Code locations |
|---------|----------------|
| EI Event Ledger | `ei/db/` (queries), `mastra/tools/event-store.ts` (append) |
| EI Projections | `ei/domain/`, `ei/application/`, `ei/infrastructure/`, `mastra/tools/signal-compute.ts` |
| EI Runtime | `ei/engine/` (plays, protocol-runner), `app/api/ei/` |
| LoopHealthAssessment | `ei/domain/loop-health/`, `ei/application/assess-loop-health/` |
| Strategic Adjustment | `ei/engine/strategic-adjustment.ts`, `mastra/workflows/strategic-adjustment.ts`, `ei/application/apply-strategic-adjustment-decision/` |

**Folder structure (EI module):**

```
src/ei/
├── domain/         # Projections aggregates (TopicLoop, StudentAggregates, ...)
├── application/    # Projections use cases + SA apply-policy
├── infrastructure/ # Ledger read + Projections persistence
├── engine/         # Runtime + SA logic (LHA moved to domain/application)
├── db/             # Ledger + Projections tables/queries (existing)
└── schemas/        # Shared contracts (existing)
```

---

## 3) Layer-First Code Layout

Per the clean-ddd-hexagonal skill, code inside `src/ei/` is organized **layer-first**, with aggregate names as sub-folders within those layers.

```
src/ei/
├── domain/                          # Pure business logic — zero I/O
│   ├── shared/                      # Base classes reused across aggregates
│   │   ├── aggregate-root.ts        # Base AggregateRoot<ID>
│   │   ├── value-object.ts          # Base ValueObject<Props>
│   │   └── errors.ts                # DomainError base
│   ├── topic-loop/                  # Per aggregate
│   │   ├── topic-loop.ts            # Aggregate root
│   │   ├── value-objects.ts         # TopicLoopId, state VOs
│   │   ├── repository.ts            # ITopicLoopRepository (driven port)
│   │   └── errors.ts                # Aggregate-specific errors
│   ├── student-policy/
│   ├── student-aggregates/
│   ├── loop-health/                 # Domain service (stateless)
│   │   ├── loop-health-snapshot.ts  # LoopHealthSnapshot, LoopHealthEvidence types
│   │   ├── assess-loop-health.ts    # Pure classification logic (or wraps engine/classify during migration)
│   │   └── errors.ts                # Domain errors if any
│   └── ...
├── application/                     # Use cases — orchestrates domain + ports
│   ├── shared/
│   │   └── errors.ts                # ApplicationError base
│   ├── apply-event-to-topic-loop/   # Per use case
│   │   ├── command.ts               # Input DTO
│   │   ├── handler.ts               # Use case implementation
│   │   └── port.ts                  # Driver port interface
│   ├── apply-strategic-adjustment-decision/
│   ├── assess-loop-health/         # LHA use case
│   │   ├── command.ts               # AssessLoopHealthCommand
│   │   ├── handler.ts               # AssessLoopHealthHandler
│   │   └── port.ts                  # IAssessLoopHealthUseCase (driver), IGetStudentSignalsPort (driven)
│   └── ...
└── infrastructure/                  # Adapters — DB, framework, external
    ├── persistence/
    │   ├── mappers/                 # Domain ↔ DB row mappings
    │   └── *.pg.ts                  # Postgres repository adapters
    └── projector/
        └── *.ts                     # Replay / recompute entrypoints
```

---

## 4) The Dependency Rule

Dependencies point **inward only**:

```
Infrastructure → Application → Domain
```

**Strict rules:**
- `domain/` imports nothing outside itself. No `db/`, `mastra/`, `schemas/`, or `infrastructure/` imports.
- `application/` imports only `domain/`. No `db/`, `mastra/`, or `infrastructure/` imports.
- `infrastructure/` may import `domain/`, `application/`, `db/queries.ts`, and `runtime/db.ts`.

**Violations to catch:**
- Domain importing a database library (breaks purity).
- Application calling a repository implementation directly (bypasses the port).
- A use-case handler importing from `mastra/` (leaks infra into application).

---

## 5) Port Placement Rules

**Driver vs Driven (Hexagonal terminology):**

- **Driver (inbound):** How the outside world invokes the application. Interface in `application/{use-case}/port.ts` as `I{Action}UseCase`. Implemented by the handler.
- **Driven (outbound):** What the use case needs from external systems. Implemented by infrastructure. Application *calls* these interfaces.

| Port type | Direction | Location | Naming | Who implements |
|-----------|-----------|----------|--------|----------------|
| Use-case | Driver | `application/{use-case}/port.ts` | `I{Action}UseCase` | Application (handler) |
| AssessLoopHealth (LHA) | Driver | `application/assess-loop-health/port.ts` | `IAssessLoopHealthUseCase` | Application (handler) |
| Repository | Driven | `domain/{aggregate}/repository.ts` | `I{Aggregate}Repository` | Infrastructure |
| Event stream reader | Driven | `application/shared/` or `infrastructure/` | `I{Aggregate}EventStreamReader` | Infrastructure |
| GetStudentSignalsPort (LHA) | Driven | `application/assess-loop-health/port.ts` or `application/shared/` | `IGetStudentSignalsPort` | Infrastructure |

**EventStreamReader (projections):** The conceptual "event stream reader" for projections is implemented as two driven ports: **IEventStreamReader** (topic-scoped: `readEventsForTopic(studentId, topicId)`, used by the TopicLoop projector) in `application/shared/port-event-stream-reader.ts`, and **IStudentEventStreamReader** (student-scoped: `readEventsForStudentInWindow`, `readLatestEvent`, used by RecomputeStudentAggregates) in `application/shared/port-student-event-stream-reader.ts`. **ITopicStateReader** (student-scoped topic state for StudentAggregates recompute) lives in `application/shared/port-topic-state-reader.ts`.

**AssessLoopHealth driver port:** Callers (Runtime, SA, Radar) invoke AssessLoopHealth by depending on `IAssessLoopHealthUseCase`, defined in `application/assess-loop-health/port.ts`. The interface exposes the single entry point for loop health assessment; the handler implements it and uses `IGetStudentSignalsPort` (driven) to fetch signals.

**Key rules:**
- One repository per aggregate — not per table.
- Repository interfaces contain only domain concepts (`TopicLoop`, `TopicLoopId`), never DB row types.
- Do not add query methods that expose raw DB concerns (SQL, ORMs) to the repository interface.
- A use-case folder may define both a driver port (how it is invoked) and driven ports (what it needs). Driver port is primary; driven ports are dependencies.

---

## 6) Aggregate Types in EI

EI aggregates fall into three types. The type determines command vs. event application semantics.

| Type | Description | Examples |
|------|-------------|---------|
| **Projection** | Reacts to Ledger events; state derived; idempotent recompute | TopicLoop, StudentAggregates |
| **Command Handler** | Receives commands; enforces business rules; writes state; may invoke downstream | StudentMembership, Coupon, Redemption |
| **Hybrid** | Projection-derived state + command interpretation from SA | StudentPolicy |

| Type | Event semantics | Idempotency | Typical driven ports |
|------|-----------------|-------------|----------------------|
| **Projection** | Consumes Ledger only; no emitted events | GREATEST / recompute; naturally idempotent | Repository, EventStreamReader, Clock |
| **Command Handler** | Receives commands; may emit events | Idempotency key or natural uniqueness | Repository |
| **Hybrid** | Consumes SA events from Ledger; SA appends; Projections persist | Last-write-wins; projector can replay from Ledger | Repository, EventStreamReader (for replay) |

StudentPolicy is Hybrid: Strategic Adjustment appends StrategicAdjustmentDecision to Ledger; Projections consume and persist to ei_student_policy. StudentAggregates is Projection: state derived from Ledger; no commands.

---

## 7) Value Objects and Entities

**Value Object rules (from skill):**
- Immutable — no setters after construction.
- Equality by value (all attributes), not identity.
- Self-validating on construction; throw `DomainError` on invalid input.
- Examples in EI: `TopicLoopId`, `TopicLoopState`, `CouponCode`, `RedemptionId`.

**Entity rules:**
- Has a unique identity that persists across state changes.
- Equality by identity, not by attribute values.
- Contains behavior (methods that enforce invariants), not just data.

**Aggregate root rules:**
- Single entry point for all modifications to the aggregate.
- References to other aggregates by ID only (never by direct object reference).
- One aggregate per transaction.

---

## 7b) Error placement — Domain vs Application

- **Domain errors:** Thrown by domain layer (aggregates, value objects, domain services). Extend `DomainError` from `domain/shared/errors.ts`. Examples: `MissingStudentIdError`, `InvalidTightnessLevelError`, `UnknownEventTypeError`. Use for invariants and invalid domain state.
- **Application errors:** Thrown when orchestration fails (invalid command shape, preconditions before domain is invoked). Place in `application/shared/errors.ts` (add `ApplicationError` base when needed). Use for use-case boundary validation that does not belong in domain.
- **Rule:** Domain validates its own concepts; application validates command/input shape and passes validated data to domain. Handlers may catch domain errors and rethrow or map to API responses.

---

## 8) Time Semantics and Monotonic Update Policy

- All timestamps are **ISO 8601 strings** at the API/port boundary; converted to `Date` objects inside domain logic.
- **Projection aggregates** (TopicLoop, StudentAggregates) use **GREATEST / max semantics**: a timestamp field never moves backward. Applying an event with an older timestamp is a no-op for that field.
- **Command-handler aggregates** (Coupon, Redemption, StudentMembership) do not apply GREATEST; they enforce preconditions before state transitions.
- "Now" for derived events (e.g. ScheduleMissed detection) is supplied via a `Clock` port (interface), not `Date.now()` directly inside domain logic.

---

## 9) Idempotency Rules

- Every write path must tolerate retries without side effects.
- For **projections**: idempotent by design (GREATEST semantics, same event applied twice → same state).
- For **command handlers**: idempotency key or natural uniqueness constraint (`couponId + userId`, `redemptionId`) must be enforced at the aggregate boundary.
- Idempotency keys are checked in the application use-case handler before invoking domain logic.
- **Ledger append:** When the application appends events (e.g. StrategicAdjustmentDecision), use an idempotency key to prevent duplicate rows on retries. See [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md) Event ledger invariants.

---

## 10) Event Naming and Contract Handling

- Consumed event names come from `src/ei/schemas/events.ts` (`EventTypeEnum`). Do not invent new names.
- Domain layer receives events as plain `Record<string, unknown>` payloads. Field mapping (from schema to domain fields) happens in the **adapter or use-case handler** — not in domain logic.
- Domain-produced events (emitted by command-handler aggregates) are named in **past tense** (`MembershipChanged`, `RedemptionCreated`).
- Projection aggregates (TopicLoop, StudentAggregates) do **not** emit new domain events; they update state tables only.

---

## 11) Consistency and Concurrency Boundaries

| Aggregate | Consistency boundary | Writer | Conflict strategy |
|-----------|---------------------|--------|-------------------|
| TopicLoop | (studentId, topicId) | Single projection job | GREATEST; ignore regressing events |
| StudentAggregates | studentId | Single projection job | Recompute from Ledger |
| StudentPolicy | studentId | SA only | Atomic replace; single writer |
| StudentMembership | studentId | Admin / BillingEntitlements | Atomic join; idempotency key |
| Coupon | couponId | Admin / campaign | Atomic validation + usage increment |
| Redemption | redemptionId or (couponId + userId) | Single writer per redemption | Idempotency key; reject duplicate |

---

## 12) DDD-Lite Guardrails (What to Defer)

**Do now:**
- Pure domain aggregate roots with `applyEvent` or `handleCommand` methods.
- Repository interfaces in domain.
- Thin Postgres adapters in infrastructure.
- Use-case handlers in application.
- Spec tests for invariants and scenario tables.

**Defer until proven needed:**
- Full CQRS (separate read/write models) — start with simple read/write.
- Event sourcing framework — current approach is projection + state table.
- DI container — manual constructor injection is sufficient.
- Per-aggregate event buses or saga orchestrators.
- Snapshot strategy — open question per aggregate; document but do not implement yet.

---

## 13) Test Strategy per Layer

| Layer | Test type | Mocks needed | Key assertions |
|-------|-----------|-------------|----------------|
| Domain | Unit | None (pure) | Invariants, state transitions, error cases |
| Application | Unit | In-memory repository (fake) | Use-case orchestration, idempotency, error handling |
| Infrastructure | Integration | Real DB (test instance) | DB mapping correctness, upsert semantics |

**Test file locations:**
```
src/ei/tests/
├── unit/
│   ├── domain/{aggregate}/
│   └── application/{use-case}/
└── infrastructure/
    └── persistence/
```

---

## References

- Strategic index: [00-index.md](../00-index.md)
- Tactical index: [00-index.md](00-index.md)
- Cross-cutting concerns: [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- Aggregate canvases: [aggregates/00-index.md](../aggregates/00-index.md)
- Clean DDD skill: `.agents/skills/clean-ddd-hexagonal/SKILL.md`
