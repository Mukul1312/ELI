# ADR-003: Projection Schema Evolution — Session Lifecycle State in EI Projections

**Status:** Implemented
**Date:** 2026-03-12
**Deciders:** Product + Engineering (AI Study Brother core team)

---

## Context

### The Problem

EI Projections' stated purpose (`canvas-ei-projections.md`):

> *"Serve as the system's memory of aggregates, topic state, and policy so that EI Runtime can make decisions **without re-reading the raw event stream**."*

This promise is broken for 7 of the 8 latency problems documented in [`06-infrastructure-optimization.md` §0](../06-infrastructure-optimization.md). The projection schema was designed for **7-day metric aggregation** (verificationRate7d, openLoops, silenceDays). It was never extended to store **per-session runtime state** or **presentation context fields**.

### Root Cause Chain

ADR-001 removed `ei_study_sessions` (correct write-side cleanup). But no compensating read-side columns were added to `ei_topic_state`. The TopicLoop projector was never taught to consume `SessionIntentIssued`, `ActivationPlanIssued`, `FirstActionStarted` — the three events that determine session phase.

As a result:

| Reader | What it queries instead of projection | Latency penalty |
|--------|--------------------------------------|-----------------|
| `PhaseDeriver` | 4× `ei_events` scans per command | ~2300ms (contended) |
| `getSessionIdFromLastIntent` | 1× `ei_events` scan before P2/P3 | ~300ms per command |
| P3 cross-protocol read | 1× `ei_events` scan for `verification_floor` + `watch_only_flag` | ~260ms per SessionEnd |
| AppOpen routing (`ei-app-open.ts`) | 9-type, 50-event `ei_events` scan | ~600ms per AppOpen |
| `getSessionDurationSec` | 2× `ei_events` reads for start+end timestamps | contributes to 7-query fan |

Separately, `ei_student_aggregates` was never extended with 5 columns the SDUI presentation layer needs. The checkin view compensates with 11 direct `ei_events` queries.

### Current Schema State (confirmed from `src/ei/db/migrate.ts`)

**`ei_topic_state` current columns:**
`student_id`, `topic_id`, `topic_step`, `last_effort_at`, `last_retrieval_at`, `last_scheduled_due_at`, `tms`, `delta_decay`, `effort_count_7d`, `retrieval_count_7d`, `updated_at`, `topic_name`, `consecutive_deferrals`, `effort_count_total`, `last_task_type`

Missing: any session lifecycle state.

**`ei_student_aggregates` current columns:**
`student_id`, `pending_checks`, `open_loops`, `verification_rate_7d`, `schedule_misses_7d`, `avoidant_exits_7d`, `skip_count_7d`, `silence_days`, `start_latency_min_median_7d`, `intent_acceptance_rate_7d`, `replan_loop_count_7d`, `state_trend_7d`, `loop_latency_trend`, `updated_at`

Missing: 5 columns needed by the checkin view and SDUI presentation layer.

---

## Decision

**Extend `ei_topic_state` with 6 session lifecycle columns and `ei_student_aggregates` with 5 presentation context columns.**

The TopicLoop projector gains 4 new consumed event types. The StudentAggregates recompute gains 5 new computed fields. All existing behavior and invariants are preserved.

---

## Options Considered

### Option A — Extend existing projection tables (Chosen)

Add columns directly to `ei_topic_state` and `ei_student_aggregates`. Existing projectors extended to handle new event types. Non-blocking `ALTER TABLE ADD COLUMN ... DEFAULT` in Postgres.

**Chosen because:**
- No new tables, no new query paths
- Projection idempotency guarantee applies: columns are derived from the same Ledger events the projector already reads
- `ALTER TABLE ADD COLUMN` with a default is non-blocking in Postgres — zero downtime
- Fully reversible: if a column proves unnecessary, it can be dropped
- Consistent with existing projector contract: `TopicLoop` owns all per-topic state

### Option B — New materialized read model table `ei_checkin_readmodel`

A purpose-built table updated by projector on every event. Single query returns everything `composeCheckinView` needs.

**Deferred because:** This is the CQRS-correct end state for the checkin view but is premature for launch. Adding columns to existing tables achieves the same query reduction with less schema complexity. Revisit post-launch if checkin view schema diverges significantly from projection schema.

### Option C — Keep querying `ei_events` directly, consolidate into fewer queries

Merge all 11 checkin queries into 1-2 CTEs against `ei_events`. Keep projection schema unchanged.

**Rejected because:** Querying `ei_events` from the application layer violates the projection purpose. A CTE over `ei_events` with 7-day windows is expensive under Neon's serverless model (full table scans per request). The projection is the correct optimization boundary.

---

## Schema Changes

### `ei_topic_state` — 6 new columns

| Column | Type | Default | Populated by | Replaces |
|--------|------|---------|--------------|---------|
| `session_phase` | `TEXT` | `NULL` | TopicLoop projector | PhaseDeriver 4-query fan + AppOpen 9-type scan |
| `current_session_id` | `TEXT` | `NULL` | TopicLoop projector | `getSessionIdFromLastIntent` sequential read |
| `verification_floor` | `INTEGER` | `NULL` | TopicLoop projector | P3 cross-protocol `queryEvents` |
| `watch_only_flag` | `BOOLEAN` | `false` | TopicLoop projector | P3 cross-protocol `queryEvents` |
| `intent_source` | `TEXT` | `NULL` | TopicLoop projector | P3 cross-protocol `queryEvents` |
| `last_session_started_at` | `TIMESTAMPTZ` | `NULL` | TopicLoop projector | `getSessionDurationSec` event read |

**`session_phase` value semantics:**

| Value | Set by event | Meaning |
|-------|-------------|---------|
| `NULL` | (initial / no session cycle) | No active session for this topic |
| `'activating'` | `SessionIntentIssued` | P1 complete; P2 not yet run |
| `'active'` | `ActivationPlanIssued` | P2 complete; student in active session |
| `'verifying'` | `SessionEnd` | Session ended; P3 not yet run |
| `'closed'` | `VerificationDecisionIssued` | P3 complete; loop closed |

**Reset rule:** On each new `SessionIntentIssued` for a topic, `session_phase` resets to `'activating'`, `current_session_id` takes the new value, `verification_floor` and `intent_source` are updated, `watch_only_flag` resets to `false`, `last_session_started_at` remains from prior session until next `FirstActionStarted`.

### `ei_student_aggregates` — 5 new columns

| Column | Type | Default | Computed from | Replaces |
|--------|------|---------|--------------|---------|
| `sessions_last_7d` | `INTEGER` | `0` | Count of `SessionEnd` events in last 7d | `countStudentEventsLast7d()` |
| `loops_closed_last_7d` | `INTEGER` | `0` | Count of `RetrievalVerified` + `VerificationCompleted` (result=confident) events in last 7d | Separate `ei_events` count query |
| `has_prior_app_open` | `BOOLEAN` | `false` | EXISTS any `AppOpen` event ever | `hasAnyAppOpen()` EXISTS check |
| `last_identity_shown_at` | `TIMESTAMPTZ` | `NULL` | Most recent `IdentityMomentShown` event `occurred_at` | `getLastIdentityShownAt()` |
| `active_days_7d` | `INTEGER` | `0` | Distinct calendar days with `SessionEnd` in last 7d | `getActiveDaysLast7d()` |

---

## Projector Changes

### TopicLoop projector — 4 new consumed event types

The TopicLoop projector (`src/ei/application/apply-event-to-topic-loop/handler.ts`) gains handlers for:

| Event | Fields read | Columns updated |
|-------|-------------|-----------------|
| `SessionIntentIssued` | `payload.sessionId`, `payload.intentSource`, `payload.verificationFloor?.minQuestions` | `session_phase='activating'`, `current_session_id`, `intent_source`, `verification_floor` (null if declared), `watch_only_flag=false` |
| `ActivationPlanIssued` | `payload.constraints.enforceWatchOnlyVerification` | `session_phase='active'`, `watch_only_flag` |
| `FirstActionStarted` | `payload.startedAt` | `last_session_started_at` |
| `SessionEnd` | _(occurrence)_ | `session_phase='verifying'` |
| `VerificationDecisionIssued` | _(occurrence)_ | `session_phase='closed'` |

Note: `SessionEnd` was already consumed by TopicLoop (updates `last_effort_at`). Only the `session_phase` update is new.

**GREATEST semantics:** All timestamp columns follow the existing monotonic rule. `session_phase` follows event order — a `'verifying'` event never reverts to `'active'` within the same session cycle.

### StudentAggregates recompute — 5 new computed fields

`src/ei/application/recompute-student-aggregates/handler.ts` gains logic to compute and store the 5 new columns during full recompute.

---

## Domain Model Design Decisions

### SessionLifecycleState — Separate Value Object (Option B)

The 6 new `ei_topic_state` columns introduce state with fundamentally different temporal semantics than the existing `TopicLoopState` VO. Rather than extending `TopicLoopState` with all 6 fields, a separate `SessionLifecycleState` VO is composed into the `TopicLoop` aggregate.

**The temporal distinction:**

| | TopicLoopState (existing) | SessionLifecycleState (new) |
|-|---------------------------|----------------------------|
| **Semantics** | Accumulated, monotonic (GREATEST) | Transient, per-session (latest-wins) |
| **Lifecycle** | Grows across months of sessions | Resets every new `SessionIntentIssued` |
| **Update rule** | Timestamp never moves backward | `session_phase` resets to `'activating'`; `current_session_id`, `intent_source`, `verification_floor` replaced; `watch_only_flag` resets to `false` |
| **Example** | `lastEffortAt` grows with each `SessionEnd` | `sessionPhase` resets from `'closed'` → `'activating'` on new session |

The DDD VO rule applies: *"if two things have different invariants, they are different types."* Accumulated monotonic state and per-session transient state have different update rules, different reset semantics, and different lifecycles.

**Options considered:**

| Option | Description | Verdict |
|--------|-------------|---------|
| A. Extend `TopicLoopState` with all 6 fields | One VO grows to 10 props mixing GREATEST and latest-wins semantics | Rejected — mixes two update semantics in one VO; developer must remember which fields use GREATEST and which use latest-wins |
| **B. Separate `SessionLifecycleState` VO** | TopicLoop holds `_state: TopicLoopState` + `_sessionLifecycle: SessionLifecycleState` | **Chosen** — each VO owns its update semantics; the aggregate remains the single consistency boundary |
| C. Infrastructure-only (bypass domain) | Projector writes session columns directly to `upsertTopicState()`, bypassing `TopicLoop.applyEvent()` | Rejected — splits the projection's state model between domain and infrastructure; breaks the canonical pattern where `applyEvent()` is the single entry point for event application; recompute/replay must know about two code paths |

**Resulting aggregate structure:**

```typescript
class TopicLoop extends AggregateRoot<TopicLoopId> {
  private _state: TopicLoopState;                    // accumulated: lastEffortAt, lastRetrievalAt, lastScheduledDueAt, consecutiveDeferrals
  private _sessionLifecycle: SessionLifecycleState;  // per-session: sessionPhase, currentSessionId, verificationFloor, watchOnlyFlag, intentSource, lastSessionStartedAt
}
```

Each VO self-validates its own semantics:
- `TopicLoopState.withLastEffortAt(date)` — enforces GREATEST (new date must be ≥ current)
- `SessionLifecycleState.withSessionPhaseAdvanced('verifying')` — enforces forward-only phase transitions within a session
- `SessionLifecycleState.reset(sessionId, intentSource, verificationFloor)` — full reset on new `SessionIntentIssued`

### TopicLoop Aggregate Name — Retained

The addition of `SessionLifecycleState` raised the question: should `TopicLoop` be renamed to `TopicState` or `TopicProgress`, given that it now tracks two different temporal concerns?

**Decision: Keep `TopicLoop`.** The session lifecycle IS a loop iteration in progress.

The "loop" in the domain language is the **effort-to-verification cycle**: student studies → system asks for verification → student verifies → loop closed. Each study session creates a new loop. The `SessionLifecycleState` tracks where the CURRENT loop is in its phase machine (`activating → active → verifying → closed`). The `TopicLoopState` tracks the HISTORY of completed loops (`lastEffortAt`, `lastRetrievalAt`, `effortCountTotal`).

Together: TopicLoop = completed loop history + current loop in progress. The name fits.

**What TopicLoop does NOT model:** The student's mastery arc (learning → practicing → mastered → decaying → re-learning). A student who re-learns "Carnot Engine" after months of decay looks the same to the system as one learning it for the first time — both emit `SessionIntentIssued` with `taskType: 'Learn'`. The difference is visible in behavioral signals (`silenceDays`, `tms`/`delta_decay`), which LoopHealth interprets into coaching mode (Rescue for high decay). If explicit mastery-phase tracking becomes a product requirement in the future, that's either a new VO on TopicLoop or a new aggregate — to be evaluated at that time.

**Pragmatic factor:** `TopicLoop` appears in 209 source file occurrences (37 files) and 101 doc occurrences (17 files). Renaming for a concern that doesn't yet exist would be high-churn with no structural benefit.

### Event Type Registration — Direct Handling in `applyEvent()`

Four new event types are added to `TOPIC_LOOP_EVENT_TYPES`: `SessionIntentIssued`, `ActivationPlanIssued`, `FirstActionStarted`, `VerificationDecisionIssued`.

**Why this is canonical for projections:** TopicLoop already consumes cross-aggregate events (`SessionEnd` is emitted by EI Runtime's StudySession aggregate). Projections consume events from across the Ledger to materialize read-side state — that's their purpose. The 4 new events are more StudySession lifecycle events from the same Ledger. No new coupling is introduced; `TOPIC_LOOP_EVENT_TYPES` is an array of string literals matching `EventTypeEnum`, not an import from StudySession.

**Why NOT via `EVENT_TIMESTAMP_FIELD` map:** The existing map assumes each event type maps to a single timestamp field. Session events have richer update semantics — `SessionIntentIssued` updates 5 fields and resets `watch_only_flag`. The map pattern doesn't fit.

Instead, session events are handled directly in `TopicLoop.applyEvent()` with explicit per-event delegation to `SessionLifecycleState` methods. The existing `EVENT_TIMESTAMP_FIELD` map continues to serve the original 6 accumulated-state events unchanged.

```
applyEvent(eventType, payload):
  // Accumulated state — existing pattern via EVENT_TIMESTAMP_FIELD
  case 'SessionEnd':       → this._state = this._state.withLastEffortAt(timestamp)
  case 'RetrievalVerified': → this._state = this._state.withLastRetrievalAt(timestamp)
  ...

  // Session lifecycle — new direct handling via SessionLifecycleState
  case 'SessionIntentIssued': → this._sessionLifecycle = SessionLifecycleState.reset(payload)
  case 'ActivationPlanIssued': → this._sessionLifecycle = this._sessionLifecycle.withPhaseAdvanced('active', payload)
  case 'FirstActionStarted': → this._sessionLifecycle = this._sessionLifecycle.withSessionStarted(timestamp)
  case 'VerificationDecisionIssued': → this._sessionLifecycle = this._sessionLifecycle.withPhaseAdvanced('closed', payload)
```

Note: `SessionEnd` updates BOTH VOs — `_state.withLastEffortAt()` (accumulated) and `_sessionLifecycle.withPhaseAdvanced('verifying')` (per-session). This is the single event that bridges both temporal concerns, which is precisely why they belong in the same aggregate.

---

## What Gets Eliminated

| Current code | Replaced by | Latency saved |
|-------------|------------|--------------|
| `PhaseDeriver.derivePhase()` — 4 parallel `ei_events` queries | `ei_topic_state.session_phase` single column read | ~2300ms (contended) |
| `getSessionIdFromLastIntent()` — sequential `ei_events` query | `ei_topic_state.current_session_id` | ~300ms per P2+P3 |
| P3 `cross-protocol-read.ts` — sequential `queryEvents` | `ei_topic_state.verification_floor + watch_only_flag + intent_source` | ~260ms per SessionEnd |
| AppOpen 9-type event scan in `ei-app-open.ts` | `ei_topic_state.session_phase` | ~600ms per AppOpen |
| `getConsecutiveDeferrals()` tail query | Thread existing `consecutive_deferrals` from `getTopicState` call | ~248ms per P3 |
| `getSessionDurationSec()` event reads | `ei_topic_state.last_session_started_at` | ~250ms per VerificationComplete |
| 5 of 11 checkin `ei_events` queries | `ei_student_aggregates` new columns | ~1000ms per AppOpen checkin |

**Total estimated savings (cumulative, under contention):** ~5000ms across a full session cycle (SessionEnd + VerificationComplete + next AppOpen).

---

## Consequences

### Positive

- Projection schema fulfills its stated purpose: EI Runtime reads projection columns, not raw event stream
- PhaseDeriver can be removed entirely — replaced by a single `ei_topic_state.session_phase` lookup
- P3 cross-protocol read can be replaced by `ei_topic_state` columns — no sequential `queryEvents`
- AppOpen routing decision becomes a column check, not a 50-event scan
- All new columns are derivable from Ledger events — projection idempotency guarantee preserved
- Backfill via Ops backfill job restores historical data for all existing students

### Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Projection staleness: new columns may lag by one event-fire if projector is slow | Acceptable for session routing — the projection is fire-and-forget after each event; worst case is one stale read before recompute catches up |
| `session_phase` column semantics not covered by existing TopicLoop tests | New spec tests per §10 of `tactical/topic-loop-tactical-spec.md` test table |
| `watch_only_flag` reset rule: must clear on new `SessionIntentIssued` | Reset logic explicit in projector; documented in invariants |
| Large `ei_events` tables: backfill may take time | Ops backfill job with throttle_ops_per_sec already exists (`ops_backfill_jobs` table) |

### Tactical Spec Updates Required

| Spec | Change needed |
|------|--------------|
| `tactical/topic-loop-tactical-spec.md` | Add 6 new columns to §3 State Model; add 4 new event types to §6 Events Consumed; add spec tests to §10 |
| `tactical/student-aggregates-tactical-spec.md` | Add 5 new columns to §3 State Model; add computation logic to §5 Commands and Decisions; add spec tests to §10 |

---

## Migration

```sql
-- ei_topic_state: 6 new columns (non-blocking; ADD COLUMN with DEFAULT)
ALTER TABLE ei_topic_state ADD COLUMN IF NOT EXISTS session_phase TEXT;
ALTER TABLE ei_topic_state ADD COLUMN IF NOT EXISTS current_session_id TEXT;
ALTER TABLE ei_topic_state ADD COLUMN IF NOT EXISTS verification_floor INTEGER;
ALTER TABLE ei_topic_state ADD COLUMN IF NOT EXISTS watch_only_flag BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ei_topic_state ADD COLUMN IF NOT EXISTS intent_source TEXT;
ALTER TABLE ei_topic_state ADD COLUMN IF NOT EXISTS last_session_started_at TIMESTAMPTZ;

-- ei_student_aggregates: 5 new columns (non-blocking)
ALTER TABLE ei_student_aggregates ADD COLUMN IF NOT EXISTS sessions_last_7d INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ei_student_aggregates ADD COLUMN IF NOT EXISTS loops_closed_last_7d INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ei_student_aggregates ADD COLUMN IF NOT EXISTS has_prior_app_open BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ei_student_aggregates ADD COLUMN IF NOT EXISTS last_identity_shown_at TIMESTAMPTZ;
ALTER TABLE ei_student_aggregates ADD COLUMN IF NOT EXISTS active_days_7d INTEGER NOT NULL DEFAULT 0;
```

**Backfill:** After migration, run Ops backfill job for all students to replay `SessionIntentIssued`, `ActivationPlanIssued`, `FirstActionStarted`, `SessionEnd`, `VerificationDecisionIssued` events into the new columns. Students with no events will remain at defaults (safe — all defaults represent "no active session").

---

## Implementation Order

| Step | What | Files touched |
|------|------|--------------|
| 1 | Add migration SQL to `migrate.ts` | `src/ei/db/migrate.ts` |
| 2 | Extend TopicLoop projector to handle 4 new event types | `src/ei/application/apply-event-to-topic-loop/handler.ts` |
| 3 | Extend StudentAggregates recompute for 5 new fields | `src/ei/application/recompute-student-aggregates/handler.ts` |
| 4 | Update queries: `getTopicState` returns new columns; new `getSessionPhase(db, studentId, topicId)` helper | `src/ei/db/queries.ts` |
| 5 | Replace `PhaseDeriver` 4-query fan with `session_phase` column read | `src/ei/application/run-ei-command/phase-deriver.ts` |
| 6 | Replace `getSessionIdFromLastIntent` with `current_session_id` from topic state | `src/mastra/workflows/protocol2-activation.ts`, `protocol3-verification.ts` |
| 7 | Replace P3 cross-protocol `queryEvents` with topic state columns | `src/ei/application/run-p3-gate/cross-protocol-read.ts` |
| 8 | Replace AppOpen 9-type event scan with `session_phase` lookup | `src/mastra/workflows/ei-app-open.ts` |
| 9 | Thread `consecutive_deferrals` from initial `getTopicState` call to view step | `src/mastra/workflows/protocol3-verification.ts` |
| 10 | Extend `getStudentAggregates` to return new columns; update checkin view step | `src/mastra/workflows/checkin-view.ts`, `src/ei/db/queries.ts` |
| 11 | Run Ops backfill job for all existing students | Ops tooling |
| 12 | Update tactical specs | `tactical/topic-loop-tactical-spec.md`, `tactical/student-aggregates-tactical-spec.md` |

---

## Observability

### Projector spans

Each projector execution (`recomputeTopicLoop`, `recomputeStudentAggregates`) emits a structured JSON span:

```json
{
  "type": "projector_span",
  "correlationId": "abc-123",
  "projectorName": "TopicLoop",
  "studentId": "student-1",
  "topicId": "topic-1",
  "eventCount": 42,
  "durationMs": 150,
  "timestamp": "2026-03-13T10:00:00.000Z"
}
```

**Key metrics derivable from logs:**
- **Projection duration p50/p95**: Group `projector_span` by `projectorName`, compute percentiles on `durationMs`
- **Event replay volume**: `eventCount` tracks growth — sustained increase signals backfill may be needed or that event volume is growing
- **Correlation**: `correlationId` links projector spans to the parent gate call and individual DB query spans (from `TracedDbAdapter`)

### Projection staleness

Staleness is detectable by comparing `ei_topic_state.updated_at` against the student's latest `ei_events.occurred_at`. No runtime staleness check is implemented — the projector runs synchronously after event append in all workflows. If async projection is introduced later, add a staleness SLI:

```sql
SELECT student_id, topic_id,
  NOW() - updated_at AS projection_lag
FROM ei_topic_state
WHERE updated_at < NOW() - INTERVAL '5 minutes'
```

**Implementation:** `src/ei/infrastructure/logging.ts` (`logProjectorSpan`), `src/ei/infrastructure/projector/topic-loop-projector.ts`, `src/ei/infrastructure/projector/student-aggregates-projector.ts`.

---

## References

- [ADR-001: Declared Intent — Two-VO Design](adr-001-declared-intent-design.md) — original decision that removed `ei_study_sessions`
- [ADR-002: Declared-Intent Bypass Fix](adr-002-declared-intent-bypass-fix.md) — prerequisite: both paths now emit full protocol event sequence
- [06-infrastructure-optimization.md §0](../06-infrastructure-optimization.md) — 8 gap analysis with trace evidence
- [canvas-ei-projections.md](../canvas-ei-projections.md) — projection purpose statement
- [tactical/topic-loop-tactical-spec.md](../tactical/topic-loop-tactical-spec.md) — TopicLoop spec (update required)
- [tactical/student-aggregates-tactical-spec.md](../tactical/student-aggregates-tactical-spec.md) — StudentAggregates spec (update required)
- [src/ei/db/migrate.ts](../../src/ei/db/migrate.ts) — current schema (confirmed before drafting)
