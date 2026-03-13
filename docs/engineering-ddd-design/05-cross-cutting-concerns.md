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
| AppOpen | studentId, energy, openedAt; `timeCommitment` (optional, int: 10\|20\|45\|60 — student-declared minutes); `taskType` (optional, string: Learn\|Practice\|Revise — student-declared); `highPressureDetected` (optional, boolean — system-derived from V3 triggers; absent = false). `timeCommitment` and `taskType` absent for V1 SILENCE_RE_ENTRY, V3 HIGH_PRESSURE, V9 IDENTITY_MOMENT, V10 ONBOARDING; system uses mode-based fallback when absent. | UI | P1, Ledger | — |
| IntentSet | studentId, topic, setAt | UI | P2, Ledger | — |
| SessionEnd | studentId, topic, endedAt | UI | P3, Ledger | ei_topic_state: last_effort_at, session_phase='verifying' ([ADR-003](decisions/adr-003-projection-schema-evolution.md)) |
| SessionIntentIssued | `intentSource` ('negotiated'\|'declared'), studentId, topicId, timebox, taskType, energy, sleep, issuedAt; **negotiated-only:** mode, playId, verificationFloor, constraints; **passive:** loopHealthSnapshot. Producer: `issueNegotiatedIntent()` (ELI-driven) or `issueDeclaredIntent()` (student-driven). See [ADR-001](decisions/adr-001-declared-intent-design.md) and [ei-runtime-tactical-spec.md §9](tactical/ei-runtime-tactical-spec.md). | P1 (RunP1GateHandler) or DeclaredEntry (RunDeclaredIntentHandler) | Ledger, P3 (cross-protocol floor when `intentSource='negotiated'`) | ei_topic_state: session_phase='activating', current_session_id, intent_source, verification_floor ([ADR-003](decisions/adr-003-projection-schema-evolution.md)) |
| ActivationPlanIssued | studentId, mode, firstAction, issuedAt | P2 | Ledger, P3 (watch-only flag) | ei_topic_state: session_phase='active', watch_only_flag ([ADR-003](decisions/adr-003-projection-schema-evolution.md)) |
| VerificationDecisionIssued | studentId, mode, topic, verificationDecision, issuedAt | P3 | Ledger | ei_topic_state: session_phase='closed' ([ADR-003](decisions/adr-003-projection-schema-evolution.md)) |
| IntentResponse | studentId, negotiatedIntentId, decision, respondedAt | UI | Ledger | — |
| FirstActionStarted | studentId, topic, startedAt | UI | Ledger | ei_topic_state: last_session_started_at ([ADR-003](decisions/adr-003-projection-schema-evolution.md)) |
| Replan | studentId, topic, replannedAt | UI | Ledger | — |
| RetrievalVerified | studentId, topic, verifiedAt | UI | Ledger | ei_topic_state.last_retrieval_at |
| RetrievalScheduled | studentId, topic, dueAt, scheduledAt | UI | Ledger | ei_topic_state.last_scheduled_due_at |
| RetrievalSkipped | studentId, topic, reason, skippedAt | UI | Ledger | — |
| VerificationCompleted | studentId, topic, completedAt, result | UI | Ledger | ei_topic_state.last_retrieval_at |
| ScheduleMissed | studentId, topic, missedAt | System/Projection | Ledger | — |
| StrategicAdjustmentDecision | studentId, adjustmentMode, dials, issuedAt; optional: tightnessLevel, nextCycleConstraints | SA, setPolicyTool | Projections | ei_student_policy |

> **Topic ID evolution — see detailed subsection below.**

### V3 Trigger Signals (Stage 2 — system-derived pressure detection)

**Context:** The self-reported Pressure (1-5) and BacklogPressure (1-5) scales have been retired from student UX. Students in genuine high-pressure states do not stop to self-report; the scales were least reliable for the archetypes (S2, S5) that most depended on them. The pressure signal is now system-detected via V3 triggers that feed a single boolean: `highPressureDetected`.

**Definition:**

```
highPressureDetected = examProximityDays <= 7 OR avoidancePattern OR recentMockFailure
```

| Signal | Type | Source | Detection logic |
|--------|------|--------|----------------|
| `examProximityDays` | number (days) | Institute exam schedule import or student self-report | Days until next known exam; trigger when <= 7 |
| `avoidancePattern` | boolean | Behavioral (Projections) | 3+ AppOpen events without a matching SessionEnd event within any 24h window |
| `recentMockFailure` | boolean | Mock result import or student self-report | True when a mock result below threshold was recorded in last 14d |

**Staging:**

- **Stage 1 (v1 ship):** `highPressureDetected` defaults to `false`. All downstream logic (P1GateContext, assignP1Label) uses the boolean; no V3 trigger infrastructure is required. The V3 HIGH_PRESSURE checkin variant cannot fire until Stage 2.
- **Stage 2 (post-launch):** Implement V3 trigger detection. `avoidancePattern` can be derived from existing Projections (AppOpen count without SessionEnd). `examProximityDays` and `recentMockFailure` require new data ingestion (institute import or student self-report screen).

**Consumers:** P1GateContext (EI Runtime), assignP1Label (LoopHealthAssessment). Both use `highPressureDetected` where they previously used `pressure >= 4` or `backlogPressure >= 4`.

### Dropout Signal (per-topic verification avoidance detection)

**Context:** The AVOIDANT P3 label captures student-level verification avoidance (verificationRate7d < 0.60, openLoops ≥ 3). The Dropout Signal is a complementary **topic-level** signal: a single topic with 3+ consecutive deferrals or skips without an intervening VerificationCompleted event.

**Definition:**

```
dropoutSignalActive(topicId) = consecutiveDeferrals(topicId) >= 3
```

Where `consecutiveDeferrals` counts sequential RetrievalScheduled + RetrievalSkipped events for a topic since the last VerificationCompleted (or since the first effort event if no VerificationCompleted exists).

| Signal | Type | Source | Reset condition |
|--------|------|--------|----------------|
| `consecutiveDeferrals` | number | Projections (ei_topic_state) | Resets to 0 on VerificationCompleted for that topic |

**Consumer:** PresentationContext (ViewComposer). Not consumed by LoopHealthAssessment or P3 gate logic — the Dropout Signal only affects presentation (Shrunk Card variant), not gate routing.

**Data ownership:** `ei_topic_state.consecutive_deferrals` — maintained by TopicLoop projector on RetrievalScheduled, RetrievalSkipped, and VerificationCompleted events.

### Topic ID evolution (CurriculumCatalog integration)

**Problem:** Events currently use `topic: z.string()` (raw student input). This causes normalization issues, duplicate topic identities, and unreliable analytics.

**Solution:** After CurriculumCatalog ships, new events use structured topic identity from CC. Old events are never backfilled (append-only invariant).

#### New event field schema (post-CC)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topicId` | UUID | Yes | Stable CurriculumCatalog reference. Provisional UUIDs are valid (from free-text fallback). |
| `topicName` | string | Yes | Display name from CC (`CatalogTopic.name`). |
| `topicRaw` | string | No | Original student input (only when free-text fallback was used; feeds normalization queue). |

#### Events affected

All events that currently carry `topic: z.string()` will carry `topicId` + `topicName` instead:

| Event type | Current field | Post-CC fields |
|------------|--------------|----------------|
| IntentSet | `topic` | `topicId`, `topicName`, `topicRaw?` |
| SessionEnd | `topic` | `topicId`, `topicName` |
| SessionIntentIssued | `topic` | `topicId`, `topicName` |
| VerificationDecisionIssued | `topic` | `topicId`, `topicName` |
| FirstActionStarted | `topic` | `topicId`, `topicName` |
| Replan | `topic` | `topicId`, `topicName` |
| RetrievalVerified | `topic` | `topicId`, `topicName` |
| RetrievalScheduled | `topic` | `topicId`, `topicName` |
| RetrievalSkipped | `topic` | `topicId`, `topicName` |
| VerificationCompleted | `topic` | `topicId`, `topicName` |
| ScheduleMissed | `topic` | `topicId`, `topicName` |

Events without topic fields (`AppOpen`, `ActivationPlanIssued`, `IntentResponse`, `StrategicAdjustmentDecision`) are unchanged.

#### Dual-read strategy (Projections)

Projections must handle both legacy and post-CC events:

1. **New events:** Read `topicId` directly — it is the CC UUID.
2. **Legacy events:** Read `topic` (string). Query `ICatalogRepository.findTopicsByAlias(topic)` to resolve to a CC UUID. If no alias match, use the raw string as-is (backward compatible).
3. **`ei_topic_state` key:** Remains `(student_id, topic_id)`. For new events, `topic_id` = CC UUID. For unresolved legacy events, `topic_id` = raw string.

#### Migration timeline

| Stage | When | What |
|-------|------|------|
| **Stage 1** (now) | CC code shipped | New events emit `topicId` + `topicName`. Projections implement dual-read. Old events untouched. |
| **Stage 2** (post-launch) | After normalization queue catches up | Optional: add `catalog_topic_id` column to `ei_topic_state` for explicit CC linkage. Backfill via batch alias resolution. |
| **Never** | — | No retroactive event rewriting. Append-only ledger invariant is absolute. |

See [14-topic-selection-system.md](../student-ux-architecture/14-topic-selection-system.md) § Schema Migration, [canvas-curriculum-catalog.md](canvas-curriculum-catalog.md), [tactical/curriculum-catalog-tactical-spec.md](tactical/curriculum-catalog-tactical-spec.md).

---

### ei_topic_state projection storage

`ei_topic_state` stores two categories of derived state, owned by the TopicLoop aggregate's two Value Objects:

**TopicLoopState (accumulated, GREATEST semantics):**
- `last_effort_at`, `last_retrieval_at`, `last_scheduled_due_at` — monotonic timestamps from event catalog
- `effort_count_7d`, `retrieval_count_7d` — 7-day rolling counts
- `consecutive_deferrals` — reset on VerificationCompleted (see §Dropout Signal)
- `effort_count_total`, `last_task_type`, `topic_name` — lifetime counters

**SessionLifecycleState (per-session, latest-wins semantics — [ADR-003](decisions/adr-003-projection-schema-evolution.md)):**
- `session_phase` — `'activating'` | `'active'` | `'verifying'` | `'closed'` | NULL
- `current_session_id` — sessionId of the in-progress session
- `intent_source` — `'negotiated'` | `'declared'` | NULL
- `verification_floor` — P1 `NegotiatedIntent.verificationPlan.minQuestions` (INTEGER; null for declared sessions)
- `watch_only_flag` — P2 `ActivationPlan.constraints.enforceWatchOnlyVerification` (BOOLEAN, default false)
- `last_session_started_at` — `FirstActionStarted.startedAt` timestamp

SessionLifecycleState resets on each new `SessionIntentIssued` for a topic. TopicLoopState accumulates monotonically across sessions. Both are projected by the TopicLoop projector via `applyEvent()`.

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
| ei_topic_state        | EI Projections  | Derived from events; TopicLoop lifecycle; includes `consecutive_deferrals` (int, reset on VerificationCompleted — see §Dropout Signal) + SessionLifecycleState (`session_phase`, `current_session_id`, `intent_source`, `verification_floor`, `watch_only_flag`, `last_session_started_at` — per [ADR-003](decisions/adr-003-projection-schema-evolution.md)) |
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
