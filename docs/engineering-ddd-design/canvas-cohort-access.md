# Bounded Context Canvas — CohortAccess

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** CohortAccess (Identity, Cohorts, RBAC)  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md)
**See also (cross-cutting):** [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — invariants, event catalog, data ownership, ACLs

---

## Name

CohortAccess

---

## Purpose

Enforce tenant/cohort isolation and role-based access for all EI surfaces. Own membership and enrollment semantics (including unassigned as valid state). Four access surfaces: student EI, Institute Radar, institute admin (enrollment), coupon redemption. Platform ops (backfill, timeline, observability) is not in CohortAccess scope. Never trust client-provided studentId; server-derived identity only.

---

## Strategic Classification

| Dimension               | Choice       | Notes                                                                 |
| ----------------------- | ------------ | --------------------------------------------------------------------- |
| **Domain**              | generic      | Identity, cohorts, RBAC are table stakes; Neon Auth integration       |
| **Business model role** | engagement   | Enables student access and institute visibility                       |
| **Evolution**           | product      | Standard identity/access patterns; may extend for Student+Parent      |

---

## Domain Roles

- **Gateway context:** Auth, RBAC, cohort filtering; ACL for EI Runtime and downstream consumers
- **Draft context:** Membership semantics (active/unassigned), enrollment flows (admin enroll, coupon redemption)

---

## Ubiquitous Language (in this context)

| Term              | Definition (in this context)                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| AuthSession       | Server-validated session; yields student_id and scope                                            |
| student_id        | Server-derived identity; never trusted from client                                               |
| Institute         | Tenant; owns cohorts and roles                                                                   |
| Cohort            | Group of students; scope boundary for institute views                                            |
| Membership        | active (in cohort) or unassigned; exactly one active cohort or unassigned per student            |
| Role              | student, admin, institute; governs RBAC                                                          |
| AccessScope       | Cohort-scoped or global; determined by role and membership                                       |
| Enrollment        | Admin enroll or student join; coupon redemption path changes membership atomically               |
| server-derived identity | Identity resolved on server; client never supplies studentId for authorization            |

---

## Inbound Communication

| Collaborator        | Message type | Message name                                  | Key data                                   | Integration style  | Relationship (from context map) |
| ------------------- | ------------ | --------------------------------------------- | ------------------------------------------ | ------------------ | ------------------------------- |
| EI Runtime          | Command      | Auth request                                  | session, cohort scope                      | Sync (per request) | ACL (Runtime is downstream)     |
| Institute Radar     | Query        | Cohort scope, institute role for filtering     | cohortIds, role                            | Sync               | Customer-Supplier               |
| BillingEntitlements | Command      | Who can redeem; membership change on redemption | userId, couponCode, targetCohortId         | Sync / event       | Customer-Supplier               |
| Institute admin     | Command      | Cohort-scoped enrollment                       | cohortIds, role, accessScope                | —                  | Direct / ACL                    |

---

## Outbound Communication

| Message type   | Message name                      | Collaborator        | Key data                               | Integration style  | Relationship      |
| -------------- | --------------------------------- | ------------------- | -------------------------------------- | ------------------ | ----------------- |
| Auth response  | Auth session / user claims        | EI Runtime          | studentId, role, cohort scope           | Sync (per request) | ACL               |
| Query response | Cohort scope, institute role      | Institute Radar     | cohortIds, role, accessScope             | Sync               | Customer-Supplier |
| Command result | Membership change on redemption   | BillingEntitlements | membership updated, cohortId             | Sync / event       | Customer-Supplier |

---

## Business Decisions

- **Never trust client-provided studentId:** All routes obtain studentId from CohortAccess (ACL); server-derived identity only.
- **Exactly one active cohort or unassigned:** Membership invariant; no ambiguity.
- **Zero cross-cohort visibility:** Institute views are strictly cohort-scoped.
- **Zero privilege escalation:** Institute admin role and cohort-scope checks enforced; no elevation via client input. CohortAccess does not define platform or super-admin roles.
- **Atomic join on valid redemption:** Coupon redemption → membership update is atomic; BillingEntitlements triggers, CohortAccess enforces.

---

## Assumptions

- Neon Auth (or equivalent) supplies auth_user_id; CohortAccess maps to student_id and cohort.
- BillingEntitlements validates coupon before invoking CohortAccess for membership change.
- Unassigned is a valid, first-class state (supports self/parent buyer model).

---

## Verification Metrics

- All EI routes obtain studentId via CohortAccess; no client-supplied studentId in auth path.
- Institute Radar receives only cohort-scoped data; no cross-cohort leakage.
- Redemption flow: valid coupon → membership update with read-your-writes consistency.

---

## Open Questions

- Student+Parent household model: future extension of CohortAccess for parent role.
- Coupon redemption idempotency at CohortAccess boundary.
