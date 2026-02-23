# Tactical DDD Candidates

> **How to fill:** Propose 2–3 aggregates and a few value objects worth formalizing first. No code refactor yet—this is a design note for when you're ready.
>
> **Source:** [DDD-TACTICAL.md](.agents/skills/clean-ddd-hexagonal/references/DDD-TACTICAL.md)
>
> **Aggregate canvases:** [aggregates/00-index.md](aggregates/00-index.md)  
**Domain service canvases:** [domainService/00-index.md](domainService/00-index.md)

---

## Aggregates (candidates)

| Aggregate | Responsibility | Consistency boundary | Code location (current) | Canvas |
|-----------|-----------------|----------------------|-------------------------|--------|
| TopicLoop | Per (studentId, topicId): effort → verification lifecycle; overdue detection | ei_topic_state + relevant events | ei_topic_state, appendEvent side-effects | [agg-topic-loop.md](aggregates/agg-topic-loop.md) |
| StudentPolicy | SA dials, tightness level, constraints; read by all protocols | ei_student_policy | [src/ei/domain/student-policy/](../../src/ei/domain/student-policy/), [src/ei/application/apply-strategic-adjustment-decision/](../../src/ei/application/apply-strategic-adjustment-decision/) | [agg-student-policy.md](aggregates/agg-student-policy.md) |
| StudentAggregates | Per student: openLoops, verificationRate7d, silenceDays, startLatencyMinMedian7d | ei_student_aggregates | ei_student_aggregates, projection logic | [agg-student-aggregates.md](aggregates/agg-student-aggregates.md) |
| StudentMembership | Exactly one active cohort or unassigned; atomic join on redemption | student_cohort_membership | student_cohort_membership (future) | [agg-student-membership.md](aggregates/agg-student-membership.md) |
| Coupon | Eligibility, limits, expiry; idempotency for redemptions | coupons | coupons (future) | [agg-coupon.md](aggregates/agg-coupon.md) |
| Redemption | Idempotent record of coupon use; triggers membership change | coupon_redemptions | coupon_redemptions (future) | [agg-redemption.md](aggregates/agg-redemption.md) |

---

## Domain services (candidates)

| Domain Service | Responsibility | Dependencies | Code location (current) | Canvas |
|----------------|----------------|--------------|-------------------------|--------|
| LoopHealth | Interpret metrics to labels + LoopHealthSnapshot | GetStudentSignals (Projections) | [src/ei/domain/loop-health/](../../src/ei/domain/loop-health/), [src/ei/application/assess-loop-health/](../../src/ei/application/assess-loop-health/) | [canvas-loop-health-assessment.md](canvas-loop-health-assessment.md), [ds-loop-health.md](domainService/ds-loop-health.md) |

---

## Value objects (candidates)

| Value object | Purpose | Current |
|--------------|---------|---------|
| StudentId | Identity wrapper; avoid stringly-typed IDs | string |
| TopicId | Same | string |
| LoopHealthSnapshot | Labels + evidence output contract; consumed by Runtime, SA, Radar | (to be implemented) |
| LoopHealthEvidence | Privacy-safe subset of evidence numbers | (to be implemented) |
| SleepBucket | Valid enum; used in score, classify | enum |
| Mode | Rescue / Neutral / Boost | enum |
| TightnessLevel | Loose / Normal / Tight | enum |
| OccurredAt | ISO datetime; validation | string |

---

## Where they would live

**Implemented:** StudentPolicy (`domain/student-policy/`, `application/apply-strategic-adjustment-decision/`), LoopHealth (`domain/loop-health/`, `application/assess-loop-health/`).

**Future refactor:**

```
src/ei/
├── domain/
│   ├── topic-loop/           # TopicLoop aggregate (planned)
│   │   ├── topic-loop.ts
│   │   ├── value-objects.ts
│   │   └── events.ts
│   ├── student-policy/       # StudentPolicy aggregate (implemented)
│   │   ├── student-policy.ts
│   │   └── value-objects.ts
│   ├── loop-health/          # LoopHealth domain service (implemented)
│   │   ├── loop-health-snapshot.ts
│   │   ├── assess-loop-health.ts
│   │   └── errors.ts
│   └── shared/
│       └── ids.ts            # StudentId, TopicId value objects
└── application/
    ├── apply-strategic-adjustment-decision/  # (implemented)
    └── assess-loop-health/                   # LHA use case (implemented)
        ├── command.ts
        ├── handler.ts
        └── port.ts
```

<!-- Full EI layout: tactical/01-ei-tactical-conventions.md -->
