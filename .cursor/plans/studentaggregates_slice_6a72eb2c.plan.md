---
name: StudentAggregates slice
overview: Implement StudentAggregates as an EI Projections projection aggregate (domain + application use case + Postgres adapters + projector), aligned to the StudentAggregates tactical spec. Preserve current callers by refactoring computeAggregatesTool to delegate to the use case while keeping its input/output contract unchanged.
todos:
  - id: sa-domain
    content: "Create domain/student-aggregates: id VO, aggregate recompute logic, repository port, errors"
    status: completed
  - id: sa-app-ports
    content: "Add application/shared ports: student event stream reader + topic state reader (reuse existing IClock)"
    status: completed
  - id: sa-usecase
    content: "Add application/recompute-student-aggregates: command, port, handler (inject repo/readers/clock)"
    status: completed
  - id: sa-infra-adapters
    content: Add infrastructure persistence adapters + mapper for ei_student_aggregates, plus event/topic readers
    status: completed
  - id: sa-projector
    content: Add infrastructure projector recomputeStudentAggregates(db, studentId, now?) entrypoint
    status: completed
  - id: sa-wire-tool
    content: Refactor computeAggregatesTool to call RecomputeStudentAggregates handler (preserve contract)
    status: completed
  - id: sa-tests
    content: Add unit tests for domain recompute and application handler; optional PG integration test
    status: completed
isProject: false
---

# StudentAggregates implementation plan (EI Projections)

## Goals (from EI Projections canvas + tactical spec)

- Implement **StudentAggregates** (projection aggregate, id = `studentId`) inside `src/ei/` using the **layer-first** structure from [docs/engineering-ddd-design/tactical/01-ei-tactical-conventions.md](docs/engineering-ddd-design/tactical/01-ei-tactical-conventions.md).
- Make StudentAggregates **replaceable/recomputable** from the ledger + topic state (invariant from [docs/engineering-ddd-design/05-cross-cutting-concerns.md](docs/engineering-ddd-design/05-cross-cutting-concerns.md)).
- Keep existing runtime/tool entrypoints working:
  - `computeAggregatesTool` in [src/mastra/tools/signal-compute.ts](src/mastra/tools/signal-compute.ts)
  - callers in [src/ei/protocol-runner.ts](src/ei/protocol-runner.ts) and [src/app/api/ei/aggregates/route.ts](src/app/api/ei/aggregates/route.ts)

## Reference sources (business + tactical)

- Bounded context: [docs/engineering-ddd-design/canvas-ei-projections.md](docs/engineering-ddd-design/canvas-ei-projections.md)
- Aggregate canvas: [docs/engineering-ddd-design/aggregates/agg-student-aggregates.md](docs/engineering-ddd-design/aggregates/agg-student-aggregates.md)
- Tactical spec: [docs/engineering-ddd-design/tactical/student-aggregates-tactical-spec.md](docs/engineering-ddd-design/tactical/student-aggregates-tactical-spec.md)
- Current implementation to migrate: [src/mastra/tools/signal-compute.ts](src/mastra/tools/signal-compute.ts)

## Target code layout (inside `src/ei/`)

- Domain (pure): `src/ei/domain/student-aggregates/`
- Application (use case): `src/ei/application/recompute-student-aggregates/`
- Application ports (shared): `src/ei/application/shared/`
- Infrastructure adapters:
  - persistence: `src/ei/infrastructure/persistence/`
  - projector: `src/ei/infrastructure/projector/`

## Step-by-step plan

### 1) Domain: StudentAggregates aggregate + repository port

Add `src/ei/domain/student-aggregates/`:

- `value-objects.ts`
  - `StudentAggregatesId` (VO: `{ studentId: string }`)
- `student-aggregates.ts`
  - `StudentAggregates` aggregate root holding the metrics from the spec:
    - `pendingChecks`, `openLoops`, `verificationRate7d`, `scheduleMisses7d`, `avoidantExits7d`, `skipCount7d`, `silenceDays`, `startLatencyMinMedian7d`, `intentAcceptanceRate7d`, `replanLoopCount7d`, `stateTrend7d`, `loopLatencyTrend`
  - a **single recompute factory** that is order-independent and clamps rates/counts per spec:
    - input: `{ now: Date; sevenDaysAgo: Date; graceMs: number; events: DomainEventSnapshot[]; topicStates: TopicStateSnapshot[] }`
    - output: a fully-populated aggregate (full replace semantics)
- `repository.ts`
  - `IStudentAggregatesRepository` with `findById(id)` and `save(aggregate)`
- `errors.ts`
  - domain errors for invalid studentId / invalid metrics (minimal)

Notes:

- Keep domain inputs as plain domain snapshots (no DB row types).
- Implement spec invariants: replaceability, non-negative counts, rate clamping to [0,1], consistent rolling window based on a single `now`.

### 2) Application: ports needed by the use case

Add ports per [student-aggregates-tactical-spec.md](docs/engineering-ddd-design/tactical/student-aggregates-tactical-spec.md) §7:

- `src/ei/application/shared/port-student-event-stream-reader.ts`
  - `readEventsForStudentInWindow(studentId, since, until?)` returning snapshots including:
    - `eventType`, `occurredAt`, `topicId`, `payload`
- `src/ei/application/shared/port-topic-state-reader.ts`
  - `getAllTopicStates(studentId)` returning domain snapshots:
    - `topicId`, `lastEffortAt`, `lastRetrievalAt`, `lastScheduledDueAt`
- Use existing clock port you already have:
  - `src/ei/application/shared/port-clock.ts` (`IClock`)

### 3) Application: RecomputeStudentAggregates use case

Add `src/ei/application/recompute-student-aggregates/`:

- `command.ts`
  - `{ studentId: string; now?: Date }` (matches tactical spec §8)
- `port.ts`
  - `IRecomputeStudentAggregatesUseCase` with `execute(command)`
- `handler.ts`
  - constructor injects:
    - `IStudentAggregatesRepository`
    - `IStudentEventStreamReader`
    - `ITopicStateReader`
    - `IClock`
  - execution flow:
    - resolve `now = command.now ?? clock.now()`
    - compute `sevenDaysAgo = now - 7d`
    - read events in window via event-stream reader
    - read topic states via topic-state reader
    - call domain recompute factory
    - persist via repository (atomic replace)
    - return computed metrics (same shape as the tool output)

### 4) Infrastructure: Postgres adapters + mappers

Add infrastructure under `src/ei/infrastructure/persistence/`:

- `mappers/student-aggregates-mapper.ts`
  - map DB `AggregatesRow` (from [src/ei/db/queries.ts](src/ei/db/queries.ts)) to/from domain aggregate
- `student-aggregates-repository.pg.ts`
  - implements `IStudentAggregatesRepository` using `getAggregates` / `upsertAggregates`
- `topic-state-reader.pg.ts`
  - implements `ITopicStateReader` using `getAllTopicStates`
- `student-event-stream-reader.pg.ts`
  - implements `IStudentEventStreamReader` using `queryEvents(db, studentId, { since, until })`

Clock wiring:

- Use your existing `getClock(context)` from [src/ei/runtime/clock.ts](src/ei/runtime/clock.ts) when assembling the use case inside a tool/projector.

### 5) Infrastructure: projector entrypoint

Add `src/ei/infrastructure/projector/student-aggregates-projector.ts`:

- `recomputeStudentAggregates(db, studentId, now?)`
  - constructs Postgres adapters + handler
  - calls handler.execute
  - this is the canonical repair/backfill path, consistent with replaceability invariant

### 6) Wire into existing driver (`computeAggregatesTool`)

Refactor [src/mastra/tools/signal-compute.ts](src/mastra/tools/signal-compute.ts):

- Preserve **inputSchema/outputSchema** of `computeAggregatesTool` exactly.
- Replace the inlined recompute logic with:
  - assemble Postgres adapters using `getEiDb(context)`
  - assemble clock using `getClock(context)`
  - call `RecomputeStudentAggregatesHandler.execute({ studentId })`
  - return its result

This keeps all current callers working:

- [src/ei/protocol-runner.ts](src/ei/protocol-runner.ts)
- [src/app/api/ei/aggregates/route.ts](src/app/api/ei/aggregates/route.ts)

### 7) Tests (skill test pyramid)

- Domain unit tests (pure): `src/ei/tests/unit/domain/student-aggregates/student-aggregates.test.ts`
  - cover the scenario table in tactical spec §10 (no events, simple session+verification, overdue schedule, silence detection, rate clamping, idempotency)
  - use fixed `now` and fixed inputs
- Application unit tests: `src/ei/tests/unit/application/recompute-student-aggregates/handler.test.ts`
  - in-memory implementations of:
    - `IStudentAggregatesRepository`
    - `IStudentEventStreamReader`
    - `ITopicStateReader`
    - `IClock` (fixed)
  - assert orchestration and returned metrics
- Optional infrastructure integration test (real DB): `src/ei/tests/infrastructure/persistence/student-aggregates-repository.pg.test.ts`
  - same pattern as your TopicLoop PG integration test: skip if `DATABASE_URL` missing

## Notes / scope control (DDD-lite)

- No DI container: manual construction inside tool/projector is fine (consistent with DDD-lite guardrails in tactical conventions).
- Do not implement ScheduleMissed event emission here; StudentAggregates can continue computing `openLoops` / `scheduleMisses7d` from topic state + clock as the current tool does.
- Keep `loopLatencyTrend` as `null` for now (spec notes it as deferred).

## Files expected to be touched/added

- Add:
  - `src/ei/domain/student-aggregates/`*
  - `src/ei/application/shared/port-student-event-stream-reader.ts`
  - `src/ei/application/shared/port-topic-state-reader.ts`
  - `src/ei/application/recompute-student-aggregates/`*
  - `src/ei/infrastructure/persistence/mappers/student-aggregates-mapper.ts`
  - `src/ei/infrastructure/persistence/student-aggregates-repository.pg.ts`
  - `src/ei/infrastructure/persistence/topic-state-reader.pg.ts`
  - `src/ei/infrastructure/persistence/student-event-stream-reader.pg.ts`
  - `src/ei/infrastructure/projector/student-aggregates-projector.ts`
  - tests under `src/ei/tests/unit/...`
- Update:
  - `src/mastra/tools/signal-compute.ts` (delegate to use case)

