# Tactical DDD Candidates

> **How to fill:** Propose 2–3 aggregates and a few value objects worth formalizing first. No code refactor yet—this is a design note for when you're ready.
>
> **Source:** [DDD-TACTICAL.md](.agents/skills/clean-ddd-hexagonal/references/DDD-TACTICAL.md)

---

## Aggregates (candidates)

| Aggregate | Responsibility | Consistency boundary | Code location (current) |
|-----------|-----------------|----------------------|-------------------------|
| TopicLoop | Per (studentId, topicId): effort → verification lifecycle; overdue detection | ei_topic_state + relevant events | ei_topic_state, appendEvent side-effects |
| StudentPolicy | SA dials, tightness level, constraints; read by all protocols | ei_student_policy | ei_student_policy, engine/strategic-adjustment |

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
