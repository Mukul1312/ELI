# Aggregate Design Canvas — StudentMembership

**Tactical spec:** [student-membership-tactical-spec.md](../tactical/student-membership-tactical-spec.md)

**Owned by bounded context:** CohortAccess
**Related subdomain(s):** CohortAccess (Identity, Cohorts, RBAC)
**Sources:** [02-subdomains.md](../02-subdomains.md), [03-context-map.md](../03-context-map.md), [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
**Code pointers (current):** `student_cohort_membership` (future)

---

## 1) Name

- **Aggregate:** StudentMembership
- **Aggregate Type:** Command Handler — handles membership changes (admin enroll, coupon redemption)
- **Instance identity:** studentId
- **Lifetime:** Long-lived (exactly one membership state per student; transitions between active cohort and unassigned)

---

## 2) Description

- **Responsibility:** Enforce "exactly one active cohort or unassigned" invariant per student. Own membership transitions (active cohort ↔ unassigned). Atomic updates on admin enroll and coupon redemption.
- **Why these boundaries:** Membership is the access gate; one student cannot have multiple active cohorts. Atomic join on valid redemption prevents inconsistent state. CohortAccess owns membership semantics per context map.
- **Trade-offs:** We do NOT own coupon validation or entitlement rules; BillingEntitlements triggers membership change only after valid redemption. Cohort is reference data; StudentMembership holds the link (cohortId or unassigned).

---

## 2b) Dependencies

- **BillingEntitlements:** Invokes membership change on valid coupon redemption. CohortAccess supplies "who can redeem" and receives membership update request with targetCohortId.
- **Admin/Ops:** Admin operations can enroll students; CohortAccess enforces role and scope.

---

## 3) State Transitions

- **States:** active (in cohort) | unassigned
- **Transitions:** Admin enroll → active(cohortId). Coupon redemption → active(targetCohortId). (Future: leave/revoke → unassigned.)
- **Invariant:** Exactly one of { active(cohortId), unassigned } per student.

---

## 4) Enforced Invariants

Per [canvas-cohort-access.md](../canvas-cohort-access.md) and [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md):

- **Exactly one active cohort or unassigned:** No ambiguity; no student with multiple active cohorts.
- **Atomic join on valid redemption:** Coupon redemption → membership update is atomic; read-your-writes consistency.
- **Server-derived identity:** studentId resolved from auth; never trust client-provided identity.

---

## 5) Corrective Policies

- **Idempotency at boundary:** Coupon redemption may be retried; CohortAccess must handle idempotently (same redemption → same membership outcome).
- **Reconciliation:** Admin can correct mistaken enrollment manually; audit trail supports investigations.

---

## 6) Handled Commands


| Command                      | Preconditions                                    | State changes                                     | Notes                                            |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------ |
| MembershipChangeOnRedemption | Billing validates coupon; userId, targetCohortId | active(targetCohortId)                            | From BillingEntitlements; atomic with redemption |
| AdminEnroll                  | Admin role, scope check                          | active(cohortId) or unassigned → active(cohortId) | Direct admin path                                |


---

## 7) Created Events


| Event               | Triggered by (command)       | Key fields                      | Consumers                            |
| ------------------- | ---------------------------- | ------------------------------- | ------------------------------------ |
| (Internal/optional) | MembershipChangeOnRedemption | studentId, cohortId, redeemedAt | Billing audit; CohortAccess internal |


---

## 7b) Supported Queries


| Query                        | Key params      | Returns                | Notes                                 |
| ---------------------------- | --------------- | ---------------------- | ------------------------------------- |
| Cohort scope, institute role | studentId, role | cohortIds, accessScope | Institute Radar, EI Runtime (via ACL) |


---

## 8) Throughput (concurrency risk)


| Metric                      | Average        | Maximum | Notes                                        |
| --------------------------- | -------------- | ------- | -------------------------------------------- |
| Command handling rate       | Low            | Medium  | Redemption and admin enroll; not per-request |
| Total number of clients     | 1 per instance | 1       | One membership per student                   |
| Concurrency conflict chance | Low            | Low     | Single writer per student; redemption rare   |


---

## 9) Size


| Metric                        | Average | Maximum    | Notes                                        |
| ----------------------------- | ------- | ---------- | -------------------------------------------- |
| Event growth rate             | Low     | Low        | Membership transitions only                  |
| Lifetime of a single instance | Long    | Indefinite | Per student                                  |
| Number of events persisted    | TBD     | TBD        | If membership events logged; else state-only |


---

## 9b) Storage & Projection


| Aspect             | Value                                     | Notes                                                                                                        |
| ------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Table(s) / store   | `student_cohort_membership`               | Per [05-cross-cutting-concerns.md#data-ownership](../05-cross-cutting-concerns.md#data-ownership) (Identity) |
| Write path         | BillingEntitlements (redemption) or Admin | Sync                                                                                                         |
| Read path          | EI Runtime (ACL), Institute Radar         | Sync per request                                                                                             |
| Replay / recompute | No (command handler)                      | State is source of truth; audit log optional                                                                 |


---

## Open questions

- Coupon redemption idempotency at CohortAccess boundary: exact key (redemptionId vs couponId+userId)?
- Membership event catalog: publish to downstream or keep internal?

