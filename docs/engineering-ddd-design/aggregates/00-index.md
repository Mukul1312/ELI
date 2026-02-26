# Aggregates — Index

> Per [Aggregate Design Canvas](../../aggregate-design-canvas.md). Design notes for tactical DDD aggregates. See [09-tactical-ddd-candidates.md](../09-tactical-ddd-candidates.md) for value objects and future code layout.

---

| Aggregate | Owned by bounded context | Instance identity | Status | Link |
|-----------|--------------------------|-------------------|--------|------|
| TopicLoop | EI Projections (DerivedSignals) | studentId + topicId | draft | [agg-topic-loop.md](agg-topic-loop.md) |
| StudentPolicy | Strategic Adjustment | studentId | draft | [agg-student-policy.md](agg-student-policy.md) |
| StudentAggregates | EI Projections (DerivedSignals) | studentId | draft | [agg-student-aggregates.md](agg-student-aggregates.md) |
| StudentMembership | CohortAccess | studentId | draft | [agg-student-membership.md](agg-student-membership.md) |
| Coupon | BillingEntitlements | couponId | draft | [agg-coupon.md](agg-coupon.md) |
| Redemption | BillingEntitlements | redemptionId (or couponId + userId) | draft | [agg-redemption.md](agg-redemption.md) |
