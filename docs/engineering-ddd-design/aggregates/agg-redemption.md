# Aggregate Design Canvas — Redemption

**Tactical spec:** [redemption-tactical-spec.md](../tactical/redemption-tactical-spec.md)

**Owned by bounded context:** BillingEntitlements
**Related subdomain(s):** BillingEntitlements
**Sources:** [02-subdomains.md](../02-subdomains.md), [03-context-map.md](../03-context-map.md), [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
**Code pointers (current):** `coupon_redemptions` (future)

---

## 1) Name

- **Aggregate:** Redemption
- **Aggregate Type:** Command Handler — handles RedeemCoupon; idempotent record
- **Instance identity:** redemptionId (or couponId + userId for idempotency)
- **Lifetime:** Immutable once created; permanent audit record

---

## 2) Description

- **Responsibility:** Idempotent record of coupon use. Own redemption audit trail. Triggers membership change via CohortAccess (atomic join on valid redemption). System of record for "who redeemed when."
- **Why these boundaries:** One Redemption per (coupon, user) for idempotency; prevents double membership grant. Atomic with Coupon limit increment and CohortAccess membership update.
- **Trade-offs:** We do NOT own coupon validation; Coupon aggregate validates before Redemption creation. We do NOT own membership; we invoke CohortAccess. Redemption is the trigger, not the enforcer.

---

## 2b) Dependencies

- **Coupon:** Must validate (eligible, under limit, not expired) before Redemption created. Coupon usage incremented on successful Redemption.
- **CohortAccess:** Invoked to update membership on Redemption creation. BillingEntitlements triggers; CohortAccess enforces.

---

## 3) State Transitions

- **States:** created (immutable)
- **Transitions:** RedeemCoupon (validated) → created. No updates or deletes.
- **Invariant:** Idempotent; same (couponId, userId) or idempotency key → same Redemption.

---

## 4) Enforced Invariants

Per [canvas-billing-entitlements.md](../canvas-billing-entitlements.md) and [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md):

- **Idempotency:** Retries must not create duplicate Redemption. Idempotency key or (couponId + userId) uniqueness.
- **Atomic join:** Valid redemption → invoke CohortAccess to update membership; no orphaned membership without redemption.
- **Audit trail:** Redemption record supports finance/support investigations.

---

## 5) Corrective Policies

- **Idempotent retry:** Same idempotency key → return existing Redemption; do not create duplicate.
- **Invalid redemption attempt:** Reject; no Redemption created; no membership change.
- **Reconciliation:** Audit log for investigations; no automatic rollback of membership.

---

## 6) Handled Commands


| Command      | Preconditions                                                                                              | State changes                                 | Notes               |
| ------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------- |
| RedeemCoupon | Coupon validated (eligible, under limit, not expired); userId, couponCode, targetCohortId; idempotency key | Create Redemption record; invoke CohortAccess | Idempotent on retry |


---

## 7) Created Events


| Event                        | Triggered by (command) | Key fields                                 | Consumers                   |
| ---------------------------- | ---------------------- | ------------------------------------------ | --------------------------- |
| MembershipChangeOnRedemption | RedeemCoupon           | userId, targetCohortId, redemptionId       | CohortAccess; Billing audit |
| (Internal)                   | RedeemCoupon           | redemptionId, couponId, userId, redeemedAt | Billing audit; Ops          |


---

## 7b) Supported Queries


| Query         | Key params                   | Returns            | Notes               |
| ------------- | ---------------------------- | ------------------ | ------------------- |
| Billing audit | userId, couponId, date range | Redemption history | Ops & Observability |


---

## 8) Throughput (concurrency risk)


| Metric                      | Average              | Maximum | Notes                                                          |
| --------------------------- | -------------------- | ------- | -------------------------------------------------------------- |
| Command handling rate       | Low                  | Medium  | Redemption spikes during campaigns                             |
| Total number of clients     | 1 per (coupon, user) | 1       | Idempotent; one redemption per user per coupon                 |
| Concurrency conflict chance | Low                  | Low     | Idempotency key deduplicates; single writer per (coupon, user) |


---

## 9) Size


| Metric                        | Average          | Maximum   | Notes                     |
| ----------------------------- | ---------------- | --------- | ------------------------- |
| Event growth rate             | Low              | Medium    | One record per redemption |
| Lifetime of a single instance | Permanent        | Permanent | Immutable audit record    |
| Number of events persisted    | 1 per redemption | —         | In coupon_redemptions     |


---

## 9b) Storage & Projection


| Aspect             | Value                            | Notes                                                                                                               |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Table(s) / store   | `coupon_redemptions`             | Per [05-cross-cutting-concerns.md#data-ownership](../05-cross-cutting-concerns.md#data-ownership) (Billing/Sponsor) |
| Write path         | RedeemCoupon command             | Sync; atomic with Coupon and CohortAccess                                                                           |
| Read path          | Ops (audit), Billing (reporting) | Read-only query                                                                                                     |
| Replay / recompute | No (command handler)             | Redemption is append-only audit; no recompute                                                                       |


---

## Open questions

- Idempotency key format: redemptionId vs (couponId + userId)?
- Explicit integration event for redemption (e.g. for analytics)?

