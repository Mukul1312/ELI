---
paths:
  - "src/ei/application/**"
---

# Application Layer — Use Case Orchestration Rules

Full spec: `docs/engineering-ddd-design/tactical/01-ei-tactical-conventions.md` §4–§5, §9

## The Two Rules

1. **No direct DB access** — never import `pg-promise`, `@mastra/pg`, raw SQL, or DB clients. Use driven port interfaces.
2. **No domain logic** — handlers are thin orchestration; ALL business rules live in domain layer.

## Port Placement (Hexagonal)

**Driver ports (inbound)** — `{use-case}/port.ts`, named `I{Action}UseCase`
- Example: `run-p1-gate/port.ts` exports `IRunP1GateUseCase`
- The handler in `handler.ts` implements this interface

**Driven ports (outbound)** — what use cases need from the world:
- `domain/{aggregate}/repository.ts` → `I{Aggregate}Repository` (implemented by infrastructure)
- `application/shared/port-clock.ts` → `IClockPort` — inject "now"; NEVER call `Date.now()`
- `application/shared/port-append-event.ts` → `IAppendEventPort` — Ledger append
- `application/shared/port-event-stream-reader.ts` → `IEventStreamReader` — topic-scoped reads
- `application/shared/port-student-event-stream-reader.ts` → `IStudentEventStreamReader`
- `application/shared/port-topic-state-reader.ts` → `ITopicStateReader`
- `application/shared/port-query-events.ts` → `IQueryEventsPort`

**One repository per aggregate root** — never per DB table. Repository interfaces expose domain types only.

## Handler Pattern (follow this exactly)

```
1. Load signals via driven ports (aggregates, policy, event stream)
2. Invoke LoopHealth domain service if needed (via IAssessLoopHealthUseCase)
3. Reconstitute aggregate (from events or repo)
4. Call aggregate command method (enforces invariants, emits domain events)
5. Pull domain events via aggregate.pullDomainEvents()
6. Persist events via IAppendEventPort (with idempotency key)
7. Return output DTO
```

Never skip step 6. Never merge steps 2 and 4 (LoopHealth does not modify aggregates).

## Idempotency

Every Ledger append must use an idempotency key. Format: `{context}:{eventType}:{studentId}:{timestamp}`

For projections: idempotent by design (GREATEST semantics) — no key needed.
For command handlers: idempotency key or natural uniqueness (`couponId + userId`, `redemptionId`).

## Cross-Protocol Invariants (P1 → P3)

- P1 `verificationFloor` (from `NegotiatedIntent`) enforced by P3 handler
  - Read via `run-p3-gate/cross-protocol-read.ts` — only when `intentSource === 'negotiated'`
- P2 `watchOnly` constraint → overrides P3 Skip to `VerifyNow`

## Errors

Application errors MUST extend `ApplicationError`. Domain errors propagate up — catch and map to API responses at the boundary, not inside handlers.

Rule: Domain validates domain concepts. Application validates command shape/input boundaries.

## Use Case Map

| Use case | Handler |
|---|---|
| P1 gate (ELI path) | `run-p1-gate/handler.ts` |
| P1 gate (student-declared) | `run-declared-intent/handler.ts` |
| P2 gate | `run-p2-gate/handler.ts` |
| P3 gate | `run-p3-gate/handler.ts` |
| Loop health assessment | `assess-loop-health/handler.ts` |
| Topic loop projection | `apply-event-to-topic-loop/handler.ts` |
| Student aggregates recompute | `recompute-student-aggregates/handler.ts` |
| SA decision application | `apply-strategic-adjustment-decision/handler.ts` |
| Schedule missed emission | `emit-schedule-missed/handler.ts` |
| EI protocol routing | `ei-protocol-router/router.ts` |

## Concurrency Boundaries

| Aggregate | Writer | Conflict strategy |
|---|---|---|
| TopicLoop | Single projection job | GREATEST; ignore regressing events |
| StudentAggregates | Single projection job | Recompute from Ledger |
| StudentPolicy | SA only | Atomic replace |
| StudySession | Single session flow | Idempotency key per event |

## Anti-Patterns to Avoid

| Anti-Pattern | Fix |
|---|---|
| Handler importing from `mastra/` | Mastra calls use cases; use cases don't call Mastra |
| Business rules in handler | Move to domain aggregate/VO |
| Direct repo implementation import | Import the port interface only |
| `Date.now()` in handler | Use `IClockPort` |
| Skipping idempotency key on append | Always pass key on Ledger appends |
