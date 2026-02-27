# Aggregate Design Canvas — Coupon

**Tactical spec:** [coupon-tactical-spec.md](../tactical/coupon-tactical-spec.md)

**Owned by bounded context:** BillingEntitlements
**Related subdomain(s):** BillingEntitlements
**Sources:** [02-subdomains.md](../02-subdomains.md), [03-context-map.md](../03-context-map.md), [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
**Code pointers (current):** `coupons` (future)

---

## 1) Name

- **Aggregate:** Coupon
- **Aggregate Type:** Command Handler — owns coupon rules; creation, validation, redemption eligibility
- **Instance identity:** couponId
- **Lifetime:** From creation until expiration (or infinite if no expiry)

---

## 2) Description

- **Responsibility:** Own coupon semantics: eligibility rules, redemption limits (per-coupon, per-cohort, per-campaign), expiration. System of record for coupon validation. Idempotency and redemption limits enforced here.
- **Why these boundaries:** Coupon is the unit of redemption; one coupon code maps to one Coupon aggregate. Eligibility and limits must be checked atomically before Redemption is created.
- **Trade-offs:** We do NOT own membership; Redemption triggers CohortAccess. We do NOT own payment; PaymentIntent/Refund are separate. CouponBatch is reference/campaign data; Coupon holds per-code rules.

---

## 2b) Dependencies

- **CohortAccess:** Supplies "who can redeem" (eligibility check with userId, targetCohortId). BillingEntitlements validates coupon before invoking CohortAccess for membership change.
- **Redemption:** Consumes Coupon for limit checks; Coupon does not depend on Redemption state beyond count.

---

## 3) State Transitions

- **States:** active | expired | exhausted (limits reached)
- **Transitions:** Create to active. Time or limit check to expired or exhausted. Redemption increments usage.
- **Invariant:** Redemption count less than or equal to limit; expiry enforced.

---

## 4) Enforced Invariants

Per [canvas-billing-entitlements.md](../canvas-billing-entitlements.md) and [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md):

- **Eligibility, limits, expiry:** No unauthorized access grant; redemption flow enforces eligibility and limits.
- **Idempotency:** Retries must not create duplicate redemptions; idempotency key or deterministic check.
- **Atomic validation:** Coupon rules checked atomically before Redemption creation.

---

## 5) Corrective Policies

- **Expired coupon:** Reject redemption; no corrective action.
- **Limit exceeded:** Reject redemption; audit log for support.
- **Idempotent retry:** Same idempotency key returns existing Redemption; no double grant.

---

## 6) Handled Commands

| Command | Preconditions | State changes | Notes |
|---------|---------------|---------------|-------|
| CreateCoupon | Admin/campaign | active state, rules set | Coupon creation |
| RedeemCoupon (validate) | couponCode valid, not expired, under limit, user eligible | Usage count incremented (or Redemption created) | Validation is command; Redemption is separate aggregate |

---

## 7) Created Events

| Event | Triggered by (command) | Key fields | Consumers |
|-------|------------------------|------------|-----------|
| (Internal/optional) | RedeemCoupon | couponId, userId, redeemedAt | Redemption aggregate; Billing audit |

---

## 7b) Supported Queries

| Query | Key params | Returns | Notes |
|-------|------------|---------|-------|
| Validate coupon | couponCode, userId, targetCohortId | eligible, limit remaining, expiry | Called before Redemption creation |

---

## 8) Throughput (concurrency risk)

| Metric | Average | Maximum | Notes |
|--------|---------|---------|-------|
| Command handling rate | Low | Medium | Redemption spikes during campaigns |
| Total number of clients | Many per coupon | Many | One coupon, many redeemers |
| Concurrency conflict chance | Medium | Medium | Limit check plus increment must be atomic |

---

## 9) Size

| Metric | Average | Maximum | Notes |
|--------|---------|---------|-------|
| Event growth rate | Low | Medium | Per redemption |
| Lifetime of a single instance | Campaign period | Indefinite | Until expired or exhausted |
| Number of events persisted | TBD | TBD | Redemptions link to couponId |

---

## 9b) Storage & Projection

| Aspect | Value | Notes |
|--------|-------|-------|
| Table(s) / store | `coupons` | Per [05-cross-cutting-concerns.md#data-ownership](../05-cross-cutting-concerns.md#data-ownership) (Billing/Sponsor) |
| Write path | Admin/campaign (create); Redemption (usage update) | Sync |
| Read path | Redemption flow (validate); Ops (audit) | Sync |
| Replay / recompute | No (command handler) | Coupon state is source of truth |

---

## Open questions

- CouponBatch vs Coupon: batch-level limits and campaign scope?
- Payment provider integration for paid coupons?
