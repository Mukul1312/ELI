# Data Ownership

> **How to fill:** Assign each table or logical data area to a bounded context. DDD-lite: one physical DB is fine; "own data store" = ownership and consistency boundary.
>
> **Checklist item #7:** Ensure each context has its own data store (logical ownership).

---

## Table → context ownership

| Table / area | Context | Owner responsibility |
|--------------|---------|------------------------|
| ei_events | EI Event Ledger | Append-only; query by student_id |
| ei_topic_state | EI Projections | Derived from events; TopicLoop lifecycle |
| ei_student_aggregates | EI Projections | Recomputed from events; 7d signals |
| ei_student_policy | EI Projections | Written by SA; read by P1/P2/P3 |
| ei_radar_alerts | Institute Radar | Privacy boundary; never raw events |

---

## Future tables (from launch checklist)

| Table | Context | Notes |
|-------|---------|-------|
| institutes | Identity | |
| cohorts | Identity | |
| students | Identity | |
| student_cohort_membership | Identity | |
| roles | Identity | |
| enrollments | Identity | |
| coupons | Billing/Sponsor | P1 |
| coupon_redemptions | Billing/Sponsor | P1 |
| idempotency_keys | EI Event Ledger | P0 |

---

## Mastra / framework tables

| Table | Purpose |
|-------|---------|
| Mastra workflow/run tables | Framework; not EI domain |
