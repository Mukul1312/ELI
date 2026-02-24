# Bounded Context Canvas — Institute Radar

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** InstituteRadar  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md)
**See also (cross-cutting):** [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — invariants, event catalog, data ownership, ACLs

---

## Name

Institute Radar

---

## Purpose

Produce and expose a privacy-safe triage signal for institutes: at most one primary alert per student, with evidence summary and recommended intervention class. v1: alerts-only; no workflow. Different customer (institute); hard privacy boundary; no raw events or private text.

---

## Strategic Classification


| Dimension               | Choice       | Notes                                                            |
| ----------------------- | ------------ | ---------------------------------------------------------------- |
| **Domain**              | supporting   | Required for EI institute offering; privacy boundary is critical |
| **Business model role** | engagement   | Enables institute visibility and triage                          |
| **Evolution**           | custom built | EI-specific alert types and evidence summary; versioned schema   |


---

## Domain Roles

- **Analysis context:** Dedupe (one primary alert per student); priority ordering; merge rules
- **Gateway context:** RadarAlert contract; institute-facing dashboard consumer

---

## Ubiquitous Language (in this context)


| Term            | Definition (in this context)                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| RadarAlert      | Privacy-safe alert per student; evidence summary + recommended intervention; one primary per student |
| alertType       | Silence, IntegrityDebt, VerificationDrop, OpenLoopsSpike, BurnoutRunway, SubjectAvoidance            |
| severity        | Red, yellow; triage ordering                                                                         |
| evidenceSummary | Aggregated metrics only; no raw events, no private text                                              |
| primaryAlert    | Single alert chosen per student after dedupe; priority ordering                                      |
| dedupe          | Rules to merge multiple risk signals into one primary alert                                          |
| cohortScoped    | Institute view filtered by cohort membership; CohortAccess supplies scope                            |
| privacyBoundary | No raw events, no private text; only aggregated numbers/tags                                         |


---

## Inbound Communication


| Collaborator         | Message type   | Message name                           | Key data                                   | Integration style | Relationship (from context map) |
| -------------------- | -------------- | -------------------------------------- | ------------------------------------------ | ---------------- | ------------------------------- |
| LoopHealthAssessment | Query response | LoopHealthSnapshot / labels + evidence | labels (p1, p2, p3), aggregated evidence   | Sync / feed      | Published Language              |
| EI Projections       | Query response | Privacy-safe signals feed              | aggregated metrics, versioned alert schema | Sync / feed      | Published Language              |
| CohortAccess         | Query response | Cohort scope, institute role           | cohortIds, role, accessScope               | Sync             | Customer-Supplier               |


---

## Outbound Communication


| Message type   | Message name | Collaborator        | Key data                                                | Integration style | Relationship      |
| -------------- | ------------ | ------------------- | ------------------------------------------------------- | ---------------- | ----------------- |
| Query response | RadarAlert   | Institute dashboard | alertType, severity, evidenceSummary, recommendedAction | —                | External consumer |


---

## Business Decisions

- **No raw events, no private text:** Privacy boundary; evidence is aggregated numbers/tags only.
- **One primary alert per student:** Dedupe and merge rules ensure at most one triage signal per student.
- **Priority ordering:** Stable sorting for triage; severity and alert type drive order.
- **Cohort-scoped filtering:** Institute sees only students in their cohort(s); CohortAccess enforces.
- **v1 alerts-only:** No workflow (acknowledge, assign, playbook); can be added later.

---

## Assumptions

- LoopHealthSnapshot and Projections feed provide sufficient privacy-safe signals for alert generation.
- Institute dashboard consumes RadarAlert via published API or feed.
- Alert schema is versioned; breaking changes require coordination with consumers.

---

## Verification Metrics

- No raw events or private text in any Radar output; only aggregated evidence.
- Exactly one primary alert per student in cohort-scoped view.
- Alert types and priority order match triage expectations.

---

## Open Questions

- Institute workflow actions (acknowledge, assign owner, trigger playbook) in future iterations.
- Alert threshold tuning and recommended-action mapping cadence.

