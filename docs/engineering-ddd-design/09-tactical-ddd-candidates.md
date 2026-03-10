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
| StudySession | One student study session: P1→P2→P3 lifecycle; cross-protocol invariants (P1 verification floor → P3, P2 watchOnly → P3); emits NegotiatedIntentIssued, ActivationPlanIssued, VerificationDecisionIssued | One session from AppOpen to retrieval decision | [src/ei/domain/study-session/](../../src/ei/domain/study-session/), [src/ei/application/run-p1-gate/](../../src/ei/application/run-p1-gate/), [src/ei/application/run-p2-gate/](../../src/ei/application/run-p2-gate/), [src/ei/application/run-p3-gate/](../../src/ei/application/run-p3-gate/) | [canvas-ei-runtime.md](canvas-ei-runtime.md), [ei-runtime-tactical-spec.md](tactical/ei-runtime-tactical-spec.md) |
| TopicLoop | Per (studentId, topicId): effort → verification lifecycle; overdue detection | ei_topic_state + relevant events | [src/ei/domain/topic-loop/](../../src/ei/domain/topic-loop/), [src/ei/application/apply-event-to-topic-loop/](../../src/ei/application/apply-event-to-topic-loop/), [src/ei/infrastructure/projector/topic-loop-projector.ts](../../src/ei/infrastructure/projector/topic-loop-projector.ts), [src/ei/infrastructure/persistence/topic-loop-repository.pg.ts](../../src/ei/infrastructure/persistence/topic-loop-repository.pg.ts) | [agg-topic-loop.md](aggregates/agg-topic-loop.md) |
| StudentPolicy | SA dials, tightness level, constraints; read by all protocols | ei_student_policy | [src/ei/domain/student-policy/](../../src/ei/domain/student-policy/), [src/ei/application/apply-strategic-adjustment-decision/](../../src/ei/application/apply-strategic-adjustment-decision/) | [agg-student-policy.md](aggregates/agg-student-policy.md) |
| StudentAggregates | Per student: openLoops, verificationRate7d, silenceDays, startLatencyMinMedian7d | ei_student_aggregates | [src/ei/domain/student-aggregates/](../../src/ei/domain/student-aggregates/), [src/ei/application/recompute-student-aggregates/](../../src/ei/application/recompute-student-aggregates/), [src/ei/infrastructure/projector/student-aggregates-projector.ts](../../src/ei/infrastructure/projector/student-aggregates-projector.ts), [src/ei/infrastructure/persistence/](../../src/ei/infrastructure/persistence/) (repository and mappers) | [agg-student-aggregates.md](aggregates/agg-student-aggregates.md) |
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
| TopicReference | Published Language VO: `{ topicId: UUID, topicName: string }` — stable topic identity consumed by EI Runtime, Projections, Radar | (to be implemented) |
| TimeCommitment | Student-declared study duration; constrained to 10/20/45/60 minutes; feeds `NegotiatedIntent.scope.timeboxMin` when present; mode-based range midpoint fallback when absent (for variants that hide time chips) | (to be implemented) |
| HighPressureDetected | System-derived boolean: true when V3 triggers fire (`examProximityDays <= 7`, `avoidancePattern`, `recentMockFailure`); replaces retired self-reported Pressure and BacklogPressure scales; defaults to false in Stage 1; see `05-cross-cutting-concerns.md` §V3 Trigger Signals | (to be implemented) |
| DropoutSignalActive | Per-topic boolean: `consecutiveDeferrals >= 3`. Consumed by PresentationContext for Shrunk Card rendering (binary Got it / Not yet). Not a domain routing signal — P3 gate uses AVOIDANT label for routing. See `05-cross-cutting-concerns.md` §Dropout Signal | (to be implemented) |
| TopicSeed | Presentation VO: `{ topicName: string, waitingSinceDays: number }` for Dynamic Footer Seed in Phase 3 close view ("Next: [topic] waiting since [Day X]"). Sourced from oldest open TopicLoop in Projections. | (to be implemented) |

---

## Where they would live

**Implemented:** StudySession (`domain/study-session/`, `application/run-p1-gate/`, `run-p2-gate/`, `run-p3-gate/`), ViewComposer/SDUI (`sdui/` — StudySessionOrchestration presentation layer), StudentPolicy (`domain/student-policy/`, `application/apply-strategic-adjustment-decision/`), LoopHealth (`domain/loop-health/`, `application/assess-loop-health/`), **TopicLoop** (`domain/topic-loop/`, `application/apply-event-to-topic-loop/`), **StudentAggregates** (`domain/student-aggregates/`, `application/recompute-student-aggregates/`).

**Layout (implemented aggregates and use cases):**

```
src/ei/
├── domain/
│   ├── study-session/        # StudySession aggregate (implemented)
│   │   ├── study-session.ts
│   │   ├── value-objects.ts
│   │   └── protocol-engine.ts
│   ├── topic-loop/           # TopicLoop aggregate (implemented)
│   │   ├── topic-loop.ts
│   │   ├── value-objects.ts
│   │   └── events.ts
│   ├── student-aggregates/   # StudentAggregates aggregate (implemented)
│   ├── student-policy/       # StudentPolicy aggregate (implemented)
│   │   ├── student-policy.ts
│   │   └── value-objects.ts
│   ├── loop-health/          # LoopHealth domain service (implemented)
│   │   ├── loop-health-snapshot.ts
│   │   ├── assess-loop-health.ts
│   │   └── errors.ts
│   └── shared/
│       └── ids.ts            # StudentId, TopicId value objects
├── sdui/                     # StudySessionOrchestration presentation layer (implemented)
│   ├── types/
│   │   ├── sdui-contract.ts  # SduiResponse, SduiViewTree, SduiPhase, SduiAction
│   │   └── components.ts     # SduiComponent union (16 component types)
│   ├── view-composer.ts      # Pure function: VO output + PresentationContext → SduiResponse
│   ├── presentation-context.ts  # PresentationContext VO (derived from domain output, zero DB)
│   ├── microcopy/
│   │   ├── catalog.ts        # Microcopy by gate/slot/mode/play (Elder Brother tone)
│   │   └── resolver.ts       # Priority chain: play-specific → mode-specific → default
│   └── __tests__/
│       └── view-composer.test.ts  # 22 unit tests
└── application/
    ├── run-p1-gate/                    # StudySession P1 use case (implemented)
    ├── run-p2-gate/                    # StudySession P2 use case (implemented)
    ├── run-p3-gate/                    # StudySession P3 use case (implemented)
    ├── apply-event-to-topic-loop/      # (implemented)
    ├── recompute-student-aggregates/   # (implemented)
    ├── apply-strategic-adjustment-decision/  # (implemented)
    └── assess-loop-health/             # LHA use case (implemented)
        ├── command.ts
        ├── handler.ts
        └── port.ts
```

Full EI layer layout and port rules: [tactical/01-ei-tactical-conventions.md](tactical/01-ei-tactical-conventions.md).

**Planned: CurriculumCatalog** (`src/curriculum-catalog/`)

Note: No aggregate needed — CatalogTopic is a simple entity (reference data, read-heavy). NormalizationQueue is a lightweight entity, not an aggregate.

```
src/curriculum-catalog/
├── domain/
│   ├── catalog-topic.ts          # CatalogTopic entity (id, name, aliases, hierarchy refs)
│   ├── value-objects.ts          # TopicReference, ExamId, SubjectId, etc.
│   └── topic-search-service.ts   # Domain service: fuzzy match, ranking, institute priority
├── application/
│   ├── search-topics/            # Type-ahead search use case
│   ├── browse-tree/              # Hierarchical browse use case
│   ├── resolve-topic/            # Raw string → TopicReference resolution
│   └── import-curriculum/        # Institute CSV/JSON import use case
├── infrastructure/
│   ├── persistence/
│   │   ├── catalog-repository.pg.ts
│   │   └── normalization-queue.pg.ts
│   └── search/
│       └── topic-search-adapter.pg.ts  # pg_trgm or prefix-match queries
└── __tests__/
```

---

## Context-level tactical specs (cross-cutting)

Bounded contexts that have a tactical spec but no aggregate in this doc; they implement cross-cutting concerns (see [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md)).

| Context | Spec | Purpose |
|---------|------|---------|
| CohortAccess | [tactical/cohort-access-tactical-spec.md](tactical/cohort-access-tactical-spec.md) | Auth resolution (ACL), GetCohortScope, StudentMembership, RBAC |
| Ops & Observability | [tactical/ops-observability-tactical-spec.md](tactical/ops-observability-tactical-spec.md) | Debug timeline, correlation ids, repair/backfill orchestration; consumer + ops-level orchestrator; admin-only, redaction |
