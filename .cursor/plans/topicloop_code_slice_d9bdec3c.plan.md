---
name: topicloop code slice
overview: Implement TopicLoop as an incremental DDD/hexagonal slice inside `src/ei`, using the correct layer-first structure (domain → application → infrastructure) as specified by the clean-ddd-hexagonal skill, with all missing building blocks added.
todos:
  - id: domain-shared
    content: "Create domain/shared base classes: AggregateRoot, ValueObject, DomainError"
    status: completed
  - id: topicloop-domain
    content: "Create domain/topic-loop: value-objects (TopicLoopId, TopicLoopState), aggregate root with applyEvent invariants, errors"
    status: completed
  - id: topicloop-repo-port
    content: Create domain/topic-loop/repository.ts driven port interface (ITopicLoopRepository)
    status: completed
  - id: topicloop-event-stream-port
    content: Create IEventStreamReader port and ensure PostgresEventStreamReader returns ASC-ordered events
    status: completed
  - id: topicloop-usecase
    content: "Create application/apply-event-to-topic-loop: command DTO, driver port interface, handler"
    status: completed
  - id: topicloop-pg-adapters
    content: "Create infrastructure/persistence: topic-loop-mapper, PostgresTopicLoopRepository, PostgresEventStreamReader"
    status: completed
  - id: topicloop-projector
    content: Create infrastructure/projector/topic-loop-projector.ts (replay/recompute entrypoint)
    status: completed
  - id: integrate-append-event
    content: Update appendEventTool in event-store.ts to call ApplyEventToTopicLoopHandler instead of inline switch
    status: completed
  - id: topicloop-tests
    content: Add unit/domain and unit/application tests following skill test pyramid (no mocks in domain, InMemory repo in application)
    status: completed
isProject: false
---

# TopicLoop Incremental Implementation Plan (Skill-Aligned)

## Layer-first structure (from skill)

All new code lives under `src/ei/` in layer folders. TopicLoop is an aggregate inside those layers, not a top-level folder. See [01-ei-tactical-conventions.md](docs/strategic-design/tactical/01-ei-tactical-conventions.md) §2 for the strategic→tactical mapping (9 contexts → 3–5 modules).

```
src/ei/
├── domain/                          ← NEW (pure, zero I/O)
│   ├── shared/
│   │   ├── aggregate-root.ts        ← Base AggregateRoot class
│   │   ├── value-object.ts          ← Base ValueObject class
│   │   └── errors.ts                ← DomainError base
│   └── topic-loop/                  ← TopicLoop aggregate
│       ├── topic-loop.ts            ← Aggregate root + applyEvent logic
│       ├── value-objects.ts         ← TopicLoopId, TopicLoopState (VO)
│       ├── events.ts                ← Event type constants only (no schema import); domain defines accepted event type strings
│       ├── repository.ts            ← ITopicLoopRepository (driven port, interface only)
│       └── errors.ts                ← TopicLoopErrors
├── application/                     ← NEW (orchestrates domain + ports)
│   ├── shared/
│   │   ├── errors.ts                ← ApplicationError base (optional until needed)
│   │   └── port-event-stream-reader.ts  ← IEventStreamReader (for projector)
│   └── apply-event-to-topic-loop/
│       ├── command.ts               ← ApplyEventCommand DTO (input)
│       ├── handler.ts               ← ApplyEventToTopicLoopHandler (use case)
│       └── port.ts                  ← IApplyEventToTopicLoopUseCase (driver port)
└── infrastructure/                  ← NEW (adapters, DB, framework)
    ├── persistence/
    │   ├── topic-loop-repository.pg.ts   ← PostgresTopicLoopRepository (implements ITopicLoopRepository)
    │   ├── event-stream-reader.pg.ts     ← PostgresEventStreamReader (for replay)
    │   └── mappers/
    │       └── topic-loop-mapper.ts      ← DB row ↔ domain TopicLoop mapping
    └── projector/
        └── topic-loop-projector.ts       ← Replay/recompute entrypoint
```

**Dependency rule:**

- `domain/` imports: only language primitives and other `domain/` types. Zero imports from `application/`, `infrastructure/`, `db/`, `mastra/`, `schemas/`.
- `application/` imports: only `domain/`. Zero imports from `infrastructure/`.
- `infrastructure/` imports: `domain/` and `application/` for interfaces; `db/queries.ts` and `runtime/db.ts` for DB.

## Tests (skill test pyramid)

```
src/ei/
└── tests/
    ├── unit/
    │   ├── domain/
    │   │   └── topic-loop/
    │   │       └── topic-loop.test.ts       ← Pure domain tests (no mocks)
    │   └── application/
    │       └── apply-event-to-topic-loop/
    │           └── handler.test.ts           ← Use-case tests (mock repo via InMemoryTopicLoopRepository)
    └── infrastructure/
        └── persistence/
            └── topic-loop-repository.pg.test.ts  ← Integration (real DB, optional now)
```

An `InMemoryTopicLoopRepository` lives alongside the application test as a test double implementing `ITopicLoopRepository`.

---

## Implementation steps (in skill order: domain → ports → use case → adapters → tests)

### Step 1 — Domain shared base classes

Create `src/ei/domain/shared/`:

- `value-object.ts`: base `ValueObject<Props>` with `equals()` by deep prop equality.
- `aggregate-root.ts`: base `AggregateRoot<ID>` (for TopicLoop; no internal domain events needed since TopicLoop is a projection).
- `errors.ts`: `DomainError` base class.

### Step 2 — TopicLoop aggregate root + value objects

Create `src/ei/domain/topic-loop/value-objects.ts`:

- `TopicLoopId`: value object with `{ studentId: string; topicId: string }`, with `equals()`.
- `TopicLoopState`: value object with `{ lastEffortAt: Date | null; lastRetrievalAt: Date | null; lastScheduledDueAt: Date | null }` and a `static empty()` factory.

Create `src/ei/domain/topic-loop/topic-loop.ts`:

- Class `TopicLoop` (aggregate root, identified by `TopicLoopId`).
- Pure `applyEvent(eventType, payload)` method enforcing all invariants from [topic-loop-tactical-spec.md](docs/strategic-design/tactical/topic-loop-tactical-spec.md):
  - `SessionEnd` → `lastEffortAt = max(current, endedAt)`
  - `RetrievalVerified` / `VerificationCompleted` → `lastRetrievalAt = max(current, verifiedAt/completedAt)`
  - `RetrievalScheduled` → `lastScheduledDueAt = max(current, dueAt)`
  - `RetrievalSkipped`, `ScheduleMissed` → no-op on timestamps.
  - Monotonicity enforced via `max` — never move backward.
- Static `reconstitute(id, state)` factory for rebuilding from persistence.
- Static `empty(id)` factory for new instances.
- **No imports from `db/`, `mastra/`, or `schemas/`**; event payload shape is plain `Record<string, unknown>`. Domain extracts timestamps from payload using an internal event-type → field-name map (e.g. SessionEnd → `endedAt`, RetrievalVerified → `verifiedAt`).

Create `src/ei/domain/topic-loop/errors.ts`:

- `MissingStudentIdError`, `MissingTopicIdError`, `UnknownEventTypeError`.

### Step 3 — Repository port (driven port, interface only)

Create `src/ei/domain/topic-loop/repository.ts`:

```typescript
export interface ITopicLoopRepository {
  findById(id: TopicLoopId): Promise<TopicLoop | null>;
  save(topicLoop: TopicLoop): Promise<void>;
}
```

Per skill: interface lives in domain, implementation in infrastructure. One repository per aggregate (not per table).

### Step 3.5 — EventStreamReader port (driven port, for projector)

Create `src/ei/application/shared/port-event-stream-reader.ts`:

```typescript
export interface IEventStreamReader {
  readEventsForTopic(studentId: string, topicId: string): Promise<Array<{ eventType: string; payload: Record<string, unknown>; occurredAt: Date }>>;
}
```

- Must return events in **ascending** `occurred_at` order for replay (chronological, oldest first).
- Projector depends on this port (injectable, testable with in-memory implementation).

### Step 4 — Application use case

Create `src/ei/application/apply-event-to-topic-loop/command.ts`:

```typescript
export interface ApplyEventCommand {
  studentId: string;
  topicId: string;
  eventType: string;
  payload: Record<string, unknown>;
}
```

Create `src/ei/application/apply-event-to-topic-loop/port.ts`:

```typescript
export interface IApplyEventToTopicLoopUseCase {
  execute(command: ApplyEventCommand): Promise<void>;
}
```

Create `src/ei/application/apply-event-to-topic-loop/handler.ts`:

- `ApplyEventToTopicLoopHandler` implements `IApplyEventToTopicLoopUseCase`.
- Receives `ITopicLoopRepository` via constructor (dependency injection).
- **Payload-to-domain mapping:** Handler maps payload fields to timestamps before calling domain: `endedAt` → last_effort_at, `verifiedAt`/`completedAt` → last_retrieval_at, `dueAt` → last_scheduled_due_at. Use payload field when present, else fallback to `occurredAt`.
- Orchestrates: load → `topicLoop.applyEvent(...)` → save.
- Returns void; idempotent (same event applied twice → same state due to domain max logic).
- No infrastructure imports — only `domain/` and `command.ts`/`port.ts`.

### Step 5 — Postgres adapters (infrastructure)

Create `src/ei/infrastructure/persistence/mappers/topic-loop-mapper.ts`:

- `toDomain(row: TopicStateRow): TopicLoop` — maps DB row to domain aggregate. **TopicLoop owns only three timestamp columns**; read only `last_effort_at`, `last_retrieval_at`, `last_scheduled_due_at`. Ignore `topic_step`, `tms`, `delta_decay` for TopicLoop state.
- `toPersistence(topicLoop: TopicLoop): Partial<TopicStateRow>` — maps domain to DB columns. Output **only the three timestamp fields** for partial upsert; do not overwrite other columns. Existing `upsertTopicState` supports partial updates.
- Uses existing `TopicStateRow` from `src/ei/db/queries.ts`.

Create `src/ei/infrastructure/persistence/topic-loop-repository.pg.ts`:

- `PostgresTopicLoopRepository implements ITopicLoopRepository`.
- `findById`: calls existing `getTopicState()` from `db/queries.ts`, maps with mapper.
- `save`: calls existing `upsertTopicState()` from `db/queries.ts`, maps with mapper.
- Accepts `EiDb` (from `runtime/db.ts`) via constructor.

Create `src/ei/infrastructure/persistence/event-stream-reader.pg.ts`:

- `PostgresEventStreamReader implements IEventStreamReader` (from Step 3.5).
- `readEventsForTopic(studentId, topicId)`: calls existing `queryEvents()` from `db/queries.ts`. **Returns events in ascending order** for replay (either add `order` param to `queryEvents` and use `ASC`, or reverse the array after querying — `queryEvents` currently returns `DESC`).

### Step 6 — Projection/replay entrypoint

Create `src/ei/infrastructure/projector/topic-loop-projector.ts`:

- `recomputeTopicLoop(db, studentId, topicId)`: reads all relevant events via `PostgresEventStreamReader`, applies them in order through `ApplyEventToTopicLoopHandler` using `PostgresTopicLoopRepository`.
- This is the canonical repair/rebuild path (replaceability invariant from tactical spec).

### Step 7 — Wire into existing runtime

Update `src/mastra/tools/event-store.ts` (`appendEventTool`):

- After `insertEvent`, for **all six** TopicLoop-relevant event types (`SessionEnd`, `RetrievalVerified`, `RetrievalScheduled`, `RetrievalSkipped`, `VerificationCompleted`, `ScheduleMissed`), call `ApplyEventToTopicLoopHandler.execute(command)` instead of the current inline `switch`. Domain no-ops for `RetrievalSkipped` and `ScheduleMissed` (no timestamp update).
- **Composition:** Inside `appendEventTool` execute, after `getEiDb(context)`, instantiate `PostgresTopicLoopRepository(db)`, then `ApplyEventToTopicLoopHandler(repo)`, then call `handler.execute(command)`. Future: move construction to `infrastructure/config/di` or a small bootstrap module.
- Construct `ApplyEventCommand` from the event payload already validated by Zod. Integration must pass **payload-derived timestamp** (e.g. `payload.endedAt`, `payload.verifiedAt`, `payload.dueAt`, `payload.completedAt`) with `occurredAt` fallback when payload field is missing.
- Preserve `appendEventTool` input/output contract exactly.

### Step 8 — Tests (skill test pyramid)

**Domain unit tests** (`topic-loop.test.ts`) — no mocks:

- Each scenario from tactical spec section 10: in-order, out-of-order, duplicate, stale timestamp, wrong topic no-op, boundary equality, `RetrievalSkipped` no-op.
- Call `topicLoop.applyEvent(...)` directly; assert state fields.

**Application tests** (`handler.test.ts`) — mock repo:

- `InMemoryTopicLoopRepository` (in-memory, implements `ITopicLoopRepository`).
- Test that handler loads, applies, saves; no-op on unknown event; idempotency across double-apply.

**Architecture guard** (optional, cheap): a simple import check that `domain/` files contain no imports of `db/`, `mastra/`, or `infrastructure/` paths.

---

## Open questions / Deferred

- **Clock port** for ScheduleMissed derivation — defer until ScheduleMissed flow is defined (tactical spec §11).
- **application/shared/errors.ts** — optional until needed; add `ApplicationError` base when handler needs to throw application-level validation errors.

## What the previous plan was missing (from skill)


| Missing element                                                               | Now added               |
| ----------------------------------------------------------------------------- | ----------------------- |
| Layer-first folder structure (`domain/` → `application/` → `infrastructure/`) | Yes — rewritten         |
| `shared/` base classes (`AggregateRoot`, `ValueObject`, `DomainError`)        | `domain/shared/` step 1 |
| Value objects for `TopicLoopId` and `TopicLoopState`                          | Step 2                  |
| Domain error types                                                            | Step 2                  |
| Driven port (`ITopicLoopRepository`) in domain layer (not application)        | Step 3                  |
| Driver port (`IApplyEventToTopicLoopUseCase`) in application layer            | Step 4                  |
| `command.ts` DTO separate from handler                                        | Step 4                  |
| Domain-to-DB mapper (`topic-loop-mapper.ts`)                                  | Step 5                  |
| `InMemoryTopicLoopRepository` test double for application tests               | Step 8                  |
| Test pyramid structure (`unit/domain/`, `unit/application/`)                  | Step 8                  |
| Dependency rule enforcement (domain imports zero I/O)                         | Throughout              |
| `IEventStreamReader` port for projector (ASC-ordered events)                  | Step 3.5                |


## Files touched summary


| File                                                                      | Action                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| `src/ei/domain/shared/value-object.ts`                                    | New                                               |
| `src/ei/domain/shared/aggregate-root.ts`                                  | New                                               |
| `src/ei/domain/shared/errors.ts`                                          | New                                               |
| `src/ei/domain/topic-loop/value-objects.ts`                               | New                                               |
| `src/ei/domain/topic-loop/topic-loop.ts`                                  | New                                               |
| `src/ei/domain/topic-loop/repository.ts`                                  | New                                               |
| `src/ei/domain/topic-loop/errors.ts`                                      | New                                               |
| `src/ei/application/shared/port-event-stream-reader.ts`                   | New                                               |
| `src/ei/application/apply-event-to-topic-loop/command.ts`                 | New                                               |
| `src/ei/application/apply-event-to-topic-loop/port.ts`                    | New                                               |
| `src/ei/application/apply-event-to-topic-loop/handler.ts`                 | New                                               |
| `src/ei/infrastructure/persistence/mappers/topic-loop-mapper.ts`          | New                                               |
| `src/ei/infrastructure/persistence/topic-loop-repository.pg.ts`           | New                                               |
| `src/ei/infrastructure/persistence/event-stream-reader.pg.ts`             | New                                               |
| `src/ei/infrastructure/projector/topic-loop-projector.ts`                 | New                                               |
| `src/mastra/tools/event-store.ts`                                         | Update (replace inline switch with use-case call) |
| `src/ei/tests/unit/domain/topic-loop/topic-loop.test.ts`                  | New                                               |
| `src/ei/tests/unit/application/apply-event-to-topic-loop/handler.test.ts` | New                                               |


