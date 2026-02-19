# Subdomains

> **How to fill:** List capabilities (not code files) from the domain-expert docs. Classify each as **Core** (differentiation), **Supporting** (necessary but not unique), or **Generic** (commodity). Then assign **Now** / **Next** / **Later** for investment focus.
>
> **Source:** [EI_Spec.md](../../EI_Spec.md), [EI_Scenarios.md](../../EI_Scenarios.md), storyboards, [launch-requirements-checklist.md](../launch-requirements-checklist.md)

---

## Subdomain list

| Subdomain | Description | Classification | Focus |
|-----------|-------------|-----------------|-------|
| Adaptive Coaching Decisions (P1/P2/P3) | Gate-time protocol routing and play selection | **Core** | Now |
| Learning Integrity & Loop Health | OpenLoops, verification rate, LoopLatency, avoidant exits | **Core** | Now |
| Strategic Adjustment Policy Engine | SA dials, next-cycle constraints, scenario matching | **Core** | Next |
| Event Ledger & Behavioral Timeline | Append-only event store, query by student | **Supporting** | Now |
| Derived Signals & Student State Projection | Aggregates, topic state (TMS), policy | **Supporting** | Now |
| Student Session UX Flow | Check-in, intent, activation, session, verification, done | **Supporting** | Now |
| Institute Radar & Privacy-safe Reporting | Alerts, evidence summary, recommended action | **Supporting** | Next |
| Identity, Cohorts, RBAC | Auth, cohort membership, enrollment, roles | **Generic** | Now |
| Ops/Observability/Replay/Backfill | Debug timeline, correlation ids, recompute jobs | **Generic** | Now |
| Billing/Sponsor/Coupon Enrollment | Coupon redemption, audit trail | **Generic** | Later |
| | | | |

---

## Rationale (why each classification)

**Core (differentiation):** Adaptive Coaching, Learning Integrity, and Strategic Adjustment are EI's unique value. Rescue vs Boost, verification-floor enforcement, and loop-health metrics are not commodity features.

**Supporting (necessary but not unique):** Event ledger, projections, session flow, and institute radar are required for EI to work but can be built with standard patterns. Radar's privacy boundary is important but the capability is support, not differentiation.

**Generic (commodity):** Identity, cohorts, RBAC, ops/debug, and billing are table stakes for a production app. We integrate Neon Auth and standard patterns rather than inventing them.
