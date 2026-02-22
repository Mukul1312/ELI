# Tactical DDD — Index

> Docs-only tactical specs for aggregates, prepared before implementation. Shared conventions are in `01-ei-tactical-conventions.md`. Links to strategic design docs.

---

## Shared Conventions

| Doc | Purpose |
|-----|---------|
| [01-ei-tactical-conventions.md](01-ei-tactical-conventions.md) | Layer-first code layout, port placement rules, aggregate types, time semantics, idempotency, DDD-lite guardrails, test strategy |

---

## Aggregate Tactical Specs

| Aggregate | Owned by | Type | Spec | Purpose |
|-----------|----------|------|------|---------|
| TopicLoop | EI Projections | Projection | [topic-loop-tactical-spec.md](topic-loop-tactical-spec.md) | Effort-to-verification lifecycle; monotonic timestamps; consumed events; ports; test scenarios |
| StudentPolicy | Strategic Adjustment | Hybrid | [student-policy-tactical-spec.md](student-policy-tactical-spec.md) | Next-cycle policy: tightness level, dials, constraints; written by SA; read by protocols |
| StudentAggregates | EI Projections | Projection | [student-aggregates-tactical-spec.md](student-aggregates-tactical-spec.md) | Rolled-up student-level metrics (openLoops, verificationRate7d, silenceDays, etc.) over 7d windows |
| StudentMembership | CohortAccess | Command Handler | [student-membership-tactical-spec.md](student-membership-tactical-spec.md) | Exactly-one-cohort invariant; admin enroll; redemption-triggered membership change |
| Coupon | BillingEntitlements | Command Handler | [coupon-tactical-spec.md](coupon-tactical-spec.md) | Coupon eligibility, limit enforcement, expiry, atomic check-and-increment |
| Redemption | BillingEntitlements | Command Handler | [redemption-tactical-spec.md](redemption-tactical-spec.md) | Idempotent redemption audit record; triggers StudentMembership on valid coupon use |

---

## References

- Strategic index: [00-index.md](../00-index.md)
- Aggregate canvases: [aggregates/00-index.md](../aggregates/00-index.md)
- Cross-cutting concerns: [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
- Clean DDD skill: `.agents/skills/clean-ddd-hexagonal/SKILL.md`
