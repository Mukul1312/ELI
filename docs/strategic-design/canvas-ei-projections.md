# Bounded Context Canvas — EI Projections

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** DerivedSignals  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md)

---

## Name

EI Projections

---

## Purpose

Compute and persist the student's derived state/metrics from the event ledger for fast queries. Serve as the system's "memory" of aggregates, topic state, and policy so that EI Runtime, LoopHealthAssessment, Strategic Adjustment, and Institute Radar can make decisions without re-reading the raw event stream. Key actors: EI Runtime (primary), LoopHealthAssessment, Strategic Adjustment, Institute Radar, Ops.

---

## Strategic Classification


| Dimension               | Choice       | Notes                                                                |
| ----------------------- | ------------ | -------------------------------------------------------------------- |
| **Domain**              | supporting   | Required for EI; built with standard projection patterns             |
| **Business model role** | engagement   | Enables fast gate decisions and policy reads                         |
| **Evolution**           | custom built | EI-specific aggregates and policy storage; standard projection logic |


---

## Domain Roles

- **Analysis context:** Projection and aggregation over event stream; computes metric values and state
- **Gateway context:** Query interface for aggregates, topic state, and policy

---

## Ubiquitous Language (in this context)


| Term                  | Definition (in this context)                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| Aggregates            | Rolled-up metrics per student (e.g. openLoops, verificationRate7d, silenceDays, startLatencyMinMedian7d) |
| topic_state           | Per-topic state (last_effort_at, last_retrieval_at, etc.)                                                |
| policy                | StrategicAdjustmentDecision persisted as dials and constraints (maxOpenLoops, closeLoopFirst, etc.)      |
| projection            | Computation of derived state from event stream; idempotent recompute                                     |
| Rolling windows (7d)  | 7-day windows for metrics like verificationRate7d, scheduleMisses7d                                      |
| ei_student_aggregates | Table/store for student-level aggregates                                                                 |
| ei_topic_state        | Table/store for per-topic state                                                                          |
| ei_student_policy     | Table/store for policy written by Strategic Adjustment                                                   |


---

## Inbound Communication


| Collaborator         | Message type | Message name                     | Key data                            | Integration style              | Relationship (from context map) |
| -------------------- | ------------ | -------------------------------- | ----------------------------------- | ------------------------------ | ------------------------------- |
| EI Event Ledger      | Event stream | Event stream (batch / sync read) | All EventTypeEnum + payload schemas | Batch / recompute or sync read | Customer-Supplier (Conformist)  |
| Strategic Adjustment | Command      | StrategicAdjustmentDecision      | dials, constraints, adjustmentMode  | Sync write                     | Customer-Supplier               |


---

## Outbound Communication


| Message type   | Message name                                   | Collaborator         | Key data                                                                    | Integration style       | Relationship       |
| -------------- | ---------------------------------------------- | -------------------- | --------------------------------------------------------------------------- | ----------------------- | ------------------ |
| Query response | GetStudentSignals / R/Signals                  | LoopHealthAssessment | openLoops, verificationRate7d, silenceDays, startLatencyMinMedian7d, policy | Sync query              | Customer-Supplier  |
| Query response | GetStudentSignals / R/Signals                  | EI Runtime           | aggregates, topic state, policy                                             | Sync query              | Customer-Supplier  |
| Query response | GetStudentSignals / R/Signals                  | Strategic Adjustment | openLoops, verificationRate7d, topic state, policy dials                    | Sync query              | Customer-Supplier  |
| Feed           | Privacy-safe signals/alerts feed               | Institute Radar      | Aggregated metrics only; no raw events                                      | Sync / feed             | Published Language |
| Read-only      | Projection state for debug; backfill job specs | Ops & Observability  | Projection state, versioning                                                | Read-only / backfill    | Customer-Supplier  |


---

## Business Decisions

- **Conform to Ledger event schema:** Projections adopt Ledger's event types and payloads as-is; source of truth is Ledger.
- **Idempotent recompute:** Projections can be recomputed from the event stream; monotonic timestamps.
- **Projections own policy storage:** Strategic Adjustment writes policy; Projections persist it; SA owns policy semantics.
- **Numeric evidence only:** Projections supply numbers and state; interpretation (labels) belongs to LoopHealthAssessment.

---

## Assumptions

- Event schema from Ledger is stable enough for projection logic; backward-compatible changes only.
- Policy written by SA is applied before Runtime's next read when same request/cycle.
- Query load from Runtime, LHA, SA, Radar is within acceptable latency bounds.

---

## Verification Metrics

- Projection state is consistent with replay from Ledger.
- Policy reads return latest SA decision when applicable.
- Backfill jobs complete successfully with versioned projection logic.

---

## Open Questions

- Projection versioning strategy for backfill and migration.

