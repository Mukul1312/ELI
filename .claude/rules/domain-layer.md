---
paths:
  - "src/ei/domain/**"
---

# Domain Layer — Purity Rules

Full spec: `docs/engineering-ddd-design/tactical/01-ei-tactical-conventions.md` §3–§7

## The One Rule

`domain/` imports NOTHING outside itself. No `db/`, `mastra/`, `schemas/`, `infrastructure/`, `application/`. Zero external I/O.

**Validate yourself:** "Can I run this logic in a test with no DB and no HTTP?" If no — it doesn't belong in domain/.

## No Timestamps from System

- NEVER call `Date.now()` or `new Date()` inside domain files
- "Now" is a parameter passed in by the application layer (via `IClockPort` from `src/ei/application/shared/port-clock.ts`)
- ISO 8601 strings at port boundaries; `Date` objects only inside domain logic

## Value Objects (VO Rules)

- **Immutable** — no setters after construction; `private constructor`, `static create()` factory
- **Equality by value** — all attributes; implement `.equals(other)`
- **Self-validating** — throw `DomainError` from `domain/shared/errors.ts` on invalid input in `create()`
- **No side effects** — VOs never call I/O; they derive and validate

Key VOs in this project:
- `DeclaredIntent` (`study-session/value-objects/declared-intent.ts`) — data integrity only, no ELI rules
- `NegotiatedIntent` (`study-session/value-objects/negotiated-intent.ts`) — all ELI business rules (scope, mode, verificationFloor, constraints)
- `LoopHealthSnapshot` (`loop-health/loop-health-snapshot.ts`) — Published Language VO; thresholds live HERE ONLY

## Entities

- Has unique identity that persists across state changes
- Equality by identity (not by attributes)
- Contains behavior (methods enforcing invariants) — NOT just a data bag
- Anemic entities (data bags with logic in services) are an anti-pattern

## Aggregate Root Rules

- **Single entry point** — all modifications go through the aggregate root, never child entities directly
- **Reference other aggregates by ID only** — never hold a direct object reference to another aggregate
- **One aggregate per transaction** — cross-aggregate consistency via domain events (eventual consistency)
- After each command: call `.pullDomainEvents()` — the application layer persists them

### StudySession (Command Handler) — lifecycle

```
negotiating → activating → active → verifying → closed
```

Commands: `open()`, `issueNegotiatedIntent()`, `issueDeclaredIntent()`, `issueActivationPlan()`, `issueVerificationDecision()`, `close()`

### TopicLoop & StudentAggregates (Projection Aggregates)

- State derived entirely from Ledger events; idempotent recompute always valid
- **GREATEST semantics** — timestamps NEVER regress (monotonic update only)
- No command methods; projection logic only

### StudentPolicy (Hybrid Aggregate)

- Projection-derived state + single writer: Strategic Adjustment only
- SA appends `StrategicAdjustmentDecision` to Ledger; Projections persist to `ei_student_policy`

## LoopHealth Domain Service (`loop-health/assess-loop-health.ts`)

- **Stateless** — no identity, no persistence, no I/O
- **Deterministic** — same inputs always produce same output; no randomness
- **Single interpretation authority** — owns ALL label thresholds and precedence rules
- Do NOT replicate threshold logic anywhere else

## Error Rule

All domain errors MUST extend `DomainError` from `src/ei/domain/shared/errors.ts`.

Application errors (command shape, preconditions) are NOT domain errors — use `ApplicationError`.

## Anti-Patterns to Avoid

| Anti-Pattern | Fix |
|---|---|
| Anemic domain model (data bag + logic in services) | Move behavior INTO aggregates/entities |
| Domain importing DB or HTTP libs | Zero external deps |
| `Date.now()` in domain logic | Pass timestamp as parameter |
| Logic checking thresholds outside LoopHealth | All thresholds live in `loop-health/` |
| Cross-aggregate object references | Reference by ID only |
