# Bounded Context Canvas — Ops & Observability

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** OpsObservability  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md)
**See also (cross-cutting):** [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — invariants, event catalog, data ownership, ACLs

---

## Name

Ops & Observability

---

## Purpose

Keep EI runnable and diagnosable in production: observe behavior (logs, metrics, traces), investigate issues, and safely recompute or repair projections via replay/backfill without corrupting domain truth. Ops consumes; does not supply domain data to other contexts.

---

## Strategic Classification


| Dimension               | Choice         | Notes                                                    |
| ----------------------- | -------------- | -------------------------------------------------------- |
| **Domain**              | generic        | Standard observability and repair patterns               |
| **Business model role** | cost reduction | Enables diagnosis and safe repair; reduces incident cost |
| **Evolution**           | commodity      | Integrate standard tooling; job orchestration is custom  |


---

## Domain Roles

- **Analysis context:** Debug timeline, correlation; trace assembly for investigations
- **Gateway context:** Replay/backfill orchestration; job scope, versioning, checkpointing

---

## Ubiquitous Language (in this context)


| Term              | Definition (in this context)                                       |
| ----------------- | ------------------------------------------------------------------ |
| CorrelationId     | Request-scoped ID for tracing across contexts; generated at API boundary, propagated through Mastra steps into domain events |
| TraceId           | End-to-end trace for a flow                                        |
| TimelineDebug     | Student or request timeline; assembled from Ledger events + Projection state. For a single AppOpen: AppOpen → FlowSelected → SessionIntentIssued → ViewComposed (full request trace queryable by correlationId or sessionId) |
| PresentationTrace | The sub-sequence of ViewComposed events in a student timeline; answers "which screen variant was shown and why" without requiring Mastra Studio access |
| ViewComposed      | SSO-owned domain event appended after each SDUI composition step; carries correlationId, phase, variant, presentationSignals (key signals that drove the presentation decision). Owned by StudySessionOrchestration; consumed by Ops via IQueryEventsPort |
| ReplayJob         | Job to re-ingest events; idempotent, auditable, throttled          |
| BackfillJob       | Job to recompute projection state; scope, version, checkpoint      |
| ProjectionVersion | Version of projection logic; enables safe rollback and audit       |
| Checkpoint        | Watermark for resumable jobs                                       |
| idempotent job    | Replay/backfill can be re-run without corrupting domain truth      |
| DryRun            | Job mode: validate without persisting                              |
| Canary            | Rollout: small scope first before full run                         |
| Throttling        | Rate limiting for replay/backfill to protect production            |
| Redaction         | Privacy: no raw PII in logs/traces; tenant isolation for ops views |


---

## Inbound Communication


| Collaborator        | Message type   | Message name                 | Key data                           | Integration style    | Relationship (from context map) |
| ------------------- | -------------- | ---------------------------- | ---------------------------------- | -------------------- | ------------------------------- |
| EI Event Ledger     | Query response | Event stream (read-only)     | All event types incl. SSO-owned events: FlowSelected (which flow, why), ViewComposed (which screen variant, which signals), SessionIntentIssued (gate decision), AppOpen (input signals). Correlatable by correlationId and sessionId across a single AppOpen request. | Read-only / replay   | Customer-Supplier               |
| EI Projections      | Query response | Projection state (read-only) | aggregates, policy, backfill specs | Read-only / backfill | Customer-Supplier               |
| BillingEntitlements | Query response | Billing audit (read-only)    | redemptions, entitlement status    | Read-only query      | Customer-Supplier               |


---

## Outbound Communication


| Message type | Message name | Collaborator | Key data | Integration style | Relationship      |
| ------------ | ------------ | ------------ | -------- | ----------------- | ----------------- |
| (None)       | —            | —            | —        | —                 | Ops consumes only |


Ops does not supply domain data to other bounded contexts. Replay/backfill writes to Ledger and Projections via their own APIs; Ops orchestrates, does not define schemas.

---

## Business Decisions

- **Safe replay/backfill:** Idempotent, auditable, throttled; no corruption of domain truth.
- **Ops does not define metrics or event schema:** Ledger and Projections own; Ops reads only.
- **Access control:** Timeline and replay/backfill use OpsAuth (API key, cron secret, dev bypass). Not CohortAccess. Least-privilege; tenant isolation where applicable.

---

## Assumptions

- Ledger and Projections expose read-only APIs suitable for timeline assembly and job scope.
- Replay/backfill writes go through standard append/recompute paths; no special Ops-only writes.
- CorrelationId/TraceId propagate across contexts for debugging.

---

## Verification Metrics

- Replay/backfill jobs complete without corrupting aggregates or policy.
- Debug timeline correctly assembles events and projection state for a student.
- Ops views respect tenant boundaries; no unauthorized cross-cohort access.
- TracedDbAdapter emits span logs for every DB query without modifying business code.
- TracedAuthAdapter captures getSession, ensureMapping, resolveAuth as separate spans with correlationId.
- For any AppOpen request: timeline query by studentId returns FlowSelected + ViewComposed events with matching correlationId, enabling full "which flow → which screen variant → which signals" trace without Mastra Studio access.
- ViewComposed.variant correctly identifies which Phase1Variant was selected (e.g. SILENCE_RE_ENTRY, LOW_ENERGY) and the presentationSignals that drove it.

---

## Open Questions

- SLI/SLO definitions and alerting ownership.
- Redaction policy for PII in logs/traces.

