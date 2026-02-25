# StudentMembership — Tactical DDD Spec

> Docs-only specification for implementing StudentMembership. Source: [agg-student-membership.md](../aggregates/agg-student-membership.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md).

---

## 1) Purpose and Boundary

- **Aggregate root:** StudentMembership
- **Aggregate type:** Command Handler — handles membership state transitions; enforces "exactly one active cohort or unassigned" invariant.
- **Identity:** `studentId` — one instance per student.
- **Responsibility:** Enforce cohort membership invariants atomically. Accept commands from admin enroll and coupon redemption paths. Source of truth for which cohort a student belongs to.
- **Non-goals (outside StudentMembership):**
  - Coupon eligibility/limit validation — lives in Coupon aggregate.
  - Coupon audit trail — lives in Redemption aggregate.
  - RBAC or role computation — lives in CohortAccess context but outside this aggregate.
  - EI signal computation — lives in EI Projections.

---

## 2) Ubiquitous Language (Tactical Terms)


| Term                         | Definition                                                                |
| ---------------------------- | ------------------------------------------------------------------------- |
| StudentMembershipId          | Identity: `{ studentId }`                                                 |
| StudentId                    | Student identifier (string; server-derived from auth session)             |
| CohortId                     | Identifier of the cohort the student belongs to                           |
| MembershipState              | `active(cohortId)` or `unassigned`                                        |
| AdminEnroll                  | Command from admin to set a student's cohort                              |
| MembershipChangeOnRedemption | Command triggered by BillingEntitlements on valid coupon redemption       |
| IdempotencyKey               | Unique key per redemption attempt to prevent duplicate membership changes |
| TargetCohortId               | The cohort the student is being enrolled into                             |


---

## 3) State Model


| Field           | Type                    | Semantics                         |
| --------------- | ----------------------- | --------------------------------- |
| studentId       | string                  | Identity                          |
| cohortId        | string or null          | Current cohort; null = unassigned |
| membershipState | `active` | `unassigned` | Derived from cohortId             |
| updatedAt       | ISO datetime            | When membership last changed      |


- **Lifecycle:** `unassigned` → `active(cohortId)`. Future: `active` → `unassigned` (leave/revoke; deferred).
- **Initial:** Student row absent until first enrollment; treat as `unassigned`.

---

## 4) Invariants (Must Hold Atomically)

Per [agg-student-membership.md](../aggregates/agg-student-membership.md) and [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md):

1. **Exactly one active cohort or unassigned:** No student may have two `active` states simultaneously.
2. **Server-derived identity:** `studentId` always comes from auth session; never trusted from client body.
3. **Atomic join on valid redemption:** Redemption validation → membership update must be atomic; no partial state between validation and write.
4. **Idempotency:** Same command with same idempotency key produces the same membership outcome; no duplicate transitions.

---

## 5) Commands and Decisions


| Command                      | Required fields                                         | Preconditions                              | Decision logic                                               | State change                                          |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------- |
| AdminEnroll                  | studentId, cohortId, adminId                            | Admin role verified; scope includes cohort | Enroll student into cohort                                   | cohortId = given; membershipState = `active`          |
| MembershipChangeOnRedemption | studentId, targetCohortId, redemptionId, idempotencyKey | BillingEntitlements has validated coupon   | Check idempotency key; if duplicate → no-op; else set cohort | cohortId = targetCohortId; membershipState = `active` |


---

## 6) Domain Events Consumed / Produced

### Consumed

StudentMembership does not consume Ledger events (it is a command handler, not a projection).

### Produced (optional / internal)


| Event             | Triggered by                                | Key fields                             | Consumers                            |
| ----------------- | ------------------------------------------- | -------------------------------------- | ------------------------------------ |
| MembershipChanged | AdminEnroll or MembershipChangeOnRedemption | studentId, cohortId, changedAt, source | Billing audit; CohortAccess internal |


- Event emission is optional for v1; state table is source of truth.

---

## 7) Ports (Interfaces — Docs Level)


| Port                            | Role   | Responsibility                                            |
| ------------------------------- | ------ | --------------------------------------------------------- |
| **StudentMembershipRepository** | Driven | Load by `studentId`; save membership state                |
| **IdempotencyKeyStore**         | Driven | Check and record idempotency keys for redemption commands |


- Repository interface lives in `domain/student-membership/repository.ts`.
- Application handler lives in `application/change-student-membership/handler.ts`.
- Adapter uses `student_cohort_membership` table (future).

---

## 8) Application Use-Case Contract

**Use case:** `ChangeStudentMembership`


| Aspect            | Specification                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Input**         | `{ studentId, targetCohortId, source: 'admin' | 'redemption', idempotencyKey? }`                                        |
| **Output**        | Updated membership state persisted; returns new membershipState                                                         |
| **Errors**        | Missing `studentId` or `targetCohortId` (reject); idempotency key already used with different cohort (reject)           |
| **Idempotency**   | Same idempotency key + same cohort → no-op and return existing state; same key + different cohort → reject              |
| **Preconditions** | Coupon validated by BillingEntitlements before invoking for `redemption` source; admin role verified for `admin` source |


---

## 9) Consistency and Concurrency Rules


| Rule                      | Description                                                                       |
| ------------------------- | --------------------------------------------------------------------------------- |
| Single writer per student | One membership transition at a time per student; low concurrency conflict chance. |
| Conflict handling         | Idempotency key prevents duplicate membership grants from retried redemptions.    |
| Atomic join               | Redemption path: validate → change membership in same transaction.                |
| Recompute                 | Not applicable (command handler); audit log supports investigation.               |


---

## 10) Test Strategy (Spec Tests)


| Scenario                 | Input                                                | Expected outcome                            |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------- |
| First enrollment         | AdminEnroll; student unassigned                      | membershipState = active(cohortId)          |
| Re-enroll to same cohort | AdminEnroll; already active(cohortId)                | Idempotent; no change                       |
| Redemption path          | MembershipChangeOnRedemption with new idempotencyKey | membershipState = active(targetCohortId)    |
| Duplicate redemption     | Same idempotencyKey + same cohort                    | No-op; return existing state                |
| Conflicting duplicate    | Same idempotencyKey + different cohort               | Reject                                      |
| Missing studentId        | Command without studentId                            | Reject; no state change                     |
| Student not found        | AdminEnroll for unknown studentId                    | Create new membership row; active(cohortId) |


---

## 11) Open Questions and Deferred Decisions

- Idempotency key format: `redemptionId` vs `couponId + userId`.
- Leave / revoke path (unassigned transition): deferred to future.
- Whether `MembershipChanged` event should be published to Ledger for downstream consumers.
- Cohort validation: should StudentMembership verify `targetCohortId` exists, or trust the caller?

---

## References

- [agg-student-membership.md](../aggregates/agg-student-membership.md)
- [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [canvas-cohort-access.md](../canvas-cohort-access.md)

