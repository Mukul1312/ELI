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
| Event | Immutable record of something that happened, with type and payload |
| Event type | One of AppOpen, IntentSet, SessionEnd, NegotiatedIntentIssued, ActivationPlanIssued, VerificationDecisionIssued, RetrievalVerified, RetrievalScheduled, RetrievalSkipped, VerificationCompleted, StrategicAdjustmentDecision, ScheduleMissed, etc. |
| Event payload | Schema-validated data for the event; see events.ts |
| Append-only | No updates or deletes; events are immutable once written |
| Idempotency key | Per-write key ensuring duplicate appends are ignored |
| Behavioral timeline | Ordered event stream per student; source of truth for what happened |

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
