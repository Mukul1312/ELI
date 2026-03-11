# Infrastructure Optimization — Trace-Data-Driven Latency Reduction

> Adapter-level and infrastructure-level optimizations identified through ITracerPort span data (Phase 3, Ops & Observability). None of these changes touch domain logic — they live entirely in driven adapters, application orchestration, or infrastructure configuration.
>
> **Source:** ITracerPort structured spans from `TracedDbAdapter` and `TracedAuthAdapter`. Browser-measured request timing. Analysis date: 2026-03-11. Updated: 2026-03-12.
>
> **Principle:** Domain model (events, aggregates, value objects) stays exactly as designed. All fixes are adapter internals, application-layer orchestration, or infrastructure configuration.

> **ADR-001 (2026-03-11):** `ei_study_sessions` table removed. Session state is now fully derived from `SessionIntentIssued` events in the Ledger. `IStudySessionRepository` port removed from all gate handlers. Session identity carried in event payload (`sessionIntentId` field). See §3 Option C and §5.
>
> **ADR-002 (2026-03-12):** Declared-intent bypass replaced with proper domain path. `RunDeclaredIntentHandler` emits `SessionIntentIssued(intentSource='declared')`. `RunP2GateHandler` runs silently (no UI shown) and emits `ActivationPlanIssued`. All protocol events now present in Ledger for both negotiated and declared sessions. `PhaseDeriver` updated to accept `FirstActionStarted` as active-session evidence for declared path.

---

## §1 Context — Why This Document Exists

### The Problem

EI commands take 2.6–7.7s measured at the browser (Waiting for server response). The product is in early launch phase; target is <2s for all commands.

### Root Cause

India → Neon us-east-1 network latency: ~250ms per DB round-trip. The number of sequential round-trips (not query execution time on the server) drives total latency.

### How We Know

ITracerPort (Ops & Observability, Phase 3) wraps every DB query and auth call with structured spans. Each span records `{ correlationId, label, durationMs, startedAt, metadata: { sql } }`. Span data confirms three bottlenecks, each owned by a different bounded context.

### Trace Evidence Summary

**Baseline (2026-03-11, before optimizations):**

| Request | Browser Wait | Auth (spans) | DB (spans) | Biggest Problem |
|---------|-------------|-------------|-----------|-----------------|
| AppOpen (initial checkin) | **6.16s** | 2.63s (43%) | 3.50s (57%) | 11 parallel reads → pool contention |
| AppOpen (P1 with topic) | **2.63s** | 1.62s (62%) | 0.98s (38%) | Auth getSession 1077ms |
| SessionEnd | **7.66s** | 2.01s (26%) | 5.63s (74%) | 4 parallel reads contention + 7 sequential writes |
| VerificationComplete | **6.05s** | 1.52s (25%) | 4.51s (75%) | 7 parallel reads contention + 5 sequential writes |

**Post ADR-001 + ADR-002 + Session Cache (2026-03-12):**

| Request | Command Duration | Auth | DB Dominant Bottleneck |
|---------|-----------------|------|------------------------|
| AppOpen (checkin, cold) | **3713ms** | 0ms (cached) | 5-way parallel → pool contention (1 at 277ms, 4 at 2850–3082ms) |
| AppOpen (declared intent) | **4712ms** | 0ms (cached) | Sequential: `SessionIntentIssued` INSERT (303ms) → P2 signals contention (3173ms) → 4 sequential writes (1220ms) |
| SessionEnd | **4360ms** | 0–265ms | 4-way `PhaseDeriver` contention (2308ms) + `getSessionIdFromLastIntent` (304ms) + signals (603ms) + 2 writes (589ms) |
| VerificationComplete | **3660ms** | 265ms | 6-way parallel → pool contention (5 of 6 wait 3348–3352ms) + 1 write (303ms) |
| AppOpen (checkin, warm) | **1228ms** | 0ms (cached) | Sequential events query (605ms) + 5-way parallel (617ms max, low contention) |

**Improvements achieved:**
- `auth:getSession`: 984–1616ms → **0ms** (warm, in-memory session cache)
- `ei_study_sessions` write chain: **~332ms eliminated** per request (ADR-001)
- `SessionEnd` total: 7660ms → **4360ms** (~43% reduction)
- `VerificationComplete` total: 6050ms → **3660ms** (~39% reduction)

### Latency Budget (Target)

| Phase | Budget | Baseline (2026-03-11) | Current (2026-03-12) |
|-------|--------|-----------------------|----------------------|
| Auth (getSession + ensure + resolve) | ≤500ms | 1500–2600ms | **0–265ms** ✅ warm |
| DB reads (parallel queries) | ≤500ms | 280–2850ms | 277–3173ms (pool contention persists) |
| DB writes (event append) | ≤500ms | 750–1900ms | 288–1220ms (CTE helps per-event; chains remain) |
| Framework overhead (Next.js, JSON) | ≤50ms | ~25ms | ~25ms |
| Framework overhead (Next.js, JSON) | ≤50ms | ~25ms |
| **Total** | **≤1550ms** | **2600–7660ms** |

---

## §2 Bottleneck 1: Read Model Query Consolidation

**DDD Owner: EI Projections (read model design) + Cross-Cutting (connection pool config)**

### Current State

The checkin view (`composeCheckinView`) issues 11 parallel queries to build `PresentationContext`. All hit `ei_events` table with different filters. They fan out at the same millisecond via `Promise.all`, but Neon serializes them through limited connections:

| Query # | Duration | What |
|---------|----------|------|
| 1 | 282ms | `ei_student_aggregates` lookup |
| 2 | 618ms | Recent events by type array |
| 3-11 | 2504–2857ms | Various `ei_events` counts, EXISTS checks, MAX, topic state |

First query returns in 282ms. Last takes 2857ms. The "parallel" `Promise.all` is near-sequential due to connection pool starvation.

### Why 11 Queries?

Each query was built in isolation — `countStudentEventsLast7d`, `getLastIdentityShownAt`, `hasAnyAppOpen`, `getAppOpenCountWithTopicLast7d`, `getLatestEventTimestamp`, `getSessionEndCount`, `getActiveDaysLast7d`, `getRecentTopics`, `countSessionsAndVerifications7d`, `getAllTopicStates`. They all query `ei_events` with different filters, but share the same `student_id` and overlapping time windows.

### DDD Analysis

The real question: **why does the checkin view need 11 separate event queries when projections exist to pre-compute read-side data?**

`ei_student_aggregates` already holds `pending_checks`, `open_loops`, `verification_rate_7d`, `schedule_misses_7d`, `avoidant_exits_7d`, `silence_days`, `sessions_last_7d`, `verifications_last_7d`. Several of the 11 queries are re-deriving values the projection already holds or could hold.

### Approach

**Two complementary fixes:**

#### Fix A: Neon Connection Pool Limit (Cross-Cutting Infrastructure)

Increase Neon pooler `max` connections from default (likely 10) to 20-30. This allows more true parallelism on `Promise.all` query fans.

| Aspect | Detail |
|--------|--------|
| Owner | Cross-cutting (infrastructure config) |
| Change | Neon dashboard → connection pool settings |
| Code change | None |
| Risk | Higher connection consumption under load |
| Impact | Reduces tail latency on parallel fans by ~40-60% |

#### Fix B1: Merge `getSignals` into 1 CTE Query (Cross-Cutting)

`PostgresGetStudentSignalsAdapter.getSignals()` fires 3 queries in parallel via `Promise.all`:

```ts
const [aggRow, policyRow, topicRows] = await Promise.all([
  Q.getAggregates(db, studentId),    // SELECT from ei_student_aggregates
  Q.getPolicy(db, studentId),        // SELECT from ei_student_policy
  Q.getAllTopicStates(db, studentId), // SELECT from ei_topic_state
]);
```

All three queries share `student_id`. Under pool contention, 2 of 3 wait 2800–3100ms. A single CTE joining all three tables eliminates 2 connections and reduces to ~300ms total.

| Aspect | Detail |
|--------|--------|
| Owner | EI Runtime (infrastructure adapter) |
| Change | Replace `Promise.all` with single `JOIN` or CTE in `getStudentSignals` |
| Port change | None — `IGetStudentSignalsPort.getSignals()` signature unchanged |
| Domain impact | None |
| Impact | 3 queries → 1 = ~2800ms savings when pool is contended |

#### Fix B2: Merge `PhaseDeriver` into 1 Query (EI Runtime)

`PhaseDeriver.derivePhase()` fires 4 queries in parallel:

```ts
const [intentEvents, planEvents, decisionEvents, startedEvents] = await Promise.all([
  queryEvents(studentId, { eventTypes: ['SessionIntentIssued'], topicId, ... }),
  queryEvents(studentId, { eventTypes: ['ActivationPlanIssued'], topicId, ... }),
  queryEvents(studentId, { eventTypes: ['VerificationDecisionIssued'], topicId, ... }),
  queryEvents(studentId, { eventTypes: ['FirstActionStarted'], topicId, ... }),
]);
```

Under pool contention, 3 of 4 wait ~2300ms. All 4 queries share `student_id`, `topic_id`, and time window. A single `GROUP BY event_type` or `COUNT FILTER` query returns all 4 counts in one round-trip.

| Aspect | Detail |
|--------|--------|
| Owner | EI Runtime (application layer) |
| Change | Single `SELECT event_type, COUNT(*) WHERE event_type = ANY($types) GROUP BY event_type` |
| Domain impact | None |
| Impact | 4 queries → 1 = ~2300ms savings when pool is contended; PhaseDeriver on every `IntentSet` + `SessionEnd` |

#### Fix B3: Consolidate Checkin Queries into 1-2 Read Model Queries (EI Projections)

Redesign the checkin read path to use projections as intended:

1. **Primary query:** Single `SELECT` joining `ei_student_aggregates` + `ei_topic_state` — covers 7 of the 11 current queries (pending_checks, open_loops, verification_rate, silence_days, sessions count, recent topics, all topic states)
2. **Secondary query (if needed):** `ei_events` query only for data not in projections (identity moment timestamp, specific recent event lookups)

| Aspect | Detail |
|--------|--------|
| Owner | EI Projections (read model) + checkin view builder |
| Change | New consolidated query function; update `composeCheckinView` step |
| Domain impact | None — projection schema may gain 1-2 columns (e.g. `last_identity_shown_at`, `active_days_7d`) |
| Risk | Migration needed if adding projection columns |
| Impact | 11 queries → 2 queries = ~500ms (2 × 250ms) instead of ~2850ms |

### Pros and Cons

| | Fix A (Pool Config) | Fix B (Consolidate Queries) |
|---|---|---|
| **Pros** | Zero code change; immediate; benefits all requests | Addresses root cause; 11→2 queries; ~80% read latency reduction |
| **Cons** | Only reduces contention, doesn't eliminate it; higher connection usage | Requires adding fields to projections; migration; more complex single query |
| **Reversibility** | Trivially reversible (config change) | Schema migration is forward-only |

### Challenges

1. **Projection column additions need migration** — `active_days_7d`, `last_identity_shown_at` aren't currently in `ei_student_aggregates`. Adding them requires `ALTER TABLE` + backfill via Ops backfill job.
2. **Projection staleness** — Projections recompute fire-and-forget after events. For the first request (AppOpen initial), projections may not yet reflect the latest state. Acceptable for presentation context (non-critical data).
3. **Which queries can't be projection-ized?** — `hasAnyAppOpen` (EXISTS check) is a one-time onboarding check. Could be a boolean column on `ei_student_aggregates` or handled by checking `sessions_last_7d > 0 || silence_days < ∞`.

### Future

- **Materialized checkin read model:** A single `ei_checkin_readmodel` table purpose-built for the checkin view. Updated by projector on every event. Single query returns everything `composeCheckinView` needs. This is the CQRS-correct end state but premature for launch.
- **Connection pool per context:** If multiple bounded contexts grow independent DB usage, separate pools prevent cross-context contention.

### Phase Plan

| Phase | What | When |
|-------|------|------|
| Immediate | Fix A: Increase Neon pool max connections | Now (config change) |
| Sprint 1 | Fix B: Add missing columns to `ei_student_aggregates`, consolidate to 2 queries | Next sprint |
| Later | Materialized checkin read model | Post-launch if needed |

---

## §3 Bottleneck 2: Write Chain Batching

**DDD Owner: EI Event Ledger (driven adapter internals)**

### Current State

Every event append follows a 3-step sequential flow:

```
Step 1: SELECT event_id FROM ei_idempotency_keys WHERE key = $1    → ~250ms
Step 2: INSERT INTO ei_events (...) VALUES (...) RETURNING *         → ~250ms
Step 3: INSERT INTO ei_idempotency_keys (key, event_id) ... DO NOTHING → ~250ms
                                                              Total: ~750ms per event
```

Workflows that append 2 events (e.g., SessionEnd appends `SessionEnded` + `ActivationPlanIssued`) pay 6 round-trips (~1500ms). Add session state updates (find session, update session, update topic state) and the write chain reaches 7+ sequential round-trips (~1900ms).

### Trace Evidence

SessionEnd correlation `db9c5758`:

| Step | Duration | SQL |
|------|----------|-----|
| idempotency check | 255ms | `SELECT event_id FROM ei_idempotency_keys WHERE key = $1` |
| insert event | 256ms | `INSERT INTO ei_events (...) RETURNING *` |
| insert idempotency key | 255ms | `INSERT INTO ei_idempotency_keys (...) DO NOTHING` |
| idempotency check (2nd event) | 325ms | `SELECT event_id FROM ei_idempotency_keys WHERE key = $1` |
| insert event (2nd event) | 307ms | `INSERT INTO ei_events (...) RETURNING *` |
| insert idempotency key (2nd event) | 281ms | `INSERT INTO ei_idempotency_keys (...) DO NOTHING` |
| ~~insert study session~~ | ~~332ms~~ | ~~`INSERT INTO ei_study_sessions (...)`~~ — **eliminated** (ADR-001: table removed) |
| topic state lookup | 287ms | `SELECT consecutive_deferrals FROM ei_topic_state ...` |
| **Sequential write total** | **~1966ms** (was ~2298ms) | ~332ms saved by ADR-001 table removal |

### DDD Analysis

The domain contract (`IAppendEventPort`) says: "append this event idempotently and return the event record." It does **not** mandate 3 round-trips. The 3-step flow is an **adapter implementation detail** in `src/ei/db/queries.ts`.

The port interface doesn't change. The domain doesn't know how the adapter implements idempotency. This is the most DDD-safe kind of optimization: **infrastructure improvement inside a driven adapter**.

### Approach

#### ✅ Option A: CTE Single-Round-Trip Append (Per Event) — **IMPLEMENTED**

> **Status:** Implemented. The `insertEvent` CTE now handles idempotency check + event insert + key insert in a single round-trip. All `append()` calls in P1, P2, P3 gate handlers use the CTE path. Impact: ~500ms saved per event append.

Collapse the 3-step flow into a single SQL statement using a Common Table Expression:

```sql
WITH existing AS (
  SELECT event_id FROM ei_idempotency_keys WHERE key = $1
),
inserted AS (
  INSERT INTO ei_events (student_id, event_type, topic_id, payload, occurred_at)
  SELECT $2, $3, $4, $5, $6
  WHERE NOT EXISTS (SELECT 1 FROM existing)
  RETURNING *
),
key_insert AS (
  INSERT INTO ei_idempotency_keys (key, event_id)
  SELECT $1, id FROM inserted
  ON CONFLICT (key) DO NOTHING
)
SELECT * FROM inserted
UNION ALL
SELECT e.* FROM ei_events e
JOIN existing ex ON e.id = ex.event_id
```

| Aspect | Detail |
|--------|--------|
| Owner | EI Event Ledger (driven adapter: `src/ei/db/queries.ts`) |
| Port change | None — `IAppendEventPort.append()` signature unchanged |
| Domain impact | None |
| Risk | CTE atomicity relies on Postgres guarantees (well-established) |
| Impact | 3 round-trips → 1 per event = ~500ms saved per event |

#### Option B: Batch Append (Multiple Events in One Round-Trip)

Extend the port with `appendBatch(events[])` for workflows that append 2+ events:

```sql
-- Multi-row CTE for N events in one statement
WITH ... (same CTE pattern, multi-row INSERT)
```

| Aspect | Detail |
|--------|--------|
| Owner | EI Event Ledger (port extension + adapter) |
| Port change | Add `appendBatch(events: AppendEventPayload[]): Promise<EventRecord[]>` |
| Domain impact | Minimal — commands that append 2 events call `appendBatch` instead of 2× `append` |
| Risk | Slightly more complex SQL; idempotency per-event within batch |
| Impact | 6 round-trips → 1 for 2-event workflows = ~1250ms saved |

#### ~~Option C: Consolidate Session Write Chain~~ — **SUPERSEDED by ADR-001**

> **Superseded.** `ei_study_sessions` was removed per ADR-001 (2026-03-11): session state is fully derivable from `SessionIntentIssued` in the event Ledger. The entire session write chain (find session → insert/update session) no longer exists. The ~332ms `INSERT INTO ei_study_sessions` step is eliminated entirely — compared to the ~250ms that a single UPDATE would have saved. No action needed.

#### Option D: Eliminate `getSessionIdFromLastIntent` Sequential Read — **NEW**

`protocol2-activation.ts` (line 63) and `protocol3-verification.ts` (line 67) both execute a sequential read before the handler runs:

```ts
const sessionId = await Q.getSessionIdFromLastIntent(db, studentId, topic) ?? crypto.randomUUID();
```

This is ~300ms on every `IntentSet` and `SessionEnd` command. It exists because the sessionId (set at P1) is not carried forward in the command payload.

**Root cause:** The client receives `sessionIntentId` in the `SessionIntentIssuedOutput` from P1, but doesn't send it back with `IntentSet`/`SessionEnd` commands.

**Fix:** Include `sessionId` in the `IntentSet` and `SessionEnd` command payloads (client-side change). The server reads it directly from the command — no Ledger query needed.

| Aspect | Detail |
|--------|--------|
| Owner | EI Runtime (command schema) + client |
| Change | Add optional `sessionId` field to `IntentSet` and `SessionEnd` command payloads; skip `getSessionIdFromLastIntent` if present |
| Domain impact | None |
| Risk | Low — fallback to Ledger query if field absent (backwards compatible) |
| Impact | ~300ms saved per `IntentSet` + `SessionEnd` |

### Pros and Cons

| | Option A (CTE per event) | Option B (Batch append) | Option C (Session consolidate) | Option D (SessionId in command) |
|---|---|---|---|---|
| **Pros** | No port change; drop-in replacement; ~500ms/event saved | Biggest savings for multi-event workflows; clean port extension | Eliminates session find+update overhead | Eliminates sequential Ledger read; client already has sessionId |
| **Cons** | Still multiple round-trips for multi-event workflows | New port method; callers must be updated | Specific to session workflows only | Requires client-side change |
| **Complexity** | Low (single function rewrite) | Medium (port + adapter + caller updates) | Low (adapter internal) | Low |

### Challenges

1. **CTE idempotency correctness:** The CTE must handle the race condition where two concurrent requests with the same idempotency key both pass the `NOT EXISTS` check. Postgres `ON CONFLICT DO NOTHING` on `ei_idempotency_keys` handles this — the second inserter's key insert is a no-op, and the event insert is also safe (returns nothing from `inserted`, falls through to `existing`). Needs careful testing.
2. **Batch append port extension:** Adding `appendBatch` to `IAppendEventPort` is a small interface change. Existing `append` callers don't change. Only workflows that currently call `append` twice would switch to `appendBatch`.
3. **Transaction semantics:** The CTE runs in a single transaction. If any step fails, the whole thing rolls back. This is actually *better* than the current 3-step flow where step 3 could fail after step 2 succeeds (orphaned event without idempotency key).

### Future

- **Event outbox pattern:** If the system grows to need async event publishing (to message bus, webhooks), the CTE can be extended to insert into an outbox table in the same transaction.
- **Stored procedure:** For very hot paths, the CTE could become a Postgres function for even lower overhead (no query parsing).

### Phase Plan

| Phase | What | Status |
|-------|------|--------|
| ✅ Done | Option A: CTE single-round-trip `insertEvent` | Implemented |
| ✅ Done | Option C: Session close consolidation | **Superseded by ADR-001** — `ei_study_sessions` removed entirely |
| Sprint 2 | Option B: `appendBatch` port extension (if multi-event workflows remain a bottleneck) | Pending — measure after Fix B1/B2 |
| Sprint 2 | Option D: Pass `sessionId` in command payload | Pending — client + server schema change |

---

## §4 Bottleneck 3: Auth Session Resolution

**DDD Owner: CohortAccess bounded context (ACL + application layer)**

### Current State

> **getSession cache implemented (2026-03-11).** Module-scoped `Map<sessionToken, {data, exp}>` with 4-minute TTL in `src/lib/auth/server.ts`. On warm requests, `auth:getSession` is **0ms**. On cache miss, falls back to HTTP (~1000ms). `ensureMapping` + `resolveAuth` were merged into a single `ensureAndResolve` CTE query (~265ms). Auth total warm: **~265ms**. ✅

Auth phases post-optimization:

```
Phase 1: getSession()        → 0ms (cache hit) / ~1000ms (cache miss)
Phase 2: ensureAndResolve()  → ~265ms (single merged CTE query)
                                            Total warm: ~265ms ✅
```

### Trace Evidence

**Baseline (before cache, 2026-03-11):**

| Request | getSession | ensureMapping | resolveAuth | Total Auth |
|---------|-----------|---------------|-------------|------------|
| AppOpen (initial, cold) | 259ms | **2060ms** | 308ms | 2631ms |
| AppOpen (P1, warm) | **1077ms** | 305ms | 236ms | 1620ms |
| SessionEnd | **1433ms** | 285ms | 294ms | 2014ms |
| VerificationComplete | **907ms** | 304ms | 306ms | 1519ms |

`ensureMapping` cold spike (2060ms on first request) is the Neon DB cold-start. `getSession` consistently the largest single call (900–1400ms).

**Post session cache + ensureAndResolve merge (2026-03-12):**

| Request | getSession | ensureAndResolve | Total Auth |
|---------|-----------|------------------|------------|
| AppOpen (warm) | **0ms** | 265ms | **265ms** |
| SessionEnd (warm) | **0ms** | 237ms | **237ms** |
| VerificationComplete (warm) | **1ms** | 335ms | **336ms** |
| Any request (cache miss) | ~1000ms | ~265ms | **~1265ms** |

### DDD Analysis

All three steps live in the **CohortAccess** bounded context. `getSession` is the ACL adapter translating external Neon Auth into internal identity. `ensureMapping` and `resolveAuth` are application-layer use cases.

Key observation: `ensureMapping` (check if student row exists) and `resolveAuth` (query student + cohort + role) **query the same `students` table**. For an existing user (the common case), `ensureMapping` does a SELECT that confirms the row exists, then `resolveAuth` does another SELECT on the same row with JOINs. This is redundant.

### Approach

#### Option A: Merge ensureMapping + resolveAuth into Single Query

Replace two sequential use cases with one combined query:

```sql
WITH ensure AS (
  INSERT INTO students (auth_user_id) VALUES ($1)
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id
),
student AS (
  SELECT id FROM ensure
  UNION ALL
  SELECT id FROM students WHERE auth_user_id = $1
  LIMIT 1
)
SELECT s.id, scm.cohort_id, r.role
FROM student s
LEFT JOIN student_cohort_membership scm ON s.id = scm.student_id
LEFT JOIN roles r ON s.id = r.student_id
```

| Aspect | Detail |
|--------|--------|
| Owner | CohortAccess (application layer refactoring) |
| Change | Two use cases → one combined use case; new driven port |
| Domain impact | None — `AuthSession` VO unchanged |
| Risk | Merges two currently testable units; `provisioned` boolean needs derivation from CTE |
| Impact | 2 DB round-trips → 1 = **~250–300ms saved per request** |

#### Option B: Parallelize ensureMapping + resolveAuth

After `getSession` returns `user.id`, run `ensureMapping` and `resolveAuth` in parallel via `Promise.all`. They only depend on Phase 1, not on each other.

| Aspect | Detail |
|--------|--------|
| Owner | CohortAccess (application orchestration in `withEiSession`) |
| Change | Sequential `await` → `Promise.all([ensureMapping, resolveAuth])` |
| Domain impact | None |
| Risk | If `ensureMapping` creates a new student (first-time user), `resolveAuth` might race and find no row. Needs fallback: if `resolveAuth` returns null AND `ensureMapping.provisioned === true`, retry `resolveAuth` once. |
| Impact | ~250ms saved (ensureMapping and resolveAuth overlap instead of sequential) |

#### Option C: Cache Resolved AuthSession (Short TTL)

After resolving `AuthSession`, cache it keyed by `authUserId` with 60-120s TTL. Subsequent requests skip all 3 steps.

| Aspect | Detail |
|--------|--------|
| Owner | CohortAccess (application service layer) |
| Change | In-memory TTL cache wrapping the resolution flow |
| Domain impact | None — cache wraps at use-case level |
| Risk | Role/cohort changes won't reflect until TTL expires; Vercel serverless: in-memory cache is per-isolate (not shared across instances); cold starts still pay full cost |
| Impact | Entire auth chain (1.5–2.6s) → **0ms for warm requests within same isolate** |

#### Option D: Local JWT Verification (Replace HTTP getSession)

Instead of calling Neon Auth's `getSession()` via HTTP, verify the session JWT locally using Neon Auth's public key.

| Aspect | Detail |
|--------|--------|
| Owner | CohortAccess (ACL adapter swap) |
| Change | Replace `auth.getSession()` with local JWT verification |
| Domain impact | None — driven port returns same `session.user.id` |
| Risk | Depends on whether `@neondatabase/auth` exposes local JWT verification; token refresh/expiry must be handled locally |
| Impact | 900–1400ms → **<5ms** (crypto verification is local, no network) |

### Pros and Cons

| | Option A (Merge) | Option B (Parallel) | Option C (Cache) | Option D (Local JWT) |
|---|---|---|---|---|
| **Pros** | Eliminates redundant query; clean | Simple change; no port refactor | Huge savings on warm | Kills biggest single call |
| **Cons** | Merges two use cases | Race condition on first-time users | Per-isolate only; stale data risk | External dependency (Neon Auth SDK) |
| **Complexity** | Medium | Low | Medium | Low-Medium |
| **Savings** | ~250ms | ~250ms | ~1500-2600ms (warm) | ~900-1400ms |

### Challenges

1. **Option A — `provisioned` boolean:** The combined CTE makes it harder to know if the INSERT actually created a row (for logging). Can be solved by checking `ensure` CTE row count or using `xmax = 0` Postgres trick.
2. **Option B — First-time user race:** If student doesn't exist yet, `resolveAuth` runs in parallel with `ensureMapping` and may find no row. A retry-once fallback handles this, but adds code complexity for an edge case (first login only).
3. **Option C — Vercel serverless isolation:** Each Vercel isolate has its own memory. A cache miss in one isolate doesn't benefit another. For a single-student early-launch product, this means only consecutive requests to the same isolate benefit.
4. **Option D — Neon Auth SDK support:** Need to verify if `@neondatabase/auth` supports local JWT verification or exposes JWKS endpoint. If not, this option is blocked by external dependency.

### Future

- **Session token pattern:** If Neon Auth supports JWKS, the entire auth chain becomes: verify JWT locally (<5ms) + single merged DB query (~250ms) = **~255ms total** (85-90% reduction).
- **Edge auth:** With local JWT verification, auth can move to Vercel Edge middleware, running at the CDN edge closest to the user. DB queries still go to us-east-1, but auth is instant.

### Phase Plan

| Phase | What | Status |
|-------|------|--------|
| ✅ Done | Option E: In-memory session cache for `getSession` | Implemented — `src/lib/auth/server.ts`. Cache miss still ~1000ms. |
| ✅ Done | Option A: Merge `ensureMapping` + `resolveAuth` into single CTE `ensureAndResolve` | Implemented — ~265ms per request |
| Investigate | Option D: Local JWT verification (replace HTTP `getSession` on cache miss) | SDK does not mint `session_data` cookie via middleware. Cache miss path is still HTTP ~1000ms. JWKS endpoint not yet confirmed. |
| Later | Option C: AuthSession cache (Vercel KV) | Post-launch |

---

## §5 DDD Ownership Summary

| Bottleneck | Owner | Layer | Status | Domain Impact |
|-----------|-------|-------|--------|--------------|
| Pool contention | Cross-cutting infrastructure | Neon config | ⏳ Pending (config change) | None |
| `getSignals` 3-way fan-out | EI Runtime (adapter) | `PostgresGetStudentSignalsAdapter` | ⏳ Pending | None — port unchanged |
| `PhaseDeriver` 4-way fan-out | EI Runtime (application) | `PhaseDeriver` class | ⏳ Pending | None |
| `getSessionIdFromLastIntent` sequential read | EI Runtime (orchestration) | P2 + P3 workflow steps | ⏳ Pending (client schema) | None |
| Read model query fan (checkin) | EI Projections | Projection schema + query consolidation | ⏳ Pending | Projection may gain 1-2 columns |
| Sequential write chain | EI Event Ledger | Driven adapter (`insertEvent`) | ✅ Done (CTE, Option A) | None |
| ~~Session write chain~~ | ~~EI Runtime~~ | ~~Session repository adapter~~ | ✅ **Eliminated** — ADR-001 | — |
| Auth ensure + resolve | CohortAccess | Application layer | ✅ Done (`ensureAndResolve` CTE) | None |
| Auth `getSession` HTTP | CohortAccess | ACL adapter | ✅ Done (in-memory cache) | None |
| Bypass domain concept | EI Runtime (domain) | Declared-intent path | ✅ Done (ADR-002) | `DeclaredIntent` VO added |

**Key DDD insight:** None of these fixes touch core domain invariants. They are adapter internals, application-layer orchestration, or infrastructure configuration.

---

## §6 Combined Phase Plan

### ✅ Completed

| What | Impact |
|------|--------|
| In-memory `getSession` cache (§4 Option E) | `auth:getSession`: 984–1616ms → 0ms warm |
| Merge `ensureMapping` + `resolveAuth` → `ensureAndResolve` (§4 Option A) | Auth DB: 2×250ms → 265ms |
| CTE single-round-trip `insertEvent` (§3 Option A) | 3 round-trips → 1 per event append |
| Remove `ei_study_sessions` + `IStudySessionRepository` (ADR-001, §3 Option C) | ~332ms write eliminated per request |
| Replace bypass with `DeclaredIntent` + silent P2 (ADR-002) | Ledger integrity restored; all protocol events present |

### Immediate (Config, Zero Code)

- **§2 Fix A:** Increase Neon connection pool max (dashboard change) — reduces pool contention from 2800–3100ms to near-zero

### Sprint 2 (Query Consolidation)

- **§2 Fix B1:** Merge `getSignals` (3 queries → 1 CTE) — ~2800ms savings per command under contention
- **§2 Fix B2:** Merge `PhaseDeriver` (4 queries → 1 GROUP BY) — ~2300ms savings on every `IntentSet` + `SessionEnd`
- **§3 Option D:** Pass `sessionId` in command payload — eliminates `getSessionIdFromLastIntent` (~300ms) on every `IntentSet` + `SessionEnd`
- **§2 Fix B3:** Consolidate checkin queries to 2 — ~2000ms savings on AppOpen (checkin)

### Sprint 3 (Measure + Iterate)

- Measure post-Sprint-2 span data against target latency budget
- **§3 Option B:** `appendBatch` port extension if multi-event workflows remain slow
- **§4 Option D:** Investigate Neon Auth local JWT verification for cache-miss path

### Later

- Materialized checkin read model (§2 Future)
- AuthSession cache with Vercel KV (§4 Option C)
- Event outbox pattern (§3 Future)

---

## §7 Open Questions

1. **Neon pool max default:** What is the current Neon pooler `max` setting? Need to check dashboard before Fix A.
2. **Neon Auth JWKS:** Does `@neondatabase/auth` support local JWT verification or expose a JWKS endpoint? Cache miss path is still HTTP ~1000ms.
3. **Projection column migration path:** Can we add columns to `ei_student_aggregates` without downtime? (Yes — `ALTER TABLE ADD COLUMN` with default is non-blocking in Postgres.)
4. **Batch append adoption:** Which workflows currently append 2+ events? (`SessionEnd` appends `SessionEnd` + `VerificationDecisionIssued`; `VerificationComplete` appends 1 event. Check `protocol3-verification.ts`.)
5. **`sessionId` in client commands:** `SessionIntentIssuedOutput.sessionIntentId` is already returned from P1. Does the client currently send it back with `IntentSet` and `SessionEnd` commands?

---

## References

- [ops-observability-tactical-spec.md](tactical/ops-observability-tactical-spec.md) — ITracerPort (Phase 3), span data source
- [ei-event-ledger-tactical-spec.md](tactical/ei-event-ledger-tactical-spec.md) — insertEvent contract, idempotency
- [cohort-access-tactical-spec.md](tactical/cohort-access-tactical-spec.md) — Auth flow, ACL
- [student-aggregates-tactical-spec.md](tactical/student-aggregates-tactical-spec.md) — Projection fields, recompute
- [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — Invariants, data ownership
- [canvas-ei-projections.md](canvas-ei-projections.md) — Read model design
