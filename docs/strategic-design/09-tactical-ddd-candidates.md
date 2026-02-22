# Tactical DDD Candidates

> **How to fill:** Propose 2–3 aggregates and a few value objects worth formalizing first. No code refactor yet—this is a design note for when you're ready.
>
> **Source:** [DDD-TACTICAL.md](.agents/skills/clean-ddd-hexagonal/references/DDD-TACTICAL.md)
>
> **Aggregate canvases:** [aggregates/00-index.md](aggregates/00-index.md)

---

## Aggregates (candidates)

| Aggregate | Responsibility | Consistency boundary | Code location (current) | Canvas |
|-----------|-----------------|----------------------|-------------------------|--------|
| TopicLoop | Per (studentId, topicId): effort → verification lifecycle; overdue detection | ei_topic_state + relevant events | ei_topic_state, appendEvent side-effects | [agg-topic-loop.md](aggregates/agg-topic-loop.md) |
| StudentPolicy | SA dials, tightness level, constraints; read by all protocols | ei_student_policy | ei_student_policy, engine/strategic-adjustment | [agg-student-policy.md](aggregates/agg-student-policy.md) |
| StudentAggregates | Per student: openLoops, verificationRate7d, silenceDays, startLatencyMinMedian7d | ei_student_aggregates | ei_student_aggregates, projection logic | [agg-student-aggregates.md](aggregates/agg-student-aggregates.md) |
| StudentMembership | Exactly one active cohort or unassigned; atomic join on redemption | student_cohort_membership | student_cohort_membership (future) | [agg-student-membership.md](aggregates/agg-student-membership.md) |
| Coupon | Eligibility, limits, expiry; idempotency for redemptions | coupons | coupons (future) | [agg-coupon.md](aggregates/agg-coupon.md) |
| Redemption | Idempotent record of coupon use; triggers membership change | coupon_redemptions | coupon_redemptions (future) | [agg-redemption.md](aggregates/agg-redemption.md) |

---

## Value objects (candidates)

| Value object | Purpose | Current |
|--------------|---------|---------|
| StudentId | Identity wrapper; avoid stringly-typed IDs | string |
| TopicId | Same | string |
| SleepBucket | Valid enum; used in score, classify | enum |
| Mode | Rescue / Neutral / Boost | enum |
| TightnessLevel | Loose / Normal / Tight | enum |
| OccurredAt | ISO datetime; validation | string |

---

## Where they would live (future refactor)

```
src/domain/
├── topic-loop/           # TopicLoop aggregate
│   ├── topic-loop.ts
│   ├── value-objects.ts
│   └── events.ts
├── student-policy/       # StudentPolicy aggregate
│   ├── student-policy.ts
│   └── value-objects.ts
└── shared/
    └── ids.ts            # StudentId, TopicId value objects
```

<!-- Fill: Refine when you start tactical implementation. Keep DDD-lite: minimal ceremony. -->
