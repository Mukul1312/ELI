# Cross-Cutting Concerns

Single source for invariants, event contracts, data ownership, and ACLs. Canvases link here for cross-cutting design decisions.

---

## Invariants

> **How to fill:** List system invariants—things that must never break. These are your "constitution." When adding features or refactoring, check that no invariant is violated.

---

### Event ledger invariants

| Invariant | Description |
|-----------|-------------|
| **Immutability** | Events are append-only. No updates or deletes. |
| **Idempotency** | Retries must not create duplicate events. Every write endpoint supports idempotency key or deterministic event id. |
| **Schema strictness** | Every event payload validates against strict schema per event type. Unknown keys rejected. |

**Idempotency implementation guidance:**
- **Ledger append:** Producers (SA, setPolicyTool, event-store) should pass an idempotency key when appending events. The Ledger or adapter checks `idempotency_keys` before insert; duplicate key returns existing event id (no new row).
- **Projections:** Idempotent by design (GREATEST / recompute). No Ledger idempotency key needed for consumed events; projection logic is deterministic.
- **Command-style Ledger appends (e.g. StrategicAdjustmentDecision):** Require idempotency key for retry safety. Recommended key format: `{context}:{eventType}:{studentId}:{issuedAt}` or client-provided.

Implementation: `ei_idempotency_keys` table (key, event_id, created_at) and optional `idempotencyKey` parameter on `insertEvent`. SA workflow and setPolicyTool pass key `sa:StrategicAdjustmentDecision:{studentId}:{issuedAt}`; event-store tool accepts optional `idempotencyKey` in input. See `src/ei/db/migrate.ts` and `src/ei/db/queries.ts`.

---

### Projection invariants

| Invariant | Description |
|-----------|-------------|
| **Monotonic topic state** | `last_effort_at`, `last_retrieval_at`, `last_scheduled_due_at` must never move backward (out-of-order or late events handled via GREATEST semantics). |
| **Replaceability** | Aggregates, policy, radar can be recomputed from events. No source of truth outside event log for derived state. |

---

### Protocol invariants

| Invariant | Description |
|-----------|-------------|
| **Determinism** | Same inputs + same projections → same protocol output. No randomness in gate decisions. |
| **Integrity-first** | At SessionEnd, no retrieval + no schedule → AVOIDANT → Rescue. (Precedence rule 1.) |
| **Risk overrides ambition** | OpenLoops high or SilenceDays elevated → no Boost even if state taps look strong. |
| **Single interpretation** | Thresholds and labels live in LoopHealthAssessment; EI Runtime, SA, Radar consume LoopHealthSnapshot only. |
| **Privacy-safe evidence** | LoopHealthSnapshot exposes only aggregated numbers and labels; never raw events or private content. |

---

### Privacy invariants

| Invariant | Description |
|-----------|-------------|
| **Privacy boundary** | Institute APIs never expose raw events, journaling, or private content. Only aggregated signals + alert types. |
| **Server-derived identity** | Server derives `student_id` from auth session. Never trust client-provided `studentId` for authorization. |

### Error conventions

Domain errors for invariants; Application errors for use-case boundary validation. See [tactical/01-ei-tactical-conventions.md](tactical/01-ei-tactical-conventions.md) Section 7b.

---

## Event Catalog

> **Event Catalog and Contracts.** How to fill: For each event type, document: required fields, producer, consumer(s), projection side-effects. Add an **Integration events** subsection for published, versioned schemas consumed by external or cross-context systems (e.g. Radar, Institute).
>
> **Checklist item #6:** Define integration event schemas.
>
> **Code reference:** [src/ei/schemas/events.ts](../../src/ei/schemas/events.ts), [src/ei/schemas/outputs.ts](../../src/ei/schemas/outputs.ts)

---

### Internal event catalog

| Event type | Required fields | Producer | Consumer(s) | Projection side-effects |
|------------|-----------------|----------|-------------|--------------------------|
| AppOpen | studentId, energy, openedAt | UI | P1, Ledger | — |
| IntentSet | studentId, topic, setAt | UI | P2, Ledger | — |
| SessionEnd | studentId, topic, endedAt | UI | P3, Ledger | ei_topic_state.last_effort_at |
| NegotiatedIntentIssued | studentId, mode, topic, scope, verificationPlan, issuedAt | P1 | Ledger, P3 (cross-protocol floor) | — |
| ActivationPlanIssued | studentId, mode, firstAction, issuedAt | P2 | Ledger, P3 (watch-only flag) | — |
| VerificationDecisionIssued | studentId, mode, topic, verificationDecision, issuedAt | P3 | Ledger | — |
| IntentResponse | studentId, negotiatedIntentId, decision, respondedAt | UI | Ledger | — |
| FirstActionStarted | studentId, topic, startedAt | UI | Ledger | — |
| Replan | studentId, topic, replannedAt | UI | Ledger | — |
| RetrievalVerified | studentId, topic, verifiedAt | UI | Ledger | ei_topic_state.last_retrieval_at |
| RetrievalScheduled | studentId, topic, dueAt, scheduledAt | UI | Ledger | ei_topic_state.last_scheduled_due_at |
| RetrievalSkipped | studentId, topic, reason, skippedAt | UI | Ledger | — |
| VerificationCompleted | studentId, topic, completedAt, result | UI | Ledger | ei_topic_state.last_retrieval_at |
| ScheduleMissed | studentId, topic, missedAt | System/Projection | Ledger | — |
| StrategicAdjustmentDecision | studentId, adjustmentMode, dials, issuedAt; optional: tightnessLevel, nextCycleConstraints | SA, setPolicyTool | Projections | ei_student_policy |

> **Topic ID evolution (Stage 1):** Events currently use `topic: z.string()` (raw student input). After CurriculumCatalog ships, new events will use `topicId: UUID` (stable catalog reference) + `topicName: string` (display) + optional `topicRaw: string` (original input for normalization queue). Old events are never backfilled (append-only invariant). Projections reconcile legacy string-based topics to catalog UUIDs via alias lookup in CurriculumCatalog. See [14-topic-selection-system.md](../student-ux-architecture/14-topic-selection-system.md) § Schema Migration.

---

### ei_topic_state projection storage

In addition to the timestamp columns listed in the event catalog table (`last_effort_at`, `last_retrieval_at`, `last_scheduled_due_at`), `ei_topic_state` stores derived 7-day counts: **effort_count_7d** (SessionEnd events in the last 7 days per topic) and **retrieval_count_7d** (RetrievalVerified/VerificationCompleted in the last 7 days per topic). These are persisted when the TopicLoop projection is saved (e.g. in the TopicLoop repository adapter) and are used by Strategic Adjustment and other consumers that need 7d counts per topic without querying the event stream at read time.

---

### Integration event schemas

> **Purpose:** Published, versioned schemas for cross-context or external consumers. EI never exposes raw event payloads externally.

#### Radar alert (Institute-facing)

Schema for alerts consumed by Institute dashboard. Privacy-safe: no raw events, no PII.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://api.ei.example.com/events/radar/alert/v1.json",
  "title": "RadarAlert",
  "description": "Privacy-safe risk alert for institute dashboard",
  "type": "object",
  "required": ["studentId", "batchId", "alertType", "severity", "evidenceSummary", "recommendedAction"],
  "properties": {
    "studentId": { "type": "string", "format": "uuid" },
    "batchId": { "type": "string" },
    "alertType": { "enum": ["Silence", "IntegrityDebt", "VerificationDrop", "BurnoutRunway", "SubjectAvoidance"] },
    "severity": { "enum": ["low", "medium", "high", "critical"] },
    "evidenceSummary": {
      "type": "object",
      "additionalProperties": true,
      "description": "Aggregated metrics only; no raw event content"
    },
    "recommendedAction": { "type": "string" },
    "lastUpdatedAt": { "type": "string", "format": "date-time" }
  }
}
```

#### LoopHealthSnapshot (cross-context)

Schema for loop health interpretation consumed by EI Runtime, Strategic Adjustment, Institute Radar. Producer: LoopHealthAssessment. Privacy-safe: labels (p1, p2, p3) + aggregated evidence only.

| Field | Type | Description |
|-------|------|-------------|
| studentId | string | |
| p1, p2, p3 | P1Label, P2Label, P3Label | Labels |
| mode | Rescue \| Neutral \| Boost | |
| evidence | LoopHealthEvidence | openLoops, verificationRate7d, silenceDays, etc. (aggregated only) |
| computedAt | ISO8601 | |

See [domainService/ds-loop-health.md](domainService/ds-loop-health.md), [tactical/loop-health-assessment-tactical-spec.md](tactical/loop-health-assessment-tactical-spec.md).

<!-- Fill: Add other integration events (e.g. cohort enrollment, coupon redemption) as needed. -->

---

## Data Ownership

> **How to fill:** Assign each table or logical data area to a bounded context. DDD-lite: one physical DB is fine; "own data store" = ownership and consistency boundary.
>
> **Checklist item #7:** Ensure each context has its own data store (logical ownership).

---

### Table → context ownership

| Table / area          | Context         | Owner responsibility                     |
| --------------------- | --------------- | ---------------------------------------- |
| ei_events             | EI Event Ledger | Append-only; query by student_id         |
| ei_topic_state        | EI Projections  | Derived from events; TopicLoop lifecycle |
| ei_student_aggregates | EI Projections  | Recomputed from events; 7d signals       |
| ei_student_policy     | EI Projections  | Persisted by Projections from Ledger events; SA owns semantics; read by P1/P2/P3 |
| ei_radar_alerts       | Institute Radar | Privacy boundary; never raw events       |

---

### Future tables (from launch checklist)

| Table                     | Context         | Notes |
| ------------------------- | --------------- | ----- |
| institutes                | CohortAccess    |       |
| cohorts                   | CohortAccess    |       |
| students                  | CohortAccess    |       |
| student_cohort_membership | CohortAccess    |       |
| roles                     | CohortAccess    |       |
| enrollments               | CohortAccess    |       |
| coupons                   | Billing/Sponsor | P1    |
| coupon_redemptions        | Billing/Sponsor | P1    |
| ei_idempotency_keys       | EI Event Ledger | Implemented (migrate.ts) |
| curriculum_topics         | CurriculumCatalog | Leaf topics with stable UUIDs, aliases, hierarchy refs |
| curriculum_exams          | CurriculumCatalog | Exam definitions (JEE Main, NEET, etc.) |
| curriculum_subjects       | CurriculumCatalog | Subjects per exam |
| curriculum_units          | CurriculumCatalog | Units per subject |
| curriculum_chapters       | CurriculumCatalog | Chapters per unit |
| institute_curriculum      | CurriculumCatalog | Which topics belong to which institute |
| topic_normalization_queue | CurriculumCatalog | Unmapped free-text entries awaiting alias resolution |

---

### Mastra / framework tables

| Table                      | Purpose                  |
| -------------------------- | ------------------------ |
| Mastra workflow/run tables | Framework; not EI domain |

---

## ACLs

> **How to fill:** Document where ACLs exist or are planned. ACLs translate external models into your domain model and protect your context from external changes.
>
> **Checklist item #5:** Design anti-corruption layers for external systems.

### Where contracts live (no dedicated contracts folder)

Cross-context contracts are documented in existing DDD artifacts rather than a dedicated `contracts/` folder. This avoids the shared-kernel-by-copy-paste anti-pattern. Contracts live in three places:

- **Relationship semantics:** [03-context-map.md](03-context-map.md) — integration semantics, ACL vs Published Language
- **Constitutional invariants + event catalog + ACL intent:** this file — invariants, event catalog, data ownership
- **Port-level contracts + algorithms:** tactical specs — e.g. [tactical/ei-runtime-tactical-spec.md](tactical/ei-runtime-tactical-spec.md) (Session state derivation, Routing matrix, RunEiCommand orchestrator, Idempotency + event completeness at command boundary)

**Context-level and cross-cutting tactical specs** (implement invariants and ACLs from this file):

| Context | Tactical spec | Cross-cutting concerns |
|---------|---------------|-------------------------|
| CohortAccess | [tactical/cohort-access-tactical-spec.md](tactical/cohort-access-tactical-spec.md) | Server-derived identity, ACL (Neon Auth → AuthSession), RBAC |
| Ops & Observability | [tactical/ops-observability-tactical-spec.md](tactical/ops-observability-tactical-spec.md) | Timeline and backfill: OpsAuth (API key, cron, dev bypass). No CohortAccess. Tenant isolation, redaction (no raw PII in logs/traces), idempotent/auditable backfill; consumer + repair-orchestrator only |

---

### Identity → EI Runtime

| Aspect           | Production                                                                |
| ---------------- | ------------------------------------------------------------------------- |
| Auth             | Neon Auth SDK (Google OAuth) — session cookie required                    |
| Student identity | Server-derived from auth session (auth_user_id → student_id mapping)     |
| ACL              | CohortAccess ResolveAuthSession translates Neon Auth session to AuthSession; studentId never trusted from client body |

---

### Institute / external dashboard

| Aspect       | Current                                | Target                                                                                 |
| ------------ | -------------------------------------- | -------------------------------------------------------------------------------------- |
| Data exposed | Radar alerts only (getRadarAlerts)     | Same; never raw events                                                                 |
| ACL needed?  | Implicit: Radar tools are the boundary | Explicit Published Language: versioned RadarAlert schema; institute consumes only that |

---

### Future external systems

| System                     | Relationship        | ACL approach                                                                     |
| -------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| Notification service       | Downstream consumer | EI publishes integration events (e.g. ReminderDue); consumer adapts to its model |
| Analytics / data warehouse | Downstream consumer | Same: integration events only; no raw EI payloads                                |
