---
paths:
  - "src/ei/infrastructure/**"
---

# Infrastructure Layer — Adapter Rules

Full spec: `docs/engineering-ddd-design/tactical/01-ei-tactical-conventions.md` §3–§4

## The Two Rules

1. **Implements ports only** — every file here implements one or more port interfaces from `domain/` or `application/shared/`
2. **Zero domain logic** — no business rules, no invariant checks; delegate ALL logic to the domain layer

## Ledger is Append-Only — Forever

NEVER run `UPDATE` or `DELETE` on `ei_events`. Ever. This is an irreversible architectural invariant.

`ei_idempotency_keys` table prevents duplicate appends on retry — use the CTE pattern from `src/ei/db/queries.ts` `insertEvent()`.

## GREATEST Semantics on All Projection Upserts

All upserts to `ei_topic_state` and `ei_student_aggregates` MUST use `GREATEST(existing_value, new_value)` for timestamp columns. Timestamps must never regress. A smaller timestamp from a late-arriving event is a no-op for that field.

## File Naming Conventions

| What | Suffix | Example |
|---|---|---|
| Repository adapter | `.pg.ts` | `topic-loop-repository.pg.ts` |
| Event stream adapter | `.pg.ts` | `event-stream-reader.pg.ts` |
| Row → domain mapper | `-mapper.ts` | `mappers/topic-loop-mapper.ts` |
| Projector entrypoint | `-projector.ts` | `projector/topic-loop-projector.ts` |

## Table Ownership

| Table | Owner context | Rule |
|---|---|---|
| `ei_events` | EI Event Ledger | Append-only; idempotency key always required |
| `ei_idempotency_keys` | EI Event Ledger | Written via CTE alongside event insert |
| `ei_topic_state` | EI Projections | TopicLoop projected state; GREATEST timestamps |
| `ei_student_aggregates` | EI Projections | 7d metrics; full recompute, atomic replace |
| `ei_student_policy` | EI Projections | SA-written dials/constraints; atomic replace |
| `ei_radar_alerts` | Institute Radar | Privacy boundary — aggregated metrics ONLY, never raw events |

## Mapper Rules

- Mappers in `persistence/mappers/` translate DB row types → domain value objects
- NEVER expose raw DB row types (`StoredEventRow`, etc.) to the application layer
- Mappers are pure functions: `(row) → DomainType`
- Type: `import type { StoredEventRow }` stays in infrastructure — application sees domain types only

## Projectors

Projector files in `infrastructure/projector/` are entrypoints for replay/recompute jobs. They:
- Read from `IEventStreamReader` / `IStudentEventStreamReader` ports
- Call the corresponding application use-case handler
- Do NOT contain projection logic directly

## Tests

Infrastructure tests MUST use a real Postgres instance. Never mock the DB in infrastructure tests — mock/prod divergence has caused missed migration failures before.

## Anti-Patterns to Avoid

| Anti-Pattern | Fix |
|---|---|
| Business logic in repository adapter | Implement port interface only; logic lives in domain |
| Exposing DB row types to application layer | Use mappers to translate to domain types |
| UPDATE or DELETE on `ei_events` | Append-only, always |
| Projection upsert without GREATEST | Always GREATEST for timestamp columns |
| Skipping idempotency CTE on insert | Use `insertEvent()` from `db/queries.ts` with idempotency key |
