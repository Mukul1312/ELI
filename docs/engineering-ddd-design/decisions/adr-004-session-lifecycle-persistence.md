# ADR-004: Session Lifecycle Persistence — Event-Sourced Repository + Read Model

**Status:** Proposed
**Date:** 2026-03-12
**Deciders:** Product + Engineering (AI Study Brother core team)

---

## Context

### The Gap in the Tactical Spec

`ei-runtime-tactical-spec.md` §10 defines `IStudySessionRepository` with `findById` and `save`, then immediately defers it:

> *"Since StudySession state is derivable from Ledger events, a dedicated `ei_study_sessions` table is deferred."*

§17 Open Questions lists:

> *"StudySession persistence: `ei_study_sessions` table deferred post-MVP. Cross-protocol state threaded via P3GateContext."*

This framing makes the deferral sound like a principled design choice. It is not — it is an architectural gap with measurable consequences.

### DDD → CQRS+ES: Why Write and Read Sides Are Separate

Evans (2003) wrote the Repository pattern before CQRS existed. In his model there's one path: aggregate → Repository → database. The database holds aggregate state.

Greg Young and Udi Dahan (~2007) recognized that **commands and queries have fundamentally different needs**: commands need invariant enforcement, consistency, and sequential ordering; queries need speed, flat shape, and different projections for different consumers. That split became CQRS — Command Query Responsibility Segregation.

When you combine CQRS with an append-only event log as source of truth, you get the canonical modern DDD architecture:

```
        WRITE SIDE                         READ SIDE

Command arrives                    Query / routing arrives
    ↓                                      ↓
Aggregate (enforces invariants)    Read Model (pre-materialized)
    ↓                                      ↑
Repository.findById()              Projector (event consumer)
    ↓ reconstitutes from                   ↑
Event Store (source of truth)  ←── events ─┘
    ↑
Repository.save() — no-op
(events already appended)
```

In this system: the Ledger (`ei_events`) is the event store. `StudySession` is the aggregate. `TopicLoop` (`ei_topic_state`) is the read model. The projector already exists. What's missing is the left side: the event-sourced Repository that reconstitutes the aggregate from Ledger events.

### Why "Derivable from Events" ≠ "Don't Persist State"

The statement "state is derivable from Ledger events" is true — the Ledger is the source of truth, and you could rebuild any aggregate from its events. But this does not mean "therefore, don't persist state."

Evans' blue book is clear on the Repository pattern:

> The Repository's job is to make the aggregate **feel like an in-memory collection**. "Give me this aggregate by ID — I don't care how you stored it."

The *how* is an infrastructure concern. The Repository might use a state table, an event replay, a cache, or a snapshot. But it **must be able to return a fully reconstituted aggregate cheaply**. "Derivable" describes a capability of the event store. It does not exempt the system from providing fast aggregate reconstitution.

The correct reasoning would have been:

> "The Ledger is source of truth. But the Repository implementation must still return a reconstituted aggregate quickly. We are deferring the implementation — which means the Repository contract cannot be fulfilled. This is a temporary gap, not a design choice."

### The Orphaned Aggregate State Problem

The `StudySession` aggregate has four fields:

```typescript
private _status: SessionStatus;        // negotiating → activating → active → verifying → closed
private _sessionIntent: NegotiatedIntent | DeclaredIntent | null;
private _activationPlan: ActivationPlan | null;
private _verificationDecision: VerificationDecision | null;
```

These fields are alive during command execution. Each gate handler creates or reconstitutes a `StudySession`, runs a command method (which transitions `_status` and populates a VO field), pulls domain events, and then **discards the aggregate**. Nothing persists the updated state.

The code evidence is explicit. P2 and P3 handlers call `reconstitute()` with `null` for all Value Objects:

```typescript
// src/ei/application/run-p2-gate/handler.ts:120
const session = StudySession.reconstitute(sessionId, studentId, topicId, 'activating', null, null, null);

// src/ei/application/run-p3-gate/handler.ts:140
const session = StudySession.reconstitute(sessionId, studentId, topicId, 'active', null, null, null);
```

The aggregate is a **stateless shell** at reconstitution. It knows its `status` (hardcoded by the caller) but has no memory of prior gate outputs. Specifically:

- P3 cannot do `if (this._sessionIntent instanceof NegotiatedIntent)` to enforce the verification floor — `_sessionIntent` is `null`
- P3 cannot read `this._activationPlan.constraints.enforceWatchOnlyVerification` — `_activationPlan` is `null`

### The Workaround: P3GateContext Threading

The current code works around the gap by querying the Ledger directly for cross-protocol values:

- `findP1VerificationFloorFromEvents()` reads `SessionIntentIssued` payload for `verificationFloor`
- `findP2WatchOnlyFlagFromEvents()` reads `ActivationPlanIssued` payload for `watchOnly`
- These values are passed into `P3GateContext`, which feeds `VerificationDecision.create()`

This bypasses the aggregate entirely. The invariant *"P3 must honor P1's verification floor when intentSource is negotiated"* is enforced in the Value Object's `create()` method via context fields — not via the aggregate's `instanceof` check on `_sessionIntent`. It works, but it violates the DDD principle that the aggregate root is the single entry point for invariant enforcement.

### The `reconstitute()` Signature Is Stale After ADR-001

The current signature at `src/ei/domain/study-session/study-session.ts:68-83`:

```typescript
static reconstitute(
  sessionId: string,
  studentId: string,
  topicId: string,
  status: SessionStatus,
  negotiatedIntent: NegotiatedIntent | null,  // ← stale: should be sessionIntent
  activationPlan: ActivationPlan | null,
  verificationDecision: VerificationDecision | null,
  negotiatedIntentId?: string | null
): StudySession
```

ADR-001 changed the aggregate's internal field to `_sessionIntent: NegotiatedIntent | DeclaredIntent | null`. But `reconstitute()` still accepts `negotiatedIntent: NegotiatedIntent | null` — it cannot accept a `DeclaredIntent`. This must be updated as part of the canonical fix.

### Connection to Latency Problems

`06-infrastructure-optimization.md` §0 documents 8 latency gaps. The orphaned aggregate state is the write-side root cause for 4 of them:

| Gap | Problem | Latency | Connection to orphaned state |
|-----|---------|---------|------------------------------|
| 1 | PhaseDeriver 4-way `ei_events` fan | ~2300ms | `session_phase` not stored in any projection or repository — re-derived from 4 event queries on every request |
| 2 | `getSessionIdFromLastIntent` | ~300ms | `current_session_id` not stored — read from Ledger event payload |
| 5 | AppOpen 9-type event scan | ~600ms | Same root cause as Gap 1 — no `session_phase` anywhere |
| 8 | P3 cross-protocol `queryEvents` | ~260ms | `verification_floor` and `watch_only_flag` not projected — read from event payloads |

ADR-003 addresses the **read side** by adding projection columns to `ei_topic_state`. This ADR addresses the **write side** by restoring aggregate reconstitution from Ledger events.

---

## Decision

**Event-sourced repository (Option B) for the write side. TopicLoop projection (ADR-003) for the read side.**

`IStudySessionRepository.findById(sessionId)` loads the session's events from the Ledger, folds them into a fully reconstituted `StudySession` aggregate via `StudySession.reconstitute()`. `IStudySessionRepository.save()` is a no-op — events are already appended to the Ledger by the application handler before `save()` is called.

The Ledger remains the single source of truth. No dedicated `ei_study_sessions` state table is created.

### Why Both Sides Are Needed (Read Model Fix Alone Is Not Complete)

ADR-003 (read-side projection columns) solves the latency problems. But it does not restore aggregate invariant enforcement. Both sides must be fixed for canonical CQRS+ES:

| Concern | Read-side fix only (ADR-003) | Read-side + write-side (ADR-003 + ADR-004) |
|---------|------------------------------|---------------------------------------------|
| AppOpen routing | 4 queries → 1 query ✓ | 1 query ✓ |
| P3 `verificationFloor` | Still threaded via `P3GateContext` | Loaded from aggregate's `_sessionIntent` directly |
| `assertStatus('active')` at P3 | Not enforced — hardcoded by caller | Enforced by aggregate (folded from events) |
| Cross-protocol invariants | Application-layer workaround (`P3GateContext`) | Aggregate enforces atomically via `instanceof` |
| `reconstitute(null)` anti-pattern | Still present | Eliminated — `sessionRepo.findById()` returns full aggregate |

The read-side fix solves the user-facing latency (~2300ms → ~250ms). The write-side fix restores DDD correctness — the aggregate root is the single entry point for invariant enforcement, not the application layer workaround.

---

## Options Considered

### Option A — Dedicated state table (`ei_study_sessions`)

Reintroduce the `ei_study_sessions` table that ADR-001 removed. Columns: `session_id`, `student_id`, `topic_id`, `status`, `session_intent` (JSONB), `activation_plan` (JSONB), `verification_decision` (JSONB), `updated_at`.

`IStudySessionRepository.save()` writes to this table after each command. `findById()` reads from it.

**Rejected because:**
- Creates **dual source of truth** — the Ledger has events, the table has state. If they diverge, which is authoritative?
- ADR-001 removed this table for exactly this reason: *"`ei_study_sessions` dual-write table: can be removed (session state fully derivable from `SessionIntentIssued`)"*
- In a CQRS+ES system, the event store IS the write-side persistence. A separate state table is the classic DDD pattern for systems without event sourcing.

### Option B — Event-sourced repository (CHOSEN)

`findById()` loads events from the Ledger for the given `sessionId`, folds them in order into aggregate state, and returns a fully reconstituted `StudySession`. `save()` is a no-op.

```typescript
// infrastructure/persistence/study-session-repository.pg.ts
class StudySessionEventSourcedRepo implements IStudySessionRepository {

  async findById(sessionId: string): Promise<StudySession | null> {
    const events = await this.ledger.loadEventsForSession(sessionId);
    if (events.length === 0) return null;
    return StudySession.fold(events);
  }

  async save(_session: StudySession): Promise<void> {
    // No-op: events already appended to Ledger by handler
  }
}
```

**Chosen because:**
- Ledger remains **single source of truth** — no dual writes, no divergence risk
- Aggregate is fully reconstituted with correct Value Objects — all invariants enforceable
- Standard CQRS+ES pattern per `CQRS-EVENTS.md` and `DDD-TACTICAL.md`
- Session event count is bounded (max ~5 events per lifecycle: `SessionIntentIssued`, `ActivationPlanIssued`, `FirstActionStarted`, `SessionEnd`, `VerificationDecisionIssued`) — no risk of unbounded replay
- `save()` as no-op is canonical: the application handler calls `ledger.append(session.pullDomainEvents())` before `sessionRepo.save(session)`

### Option C — Continue deferring (current spec position)

Keep `reconstitute(null, null, null)` pattern. Thread cross-protocol state via `P3GateContext`. Derive phase from 4 event queries.

**Rejected because:**
- `reconstitute(null)` makes the aggregate a stateless shell — cannot enforce cross-protocol invariants
- P3 cannot do `instanceof NegotiatedIntent` check for verification floor enforcement
- Creates latency Gaps 1, 2, 5, 8 (documented in `06-infrastructure-optimization.md` §0)
- The "derivable from events" justification conflates "possible to derive" with "correct to derive on every request"

### Comparison

| | Option A (state table) | Option B (event-sourced repo) | Option C (continue deferring) |
|-|------------------------|-------------------------------|-------------------------------|
| Source of truth | Dual (Ledger + table) | Ledger only | Ledger only |
| Write-side invariants | Aggregate enforces | Aggregate enforces | Not enforced (null VOs) |
| Read-side queries | Fast (direct read) | Needs read model (ADR-003) | 4 queries per call |
| Canonical CQRS+ES | No | **Yes** | No |
| Dual-write risk | Yes | None | None |
| Implementation cost | Medium | Medium | None (deferred) |

---

## The Fold/Reconstitute Pattern

### Event → Aggregate Reconstitution

The `fold` function processes a session's events in chronological order, reconstructing the aggregate's full state.

**Fold processes only 3 event types** — the events that the aggregate itself emits via `addDomainEvent()`:

| Event | Emitted by | Status after fold |
|-------|-----------|-------------------|
| `SessionIntentIssued` | `issueNegotiatedIntent()` or `issueDeclaredIntent()` | `'activating'` |
| `ActivationPlanIssued` | `issueActivationPlan()` | `'active'` |
| `VerificationDecisionIssued` | `issueVerificationDecision()` | `'verifying'` |

`SessionEnd` and `FirstActionStarted` are **NOT** aggregate events — they are appended directly by application handlers/workflows ([run-p3-gate/handler.ts:178-183](../../../src/ei/application/run-p3-gate/handler.ts)). The fold function does not process them. These events are consumed by the **read-side** TopicLoop projector (ADR-003), not the write-side aggregate.

```typescript
// domain/study-session/study-session.ts — new static method
static fold(events: SessionEvent[]): StudySession {
  let status: SessionStatus = 'negotiating';
  let sessionIntent: NegotiatedIntent | DeclaredIntent | null = null;
  let activationPlan: ActivationPlan | null = null;
  let verificationDecision: VerificationDecision | null = null;
  let sessionId: string, studentId: string, topicId: string;

  for (const event of events) {
    switch (event.eventType) {
      case 'SessionIntentIssued':
        sessionId = event.payload.sessionId;
        studentId = event.payload.studentId;
        topicId = event.payload.topicId;
        sessionIntent = reconstructIntent(event.payload);
        status = 'activating';
        break;

      case 'ActivationPlanIssued':
        activationPlan = reconstructPlan(event.payload);
        status = 'active';
        break;

      case 'VerificationDecisionIssued':
        verificationDecision = reconstructDecision(event.payload);
        status = 'verifying';
        break;
    }
  }

  return StudySession.reconstitute(
    sessionId, studentId, topicId,
    status, sessionIntent, activationPlan, verificationDecision
  );
}
```

The starting state is `'negotiating'` because every session begins there. The fold transitions forward as it encounters each event — exactly mirroring the aggregate's command methods.

### Why `reconstructX` Functions Are Needed: Flat JSON → Value Object Bridging

When the Ledger stores `SessionIntentIssued`, the event payload is a **flat JSON object** — raw fields like `topicId`, `taskType`, `energy`, `timebox`, `intentSource`. But the aggregate doesn't hold raw JSON — it holds **Value Objects** with type identity (`instanceof` checks) and encapsulated access.

The `reconstructIntent`, `reconstructPlan`, and `reconstructDecision` functions bridge this gap: they accept **already-computed props** from event payloads and create VOs via `reconstitute()` — a secondary factory that bypasses computation and validation.

**Why `reconstitute()`, not `create()`?** Events are immutable facts — they record computed values at a specific point in time. `create()` computes derived values from raw inputs (e.g., `timeboxMin = Math.round((P1_RESCUE_SCOPE_MIN + P1_RESCUE_SCOPE_MAX) / 2)`). If tunables change after the event was stored, `create()` would produce different values — breaking temporal correctness. `reconstitute()` accepts the props as-is: what was stored is what we get back.

**DDD alignment:** This follows the `OrderId.from(value)` pattern in DDD-TACTICAL.md — a secondary factory for recreating VOs from persisted data, with no re-validation. See also [ei-runtime-tactical-spec.md §7g](../tactical/ei-runtime-tactical-spec.md) for the full two-factory pattern specification.

### ADR-001 Two-VO Integration

The `reconstructIntent` function uses the `intentSource` discriminator from `SessionIntentIssued` to reconstruct the correct Value Object type:

```typescript
function reconstructIntent(payload: SessionIntentIssuedPayload): NegotiatedIntent | DeclaredIntent {
  if (payload.intentSource === 'declared') {
    return DeclaredIntent.reconstitute({
      timebox: payload.timebox,
      taskType: payload.taskType,
      energy: payload.energy,
      sleepBucket: payload.sleepBucket,
      verificationFloor: payload.verificationFloor,
    });
  } else {
    // NegotiatedIntent has non-trivial payload → props mapping
    // (toEventPayload() renames/nests fields — see mapping table below)
    return NegotiatedIntent.reconstitute({
      playId: payload.playId,
      mode: payload.mode,
      scope: {
        timeboxMin: payload.timebox,            // payload flat → props nested
        questionCount: payload.questionCount,
        difficultyTier: payload.difficultyTier,
      },
      verificationPlan: {                       // payload: verificationFloor → props: verificationPlan
        minQuestions: payload.verificationFloor.minQuestions,
        preferVerifyNow: payload.verificationFloor.preferVerifyNow,
      },
      constraints: payload.constraints,
      stateScore: payload.stateScore,
      negotiatedIntentId: payload.sessionIntentId,  // payload: sessionIntentId → props: negotiatedIntentId
      energy: payload.energy,
      sleepBucket: payload.sleepBucket,
    });
  }
}

// ActivationPlan and VerificationDecision: payload ≈ props (direct pass-through)
function reconstructPlan(payload: ActivationPlanIssuedPayload): ActivationPlan {
  return ActivationPlan.reconstitute({
    playId: payload.playId,
    mode: payload.mode,
    firstAction: payload.firstAction,
    replanCap: payload.replanCap,
    constraints: payload.constraints,
  });
}

function reconstructDecision(payload: VerificationDecisionIssuedPayload): VerificationDecision {
  return VerificationDecision.reconstitute({
    playId: payload.playId,
    mode: payload.mode,
    decision: payload.decision,
    verifyNow: payload.verifyNow,
    scheduleVerify: payload.scheduleVerify,
    skipReason: payload.skipReason,
  });
}
```

### NegotiatedIntent: Payload → Props Field Mapping

`toEventPayload()` ([negotiated-intent.ts:175-197](../../../src/ei/domain/study-session/value-objects/negotiated-intent.ts)) renames and nests fields for the event schema. The fold function reverses this mapping when calling `reconstitute()`:

| Event payload field | VO props field | Notes |
|---|---|---|
| `timebox` | `scope.timeboxMin` | Flat → nested |
| `questionCount` | `scope.questionCount` | Flat → nested |
| `difficultyTier` | `scope.difficultyTier` | Flat → nested |
| `verificationFloor.minQuestions` | `verificationPlan.minQuestions` | Different container name |
| `verificationFloor.preferVerifyNow` | `verificationPlan.preferVerifyNow` | Different container name |
| `sessionIntentId` | `negotiatedIntentId` | Different field name |
| `playId`, `mode`, `energy`, `sleepBucket`, `stateScore`, `constraints` | Same | Direct pass-through |

**DeclaredIntent, ActivationPlan, VerificationDecision:** payload shape ≈ props shape. No mapping needed — direct pass-through as shown in the `reconstructPlan` and `reconstructDecision` functions above.

### instanceof Check Restored

This restores the `instanceof` check capability in P3:

```typescript
// Inside StudySession.issueVerificationDecision():
if (this._sessionIntent instanceof NegotiatedIntent) {
  // Enforce verification floor — ELI set this in P1
  const floor = this._sessionIntent.verificationFloor;
  // VerificationDecision.create() uses floor
} else {
  // DeclaredIntent — no floor to enforce (by design, ADR-001)
}
```

### `reconstitute()` Signature Update

The current signature must be updated to match ADR-001's two-VO design:

```typescript
// Current (stale):
static reconstitute(
  sessionId, studentId, topicId, status,
  negotiatedIntent: NegotiatedIntent | null,       // ← only NegotiatedIntent
  activationPlan, verificationDecision, negotiatedIntentId?
): StudySession

// Target:
static reconstitute(
  sessionId, studentId, topicId, status,
  sessionIntent: NegotiatedIntent | DeclaredIntent | null,  // ← both VO types
  activationPlan, verificationDecision
): StudySession
```

The `negotiatedIntentId` parameter is no longer needed — the session ID is carried in the event payload per ADR-001.

---

## Write-Side + Read-Side Canonical Flow

> **Note:** This diagram shows the **target architecture** — what the system looks like after the event-sourced repository is implemented. It is not a description of the current code. Today, `IStudySessionRepository` does not exist (ADR-001 deleted it). P2/P3 handlers call `StudySession.reconstitute(sessionId, ..., null, null, null)` with hardcoded status and null VOs. `sessionId` is derived from a Ledger query (`getSessionIdFromLastIntent`). The gap documented in this ADR is the **absence** of `sessionRepo` — the canonical flow below is the fix.

### Current flow (the gap)

```
RunP2GateHandler (today):
  sessionId = getSessionIdFromLastIntent(db, studentId, topicId)    ← Ledger query (~300ms)
  session = StudySession.reconstitute(sessionId, ..., null, null, null)  ← stateless shell
  session.issueActivationPlan(...)   ← aggregate has no memory of P1

RunP3GateHandler (today):
  sessionId = getSessionIdFromLastIntent(db, studentId, topicId)    ← Ledger query (~300ms)
  verificationFloor = findP1VerificationFloorFromEvents(db, ...)    ← Ledger query (~260ms)
  watchOnly = findP2WatchOnlyFlagFromEvents(db, ...)                ← Ledger query
  session = StudySession.reconstitute(sessionId, ..., null, null, null)  ← stateless shell
  // Floor enforcement happens in VerificationDecision.create() via P3GateContext
  // — NOT via aggregate's instanceof check on _sessionIntent
```

### `sessionId` sourcing in target flow

Today, P2/P3 workflows call `getSessionIdFromLastIntent(db, studentId, topicId)` to read `sessionId` from the Ledger (~300ms per call). In the target flow, `sessionId` comes from one of two sources — no Ledger query needed:

- **P2 in same workflow as P1:** `sessionId` is already in scope — P1 generated it (`crypto.randomUUID()`) and it flows through workflow context directly to P2.
- **P3 in separate workflow:** `sessionId` is read from `ei_topic_state.current_session_id` (ADR-003 projection column) — already loaded as part of the initial `getTopicState()` query. Zero extra queries.

Both paths feed `sessionRepo.findById(sessionId)`, which loads the session's events from the Ledger and folds them into the aggregate.

### Target flow (gap filled)

```
WRITE PATH                                READ PATH

─── P1 (two paths per ADR-001) ───        ─── AppOpen Routing ───

RunDeclaredIntentHandler (Sessions 1-8)   AppOpen arrives
  StudySession.open()                     → SELECT session_phase
  session.issueDeclaredIntent()             FROM ei_topic_state
  → SessionIntentIssued {declared}          WHERE student_id=$1 AND topic_id=$2
  events → Ledger                         → null → P1 (fresh session)
  sessionRepo.save() → no-op             → 'activating' → P2 (resume)
                                          → 'active' → already in session
       — OR —
                                          ─── TopicLoop Projector ───
RunP1GateHandler (Session 9+)            (event consumer)
  StudySession.open()
  session.issueNegotiatedIntent()         handles SessionIntentIssued
  → SessionIntentIssued {negotiated}        → session_phase = 'activating'
  events → Ledger                           → current_session_id = sessionId
  sessionRepo.save() → no-op               → intent_source = intentSource
                                            → verification_floor (from payload)

─── P2 (both paths) ───                  handles ActivationPlanIssued
                                            → session_phase = 'active'
RunP2GateHandler                            → watch_only_flag (from payload)
  session = sessionRepo.findById(id)
    → loads SessionIntentIssued           handles FirstActionStarted
    → intentSource='declared'?              → last_session_started_at
        → DeclaredIntent VO
    → intentSource='negotiated'?          handles SessionEnd
        → NegotiatedIntent VO               → session_phase = 'verifying'
    → status = 'activating'
  session.issueActivationPlan(...)        handles VerificationDecisionIssued
  events → Ledger                           → session_phase = 'closed'
  sessionRepo.save() → no-op

─── P3 (both paths) ───

RunP3GateHandler
  session = sessionRepo.findById(id)
    → loads SessionIntentIssued
           + ActivationPlanIssued
    → folds: status='active'
             sessionIntent = correct VO
             activationPlan = VO
  session.issueVerificationDecision(...)
    → if sessionIntent instanceof NegotiatedIntent:
        enforce verificationFloor         ← aggregate invariant
    → if sessionIntent instanceof DeclaredIntent:
        no floor (student controls)       ← ADR-001 design
  events → Ledger
  sessionRepo.save() → no-op
```

---

## Consequences

### Positive

- **Aggregate fully reconstituted at each gate** — `_status`, `_sessionIntent`, `_activationPlan` all populated from Ledger events. All invariants enforceable via aggregate methods.
- **P3 `instanceof` check restored** — verification floor enforcement is canonical: the aggregate reads `this._sessionIntent.verificationFloor` directly, not via context threading.
- **`reconstitute(null)` anti-pattern eliminated** — P2/P3 handlers call `sessionRepo.findById()` instead of hardcoding status and passing null VOs.
- **PhaseDeriver replaced** — read-side queries use `ei_topic_state.session_phase` (ADR-003), not 4 event queries.
- **Cross-protocol-read functions replaceable** — `findP1VerificationFloorFromEvents()` and `findP2WatchOnlyFlagFromEvents()` can be removed once the aggregate carries this state.
- **Bounded event replay** — a session lifecycle produces at most ~5 events. No risk of unbounded growth requiring snapshots.

### What Gets Eliminated

| Current code | Replaced by | Reason |
|-------------|-------------|--------|
| `cross-protocol-read.ts` Ledger queries | Aggregate's own `_sessionIntent` and `_activationPlan` | Write-side fix: aggregate carries state |
| `P3GateContext` floor/watchOnly threading | Aggregate's `instanceof` check + VO field access | Write-side fix: no manual threading |
| `PhaseDeriver.derivePhase()` 4-query fan | `ei_topic_state.session_phase` column | Read-side fix (ADR-003) |
| `getSessionIdFromLastIntent()` | `ei_topic_state.current_session_id` column | Read-side fix (ADR-003) |
| AppOpen 9-type event scan | `ei_topic_state.session_phase` lookup | Read-side fix (ADR-003) |

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| `findById` loads N events per session | Bounded: max ~5 events per session lifecycle. No snapshot needed. |
| Fold logic must correctly reconstruct VOs | Unit tests: fold each event type individually and in combination. Test both `intentSource` paths. |
| `reconstitute()` signature change breaks callers | All callers already pass `null` — change is compatible. Update type only. |
| Fold must accept event payloads without re-validation | VOs use `reconstitute()` (not `create()`) for fold — no re-validation or re-computation. Ledger payloads were valid at write time; temporal correctness requires accepting them as-is. See [ei-runtime-tactical-spec.md §7g](../tactical/ei-runtime-tactical-spec.md) for the two-factory pattern. |

### Relationship to Other ADRs

| ADR | Relationship |
|-----|-------------|
| **ADR-001** (Declared Intent) | Removed `ei_study_sessions` table → created the persistence gap this ADR fills. Introduced `intentSource` discriminator → used by the fold function to reconstruct correct VO type. |
| **ADR-002** (Declared-Intent Bypass Fix) | Ensured both paths (declared + negotiated) emit full protocol event sequence (`SessionIntentIssued` + `ActivationPlanIssued`) → prerequisite for the fold function to work for all sessions. |
| **ADR-003** (Projection Schema Evolution) | Covers the **read-side** schema changes (`session_phase`, `current_session_id`, etc. on `ei_topic_state`). This ADR covers the **write-side**. Together they form the complete CQRS+ES solution. |

---

## Infrastructure Design Decisions

### C1: JSONB Functional Index for `findById(sessionId)`

**Decision:** Add a partial JSONB functional index on `ei_events` to enable canonical `findById(sessionId)` on the event-sourced repository.

```sql
CREATE INDEX IF NOT EXISTS idx_ei_events_session_id
  ON ei_events ((payload->>'sessionId'))
  WHERE event_type IN ('SessionIntentIssued', 'ActivationPlanIssued', 'VerificationDecisionIssued');
```

**Why a partial index:** Only 3 of 16 event types carry `sessionId` in their payload — the 3 aggregate events that `fold()` processes. The partial filter keeps the index small and avoids indexing irrelevant rows.

**Repository port signature:** Canonical `findById(sessionId)` — the aggregate ID uniquely identifies the session. The adapter queries `ei_events` directly via the JSONB index, folds events into the aggregate, and returns a fully reconstituted `StudySession`.

```typescript
// domain/study-session/repository.ts
interface IStudySessionRepository {
  findById(sessionId: string): Promise<StudySession | null>;
  save(session: StudySession): Promise<void>;
}

// infrastructure/persistence/study-session-repository.pg.ts
async findById(sessionId: string): Promise<StudySession | null> {
  const rows = await db.any(
    `SELECT event_type, payload, occurred_at FROM ei_events
     WHERE payload->>'sessionId' = $1
       AND event_type = ANY($2)
     ORDER BY occurred_at ASC`,
    [sessionId, ['SessionIntentIssued', 'ActivationPlanIssued', 'VerificationDecisionIssued']],
  );
  if (rows.length === 0) return null;
  return StudySession.fold(rows.map(toSessionEvent));
}
```

**Options rejected:**

| Option | Why rejected |
|--------|-------------|
| `findLatestByTopic(studentId, topicId)` | Not canonical DDD — mixes query method into repository. `(studentId, topicId)` is not the aggregate ID. Cannot load historical sessions by ID. |
| Add `session_id TEXT` column to `ei_events` | Requires backfill `UPDATE` on append-only Ledger — violates the "never UPDATE `ei_events`" invariant. |
| No index, reverse-lookup via `ei_topic_state.current_session_id` | Creates write-side dependency on read-side projection. Repository must read from source of truth (Ledger), not projections. |

**Neon compatibility:** JSONB functional indexes use standard Postgres B-tree mechanics. No Neon-specific performance concern — index pages are cached in the compute node's page cache identically to regular column indexes. Partial index filter keeps storage minimal.

**No projection dependency:** The repository reads directly from `ei_events` (the Ledger). No staleness risk from projection lag. Events are queryable immediately after INSERT — standard Postgres transactional visibility.

### C2: Migration SQL — Pattern and `upsertAggregates` Extension

**Migration pattern decision:** Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (Postgres 9.6+) for all new columns. This is simpler and more readable than the existing `DO $$ BEGIN IF NOT EXISTS ... END $$` pattern used for earlier backfill columns. Both are idempotent; the newer syntax is the recommended approach.

**ADR-004-specific migration** (the JSONB index — ADR-003's 11 columns are documented in that ADR):

```sql
-- ADR-004: JSONB functional index for event-sourced repository
CREATE INDEX IF NOT EXISTS idx_ei_events_session_id
  ON ei_events ((payload->>'sessionId'))
  WHERE event_type IN ('SessionIntentIssued', 'ActivationPlanIssued', 'VerificationDecisionIssued');
```

**`upsertAggregates` extension:** The current function ([queries.ts:355-382](../../../src/ei/db/queries.ts)) uses hardcoded positional params `$1` through `$13`. Adding 5 new columns (ADR-003: `sessions_last_7d`, `loops_closed_last_7d`, `has_prior_app_open`, `last_identity_shown_at`, `active_days_7d`) extends to `$18`. Manual extension of INSERT column list, VALUES, SET clause, and params array. The function does atomic full-replace (not partial update), so the dynamic approach used by `upsertTopicState` doesn't add value here.

```
Current:  INSERT ... VALUES ($1..$13) ON CONFLICT ... SET $2..$13
Target:   INSERT ... VALUES ($1..$18) ON CONFLICT ... SET $2..$18
```

**`upsertTopicState` — no SQL change needed:** The function ([queries.ts:285-322](../../../src/ei/db/queries.ts)) builds SQL dynamically from `Object.entries(updates)`. Adding 6 new columns to the `updates` type parameter is sufficient — the SQL builder includes any key present in the updates object. Both the INSERT column list and SET clause are generated at runtime.

**GREATEST for `last_session_started_at`:** Domain-enforced only. `SessionLifecycleState.withSessionStarted(ts)` enforces monotonicity before persistence. `FirstActionStarted` fires at most once per session (P2 guarantees this) — no concurrent-write conflict scenario exists.

### C3: TopicLoopMapper Extension

The mapper ([topic-loop-mapper.ts](../../../src/ei/infrastructure/persistence/mappers/topic-loop-mapper.ts)) bridges `TopicLoop`'s two VOs (`TopicLoopState` + `SessionLifecycleState`) to/from `TopicStateRow`.

**`toDomain` extension:**

```typescript
toDomain(row: TopicStateRow): TopicLoop {
  const id = TopicLoopId.create(row.student_id, row.topic_id);
  const state = TopicLoopState.create({ /* existing 4 fields unchanged */ });
  const sessionLifecycle = SessionLifecycleState.reconstitute({
    sessionPhase: row.session_phase,
    currentSessionId: row.current_session_id,
    verificationFloor: row.verification_floor,   // INTEGER — stores minQuestions only
    watchOnlyFlag: row.watch_only_flag,
    intentSource: row.intent_source,
    lastSessionStartedAt: row.last_session_started_at,
  });
  return TopicLoop.reconstitute(id, state, sessionLifecycle);
}
```

**`verificationFloor` naming:** The DB column `verification_floor` stores an `INTEGER` — the `minQuestions` value extracted from `NegotiatedIntent.verificationPlan.minQuestions`. It is NOT the full `verificationPlan` object (which also contains `preferVerifyNow`). P3 only needs `minQuestions` for the cross-protocol constraint check; `preferVerifyNow` is consumed only during P1 negotiation.

Naming chain: `NegotiatedIntent.verificationPlan.minQuestions` → event payload `verificationFloor.minQuestions` → projection column `verification_floor` (integer) → VO field `SessionLifecycleState.verificationFloor` (number | null).

**`toPersistence` extension:**

```typescript
toPersistence(topicLoop: TopicLoop): Pick<TopicStateRow, ...> {
  return {
    // Existing 4 accumulated-state fields
    last_effort_at: topicLoop.state.lastEffortAt,
    last_retrieval_at: topicLoop.state.lastRetrievalAt,
    last_scheduled_due_at: topicLoop.state.lastScheduledDueAt,
    consecutive_deferrals: topicLoop.state.consecutiveDeferrals,
    // New 6 session-lifecycle fields
    session_phase: topicLoop.sessionLifecycle.sessionPhase,
    current_session_id: topicLoop.sessionLifecycle.currentSessionId,
    verification_floor: topicLoop.sessionLifecycle.verificationFloor,
    watch_only_flag: topicLoop.sessionLifecycle.watchOnlyFlag,
    intent_source: topicLoop.sessionLifecycle.intentSource,
    last_session_started_at: topicLoop.sessionLifecycle.lastSessionStartedAt,
  };
}
```

**Dependency chain:** C3 depends on A5 (`SessionLifecycleState` VO in domain) and C2 (migration adds 6 columns). `TopicLoop.reconstitute()` signature changes from `(id, state)` to `(id, state, sessionLifecycle?)` — optional param keeps backward compatibility for scenarios where no session lifecycle data exists (brand-new topics, backfill in progress).

### C4: `queries.ts` Type Widening

`TopicStateRow` gains 6 new fields; `AggregatesRow` gains 5. Both use `SELECT *` — new columns are returned automatically after migration. TypeScript type updates ensure compile-time safety.

```typescript
// TopicStateRow additions (queries.ts):
session_phase: string | null;
current_session_id: string | null;
verification_floor: number | null;
watch_only_flag: boolean;
intent_source: string | null;
last_session_started_at: Date | null;

// AggregatesRow additions (queries.ts):
sessions_last_7d: number;
loops_closed_last_7d: number;
has_prior_app_open: boolean;
last_identity_shown_at: Date | null;
active_days_7d: number;
```

**No breaking changes for existing callers:** `upsertTopicState` is dynamic — new keys in the updates object flow through the SQL builder automatically. `upsertAggregates` requires manual extension (see C2). `StudentAggregatesMapper` ([student-aggregates-mapper.ts](../../../src/ei/infrastructure/persistence/mappers/student-aggregates-mapper.ts)) needs 5 new fields in both `toDomain` and `toPersistence`.

### C5: `StudySessionRepository.pg.ts` — Event-Sourced Adapter

New file implementing `IStudySessionRepository`. Uses the JSONB index (C1) for event lookup and `StudySession.fold()` (A3) for reconstitution.

```typescript
// infrastructure/persistence/study-session-repository.pg.ts
import type { EiDb } from '../../runtime/db';
import type { IStudySessionRepository } from '../../domain/study-session/repository';
import type { StudySession } from '../../domain/study-session/study-session';

const SESSION_EVENT_TYPES = [
  'SessionIntentIssued',
  'ActivationPlanIssued',
  'VerificationDecisionIssued',
] as const;

export class PostgresStudySessionRepository implements IStudySessionRepository {
  constructor(private readonly db: EiDb) {}

  async findById(sessionId: string): Promise<StudySession | null> {
    const rows = await this.db.any(
      `SELECT event_type, payload, occurred_at FROM ei_events
       WHERE payload->>'sessionId' = $1
         AND event_type = ANY($2)
       ORDER BY occurred_at ASC`,
      [sessionId, [...SESSION_EVENT_TYPES]],
    );
    if (rows.length === 0) return null;

    const events = rows.map((row) => ({
      eventType: row.event_type as string,
      payload: row.payload as Record<string, unknown>,
      occurredAt: row.occurred_at as Date,
    }));
    return StudySession.fold(events);
  }

  async save(_session: StudySession): Promise<void> {
    // No-op: events already appended to Ledger by the handler
    // via IAppendEventPort before save() is called.
  }
}
```

**`save()` is a no-op** — canonical for event-sourced repositories. The application handler calls `ledger.append(session.pullDomainEvents())` before calling `sessionRepo.save()`. Events are the source of truth; the repository only reads.

**Query cost:** 1 round-trip (~250ms on Neon). The JSONB partial index ensures efficient lookup. Result set is bounded: max 3 rows per session (one per aggregate event type). In-memory `fold()` is pure computation, negligible cost.

### Infrastructure Files Summary

| File | Change | Group |
|------|--------|-------|
| `src/ei/db/migrate.ts` | JSONB index + 11 `ALTER TABLE` columns (ADR-003) | C1 + C2 |
| `src/ei/db/queries.ts` | Widen `TopicStateRow` (6), `AggregatesRow` (5), extend `upsertAggregates` to `$18` | C2 + C4 |
| `src/ei/infrastructure/persistence/mappers/topic-loop-mapper.ts` | Map `SessionLifecycleState` VO ↔ 6 columns | C3 |
| `src/ei/infrastructure/persistence/mappers/student-aggregates-mapper.ts` | Map 5 new aggregate fields | C4 |
| `src/ei/infrastructure/persistence/study-session-repository.pg.ts` | **New** — event-sourced adapter | C5 |
| `src/ei/domain/study-session/repository.ts` | **New** — `IStudySessionRepository` port (re-created) | B1 |

---

## Application Layer Design Decisions

### B1: Re-create `IStudySessionRepository` Port

**Decision:** Re-introduce the driven port at `domain/study-session/repository.ts`.

```typescript
// domain/study-session/repository.ts
import type { StudySession } from './study-session';

export interface IStudySessionRepository {
  findById(sessionId: string): Promise<StudySession | null>;
  save(session: StudySession): Promise<void>;
}
```

**Port placement:** Per CLAUDE.md, driven ports for aggregates go in `domain/{aggregate}/repository.ts`. This follows the existing pattern in [topic-loop/repository.ts](../../../src/ei/domain/topic-loop/repository.ts) and [student-aggregates/repository.ts](../../../src/ei/domain/student-aggregates/repository.ts).

**`save()` is a no-op** — canonical for event-sourced repositories (see C5). The handler calls `ledger.append(session.pullDomainEvents())` before `sessionRepo.save()`. Events are the source of truth.

### B2: P2/P3 Handlers — Inject Repository, Remove `reconstitute(null)` Pattern

**Decision:** Replace the `reconstitute(null)` anti-pattern with `sessionRepo.findById(sessionId)`.

**Current code** (the anti-pattern):

```typescript
// run-p2-gate/handler.ts:120
const session = StudySession.reconstitute(sessionId, studentId, topicId, 'activating', null, null, null);

// run-p3-gate/handler.ts:140
const session = StudySession.reconstitute(sessionId, studentId, topicId, 'active', null, null, null);
```

**Target code:**

```typescript
// Both handlers:
const session = await this.sessionRepo.findById(command.sessionId);
if (!session) throw new ApplicationError(`Session ${command.sessionId} not found`);
```

**Handler constructor changes:**

```typescript
// RunP2GateHandler — add sessionRepo
constructor(
  private readonly signalsPort: IGetStudentSignalsPort,
  private readonly assessLoopHealth: IAssessLoopHealthUseCase,
  private readonly appendEvent: IAppendEventPort,
  private readonly queryEvents: IQueryEventsPort,         // ← stays (see below)
  private readonly protocolEngine: IProtocolEngine,
  private readonly sessionRepo: IStudySessionRepository,  // ← new
) {}

// RunP3GateHandler — add sessionRepo
constructor(
  private readonly signalsPort: IGetStudentSignalsPort,
  private readonly assessLoopHealth: IAssessLoopHealthUseCase,
  private readonly appendEvent: IAppendEventPort,
  private readonly queryEvents: IQueryEventsPort,         // ← stays (see below)
  private readonly protocolEngine: IProtocolEngine,
  private readonly sessionRepo: IStudySessionRepository,  // ← new
) {}
```

**`sessionId` sourcing:** Both commands already carry `sessionId` as a field ([run-p2-gate/command.ts:9](../../../src/ei/application/run-p2-gate/command.ts), [run-p3-gate/command.ts:11](../../../src/ei/application/run-p3-gate/command.ts)). How `sessionId` reaches the command is a D-group workflow concern (D2: replace `getSessionIdFromLastIntent()` with `ei_topic_state.current_session_id`).

#### Why `queryEvents` Stays in Both Handlers

The `IQueryEventsPort` remains in P2 and P3 because these handlers need **operational metrics for LoopHealth mode selection** — data that is NOT aggregate state. The aggregate stores gate *outputs* (NegotiatedIntent, ActivationPlan, VerificationDecision). LHA needs gate *inputs*.

**P2 handler** ([handler.ts:56-70](../../../src/ei/application/run-p2-gate/handler.ts)) queries `Replan`, `FirstActionStarted`, `IntentSet` to compute:
- `replanCount` — how many times the student replanned (LHA + P2GateContext)
- `hasStartSignal` / `startLatencyMin` — whether and when the student started working (LHA + P2GateContext)

These are per-session operational signals with no projection column equivalent.

**P3 handler** ([handler.ts:60-68](../../../src/ei/application/run-p3-gate/handler.ts)) queries session events to compute:
- `sessionDurationSec` — from `FirstActionStarted.startedAt` to `endedAt` (output DTO field)
- `hasRetrieval` / `hasSchedule` — whether retrieval happened during session (LHA mode selection)

**P3 filter shrinks after B3:**

```typescript
// Current (6 types — includes cross-protocol reads):
['FirstActionStarted', 'SessionIntentIssued', 'ActivationPlanIssued',
 'RetrievalVerified', 'RetrievalScheduled', 'VerificationCompleted']

// After B3 (4 types — cross-protocol reads removed):
['FirstActionStarted', 'RetrievalVerified', 'RetrievalScheduled', 'VerificationCompleted']
```

**Consequence analysis:**

| Concern | Status | Notes |
|---------|--------|-------|
| Latency (~250ms per call) | Remains | Uses existing `(student_id, event_type, occurred_at DESC)` index; efficient |
| Architectural purity | Clean | `IQueryEventsPort` is a driven port — no direct DB dependency |
| P3 scope reduction | Improved | 6 → 4 event types after cross-protocol reads removed |
| Future optimization | D-group | `sessionDurationSec` could use `ei_topic_state.last_session_started_at` (ADR-003) instead of querying `FirstActionStarted` |

### B3: P3 Handler — Remove Cross-Protocol Threading (Two-Phase)

**Decision:** Two-phase approach. Phase 1 (this ADR): source cross-protocol values from the aggregate instead of event queries. Phase 2 (future): move invariant enforcement into the aggregate's `issueVerificationDecision()` method.

#### Phase 1: Source From Aggregate, Keep P3GateContext Shape

**Current code** ([handler.ts:87-88](../../../src/ei/application/run-p3-gate/handler.ts)):

```typescript
const p1VerificationFloor = findP1VerificationFloorFromEvents(storedEvents);
const p2WatchOnlyFlag = findP2WatchOnlyFlagFromEvents(storedEvents);
```

**Target code:**

```typescript
const session = await this.sessionRepo.findById(command.sessionId);

// Source cross-protocol values from reconstituted aggregate
const p1VerificationFloor = session.sessionIntent instanceof NegotiatedIntent
  ? {
      minQuestions: session.sessionIntent.verificationPlan.minQuestions,
      preferVerifyNow: session.sessionIntent.verificationPlan.preferVerifyNow,
    }
  : null;
const p2WatchOnlyFlag =
  session.activationPlan?.constraints?.enforceWatchOnlyVerification === true;
```

P3GateContext shape is **unchanged** — `p1VerificationFloor` and `p2WatchOnlyFlag` are populated the same way; only the source changes from event queries to aggregate state. `VerificationDecision.create()` signature is unchanged. Minimal blast radius.

**Files affected:**
- [cross-protocol-read.ts](../../../src/ei/application/run-p3-gate/cross-protocol-read.ts) — **deletable** after this change
- [handler.ts](../../../src/ei/application/run-p3-gate/handler.ts) — replace lines 87-88 with aggregate reads, remove `StoredEvent` import

#### Phase 2: Domain-Owned Invariants (Future Refactor)

In the target state, `issueVerificationDecision()` should read `this._sessionIntent` and `this._activationPlan` directly to enforce cross-protocol invariants — the aggregate root is the single entry point for invariant enforcement. This changes `VerificationDecision.create()` to accept the aggregate's VOs rather than flat context fields, and `P3GateContext` drops `p1VerificationFloor` and `p2WatchOnlyFlag`.

Deferred because it changes the `VerificationDecision.create()` interface and requires updating all test fixtures. Phase 1 achieves the core ADR-004 goal (aggregate carries state); Phase 2 is a correctness refinement.

### B4: TopicLoop Projector — Extend for 4 New Event Types

**Decision:** Register 4 new event types in `TOPIC_LOOP_EVENT_TYPES` and extend `TopicLoop.applyEvent()` to delegate session lifecycle updates to `SessionLifecycleState.withX()` methods.

**New events and projected columns:**

| Event | Projected columns | Payload fields used |
|-------|------------------|---------------------|
| `SessionIntentIssued` | `session_phase='activating'`, `current_session_id`, `intent_source`, `verification_floor` | `payload.sessionId`, `payload.intentSource`, `payload.verificationFloor?.minQuestions` |
| `ActivationPlanIssued` | `session_phase='active'`, `watch_only_flag` | `payload.constraints?.enforceWatchOnlyVerification` |
| `FirstActionStarted` | `last_session_started_at` | `payload.startedAt` |
| `VerificationDecisionIssued` | `session_phase='closed'` | (event type only — no payload extraction needed) |

**`EVENT_TIMESTAMP_FIELD` map additions:**

```typescript
// New entries:
SessionIntentIssued: null,          // status transition, no timestamp column
ActivationPlanIssued: null,         // status transition, no timestamp column
FirstActionStarted: 'startedAt',    // updates last_session_started_at
VerificationDecisionIssued: null,   // status transition, no timestamp column
```

`FirstActionStarted` has `startedAt` — the handler validates it exists (existing [handler.ts:28-39](../../../src/ei/application/apply-event-to-topic-loop/handler.ts) logic). Events with `null` timestamp field skip validation — correct for the 3 status-only events.

**`applyEvent()` extension:**

```typescript
// In TopicLoop.applyEvent() — new cases after existing switch block:
case 'SessionIntentIssued': {
  const vf = payload.verificationFloor as { minQuestions?: number } | null | undefined;
  this._sessionLifecycle = this._sessionLifecycle.withSessionIntent(
    payload.sessionId as string,
    payload.intentSource as string,
    vf?.minQuestions ?? null,
  );
  break;
}

case 'ActivationPlanIssued': {
  const constraints = payload.constraints as { enforceWatchOnlyVerification?: boolean } | null | undefined;
  this._sessionLifecycle = this._sessionLifecycle.withActivationPlan(
    constraints?.enforceWatchOnlyVerification === true,
  );
  break;
}

case 'FirstActionStarted':
  this._sessionLifecycle = this._sessionLifecycle.withSessionStarted(timestamp);
  break;

case 'VerificationDecisionIssued':
  this._sessionLifecycle = this._sessionLifecycle.withVerificationDecision();
  break;
```

#### DeclaredIntent and `verification_floor`

Both `NegotiatedIntent` and `DeclaredIntent` emit `SessionIntentIssued` with the same payload shape. The `verificationFloor` field is:

| `intentSource` | `verificationFloor` in event payload | `verification_floor` projected | P3 behavior |
|---------------|--------------------------------------|-------------------------------|-------------|
| `'negotiated'` | `{ minQuestions: N, preferVerifyNow: bool }` | `N` (integer) | Floor enforced |
| `'declared'` | `null` | `null` | No floor — student controls (ADR-001) |

The projector uses a single code path: `payload.verificationFloor?.minQuestions ?? null`. For declared sessions this evaluates to `null` at every step. No special-casing needed.

**Naming chain (full):** `NegotiatedIntent.verificationPlan.minQuestions` → event payload `verificationFloor.minQuestions` → column `verification_floor` (INTEGER | NULL) → VO `SessionLifecycleState.verificationFloor` (number | null). For declared sessions: `null` → `null` → `NULL` → `null`.

### B5: StudentAggregates Recompute — 5 New Computed Fields

**Decision:** Extend `AggregateMetrics` with 5 new fields and add computation logic to `StudentAggregates.recompute()`. Extend `IStudentEventStreamReader` port with 2 new methods for all-time queries.

**New fields:**

| Field | Type | Computation |
|-------|------|-------------|
| `sessionsLast7d` | `number` | Count `SessionEnd` events in 7d window |
| `loopsClosedLast7d` | `number` | Count `RetrievalVerified` + `VerificationCompleted` (result=confident) in 7d |
| `hasPriorAppOpen` | `boolean` | Any `AppOpen` event exists for this student (all-time) |
| `lastIdentityShownAt` | `Date \| null` | Most recent `IdentityMomentShown` event (all-time) |
| `activeDays7d` | `number` | Count distinct calendar days with any event in 7d window |

**`AggregateMetrics` expansion:**

```typescript
// student-aggregates.ts — added to AggregateMetrics interface:
sessionsLast7d: number;
loopsClosedLast7d: number;
hasPriorAppOpen: boolean;
lastIdentityShownAt: Date | null;
activeDays7d: number;
```

**Input data availability:**

| Field | Available from current `RecomputeInput`? | Source |
|-------|------------------------------------------|--------|
| `sessionsLast7d` | **Yes** — count `SessionEnd` in `events` | 7d window events |
| `loopsClosedLast7d` | **Yes** — count verified events in `events` | 7d window events |
| `hasPriorAppOpen` | **No** — `events` is 7d only | Needs all-time query |
| `lastIdentityShownAt` | **No** — may be older than 7d | Needs all-time query |
| `activeDays7d` | **Yes** — distinct days from `events` | 7d window events |

**Port extension for all-time queries:**

```typescript
// application/shared/port-student-event-stream-reader.ts — 2 new methods:
export interface IStudentEventStreamReader {
  // ... existing methods ...

  /** Check if any event of the given type exists for this student (all-time). */
  hasEventOfType(studentId: string, eventType: string): Promise<boolean>;

  /** Fetch the most recent event of a specific type (all-time). */
  readLatestEventOfType(studentId: string, eventType: string): Promise<StudentStreamedEvent | null>;
}
```

**Handler extension:**

```typescript
// recompute-student-aggregates/handler.ts — parallel reads expanded:
const [rawEvents, rawTopicStates, latestEvent, hasPriorAppOpen, lastIdentityShown] = await Promise.all([
  this.eventReader.readEventsForStudentInWindow(command.studentId, sevenDaysAgo),
  this.topicReader.getAllTopicStates(command.studentId),
  this.eventReader.readLatestEvent(command.studentId),
  this.eventReader.hasEventOfType(command.studentId, 'AppOpen'),
  this.eventReader.readLatestEventOfType(command.studentId, 'IdentityMomentShown'),
]);
```

These are passed into `RecomputeInput` (extended with `hasPriorAppOpen: boolean` and `lastIdentityShownAt: Date | null`), and `StudentAggregates.recompute()` uses them directly — no additional computation needed for those two fields.

**Computation pseudocode for the 3 derivable fields (in `recompute()`):**

```typescript
const sessionsLast7d = events.filter(e => e.eventType === 'SessionEnd').length;

const loopsClosedLast7d = events.filter(e =>
  e.eventType === 'RetrievalVerified' ||
  (e.eventType === 'VerificationCompleted' && (e.payload as any).result === 'confident')
).length;

const activeDays7d = new Set(
  events.map(e => e.occurredAt.toISOString().slice(0, 10))
).size;
```

### Application Files Summary

| File | Change | Group |
|------|--------|-------|
| `src/ei/domain/study-session/repository.ts` | **New** — `IStudySessionRepository` port | B1 |
| `src/ei/application/run-p2-gate/handler.ts` | Inject `sessionRepo`, replace `reconstitute(null)` | B2 |
| `src/ei/application/run-p3-gate/handler.ts` | Inject `sessionRepo`, replace `reconstitute(null)`, source cross-protocol from aggregate | B2 + B3 |
| `src/ei/application/run-p3-gate/cross-protocol-read.ts` | **Deletable** — replaced by aggregate state | B3 |
| `src/ei/domain/topic-loop/events.ts` | Add 4 event types to `TOPIC_LOOP_EVENT_TYPES` + `EVENT_TIMESTAMP_FIELD` | B4 |
| `src/ei/domain/topic-loop/topic-loop.ts` | Extend `applyEvent()` with 4 new cases delegating to `SessionLifecycleState` | B4 |
| `src/ei/domain/student-aggregates/student-aggregates.ts` | Extend `AggregateMetrics` (5 fields), extend `recompute()` | B5 |
| `src/ei/application/shared/port-student-event-stream-reader.ts` | Add `hasEventOfType()` + `readLatestEventOfType()` | B5 |
| `src/ei/application/recompute-student-aggregates/handler.ts` | Extend parallel reads, pass 2 new inputs to `recompute()` | B5 |

---

## Orchestration Layer Design Decisions

### D1: Replace AppOpen 50-Event Scan with `session_phase` Column

**Decision:** Use `session_phase` from `ei_topic_state` for the routing decision (eliminating the 50-event scan), then load the specific event payload only when a resume is needed.

**Current code** ([ei-app-open.ts:100-258](../../../src/mastra/workflows/ei-app-open.ts)) — the `isAppOpenFirstTouch` branch:

```typescript
// 9-type, 50-event speculative scan (~600ms on Neon)
const recentEvents = await queryEventsAdapter.queryEvents(studentId, {
  eventTypes: [
    'SessionIntentIssued', 'IntentResponse',
    'ActivationPlanIssued', 'FirstActionStarted',
    'SessionEnd', 'VerificationDecisionIssued', 'VerificationCompleted',
    'RetrievalScheduled', 'RetrievalSkipped',
  ],
  since,
  limit: 50,
});
// ... 150 lines of procedural phase derivation
```

This scan is expensive because it's speculative — reads 50 events across 9 types to find out IF there's a resumable session, then extracts payload data from the matching events.

#### Cross-Topic Resume Detection

The first-touch AppOpen has no `topic` — the student hasn't selected one yet. But we need to detect if ANY topic has an active/resumable session. `session_phase` is per-topic, so the query is:

```sql
-- New query in queries.ts:
SELECT topic_id, session_phase, current_session_id
FROM ei_topic_state
WHERE student_id = $1
  AND session_phase IS NOT NULL
  AND session_phase NOT IN ('closed')
ORDER BY updated_at DESC
LIMIT 1
```

Single query, uses existing `student_id` index. Returns the topic with an active session (if any).

#### Phase-to-Resume Mapping

| `session_phase` | Current procedural logic (lines) | Resume action |
|-----------------|----------------------------------|---------------|
| `'active'` | 112-136: `FirstActionStarted` without `SessionEnd` | `composeSessionView()` — active session resume |
| `'verifying'` | 140-174: `VerificationDecisionIssued` without terminal | `composeP3View()` — verification resume |
| `'activating'` | 181-258: `SessionIntentIssued` without progress | `composeP1View()` — intent resume (negotiated only) |
| `null` or `'closed'` | 261-265: No active session | Checkin view |

#### Resume Payload Sourcing

Even after knowing `session_phase`, the resume views need event payload data (mode, playId, topicName, verificationSpec, etc.). Rather than projecting all these fields into `ei_topic_state`, we load the specific event only when `session_phase` indicates a resume:

```typescript
// Target flow:
const activeSession = await Q.getActiveSessionForStudent(db, studentId);

if (!activeSession) {
  // No active session → checkin view
  return checkinViewWorkflow.createRun().start(...);
}

const { topic_id, session_phase, current_session_id } = activeSession;

switch (session_phase) {
  case 'active':
    // Load ActivationPlanIssued event payload for mode, playId, etc.
    const activationEvent = await Q.getEventBySessionId(db, current_session_id, 'ActivationPlanIssued');
    return composeSessionView(/* from activationEvent payload */);

  case 'verifying':
    // Load VerificationDecisionIssued event payload
    const vdEvent = await Q.getEventBySessionId(db, current_session_id, 'VerificationDecisionIssued');
    return composeP3View(/* from vdEvent payload */);

  case 'activating':
    // Load SessionIntentIssued event payload
    const intentEvent = await Q.getEventBySessionId(db, current_session_id, 'SessionIntentIssued');
    return composeP1View(/* from intentEvent payload */);
}
```

**Latency improvement:** Current: 1 speculative scan of 50 events across 9 types (~600ms). Target: 1 `session_phase` query (~50ms) + at most 1 targeted event load by `current_session_id` (~100ms using JSONB index from C1). Total: ~150ms vs ~600ms — **4× improvement**.

**`getEventBySessionId` uses the JSONB index** from C1: `WHERE payload->>'sessionId' = $1 AND event_type = $2`. One row returned.

### D2: Replace `getSessionIdFromLastIntent()` with `current_session_id`

**Decision:** Replace the Ledger query with a projection column read. For synchronous paths where the projector hasn't run, pass `sessionId` through workflow context directly.

**Current code:**

[protocol2-activation.ts:63](../../../src/mastra/workflows/protocol2-activation.ts):
```typescript
const sessionId = await Q.getSessionIdFromLastIntent(db, studentId, topic) ?? crypto.randomUUID();
```

[protocol3-verification.ts:67](../../../src/mastra/workflows/protocol3-verification.ts):
```typescript
const sessionId = await Q.getSessionIdFromLastIntent(db, studentId, topic) ?? crypto.randomUUID();
```

Each calls `SELECT payload FROM ei_events WHERE event_type='SessionIntentIssued' ORDER BY occurred_at DESC LIMIT 1` (~300ms).

#### Two-Path Fix

**Declared path (synchronous P1→P2 in `ei-app-open.ts`):** `sessionId` is already generated at [line 338](../../../src/mastra/workflows/ei-app-open.ts) (`crypto.randomUUID()`) and passed directly to both `declaredIntentHandler.execute()` ([line 345](../../../src/mastra/workflows/ei-app-open.ts)) and `p2Handler.execute()` ([line 364](../../../src/mastra/workflows/ei-app-open.ts)). No `getSessionIdFromLastIntent` call here — no change needed.

**Standalone P2/P3 workflows (async — separate workflow trigger):** By the time these run, the projector has processed `SessionIntentIssued` and populated `current_session_id`. The fix:

```typescript
// protocol2-activation.ts — target:
const topicState = await Q.getTopicState(db, studentId, topic);
const sessionId = topicState?.current_session_id ?? crypto.randomUUID();

// protocol3-verification.ts — target:
const topicState = await Q.getTopicState(db, studentId, topic);
const sessionId = topicState?.current_session_id ?? crypto.randomUUID();
```

**The `?? crypto.randomUUID()` fallback** handles:
- Brand-new topics with no projection row yet
- Sessions started before this migration (no `current_session_id` projected)
- Edge case: projector hasn't caught up (should not happen for async workflows, but safe)

**Latency improvement:** ~300ms → ~50ms per workflow execution (existing indexed query vs. Ledger scan).

**`getSessionIdFromLastIntent()` in `queries.ts`** becomes **deletable** after both workflows are migrated.

### D3: Replace `ProtocolRouter.decideForAppOpen()` with Inline `session_phase` Check

**Decision:** Move the AppOpen routing decision into the workflow step. The `ProtocolRouter` class is simplified — `decideForAppOpen()` is removed. `IntentSet → 2` and `SessionEnd → 3` routing remain in the router.

**Current code** ([router.ts:47-58](../../../src/ei/application/ei-protocol-router/router.ts)):

```typescript
private async decideForAppOpen(studentId: string, topicId: string): Promise<1 | 2> {
  const events = await this.queryEvents.queryEvents(studentId, {
    eventTypes: ['SessionIntentIssued'],
    topicId,
    since,
    limit: 1,
  });
  const hasRecentIntent = events.length > 0;
  return hasRecentIntent ? 2 : 1;
}
```

This queries the Ledger to check if a recent `SessionIntentIssued` exists for the topic → P2 if yes, P1 if no.

**Target:** After D1, the `ei-app-open.ts` workflow already has `session_phase` from the `getTopicState()` or `getActiveSessionForStudent()` call. The routing decision becomes inline:

```typescript
// In ei-app-open.ts — replaces ProtocolRouter.decideForAppOpen():
const topicState = await Q.getTopicState(db, studentId, topicRef.topicId);
const sessionPhase = topicState?.session_phase;

if (sessionPhase === 'activating') {
  // Intent exists but no plan yet → resume with P2
  const run = await protocol2ActivationWorkflow.createRun();
  return run.start({ inputData: p2InputData });
} else {
  // No session or session closed → fresh P1
  const run = await protocol1IgnitionWorkflow.createRun();
  return run.start({ inputData: p1InputData });
}
```

**`ProtocolRouter` simplification:**

```typescript
// router.ts — after D3:
export class ProtocolRouter {
  async decideProtocol(command: EiCommandWithStudent): Promise<2 | 3> {
    switch (command.commandType) {
      case 'IntentSet':  return 2;
      case 'SessionEnd': return 3;
      default:
        throw new Error(`Unknown commandType: ${command.commandType}`);
    }
  }
  // decideForAppOpen() removed — AppOpen routing is now inline in workflow
}
```

The router becomes a trivial command→protocol mapper. `AppOpen` never reaches it — the workflow handles routing directly via `session_phase`. The router's `IQueryEventsPort` dependency can be removed if `IntentSet` and `SessionEnd` don't need it (they don't — they're static mappings).

### Orchestration Files Summary

| File | Change | Group |
|------|--------|-------|
| `src/mastra/workflows/ei-app-open.ts` | Replace 50-event scan (lines 100-258) with `session_phase` query + targeted event load; inline routing replaces `ProtocolRouter.decideForAppOpen()` | D1 + D3 |
| `src/mastra/workflows/protocol2-activation.ts` | Replace `getSessionIdFromLastIntent()` with `getTopicState().current_session_id` | D2 |
| `src/mastra/workflows/protocol3-verification.ts` | Replace `getSessionIdFromLastIntent()` with `getTopicState().current_session_id` | D2 |
| `src/ei/db/queries.ts` | Add `getActiveSessionForStudent()` query; `getSessionIdFromLastIntent()` becomes **deletable** | D1 + D2 |
| `src/ei/application/ei-protocol-router/router.ts` | Remove `decideForAppOpen()`, remove `IQueryEventsPort` dependency | D3 |

### Latency Impact Summary

| Operation | Current | Target | Improvement |
|-----------|---------|--------|-------------|
| AppOpen first-touch routing | ~600ms (50-event, 9-type scan) | ~150ms (phase query + targeted event load) | **4×** |
| P2/P3 `sessionId` sourcing | ~300ms per call (Ledger scan) | ~50ms (projection column read) | **6×** |
| AppOpen protocol routing | ~250ms (Ledger query for `SessionIntentIssued`) | ~0ms (inline check, `session_phase` already loaded) | **Eliminated** |

---

## Implementation Notes

When this moves to code, the sequence is:

### Phase 1 — Domain layer (A-group)

1. **Add `SessionLifecycleState` VO** to `domain/topic-loop/value-objects.ts` (A5)
2. **Add 4 event types** to `TOPIC_LOOP_EVENT_TYPES` + `EVENT_TIMESTAMP_FIELD` (A6)
3. **Add `reconstitute()` factories** to NegotiatedIntent, DeclaredIntent, ActivationPlan, VerificationDecision (A1)
4. **Update `StudySession.reconstitute()` signature** — accept `sessionIntent: NegotiatedIntent | DeclaredIntent | null` (A2)
5. **Add `static fold(events)` method** to `StudySession` (A3)

### Phase 2 — Infrastructure layer (C-group)

6. **Add migration SQL** to `migrate.ts` — 11 columns (ADR-003) + JSONB index (C1, C2)
7. **Widen `TopicStateRow` and `AggregatesRow`** in `queries.ts` — 6 + 5 new fields (C4)
8. **Extend `upsertAggregates`** from `$13` to `$18` (C2)
9. **Extend `TopicLoopMapper`** — map `SessionLifecycleState` ↔ 6 columns (C3)
10. **Extend `StudentAggregatesMapper`** — map 5 new aggregate fields (C4)
11. **Re-create `IStudySessionRepository`** port in `domain/study-session/repository.ts` (B1)
12. **Create `StudySessionRepository.pg.ts`** — event-sourced adapter using JSONB index (C5)

### Phase 3 — Application layer (B-group)

13. **Extend TopicLoop projector** for 4 new event types — `applyEvent()` delegates to `SessionLifecycleState.withX()` (B4)
14. **Extend `IStudentEventStreamReader`** with `hasEventOfType()` + `readLatestEventOfType()` (B5)
15. **Extend StudentAggregates recompute** — 5 new fields, 2 new parallel reads (B5)
16. **Update P2 handler** — inject `sessionRepo`, replace `reconstitute(null)` (B2)
17. **Update P3 handler** — inject `sessionRepo`, source cross-protocol from aggregate, shrink `queryEvents` filter (B2 + B3)
18. **Delete `cross-protocol-read.ts`** (B3)

### Phase 4 — Orchestration layer (D-group)

19. **Add `getActiveSessionForStudent()` query** to `queries.ts` — `session_phase NOT IN (null, 'closed')` (D1)
20. **Replace AppOpen 50-event scan** with `session_phase` query + targeted event load (D1)
21. **Replace `getSessionIdFromLastIntent()`** with `getTopicState().current_session_id` in standalone P2/P3 workflows (D2)
22. **Inline AppOpen routing** — replace `ProtocolRouter.decideForAppOpen()` with `session_phase` check (D3)
23. **Simplify `ProtocolRouter`** — remove `decideForAppOpen()`, remove `IQueryEventsPort` dependency (D3)
24. **Delete `getSessionIdFromLastIntent()`** from `queries.ts` (D2)

---

## References

- [ADR-001: Declared Intent — Two-VO Design](adr-001-declared-intent-design.md)
- [ADR-002: Declared-Intent Bypass Fix](adr-002-declared-intent-bypass-fix.md)
- [ADR-003: Projection Schema Evolution](adr-003-projection-schema-evolution.md)
- [ei-runtime-tactical-spec.md §10](../tactical/ei-runtime-tactical-spec.md) — Repository Interface
- [06-infrastructure-optimization.md §0](../06-infrastructure-optimization.md) — Domain Gap Analysis
- [DDD-TACTICAL.md](../../../.agents/skills/clean-ddd-hexagonal/references/DDD-TACTICAL.md) — Repository per aggregate
- [CQRS-EVENTS.md](../../../.agents/skills/clean-ddd-hexagonal/references/CQRS-EVENTS.md) — Event sourcing patterns
- [study-session.ts](../../../src/ei/domain/study-session/study-session.ts) — Aggregate implementation
