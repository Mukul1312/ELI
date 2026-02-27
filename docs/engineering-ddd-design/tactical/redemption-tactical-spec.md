# Redemption — Tactical DDD Spec

> Docs-only specification for implementing Redemption. Source: [agg-redemption.md](../aggregates/agg-redemption.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md).

---

## 1) Purpose and Boundary

- **Aggregate root:** Redemption
- **Aggregate type:** Command Handler — idempotent audit record; triggers downstream membership change.
- **Identity:** `redemptionId` (or `couponId + userId` as natural key for idempotency).
- **Responsibility:** Idempotent record of a coupon use. Own the redemption audit trail. Trigger `MembershipChangeOnRedemption` via CohortAccess after Coupon has been validated. System of record for "who redeemed when."
- **Non-goals (outside Redemption):**
  - Coupon eligibility or limit validation — lives in Coupon aggregate (must run first).
  - Membership state transition — lives in StudentMembership aggregate.
  - Billing reporting beyond audit — separate concern.
  - Payment flow — deferred (separate aggregate / external system).

---

## 2) Ubiquitous Language (Tactical Terms)

| Term | Definition |
|------|------------|
| RedemptionId | Identity of this aggregate (UUID; system-generated) |
| CouponId | Identifier of the coupon being redeemed |
| UserId | The student redeeming the coupon (server-derived from auth) |
| TargetCohortId | The cohort the student is joining via redemption |
| RedeemedAt | ISO datetime when redemption was completed |
| IdempotencyKey | Client-supplied key (or `couponId + userId`) to prevent duplicate redemptions |
| RedemptionState | `created` (immutable once created) |
| MembershipChangeOnRedemption | Command sent to StudentMembership as part of the redemption flow |

---

## 3) State Model

| Field | Type | Semantics |
|-------|------|-----------|
| redemptionId | string (UUID) | Identity |
| couponId | string | Which coupon was redeemed |
| userId | string | Which student redeemed |
| targetCohortId | string | Which cohort the student joined |
| idempotencyKey | string | Prevents duplicate creations |
| redeemedAt | ISO datetime | When redemption occurred |
| redemptionState | `created` | Immutable; no updates |

- **Lifecycle:** `created` — no further transitions. Once created, the record is permanent.
- **Initial:** No row until first valid `RedeemCoupon` for this (couponId + userId) pair.

---

## 4) Invariants (Must Hold Atomically)

Per [agg-redemption.md](../aggregates/agg-redemption.md) and [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md):

1. **Idempotency:** Same idempotency key (or same `couponId + userId`) must not create a second Redemption. Duplicate attempt returns the existing record.
2. **Atomic join:** Redemption creation and `MembershipChangeOnRedemption` must be atomic; no orphaned membership without Redemption audit record, and no Redemption without membership update.
3. **Immutability:** Once created, a Redemption record is never updated or deleted.
4. **Pre-validated:** Redemption is only created after Coupon has been validated. Redemption does not re-validate.

---

## 5) Commands and Decisions

| Command | Required fields | Preconditions | Decision logic | State change |
|---------|-----------------|---------------|----------------|--------------|
| RedeemCoupon | couponId, userId, targetCohortId, idempotencyKey | Coupon validated by Coupon aggregate (eligible, under limit, not expired) | Check idempotency key; if duplicate → return existing; else create record and invoke MembershipChangeOnRedemption | Create Redemption row; invoke StudentMembership |

---

## 6) Domain Events Consumed / Produced

### Consumed

Redemption does not consume Ledger events; it is a command handler.

### Produced

| Event | Triggered by | Key fields | Consumers |
|-------|-------------|------------|-----------|
| MembershipChangeOnRedemption | RedeemCoupon | userId, targetCohortId, redemptionId, redeemedAt | StudentMembership (CohortAccess); Billing audit |
| (Internal) | RedeemCoupon | redemptionId, couponId, userId, targetCohortId, redeemedAt | Billing audit; Ops |

- The `MembershipChangeOnRedemption` is a command to StudentMembership, not a Ledger event in v1.

---

## 7) Ports (Interfaces — Docs Level)

| Port | Role | Responsibility |
|------|------|----------------|
| **RedemptionRepository** | Driven | Load by `redemptionId` or `(couponId, userId)`; save Redemption record |
| **MembershipPort** | Driven | Invoke StudentMembership to update cohort on valid redemption |
| **CouponPort** | Driven | Read Coupon state (validate eligibility before creating Redemption) |
| **IdempotencyKeyStore** | Driven | Check and record idempotency keys |

- Repository interface lives in `domain/redemption/repository.ts`.
- Application handler lives in `application/redeem-coupon/handler.ts`.
- Adapter uses `coupon_redemptions` table (future).

---

## 8) Application Use-Case Contract

**Use case:** `RedeemCoupon`

| Aspect | Specification |
|--------|---------------|
| **Input** | `{ couponCode, userId, targetCohortId, idempotencyKey }` |
| **Output** | `{ redemptionId, redeemedAt, membershipState }` |
| **Errors** | Coupon invalid (expired, exhausted, user not eligible) — from Coupon validation; duplicate idempotency key with conflicting data (reject) |
| **Idempotency** | Same idempotency key + same coupon + same user → return existing Redemption; no second creation or membership change |
| **Preconditions** | `userId` server-derived from auth session; idempotency key provided by caller |
| **Orchestration** | 1. Validate coupon (Coupon port) → 2. Create Redemption record → 3. Invoke MembershipChangeOnRedemption (all atomic) |

---

## 9) Consistency and Concurrency Rules

| Rule | Description |
|------|-------------|
| Atomic join | Redemption creation + membership update in one transaction; no partial outcome. |
| Idempotency key | Enforces exactly-once semantics per (couponId + userId) pair; retry-safe. |
| Immutability | No updates to Redemption record after creation. |
| Concurrency conflict | Two concurrent redemptions for the same (couponId + userId): idempotency key deduplicate; only one Redemption created. |
| Audit trail | Redemption record supports finance/support investigation; no automatic rollback. |

---

## 10) Test Strategy (Spec Tests)

| Scenario | Input | Expected outcome |
|----------|-------|------------------|
| Valid first redemption | RedeemCoupon; valid coupon, new user | Redemption created; membership updated to active(targetCohortId) |
| Duplicate redemption | Same idempotencyKey, same inputs | Return existing Redemption; no second membership change |
| Conflicting duplicate | Same idempotencyKey, different targetCohortId | Reject |
| Coupon validation failure | Invalid/expired coupon | Reject before creating Redemption; no membership change |
| Membership update failure | Redemption created but MembershipPort fails | Transaction rolled back; Redemption not persisted |
| Missing userId | Command without userId | Reject at use-case boundary |
| Audit retrieval | Query by couponId + date range | Return Redemption history |

---

## 11) Open Questions and Deferred Decisions

- Idempotency key format: client-supplied UUID vs. deterministic `hash(couponId + userId)`.
- Whether to publish a Ledger event on redemption for downstream analytics.
- Refund / revoke path: reversing a redemption and revoking membership — deferred.
- Integration event for explicit Billing event stream — deferred.

---

## References

- [agg-redemption.md](../aggregates/agg-redemption.md)
- [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- [canvas-billing-entitlements.md](../canvas-billing-entitlements.md)
- [coupon-tactical-spec.md](coupon-tactical-spec.md)
- [student-membership-tactical-spec.md](student-membership-tactical-spec.md)
