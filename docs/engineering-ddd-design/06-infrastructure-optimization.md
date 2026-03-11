# Infrastructure Optimization — Trace-Data-Driven Latency Reduction

> Adapter-level and infrastructure-level optimizations identified through ITracerPort span data (Phase 3, Ops & Observability). None of these changes touch domain logic — they live entirely in driven adapters, application orchestration, or infrastructure configuration.
>
> **Source:** ITracerPort structured spans from `TracedDbAdapter` and `TracedAuthAdapter`. Browser-measured request timing. Analysis date: 2026-03-11.
>
> **Principle:** Domain model (events, aggregates, value objects) stays exactly as designed. All fixes are adapter internals, application-layer orchestration, or infrastructure configuration.

---

## §1 Context — Why This Document Exists

### The Problem

EI commands take 2.6–7.7s measured at the browser (Waiting for server response). The product is in early launch phase; target is <2s for all commands.

### Root Cause

India → Neon us-east-1 network latency: ~250ms per DB round-trip. The number of sequential round-trips (not query execution time on the server) drives total latency.

### How We Know

ITracerPort (Ops & Observability, Phase 3) wraps every DB query and auth call with structured spans. Each span records `{ correlationId, label, durationMs, startedAt, metadata: { sql } }`. Span data confirms three bottlenecks, each owned by a different bounded context.

### Trace Evidence Summary

| Request | Browser Wait | Auth (spans) | DB (spans) | Biggest Problem |
|---------|-------------|-------------|-----------|-----------------|
| AppOpen (initial checkin) | **6.16s** | 2.63s (43%) | 3.50s (57%) | 11 parallel reads → pool contention |
| AppOpen (P1 with topic) | **2.63s** | 1.62s (62%) | 0.98s (38%) | Auth getSession 1077ms |
| SessionEnd | **7.66s** | 2.01s (26%) | 5.63s (74%) | 4 parallel reads contention + 7 sequential writes |
| VerificationComplete | **6.05s** | 1.52s (25%) | 4.51s (75%) | 7 parallel reads contention + 5 sequential writes |

### Latency Budget (Target)

| Phase | Budget | Current |
|-------|--------|---------|
| Auth (getSession + ensure + resolve) | ≤500ms | 1500–2600ms |
| DB reads (parallel queries) | ≤500ms | 280–2850ms |
| DB writes (event append + session) | ≤500ms | 750–1900ms |
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

#### Fix B: Consolidate Checkin Queries into 1-2 Read Model Queries (EI Projections)

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
| insert study session | 332ms | `INSERT INTO ei_study_sessions (...)` |
| topic state lookup | 287ms | `SELECT consecutive_deferrals FROM ei_topic_state ...` |
| **Sequential write total** | **~2298ms** | |

### DDD Analysis

The domain contract (`IAppendEventPort`) says: "append this event idempotently and return the event record." It does **not** mandate 3 round-trips. The 3-step flow is an **adapter implementation detail** in `src/ei/db/queries.ts`.

The port interface doesn't change. The domain doesn't know how the adapter implements idempotency. This is the most DDD-safe kind of optimization: **infrastructure improvement inside a driven adapter**.

### Approach

#### Option A: CTE Single-Round-Trip Append (Per Event)

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

#### Option C: Consolidate Session Write Chain

SessionEnd currently does: append event → append event → find session → insert/update session → lookup topic state. The session state updates are sequential because each depends on the previous.

These could be consolidated:

- **Session close:** `UPDATE ei_study_sessions SET status = $1, updated_at = $2 WHERE student_id = $3 AND topic_id = $4 AND status IN (...) RETURNING *` — replaces find + insert pattern with single upsert.
- **Combined with batch append:** Events + session update in a single transaction CTE.

| Aspect | Detail |
|--------|--------|
| Owner | EI Runtime (session management adapter) |
| Port change | Session repository adapter internals only |
| Domain impact | None |
| Impact | 2 round-trips → 1 for session close = ~250ms saved |

### Pros and Cons

| | Option A (CTE per event) | Option B (Batch append) | Option C (Session consolidate) |
|---|---|---|---|
| **Pros** | No port change; drop-in replacement; ~500ms/event saved | Biggest savings for multi-event workflows; clean port extension | Eliminates session find+update overhead |
| **Cons** | Still multiple round-trips for multi-event workflows | New port method; callers must be updated | Specific to session workflows only |
| **Complexity** | Low (single function rewrite) | Medium (port + adapter + caller updates) | Low (adapter internal) |

### Challenges

1. **CTE idempotency correctness:** The CTE must handle the race condition where two concurrent requests with the same idempotency key both pass the `NOT EXISTS` check. Postgres `ON CONFLICT DO NOTHING` on `ei_idempotency_keys` handles this — the second inserter's key insert is a no-op, and the event insert is also safe (returns nothing from `inserted`, falls through to `existing`). Needs careful testing.
2. **Batch append port extension:** Adding `appendBatch` to `IAppendEventPort` is a small interface change. Existing `append` callers don't change. Only workflows that currently call `append` twice would switch to `appendBatch`.
3. **Transaction semantics:** The CTE runs in a single transaction. If any step fails, the whole thing rolls back. This is actually *better* than the current 3-step flow where step 3 could fail after step 2 succeeds (orphaned event without idempotency key).

### Future

- **Event outbox pattern:** If the system grows to need async event publishing (to message bus, webhooks), the CTE can be extended to insert into an outbox table in the same transaction.
- **Stored procedure:** For very hot paths, the CTE could become a Postgres function for even lower overhead (no query parsing).

### Phase Plan

| Phase | What | When |
|-------|------|------|
| Sprint 1 | Option A: CTE single-round-trip `insertEvent` | Next sprint |
| Sprint 1 | Option C: Single UPDATE for session close | Same sprint |
| Sprint 2 | Option B: `appendBatch` port extension (if multi-event workflows remain a bottleneck) | After measuring Option A impact |

---

## §4 Bottleneck 3: Auth Session Resolution

**DDD Owner: CohortAccess bounded context (ACL + application layer)**

### Current State

Every request executes three sequential auth phases:

```
Phase 1: getSession()      → HTTP to Neon Auth service    → 900–1400ms
Phase 2: ensureMapping()   → 1-3 DB queries (check/insert) → 285–2060ms (cold: 2060ms, warm: 285ms)
Phase 3: resolveAuth()     → 1 DB query (LEFT JOINs)       → 236–308ms
                                                     Total: 1519–2631ms
```

Phase 2 depends on Phase 1 (`session.user.id`). Phase 3 depends on Phase 1 (`session.user`). But Phase 2 and Phase 3 do NOT depend on each other — they both only need `user.id` from Phase 1.

### Trace Evidence

| Request | getSession | ensureMapping | resolveAuth | Total Auth |
|---------|-----------|---------------|-------------|-----------|
| AppOpen (initial, cold) | 259ms | **2060ms** | 308ms | 2631ms |
| AppOpen (P1, warm) | **1077ms** | 305ms | 236ms | 1620ms |
| SessionEnd | **1433ms** | 285ms | 294ms | 2014ms |
| VerificationComplete | **907ms** | 304ms | 306ms | 1519ms |

`ensureMapping` cold spike (2060ms on first request) is the Neon DB cold-start — connection establishment. On subsequent requests it drops to ~300ms. `getSession` is consistently the largest single call (900-1400ms).

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

| Phase | What | When |
|-------|------|------|
| Sprint 1 | Option A: Merge ensure + resolve into single CTE query | Next sprint |
| Sprint 1 | Option B: Parallelize merged-ensure-resolve with any remaining sequential step | Same sprint (if Option A leaves sequential steps) |
| Investigate | Option D: Check if Neon Auth supports local JWT verification / JWKS | Research task |
| Later | Option C: Cache only if Vercel KV or similar is already in stack | Post-launch |

---

## §5 DDD Ownership Summary

| Bottleneck | Owner | Layer | Domain Impact |
|-----------|-------|-------|--------------|
| Pool contention | Cross-cutting infrastructure | Neon config | None |
| Read model query fan | EI Projections | Projection schema + query consolidation | Projection may gain 1-2 columns |
| Sequential write chain | EI Event Ledger | Driven adapter internals (`insertEvent`) | None — port unchanged |
| Session write chain | EI Runtime | Session repository adapter | None |
| Auth ensure + resolve | CohortAccess | Application layer (use case merge) | None — AuthSession VO unchanged |
| Auth getSession HTTP | CohortAccess | ACL adapter | None — same output |

**Key DDD insight:** None of these fixes touch domain logic. They're all infrastructure adapter optimizations or application-layer orchestration changes.

---

## §6 Combined Phase Plan

### Immediate (Config Only)

- Increase Neon connection pool max (Fix A from §2)

### Sprint 1 (Adapter Optimizations)

- CTE single-round-trip `insertEvent` (§3 Option A)
- Single UPDATE for session close (§3 Option C)
- Merge ensureMapping + resolveAuth (§4 Option A)
- Consolidate checkin queries to 2 (§2 Fix B)

### Sprint 2 (Measure + Iterate)

- Measure post-optimization span data
- `appendBatch` port extension if multi-event workflows remain slow (§3 Option B)
- Investigate Neon Auth local JWT verification (§4 Option D)

### Later

- Materialized checkin read model (§2 Future)
- AuthSession cache with Vercel KV (§4 Option C)
- Event outbox pattern (§3 Future)

---

## §7 Open Questions

1. **Neon pool max default:** What is the current Neon pooler `max` setting? Need to check dashboard.
2. **Neon Auth JWKS:** Does `@neondatabase/auth` support local JWT verification or expose a JWKS endpoint?
3. **Projection column migration path:** Can we add columns to `ei_student_aggregates` without downtime? (Yes — `ALTER TABLE ADD COLUMN` with default is non-blocking in Postgres.)
4. **Batch append adoption:** Which workflows currently append 2+ events? (SessionEnd, VerificationComplete — both append 2 events via gate use cases.)

---

## References

- [ops-observability-tactical-spec.md](tactical/ops-observability-tactical-spec.md) — ITracerPort (Phase 3), span data source
- [ei-event-ledger-tactical-spec.md](tactical/ei-event-ledger-tactical-spec.md) — insertEvent contract, idempotency
- [cohort-access-tactical-spec.md](tactical/cohort-access-tactical-spec.md) — Auth flow, ACL
- [student-aggregates-tactical-spec.md](tactical/student-aggregates-tactical-spec.md) — Projection fields, recompute
- [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — Invariants, data ownership
- [canvas-ei-projections.md](canvas-ei-projections.md) — Read model design
