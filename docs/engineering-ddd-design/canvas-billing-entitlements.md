# Bounded Context Canvas — BillingEntitlements

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** BillingEntitlements  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md)
**See also (cross-cutting):** [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — invariants, event catalog, data ownership, ACLs

---

## Name

BillingEntitlements

---

## Purpose

Provision paid access to EI by issuing entitlements (self purchase, sponsor seats, coupons), recording redemptions, and maintaining a billing/audit system of record. Eligibility, limits, expiry, and idempotency are owned here; coupon rules/issuance/audit owned here. (Future context in current map.)

---

## Strategic Classification

| Dimension               | Choice       | Notes                                                          |
| ----------------------- | ------------ | -------------------------------------------------------------- |
| **Domain**              | generic      | Standard billing and entitlement patterns                      |
| **Business model role** | revenue      | Paid access; coupons, subscriptions, sponsor seats             |
| **Evolution**           | product      | Payment provider integration; coupon campaigns; future         |

---

## Domain Roles

- **Gateway context:** Redemption lifecycle; entitlement grant, extend, revoke, expire
- **Analysis context:** Audit trail; reporting for finance/support

---

## Ubiquitous Language (in this context)

| Term           | Definition (in this context)                                                             |
| -------------- | ---------------------------------------------------------------------------------------- |
| Entitlement    | Scope + expiry; grants access to EI                                                       |
| Coupon         | Redemption token; eligibility, limit, expiration                                          |
| CouponBatch    | Campaign or batch of coupons; shared rules                                                |
| Redemption     | Idempotent record of coupon use; triggers membership change via CohortAccess              |
| Eligibility    | Who can redeem; checked with CohortAccess                                                 |
| Limit          | Per-coupon, per-cohort, per-campaign max redemptions                                      |
| Expiration     | Coupon and entitlement expiry                                                             |
| BillingAuditLog| System of record for paid access; finance/support investigations                          |
| PaymentIntent  | Payment provider abstraction; charge, refund                                              |
| Refund         | Chargeback/refund semantics                                                                |

---

## Inbound Communication

| Collaborator | Message type   | Message name                          | Key data                                  | Integration style | Relationship (from context map) |
| ------------ | -------------- | ------------------------------------- | ----------------------------------------- | ---------------- | ------------------------------- |
| CohortAccess | Query response | Who can redeem; membership change     | userId, eligibility, targetCohortId       | Sync / event     | Customer-Supplier               |

---

## Outbound Communication

| Message type   | Message name              | Collaborator        | Key data                               | Integration style    | Relationship      |
| -------------- | ------------------------- | ------------------- | -------------------------------------- | -------------------- | ----------------- |
| Command        | Membership change on redemption | CohortAccess | membership update request, cohortId    | Sync / event         | Customer-Supplier |
| Query response | Billing audit             | Ops & Observability | redemptions, entitlement status         | Read-only query      | Customer-Supplier |

---

## Business Decisions

- **System of record for paid access:** Entitlements, redemptions, audit trail owned here.
- **Eligibility, limits, expiry, idempotency:** Coupon validation rules; no unauthorized access grant.
- **Coupon rules/issuance/audit owned here:** CohortAccess supplies "who can redeem"; Billing owns coupon semantics.
- **Atomic join on valid redemption:** Valid redemption → invoke CohortAccess to update membership.

---

## Assumptions

- CohortAccess provides eligibility check and membership update API before Billing processes redemption.
- Payment provider webhooks and Idempotency are handled within this context.
- BillingEntitlements is planned (future); integration patterns align with context map.

---

## Verification Metrics

- No unauthorized access grant; redemption flow enforces eligibility and limits.
- Audit trail supports finance/support investigations.
- Idempotent redemptions; no double membership grant.

---

## Open Questions

- Payment provider selection and webhook handling.
- Trial and subscription lifecycle (if applicable).
- BillingEntitlements implementation timeline and integration sequence.
