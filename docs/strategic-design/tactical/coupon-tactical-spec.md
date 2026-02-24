# Coupon — Tactical DDD Spec

> Docs-only specification for implementing Coupon. Source: [agg-coupon.md](../aggregates/agg-coupon.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md).

---

## 1) Purpose and Boundary

- **Aggregate root:** Coupon
- **Aggregate type:** Command Handler — owns coupon lifecycle: creation, eligibility rules, limit enforcement.
- **Identity:** `couponId` — one instance per coupon code.
- **Responsibility:** System of record for coupon rules. Validate redemption eligibility (eligible student, within limit, not expired). Atomically increment usage count on valid redemption. Reject invalid or exhausted attempts.
- **Non-goals (outside Coupon):**
  - Redemption audit trail — lives in Redemption aggregate.
  - Membership state update — lives in StudentMembership aggregate.
  - Student eligibility (RBAC/role check) — lives in CohortAccess.
  - Payment processing — deferred (separate aggregate / external system).
  - CouponBatch campaign scope — deferred; Coupon holds per-code rules.

---

## 2) Ubiquitous Language (Tactical Terms)


| Term            | Definition                                                                |
| --------------- | ------------------------------------------------------------------------- |
| CouponId        | Identity of this aggregate (string; matches coupon code or internal UUID) |
| CouponCode      | Human-readable redemption code                                            |
| CouponState     | `active` | `expired` | `exhausted`                                        |
| Eligibility     | Whether a given userId + targetCohortId may redeem this coupon            |
| RedemptionLimit | Maximum total redemptions allowed for this coupon                         |
| UsageCount      | Current number of successful redemptions                                  |
| ExpiresAt       | ISO datetime after which coupon is expired; null = no expiry              |
| IdempotencyKey  | Key per redemption attempt to prevent double-increment                    |
| TargetCohortId  | Cohort the coupon grants access to                                        |


---

## 3) State Model


| Field           | Type                               | Semantics                           |
| --------------- | ---------------------------------- | ----------------------------------- |
| couponId        | string                             | Identity                            |
| couponCode      | string                             | Human-readable code                 |
| couponState     | `active` | `expired` | `exhausted` | Lifecycle                           |
| redemptionLimit | integer or null                    | Max redemptions; null = unlimited   |
| usageCount      | integer                            | Cumulative successful redemptions   |
| targetCohortId  | string                             | Cohort this coupon grants access to |
| expiresAt       | ISO datetime or null               | Expiry; null = no expiry            |
| createdAt       | ISO datetime                       | When created                        |


- **Lifecycle:** `active` → `exhausted` (limit reached) or `expired` (time passed).
- **Initial:** Created by admin in `active` state with given rules.

---

## 4) Invariants (Must Hold Atomically)

Per [agg-coupon.md](../aggregates/agg-coupon.md) and [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md):

1. **Limit enforcement:** `usageCount` must never exceed `redemptionLimit`. Check-and-increment is atomic.
2. **Expiry enforcement:** Redemption rejected if `now > expiresAt` (when `expiresAt` is set).
3. **Idempotency:** Same idempotency key must not increment `usageCount` more than once.
4. **State consistency:** `couponState` is always consistent with `usageCount` and `expiresAt`.

---

## 5) Commands and Decisions


| Command                    | Required fields                                                   | Preconditions | Decision logic                                                                                  | State change                                        |
| -------------------------- | ----------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| CreateCoupon               | couponCode, targetCohortId, redemptionLimit?, expiresAt?, adminId | Admin role    | Validate uniqueness of couponCode                                                               | Create coupon row in `active` state                 |
| ValidateAndIncrementCoupon | couponId, userId, targetCohortId, idempotencyKey                  | Coupon exists | Check: active, not expired, under limit, user eligible, key not duplicate → accept; else reject | Increment usageCount; if at limit → set `exhausted` |


---

## 6) Domain Events Consumed / Produced

### Consumed

Coupon does not consume Ledger events; it is a command handler.

### Produced (optional / internal)


| Event                  | Triggered by               | Key fields                                               | Consumers                           |
| ---------------------- | -------------------------- | -------------------------------------------------------- | ----------------------------------- |
| CouponUsageIncremented | ValidateAndIncrementCoupon | couponId, userId, usageCount, idempotencyKey, occurredAt | Redemption aggregate; Billing audit |


- Internal event; not published to EI Ledger in v1. Deferred.

---

## 7) Ports (Interfaces — Docs Level)


| Port                    | Role   | Responsibility                                           |
| ----------------------- | ------ | -------------------------------------------------------- |
| **CouponRepository**    | Driven | Load by `couponId` or `couponCode`; save coupon state    |
| **IdempotencyKeyStore** | Driven | Check and record idempotency keys per redemption attempt |
| **Clock**               | Driven | Provide "now" for expiry check                           |


- Repository interface lives in `domain/coupon/repository.ts`.
- Application handler lives in `application/validate-and-increment-coupon/handler.ts`.
- Adapter uses `coupons` table (future).

---

## 8) Application Use-Case Contracts

**Use case 1:** `CreateCoupon`


| Aspect          | Specification                                                     |
| --------------- | ----------------------------------------------------------------- |
| **Input**       | `{ couponCode, targetCohortId, redemptionLimit?, expiresAt? }`    |
| **Output**      | Created coupon in `active` state; returns `couponId`              |
| **Errors**      | Duplicate `couponCode` (reject); missing required fields (reject) |
| **Idempotency** | Not applicable for creation (couponCode uniqueness enforces it)   |


**Use case 2:** `ValidateAndIncrementCoupon`


| Aspect            | Specification                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------- |
| **Input**         | `{ couponCode, userId, targetCohortId, idempotencyKey }`                                     |
| **Output**        | Validation result: `{ eligible: true, remainingUses }` or error                              |
| **Errors**        | Expired coupon; exhausted coupon; user not eligible; duplicate idempotency key with conflict |
| **Idempotency**   | Same idempotency key + same coupon → return existing result without re-incrementing          |
| **Preconditions** | Caller (Redemption use case) provides idempotency key                                        |


---

## 9) Consistency and Concurrency Rules


| Rule                        | Description                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Atomic check-and-increment  | Limit check and `usageCount` increment are in one transaction; concurrent redemptions must not both pass a limit of 1. |
| Single write per redemption | Idempotency key prevents duplicate increments from retried calls.                                                      |
| Conflict handling           | Reject if limit reached or coupon expired; return clear error reason.                                                  |
| Recompute                   | Not applicable (command handler); `usageCount` is the state.                                                           |


---

## 10) Test Strategy (Spec Tests)


| Scenario                | Input                                                         | Expected outcome                                      |
| ----------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| Create valid coupon     | CreateCoupon with limit=5, expiry future                      | couponState = active; usageCount = 0                  |
| Validate and increment  | ValidateAndIncrementCoupon; under limit, not expired          | Accepted; usageCount incremented                      |
| Limit reached           | ValidateAndIncrementCoupon when usageCount == redemptionLimit | Rejected; couponState = exhausted                     |
| Expired coupon          | ValidateAndIncrementCoupon after expiresAt                    | Rejected; couponState = expired                       |
| Idempotent retry        | Same idempotencyKey twice                                     | Second call returns same result; usageCount unchanged |
| Conflicting idempotency | Same idempotencyKey, different coupon                         | Reject                                                |
| Unlimited coupon        | redemptionLimit = null; many increments                       | Never exhausted by count alone                        |
| No expiry               | expiresAt = null                                              | Expiry check always passes                            |


---

## 11) Open Questions and Deferred Decisions

- CouponBatch: batch-level limits (max across a campaign of coupons) — deferred.
- Per-user redemption limit (one per user across all coupons) — deferred.
- Payment-backed coupons: paid access flow — deferred.
- Whether `CouponUsageIncremented` should be published to EI Ledger.

---

## References

- [agg-coupon.md](../aggregates/agg-coupon.md)
- [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [canvas-billing-entitlements.md](../canvas-billing-entitlements.md)

