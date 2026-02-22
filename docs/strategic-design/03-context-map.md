# Context Map

> **How to fill:** Define bounded context boundaries and their relationships. Use relationship types from [DDD-STRATEGIC.md](.agents/skills/clean-ddd-hexagonal/references/DDD-STRATEGIC.md): Customer-Supplier, Conformist, ACL, Partnership, Published Language.
>
> **Explanatory notes:** See [03-context-map-notes.md](03-context-map-notes.md) for upstream/downstream, pattern heuristics, and rationale.
>
> **Rule:** Each bounded context has its own ubiquitous language and model. Same real-world concept may mean different things across contexts.
>
> **Today:** Bounded contexts are implemented as modules within a monolith; this map still applies if later split into services.

---

## Bounded contexts

Aligned with [02-subdomains.md](02-subdomains.md). Subdomain names match Section B/C there. **Canvases:** [canvas-ei-runtime](canvas-ei-runtime.md), [canvas-ei-event-ledger](canvas-ei-event-ledger.md), [canvas-ei-projections](canvas-ei-projections.md), [canvas-loop-health-assessment](canvas-loop-health-assessment.md) (core); [canvas-strategic-adjustment](canvas-strategic-adjustment.md), [canvas-cohort-access](canvas-cohort-access.md), [canvas-institute-radar](canvas-institute-radar.md), [canvas-ops-observability](canvas-ops-observability.md), [canvas-billing-entitlements](canvas-billing-entitlements.md) (supporting + generic).


| Context                          | Responsibility                                                                                                                               | Subdomain(s)                                | Owned data (high-level)                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **CohortAccess**                 | Auth (Neon), server-derived student_id, cohorts, enrollment, roles; never trust client identity.                                             | CohortAccess (Identity, Cohorts, RBAC)      | Auth sessions, cohort membership, role assignments; see [05-cross-cutting-concerns.md#data-ownership](05-cross-cutting-concerns.md#data-ownership)                   |
| **EI Event Ledger**              | Append-only event store, idempotent writes, query by student; source of truth for what happened.                                             | Event Ledger                                | `ei_events`, idempotency keys; event schema ownership                                                                  |
| **EI Projections**               | Compute and persist derived state/metrics from events (aggregates, topic state, policy) for fast queries.                                    | DerivedSignals                              | `ei_student_aggregates`, `ei_topic_state`, `ei_student_policy`; projection logic                                       |
| **LoopHealthAssessment**         | Interpret metrics into labels and produce LoopHealthSnapshot (thresholds, precedence); single place for "what is healthy."                   | LoopHealthAssessment                        | Labels, thresholds, precedence rules; LoopHealthSnapshot contract (target ownership even if not yet a separate module) |
| **EI Runtime**                   | P1/P2/P3 gate decisions, protocol play selection (Rescue/Neutral/Boost), emit protocol outputs; orchestrates gates and appends events.       | AdaptiveCoaching, StudySessionOrchestration | Protocol output contracts (NegotiatedIntent, ActivationPlan, VerificationDecision); gate routing logic                 |
| **Strategic Adjustment**         | Next-cycle synthesis: emit StrategicAdjustmentDecision (dials, constraints); weekly or risk-triggered; policy feeds Runtime via Projections. | StrategicAdjustment                         | Policy semantics; SA decision schema; write path into policy storage (via Projections)                                 |
| **Institute Radar**              | Privacy-safe triage: at most one primary alert per student, evidence summary, cohort-filtered; no raw events.                                | InstituteRadar                              | RadarAlert schema; alert types, priority ordering, dedupe rules                                                        |
| **Ops & Observability**          | Debug timeline, correlation ids, replay/backfill orchestration; observability semantics and safe repair.                                     | OpsObservability                            | Correlation IDs, job state, runbooks; read-only access to Ledger/Projections for debug                                 |
| **BillingEntitlements** (future) | Coupons, redemptions, entitlement lifecycle, billing audit trail.                                                                            | BillingEntitlements                         | Coupons, redemptions, entitlements, audit log                                                                          |


---

## Context map diagram (Mermaid)

```mermaid
flowchart TB
    subgraph contexts [Bounded Contexts]
        CohortAccess[CohortAccess]
        Ledger[EI Event Ledger]
        Projections[EI Projections]
        LoopHealth[LoopHealthAssessment]
        Runtime[EI Runtime]
        SA[Strategic Adjustment]
        Radar[Institute Radar]
        Ops[Ops and Observability]
        Billing[BillingEntitlements]
    end

    CohortAccess -->|ACL| Runtime
    CohortAccess -->|Customer-Supplier| Billing
    Runtime -->|Customer-Supplier| Ledger
    Ledger -->|Customer-Supplier Conformist| Projections
    Projections -->|Customer-Supplier| LoopHealth
    LoopHealth -->|Published Language| Runtime
    Projections -->|Customer-Supplier| Runtime
    SA -->|Customer-Supplier| Projections
    Projections -->|Customer-Supplier| SA
    LoopHealth -->|Published Language| SA
    LoopHealth -->|Published Language| Radar
    Projections -->|Customer-Supplier| Radar
    CohortAccess -->|Customer-Supplier| Radar
    Ledger -->|Customer-Supplier| Ops
    Projections -->|Customer-Supplier| Ops
    Billing -->|Customer-Supplier| Ops
```



---

## Relationship catalog (detailed)

Contract names reference implemented schemas in [src/ei/schemas/events.ts](../../src/ei/schemas/events.ts) and [src/ei/schemas/outputs.ts](../../src/ei/schemas/outputs.ts) where applicable.


| Upstream             | Downstream           | Team relationship     | Context mapping pattern        | Integration style              | Contracts / messages                                                                                                                                                                                                                                                                                                                                                                                      | Notes                                                                                         |
| -------------------- | -------------------- | --------------------- | ------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| CohortAccess         | EI Runtime           | Upstream → Downstream | **ACL**                        | Sync (per request)             | Auth session / user claims → `studentId`, role, cohort scope                                                                                                                                                                                                                                                                                                                                              | Never trust client-provided studentId; server-derived identity only.                          |
| CohortAccess         | Institute Radar      | Upstream → Downstream | Customer-Supplier              | Sync                           | Cohort scope, institute role for filtering                                                                                                                                                                                                                                                                                                                                                                | Radar is cohort-scoped; CohortAccess owns membership.                                         |
| CohortAccess         | BillingEntitlements  | Upstream → Downstream | Customer-Supplier              | Sync / event                   | Who can redeem; membership change on redemption                                                                                                                                                                                                                                                                                                                                                           | Enrollment gating; atomic join on valid redemption.                                           |
| EI Runtime           | EI Event Ledger      | Upstream → Downstream | Customer-Supplier              | Sync append                    | **Commands/events:** `AppOpen`, `IntentSet`, `SessionEnd`, `FirstActionStarted`, `Replan`, `IntentResponse`; **Protocol outputs (as events):** `NegotiatedIntentIssued`, `ActivationPlanIssued`, `VerificationDecisionIssued`, `RetrievalVerified`, `RetrievalScheduled`, `RetrievalSkipped`, `VerificationCompleted`, `StrategicAdjustmentDecision`, `ScheduleMissed`. See `EventTypeEnum` in events.ts. | Runtime appends; Ledger owns schema and idempotency.                                          |
| EI Event Ledger      | EI Projections       | Upstream → Downstream | Customer-Supplier (Conformist) | Batch / recompute or sync read | Event stream: all types in `EventTypeEnum` + payload schemas (events.ts)                                                                                                                                                                                                                                                                                                                                  | Projections conform to Ledger event schema; source of truth is Ledger.                        |
| EI Projections       | LoopHealthAssessment | Upstream → Downstream | Customer-Supplier              | Sync query                     | Aggregates/topic state/policy: e.g. `openLoops`, `verificationRate7d`, `silenceDays`, `startLatencyMinMedian7d`, policy dials/constraints (see protocol-runner adaptAggregates/adaptPolicy)                                                                                                                                                                                                               | Numeric evidence only; LoopHealthAssessment owns interpretation.                              |
| LoopHealthAssessment | EI Runtime           | Upstream → Downstream | **Published Language**         | Sync call                      | `LoopHealthSnapshot` (labels + key evidence)                                                                                                                                                                                                                                                                                                                                                              | Target: Runtime consumes snapshot only; label/threshold tuning lives in LoopHealthAssessment. |
| LoopHealthAssessment | Institute Radar      | Upstream → Downstream | Published Language             | Sync / feed                    | Labels + aggregated evidence (no raw events)                                                                                                                                                                                                                                                                                                                                                              | Privacy boundary: Radar never sees raw events or private text.                                |
| EI Projections       | EI Runtime           | Upstream → Downstream | Customer-Supplier              | Sync query                     | Aggregates, topic state, policy (for gate decisions and cross-protocol state)                                                                                                                                                                                                                                                                                                                             | Runtime reads for P1/P2/P3; policy written by Strategic Adjustment.                           |
| Strategic Adjustment | EI Projections       | Upstream → Downstream | Customer-Supplier              | Sync write                     | `StrategicAdjustmentDecision` (outputs.ts: dials, constraints, adjustmentMode); persisted as policy                                                                                                                                                                                                                                                                                                       | Projections own policy storage; SA owns policy semantics.                                     |
| EI Projections       | Strategic Adjustment | Upstream → Downstream | Customer-Supplier              | Sync query                     | Aggregates/topic state/policy (openLoops, verificationRate7d, topic state, policy dials); see [signals.ts](../../src/ei/schemas/signals.ts)                                                                                                                                                                                                                                                              | SA consumes state to decide policy; not interpretation (that comes from LHA).                  |
| LoopHealthAssessment | Strategic Adjustment | Upstream → Downstream | **Published Language**         | Sync call                      | `LoopHealthSnapshot` (labels + key evidence); same contract as LHA→Runtime                                                                                                                                                                                                                                                                                                                                 | SA uses labels for adjustment-mode choice; threshold tuning stays in LHA.                     |
| EI Projections       | Institute Radar      | Upstream → Downstream | **Published Language**         | Sync / feed                    | Privacy-safe signals/alerts feed (aggregated metrics only)                                                                                                                                                                                                                                                                                                                                                | No raw events; versioned alert schema for Radar consumers.                                    |
| EI Event Ledger      | Ops & Observability  | Upstream → Downstream | Customer-Supplier              | Read-only / replay             | Event stream for debug timeline; replay job scope                                                                                                                                                                                                                                                                                                                                                         | Admin-only; enables replay/backfill.                                                          |
| EI Projections       | Ops & Observability  | Upstream → Downstream | Customer-Supplier              | Read-only / backfill           | Projection state for debug; backfill job specs, versioning                                                                                                                                                                                                                                                                                                                                                | Ops runs backfills; does not define metrics.                                                  |
| BillingEntitlements  | Ops & Observability  | Upstream → Downstream | Customer-Supplier              | Read-only query                | Billing audit, redemption history, entitlement status (for investigations; future)                                                                                                                                                                                                                                                                                                                        | Ops reads for support/finance investigations; does not define billing rules.                  |


---

## Governance notes (DDD-lite)

- **Hard boundaries**
  - **Server-derived identity:** All student-facing and institute-facing routes MUST obtain `studentId`/scope from CohortAccess (ACL); never trust client-provided identity.
  - **Append-only ledger:** EI Event Ledger is immutable and idempotent; no updates or deletes of events. Derived state can be recomputed from the log.
  - **Privacy boundary (Radar):** Institute Radar MUST NOT receive raw events or private text; only aggregated metrics and versioned alert types (Published Language).
- **Published Language (versioned contracts)**
  - **Radar alert schema:** Institute-facing alert types and evidence summary shape should be versioned; breaking changes require coordination with any Radar consumers.
  - **LoopHealthSnapshot:** If exposed as a formal API or event, version it; threshold/label changes stay inside LoopHealthAssessment.
- **Coordination**
  - **Event schema changes:** Adding or changing event types (events.ts) affects Event Ledger, Projections, and any replay/backfill; add new event types in a backward-compatible way where possible.
  - **Threshold/label tuning:** Owned by LoopHealthAssessment; changing thresholds does not require changing EI Runtime gate code, only the snapshot contract if it changes.

