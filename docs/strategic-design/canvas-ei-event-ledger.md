# Bounded Context Canvas — EI Event Ledger

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** Event Ledger  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md)
**See also (cross-cutting):** [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — invariants, event catalog, data ownership, ACLs

---

## Name

EI Event Ledger

---

## Purpose

Maintain a faithful, append-only record of what happened (domain events) as the system of record. Expose a queryable behavioral timeline per student so that all derived state and interpretation can be recomputed from the log. Key actors: EI Runtime (primary writer), EI Projections (primary reader), Ops (debug/replay consumer).

---

## Strategic Classification

| Dimension | Choice | Notes |
|-----------|--------|-------|
| **Domain** | supporting | Essential for EI but built with standard event-sourcing/append-only patterns |
| **Business model role** | compliance | Ensures auditability and determinism; source of truth for "what happened" |
| **Evolution** | custom built | EI-specific event schema; standard storage patterns |

---

## Domain Roles

- **Gateway context:** Ingestion of events from Runtime; single write path
- **Analysis context:** Query by student_id (and optionally time range) for behavioral timeline

---

## Ubiquitous Language (in this context)

| Term | Definition (in this context) |
|------|------------------------------|
| Event | **Domain Event (stored, not raised here):** immutable record of a significant occurrence in the EI domain — type, student context, schema-validated payload, occurred_at. Produced by Runtime or SA; schema-owned by Ledger; stored (not raised) by Ledger. Equality by all fields; no mutable lifecycle; append-only. |
| Event type | **Enum Value Object:** one of `AppOpen \| IntentSet \| SessionEnd \| NegotiatedIntentIssued \| ActivationPlanIssued \| IntentResponse \| FirstActionStarted \| Replan \| VerificationDecisionIssued \| RetrievalVerified \| RetrievalScheduled \| RetrievalSkipped \| VerificationCompleted \| StrategicAdjustmentDecision \| ScheduleMissed` — immutable string union, equality by value. Schema ownership: Ledger (`src/ei/schemas/events.ts`). |
| Event payload | **Structural Value Object (per-type):** Zod-validated JSONB data for one event type; shape varies per EventType (AppOpenPayload, IntentSetPayload, etc.). Immutable by convention, equality by all fields. See `src/ei/schemas/events.ts`. |
| Append-only | Invariant (not a building block): no updates or deletes; events are immutable once written. |
| Idempotency key | **Value Object:** non-empty string uniquely identifying one logical append attempt. Recommended format: `{context}:{eventType}:{studentId}:{timestamp}`. Equality by string value. Stored in `ei_idempotency_keys`; guards against duplicate appends on retry. |
| Behavioral timeline | **Read Model:** ordered stream of EventRecords per student produced by QueryEventsByStudent. Not a persistent entity — derived on query. Consumed by Projections (batch recompute) and Ops (debug). |

> **Building block note:** The Event Ledger's primary tactical building block is the **Domain Event** (stored, not raised here). The Ledger does not contain an Aggregate — the append-only store has no consistency boundary over mutable state; the idempotency + immutability invariants replace aggregate consistency semantics. Value Objects (`EventType`, `IdempotencyKey`, `EventPayload<T>`) capture the schema and idempotency semantics. Tactical spec: [`ei-event-ledger-tactical-spec.md`](tactical/ei-event-ledger-tactical-spec.md).

---

## Inbound Communication

| Collaborator | Message type | Message name | Key data | Integration style | Relationship (from context map) |
|--------------|--------------|--------------|----------|-------------------|-----------------------------------|
| EI Runtime | Event | AppOpen, IntentSet, SessionEnd, FirstActionStarted, Replan, IntentResponse | energy, pressure, topic, taskType, etc. | Sync append | Customer-Supplier |
| EI Runtime | Event | NegotiatedIntentIssued, ActivationPlanIssued, VerificationDecisionIssued | scope, mode, verificationDecision | Sync append | Customer-Supplier |
| EI Runtime | Event | RetrievalVerified, RetrievalScheduled, RetrievalSkipped, VerificationCompleted, ScheduleMissed | questions, dueAt, reason | Sync append | Customer-Supplier |

---

## Outbound Communication

| Message type | Message name | Collaborator | Key data | Integration style | Relationship |
|--------------|---------------|--------------|----------|-------------------|--------------|
| Event stream | Event stream (batch / sync read) | EI Projections | All EventTypeEnum + payload schemas; conformist | Batch / recompute or sync read | Customer-Supplier (Conformist) |
| Read-only | Event stream for debug timeline, replay scope | Ops & Observability | Event stream, replay job scope | Read-only / replay | Customer-Supplier |

---

## Business Decisions

- **Immutability:** No updates or deletes of events; derived state is recomputed from the log.
- **Idempotent writes:** Duplicate appends (same idempotency key) are ignored.
- **Schema strictness:** Event payloads must conform to schemas in events.ts; invalid payloads are rejected.
- **Source of truth:** Ledger owns event schema; Projections conform to it.

---

## Assumptions

- Event schema changes are backward-compatible where possible; new event types are additive.
- Idempotency keys are supplied by Runtime and are unique per logical write.
- Query performance by student_id is sufficient for projection replays and Ops debug.

---

## Verification Metrics

- No duplicate events for same idempotency key.
- All events pass schema validation before append.
- Replay/backfill jobs can reconstruct projection state from Ledger alone.

---

## Open Questions

- Event retention policy and archival strategy for long-term compliance.
