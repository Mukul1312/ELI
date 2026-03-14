# Ops & Observability — Tactical DDD Spec

> Docs-only specification for implementing Ops & Observability as a bounded context. Source: [canvas-ops-observability.md](../canvas-ops-observability.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [03-context-map.md](../03-context-map.md).

---

## 1) Purpose and Boundary

- **Primary building block:** Consumer + Ops-level orchestrator. No aggregate. Value Objects, Driver Ports, Driven Ports.
- **Scope:** Debug timeline assembly, correlation/trace propagation, repair/backfill job orchestration; observability sinks (structured logging).
- **Responsibility:** Read from Ledger + Projections for debug; orchestrate repair/backfill by invoking normal write paths of other contexts; ensure access control: Timeline and backfill/replay use OpsAuth (API key, cron secret, dev bypass). Tenant isolation where applicable; redaction.
- **Declare Ops as consumer + ops-level orchestrator**, not an owner of event schema or metrics.

**What Ops IS:**

- **Consumer:** Reads from Ledger + Projections for debug (timeline, "why did EI do X?").
- **Orchestrator (ops-level):** Orchestrates **repair/backfill jobs only**, not domain flows (e.g. study-session gates). Coordinates recompute, backfill, replay by invoking the normal write paths of other contexts — e.g. triggering RecomputeStudentAggregates, TopicLoop projector. Ops controls job scope, checkpointing, throttling, audit; it does not define or mutate domain semantics.

**What Ops is NOT** (per canvas-ei-runtime, canvas-ei-projections, student-policy-tactical-spec, student-aggregates-tactical-spec):

- Owner of event schema (Ledger owns).
- Owner of metric definitions (Projections owns computation).
- Writer of policy semantics (Strategic Adjustment owns; Projections persists).
- Student-facing session orchestrator (EI Runtime orchestrates gates; Ops does not).

**Non-goals (outside Ops & Observability):**

- Redefining signals or metric semantics — EI Projections
- Changing ledger semantics or event schema — EI Event Ledger
- Bypassing normal append/recompute write paths — Ops orchestrates; does not create ops-only mutation paths

---

## 2) Ubiquitous Language (Tactical Terms)


| Term                | Definition                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `CorrelationId`     | Value Object: request-scoped ID for tracing across contexts. Generated at `src/app/api/ei/command/route.ts`; propagated through Mastra workflow inputs into SSO compose steps and carried as a field in `ViewComposed` domain events. Enables cross-layer trace assembly without Mastra Studio. |
| `TraceId`           | Value Object: end-to-end trace for a flow; links spans across services.                                                           |
| `TimelineDebug`     | Read Model: student or request timeline assembled from Ledger events + Projection state; consumed for debug ("why did EI do X?"). For presentation observability: `AppOpen → FlowSelected → SessionIntentIssued → ViewComposed` all queryable by `correlationId` or `sessionId` from a single timeline query. |
| `PresentationTrace` | Value Object (read model sub-sequence): the ordered `ViewComposed` events for a student or session. Answers "which screen variant was shown and why" for each gate. Assembled from Ledger; no separate store needed. |
| `ViewComposed`      | SSO-owned domain event (informational): appended after each SDUI composition step in the Mastra layer. Carries `correlationId`, `phase`, `variant` (e.g. `SILENCE_RE_ENTRY`), `presentationSignals` (key derived values that drove the presentation decision), `sessionId?`. Owner: StudySessionOrchestration. Consumed by Ops via `IQueryEventsPort`. See event catalog in [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md). |
| `BackfillJob`       | Job to recompute projection state; scope (studentIds, projection names), version, checkpoint. Idempotent, auditable, throttled.   |
| `ReplayJob`         | Job to re-ingest events; idempotent, auditable, throttled. Optional later.                                                        |
| `Checkpoint`        | Watermark for resumable jobs; enables resume after failure or throttle pause.                                                     |
| `ProjectionVersion` | Version of projection logic; enables safe rollback and audit (e.g. TopicLoop, StudentAggregates, StudentPolicy).                  |
| `DryRun`            | Job mode: validate without persisting. Optional later.                                                                            |
| `Canary`            | Rollout: small scope first before full run. Optional later.                                                                       |
| `Redaction`         | Privacy: no raw PII in logs/traces; tenant isolation for ops views. Per 05-cross-cutting-concerns.                                |
| `OpsAuth`           | Platform-level auth for timeline, backfill, replay. API key, cron secret, dev bypass, or env var. Not CohortAccess.                |


> **Building block note:** Ops has no aggregate. It is a consumer + orchestrator context. Value Objects capture job scope, correlation, and debug semantics. Driver ports define use cases; driven ports abstract Ledger read, Projections read/write (recompute), job state, and observability sinks.

---

## 3) Capabilities / Use-Case Catalog (Driver Ports)

Define the driver-side application interfaces (hexagonal):


| Port                           | Responsibility                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `IGetStudentTimelineUseCase`   | Read-only: assemble TimelineDebug from Ledger + Projections for a student. Platform ops only; OpsAuth-protected. Dev bypass allowed in NODE_ENV=development. Not institute admin; not CohortAccess. |
| `IStartBackfillJobUseCase`     | Projection recompute orchestrator: scope projection(s), student(s), invoke existing recompute entrypoints. |
| `IGetBackfillJobStatusUseCase` | Return job id, status, progress.                                                                           |
| `ICancelBackfillJobUseCase`    | Cancel a running backfill job.                                                                             |
| `IStartReplayJobUseCase`       | Optional later: re-ingest events if needed.                                                                |
| `IDryRunBackfillUseCase`       | Optional later: validate without persisting.                                                               |


---

## 4) Input/Output Contracts

### GetStudentTimeline

**Input:**


| Field     | Type   | Required | Description                                 |
| --------- | ------ | -------- | ------------------------------------------- |
| studentId | string | Yes      | Student identifier                          |
| limit     | number | No       | Max events to return (default 200, max 500) |


**Output:** `{ events: EventRecord[], aggregates: StudentAggregatesRow | null }`

The `events` array includes all event types from the Ledger ordered by `created_at`. For presentation observability, filter or inspect:
- `FlowSelected` — which template was selected and why (`templateId`, `selectionContext`, `cohortFlags`)
- `ViewComposed` — which screen variant was shown and which signals drove it (`phase`, `variant`, `presentationSignals`, `correlationId`)
- `SessionIntentIssued` — gate output (mode, sessionId, intentSource)

These three event types together constitute the **PresentationTrace** for a session. All share `correlationId` (for cross-event correlation within a single AppOpen) and `sessionId` (for non-negotiated flows).

**Errors:** 401 Unauthorized — missing or invalid OpsAuth. (CohortAccess not used for timeline.)

---

### StartBackfillJob

**Input:**


| Field           | Type     | Required | Description                                         |
| --------------- | -------- | -------- | --------------------------------------------------- |
| projectionNames | string[] | Yes      | e.g. `["StudentAggregates", "TopicLoop"]`           |
| studentIds      | string[] | Yes      | Scope; empty = all active (with limit)              |
| throttle        | number   | No       | Max ops/sec; default from config                    |
| dryRun          | boolean  | No       | If true, validate only; no persist. Optional later. |


**Output:** `{ jobId: string, status: "queued" | "running", createdAt: ISO8601 }`

**Errors:** Invalid projection name; authz failure; invalid scope. 401 Unauthorized — missing or invalid OpsAuth (API key, cron secret).

---

### GetBackfillJobStatus

**Input:** `jobId: string`

**Output:** `{ jobId, status, progress?: { completed, total }, startedAt?, completedAt?, error? }`

**Errors:** Job not found.

---

### CancelBackfillJob

**Input:** `jobId: string`

**Output:** `{ jobId, status: "cancelled" }`

**Errors:** Job not found; job already completed.

---

## 5) Invariants (Must Hold Per Invocation)

Per [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md) and the Ops canvas:

1. **Access control:** Timeline, backfill, replay require OpsAuth (API key, cron secret, or dev bypass). No CohortAccess roles. Tenant isolation for timeline when multi-tenant.
2. **No raw PII in logs/traces:** Redaction policy enforced. Gate logs use `inputSummary`/`outputSummary` only; no raw event payloads.
3. **Backfill/replay idempotent, auditable, throttled:** Jobs can be re-run without corrupting domain truth. Audit log records job start/end. Throttling protects production.
4. **Ops writes go through standard append/recompute APIs:** No "ops-only" mutation paths. Ops invokes Ledger append, Projections recompute; does not define schemas or bypass normal write paths.

---

## 6) Ports (Driven Ports) and Adapters

List the outbound dependencies Ops needs:


| Port                                   | Role              | Responsibility                                                                                                                          |
| -------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **IQueryEventsPort**                   | Driven            | Fetch ordered EventRecord[] for a student; supports filters (eventTypes, topicId, since/until, limit). Maps to `queryEvents` in Ledger. Supports both legacy `topic: string` and post-CC `topicId: UUID` event formats transparently. For presentation observability: filter `eventTypes: ['FlowSelected', 'ViewComposed', 'SessionIntentIssued']` to assemble a PresentationTrace without loading the full timeline. |
| **IGetStudentAggregatesPort**          | Driven            | Get current aggregates for a student. Maps to `getAggregates` in queries.                                                               |
| **IRecomputeStudentAggregatesUseCase** | Driven (use case) | Invoke RecomputeStudentAggregates handler. Projections write/repair.                                                                    |
| **IProjectorEntrypointPort**           | Driven            | Call existing projector/recompute entrypoints (TopicLoop, StudentPolicy). Projections write/repair.                                     |
| **IStructuredLoggerPort**              | Driven            | Emit structured log entries (correlationId, gate, duration, summaries). **Additional span types:** `projector_span` (TopicLoop/StudentAggregates execution: eventCount, durationMs — [ADR-003](../decisions/adr-003-projection-schema-evolution.md)), `fold_span` (StudySession reconstitution: eventCount, durationMs, warning — [ADR-004](../decisions/adr-004-session-lifecycle-persistence.md)). |
| **IMetricsEmitterPort**                | Driven            | Optional (Later): emit aggregated metrics (p50/p95 latency, error rates) to observability sink.                                         |
| **ITracerPort**                        | Driven            | Request-scoped span/trace propagation. Wraps DB and auth calls with timing spans. Carries correlationId. Lightweight structured JSON output; compatible with future OTel migration. Implementations: `TracedDbAdapter` (wraps `eiStore.db`), `TracedAuthAdapter` (wraps `withEiSession`). Port: `[src/ops/application/tracing/port.ts](../../src/ops/application/tracing/port.ts)`. |
| **IBackfillJobRepository**             | Driven            | Job state store for BackfillJob. Table: `ops_backfill_jobs`. Port: `[port.ts](../../src/ops/application/start-backfill-job/port.ts)`. Adapter: `[backfill-job-repository.pg.ts](../../src/ops/infrastructure/persistence/backfill-job-repository.pg.ts)`. |


**Current implementation:** `IGetStudentTimelineUseCase` and driven ports (`IQueryEventsPort`, `IGetStudentAggregatesPort`) exist in `[src/ops/application/get-student-timeline/port.ts](../../src/ops/application/get-student-timeline/port.ts)`. The timeline route invokes `GetStudentTimelineHandler` via `LedgerTimelineAdapter` (`[src/ops/infrastructure/persistence/ledger-timeline-adapter.ts](../../src/ops/infrastructure/persistence/ledger-timeline-adapter.ts)`). Recompute via `RecomputeStudentAggregatesHandler` and Mastra tools (`signal-compute`, `recompute-topic-loop`, `recompute-student-policy`). Persistent backfill jobs: `IStartBackfillJobUseCase`, `IGetBackfillJobStatusUseCase`, `ICancelBackfillJobUseCase`, `BackfillJobRunner`, `IProjectorEntrypointPort`, `IResolveStudentScopePort`, `IGetTopicsForStudentsPort` in `[src/ops/application/](../../src/ops/application/)`; API routes `POST /api/admin/backfill/jobs`, `GET /api/admin/backfill/jobs/[jobId]`, `POST /api/admin/backfill/jobs/[jobId]/cancel`, `POST /api/admin/backfill/run`.

**Tracing (ITracerPort):** Two layers of tracing:

1. **Mastra-level (existing):** Mastra Observability traces workflow runs, workflow steps, agent runs, tool executions. Configured in [src/mastra/index.ts](../../src/mastra/index.ts) via `@mastra/observability`: `DefaultExporter` (persists traces to Postgres for Mastra Studio), `SensitiveDataFilter` (redaction). **Known limitation:** Direct tool invocations from Mastra Studio do not create traces; only agent-invoked tools and workflow steps are traced.

2. **Infrastructure-level (Phase 3):** `TracedDbAdapter` wraps `eiStore.db` to emit a span for every DB query (label, durationMs, correlationId). `TracedAuthAdapter` wraps `withEiSession` to emit spans for each auth phase (getSession, ensureMapping, resolveAuth). Business code is unaware of tracing — wrapping happens at composition root (`src/app/api/ei/command/route.ts`). Output: structured JSON via `IStructuredLoggerPort` pattern. Adapter locations: `[src/ops/infrastructure/tracing/](../../src/ops/infrastructure/tracing/)`. Compatible with future OpenTelemetry migration.

---

## 7) Domain Logic (Code Pointers)

Ops has no domain aggregates. The following table documents the **runtime integration points** (current anchors):


| Operation                              | Location                                                                                                                         | Responsibility                                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Timeline** (events + aggregates)     | `[src/app/api/admin/students/[studentId]/timeline/route.ts](../../src/app/api/admin/students/[studentId]/timeline/route.ts)`     | Platform ops GET; OpsAuth (API key, cron secret, dev bypass) via `[ops-auth.ts](../../src/ops/infrastructure/auth/ops-auth.ts)`; invokes `GetStudentTimelineHandler`; adapter calls `queryEvents`, `getAggregates`. No CohortAccess. Use case: `[src/ops/application/get-student-timeline/](../../src/ops/application/get-student-timeline/)`, adapter: `[ledger-timeline-adapter.ts](../../src/ops/infrastructure/persistence/ledger-timeline-adapter.ts)`. Includes `ViewComposed` events in the event stream — no additional query needed to get PresentationTrace. |
| **Presentation observability**         | `[src/mastra/workflows/steps/](../../src/mastra/workflows/steps/)` — compose-p1-view.ts, compose-p2-view.ts, compose-p3-view.ts, compose-checkin-view.ts | SSO compose steps append `ViewComposed` to the Ledger after each SDUI composition. Carries: `correlationId` (from workflow input), `phase`, `variant`, `presentationSignals`, `sessionId?`. `ViewComposed` is a **pending implementation** — see §12. |
| **CorrelationId + structured logging** | `[src/ei/infrastructure/logging.ts](../../src/ei/infrastructure/logging.ts)`                                                     | `createCorrelationId`, `logGateCall` (GateLogEntry with correlationId, gate, duration, summaries)                  |
| **Signal compute / recompute**         | `[src/mastra/tools/signal-compute.ts](../../src/mastra/tools/signal-compute.ts)`, `[recompute-topic-loop.ts](../../src/mastra/tools/recompute-topic-loop.ts)`, `[recompute-student-policy.ts](../../src/mastra/tools/recompute-student-policy.ts)` | `computeAggregatesTool`, `checkOverdueSchedulesTool`, `listStudentsTool`; projector backfill: `recomputeTopicLoopTool`, `recomputeStudentPolicyTool` |
| **Tracing — Mastra layer**             | `[src/mastra/index.ts](../../src/mastra/index.ts)`                                                                               | Mastra Observability: DefaultExporter, SensitiveDataFilter. Workflow/agent/tool spans for Studio. Aligns with §5 redaction via SensitiveDataFilter. |
| **Tracing — Infrastructure layer**     | `[src/ops/infrastructure/tracing/](../../src/ops/infrastructure/tracing/)`                                                       | `TracedDbAdapter` (DB query spans), `TracedAuthAdapter` (auth phase spans). Wraps `eiStore.db` and `withEiSession` transparently at composition root. Business code unaware. |
| **Event append + query**               | `[src/mastra/tools/event-store.ts](../../src/mastra/tools/event-store.ts)`                                                       | `appendEventTool`, `queryEventsTool` — Ledger read/write for workflows                                             |
| **Recompute handler**                  | `[src/ei/application/recompute-student-aggregates/handler.ts](../../src/ei/application/recompute-student-aggregates/handler.ts)` | RecomputeStudentAggregatesHandler — backfill entrypoint                                                            |
| **Projectors**                         | `[src/ei/infrastructure/projector/](../../src/ei/infrastructure/projector/)`                                                     | `topic-loop-projector.ts`, `student-aggregates-projector.ts`, `student-policy-projector.ts` — backfill entrypoints |
| **Ledger**                             | `[src/ei/db/migrate.ts](../../src/ei/db/migrate.ts)`, `[src/ei/db/queries.ts](../../src/ei/db/queries.ts)`                       | `insertEvent`, `queryEvents` — Ledger exists                                                                       |
| **Projections**                        | `recompute-student-aggregates`, `projector/`                                                                                     | Projections exist; Ops invokes via tools/handlers                                                                  |
| **Backfill jobs**                      | `[src/app/api/admin/backfill/](../../src/app/api/admin/backfill/)`                                                              | POST jobs (create), GET jobs/[jobId] (status), POST cancel, POST run. OpsAuth-protected. `BackfillJobRunner` invokes `IProjectorEntrypointPort`; checkpoints via `ops_backfill_jobs.checkpoint_payload`. |

**Dev-only bypass:** When `NODE_ENV === 'development'`, the timeline route may skip auth. Optional: set `OPS_DEV_BYPASS_SECRET` and send `X-Ops-Dev-Bypass` or `Authorization: Bearer <secret>` for controlled access. **Never active in production.** Use for local debugging only.

---

## 8) Minimal Launch Slice vs Later

Because the strategy is "ship/monitor/iterate", explicitly define:

**Launch MVP:**

- Correlation id propagation + structured gate logs (`logGateCall`, `createCorrelationId`)
- Timeline debug endpoint (`GET /api/admin/students/[studentId]/timeline`) — OpsAuth-protected
- Manual backfill tool invocations (`computeAggregatesTool`, projector entrypoints)

**Phase 2 (implemented):**

- Persistent job orchestration with checkpoints (`ops_backfill_jobs` table, `IBackfillJobRepository`). API: `POST /api/admin/backfill/jobs`, `GET /api/admin/backfill/jobs/[jobId]`, `POST /api/admin/backfill/jobs/[jobId]/cancel`, `POST /api/admin/backfill/run`.

**Phase 3 (current):**

- `ITracerPort`: infrastructure-level request tracing. `TracedDbAdapter` wraps `eiStore.db` with per-query spans; `TracedAuthAdapter` wraps `withEiSession` with per-phase spans. Output: structured JSON logs with correlationId. Business code unaware of tracing (transparent wrapping at composition root). Replaces ad-hoc `performance.now()` timers in workflow/auth code.

**Phase 4 (next — Presentation Observability):**

- `ViewComposed` domain event: SSO compose steps append to Ledger after each SDUI composition. Requires: (1) add `ViewComposed` schema to `src/ei/schemas/events.ts` + `EventTypeEnum`; (2) add `correlationId?: string` to all compose step input schemas; (3) thread `correlationId` from `ei-app-open.ts` into all compose step calls; (4) emit `ViewComposed` via `IEventAppender` in each compose step. See §12 for full design. After this: PresentationTrace queryable from timeline endpoint with zero additional infrastructure.

**Later:**

- `IMetricsEmitterPort`: aggregated p50/p95 latency, error rates to observability sink
- OpenTelemetry migration: replace structured JSON spans with OTel SDK
- Canary / dry-run modes for backfill
- Alerting / SLOs

---

## 9) Test Strategy (Spec Tests)


| Scenario                     | Input                                          | Expected outcome                         |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------- |
| Timeline OpsAuth — valid API key | Valid OPS_API_KEY in x-ops-api-key or Bearer, studentId | Returns events + aggregates              |
| Timeline OpsAuth — valid CRON_SECRET | Valid CRON_SECRET in x-cron-secret, studentId | Returns events + aggregates              |
| Timeline OpsAuth — invalid key | Wrong OPS_API_KEY in header                    | 401 Unauthorized                         |
| Timeline OpsAuth — missing auth | No OPS_API_KEY/CRON_SECRET, no valid header   | 401 Unauthorized                         |
| Redaction                    | Gate log with PII-like input                   | No raw PII in log output                 |
| Backfill idempotent          | Same student, same projection, run twice       | Second run: same state; no corruption    |
| Scope validation             | Invalid projection name                        | Reject with clear error                  |
| Throttling                   | Backfill with throttle limit                   | Respects rate limit (when implemented)   |
| Dev bypass disabled         | NODE_ENV !== 'development', no OpsAuth       | 401 Unauthorized (bypass never active)    |
| Dev bypass works            | NODE_ENV=development, no secret or header OK  | Returns timeline (local debugging). See `[timeline-route.test.ts](../../src/ops/tests/integration/timeline-route.test.ts)`. |
| Backfill API OpsAuth — valid API key | Valid OPS_API_KEY in x-ops-api-key, valid body | 200, jobId + status queued               |
| Backfill API OpsAuth — invalid key   | Wrong OPS_API_KEY on POST /api/admin/backfill/jobs | 401 Unauthorized                       |
| TracedDb span output                 | Query via traced adapter                           | Structured log with label, durationMs, correlationId |
| TracedAuth span output               | Auth via traced adapter                            | Structured log with phase (getSession/ensure/resolve), durationMs, correlationId |
| Tracing transparent to business code | Workflow uses traced db                            | Workflow code unchanged; same results, spans emitted |
| PresentationTrace — P1 negotiated    | AppOpen with no taskType → negotiated-standard; timeline query | FlowSelected (templateId=negotiated-standard) + ViewComposed (phase=p1, variant=e.g. RETURNING, correlationId matches) both in events array |
| PresentationTrace — P1 declared      | AppOpen with taskType → declared-standard; timeline query | FlowSelected (templateId=declared-standard, sessionId=UUID-A) + ViewComposed (phase=p1, sessionId=UUID-A, correlationId matches) |
| PresentationTrace — correlationId    | Single AppOpen request; inspect FlowSelected and ViewComposed | Both events share the same correlationId; enables cross-event trace assembly |
| PresentationTrace — variant debug    | Student with silenceDays ≥ 3; AppOpen; timeline query | ViewComposed.variant = SILENCE_RE_ENTRY; presentationSignals.silenceDays ≥ 3 |
| ViewComposed — ViewComposer purity   | Compose step emits ViewComposed; ViewComposer tested in isolation | No side effects in ViewComposer domain service; ViewComposed emitted only in compose step |


**Test layers:**

- **Unit:** Redaction logic, scope validation, job state transitions (work-units, StartBackfillJobHandler, CancelBackfillJobHandler). See `[src/ops/tests/unit/](../../src/ops/tests/unit/)`.
- **Integration:** Timeline endpoint OpsAuth; backfill API OpsAuth (POST jobs, run, cancel); backfill create→run→progress and failure→resume. See `[timeline-route.test.ts](../../src/ops/tests/integration/timeline-route.test.ts)`, `[backfill-routes.test.ts](../../src/ops/tests/integration/backfill-routes.test.ts)`, `[backfill-job-flow.test.ts](../../src/ops/tests/integration/backfill-job-flow.test.ts)`.
- **Safety/regression:** Throttling, audit log presence

---

## 10) BackfillJob Persistence

**Table:** `ops_backfill_jobs` in [src/ei/db/migrate.ts](../../src/ei/db/migrate.ts).

| Column               | Type       | Description                                                |
| -------------------- | ---------- | ---------------------------------------------------------- |
| id                   | UUID       | Primary key                                                |
| status               | TEXT       | queued, running, completed, cancelled, failed              |
| projection_names     | TEXT[]     | e.g. TopicLoop, StudentAggregates, StudentPolicy           |
| student_ids          | TEXT[]     | Scope (empty = resolved from listActiveStudents)           |
| throttle_ops_per_sec | INTEGER    | Optional rate limit                                        |
| total_units           | INTEGER    | Work units (computed at start)                             |
| completed_units      | INTEGER    | Progress counter                                            |
| checkpoint_payload   | JSONB      | Watermark for resume (lastCompletedUnitIndex)              |
| error_message        | TEXT       | On failure                                                 |
| created_at, started_at, completed_at, updated_at | TIMESTAMPTZ | Lifecycle timestamps |

**Checkpoint:** `checkpoint_payload` stores `{ lastCompletedUnitIndex }`. On resume, runner skips units up to that index and continues. Work units ordered deterministically: TopicLoop (all topics) → StudentAggregates → StudentPolicy per student.

**Resume flow:** Worker loads job, fetches work units, parses checkpoint, loops from `lastCompletedUnitIndex + 1`, invokes `IProjectorEntrypointPort` per unit, persists progress. On error: set status `failed`, `error_message`. On cancel: set status `cancelled`.

---

## 11) Open Questions and Deferred Decisions

**Resolved:**

- **ITracerPort scope and tooling (Phase 3):** Lightweight structured spans (not OpenTelemetry) for Launch. Scope: DB queries + auth phases. Cross-boundary tracing and `IMetricsEmitterPort` deferred to Later. Rationale: can't diagnose latency without it; ad-hoc `performance.now()` timers in business code violated the Ops boundary.
- **Presentation observability approach (Phase 4):** `ViewComposed` domain event (SSO-owned, informational) is the right solution. Alternatives considered: (a) structured log only — not queryable from timeline endpoint; (b) store full SDUI JSON — too large, not a domain event; (c) Mastra Studio only — requires Studio access, not suitable for programmatic debug. `ViewComposed` in the Ledger is queryable by existing `IQueryEventsPort`, requires no new infrastructure, and keeps ViewComposer pure.
- **ViewComposer purity invariant:** `ViewComposed` is emitted in the Mastra compose *step* (outermost shell) AFTER `ViewComposer` domain service returns. ViewComposer itself remains a pure function. Same pattern as `FirstActionStarted` emitted in `composeP2ViewStep`.

**Open:**

- SLI/SLO definitions and alerting ownership.
- Redaction policy details for PII in logs/traces (currently GateLogEntry uses summaries only).

---

## 12) Presentation Observability — ViewComposed Event Design

### Problem Statement

After an AppOpen, the EI system selects a flow (`FlowSelected`), runs a gate (`SessionIntentIssued`), and composes an SDUI screen. The Ledger captures the first two decisions but not the third: **which screen variant was shown and which signals drove the presentation decision**. This makes it impossible to debug "why did student X see SILENCE_RE_ENTRY on Tuesday?" without Mastra Studio access.

### Domain Model Decision

**New domain event: `ViewComposed`** — owned by StudySessionOrchestration (same as `FlowSelected`, `IdentityMomentShown`).

Rationale:
- The presentation variant selection (`selectPhase1Variant()`) is a **meaningful domain decision** driven by domain signals (silenceDays, mode, energy, pendingChecks). Recording it is observability of domain behavior, not implementation detail.
- **ViewComposer stays pure.** The event is emitted by the Mastra compose step after `ViewComposer` returns — same pattern as `FirstActionStarted` emitted in `composeP2ViewStep`.
- Ops already reads from the Ledger via `IQueryEventsPort`. No new driven ports, no new tables.
- The full SDUI component tree (the rendering) is ephemeral presentation data — it belongs in Mastra Studio traces, not the Ledger. `ViewComposed` captures only the *decision*, not the rendering.

### Event Schema

```typescript
// To be added to src/ei/schemas/events.ts + EventTypeEnum
ViewComposedSchema = z.object({
  studentId:   z.string(),
  correlationId: z.string(),             // request-scoped trace ID
  sessionId:   z.string().optional(),    // absent for checkin (no active session)
  templateId:  z.string(),               // e.g. 'negotiated-standard' (from FlowSelected)
  phase:       z.enum(['p1', 'p2', 'p3', 'checkin']),
  variant:     z.string().optional(),    // Phase1Variant for p1/checkin; null for p2/p3
  presentationSignals: z.object({
    mode:               z.enum(['Rescue', 'Boost', 'Neutral']).optional(),
    energy:             z.number().optional(),
    silenceDays:        z.number(),
    pendingChecks:      z.number(),
    verificationRate7d: z.number(),
    hasPriorOpen:       z.boolean(),
    sessionsTotal:      z.number(),
  }),
  composedAt:  z.string().datetime(),
})
```

Producer: SSO compose steps (Mastra layer). Consumer: Ledger (informational). Projection side effects: none.

### Implementation Constraints

| Constraint | Rule |
|---|---|
| ViewComposer purity | `ViewComposed` emitted in Mastra compose step only, AFTER `composeXxxView()` returns. Never inside `view-composer.ts`. |
| `correlationId` threading | Add `correlationId?: string` to all compose step input schemas. Thread from `ei-app-open.ts` workflow input. |
| SSO event appender | Compose steps use `PostgresSsoEventAppenderAdapter` — already used by `composeP2ViewStep` for `FirstActionStarted`. Same pattern. |
| Idempotency key | Format: `${idempotencyKey}:ViewComposed:${phase}` — same convention as `FlowSelected`. |
| checkin phase | `sessionId` absent (checkin has no active session). `templateId` = 'checkin' (not a FlowTemplate id, but a phase marker). |

### Known Implementation Challenges

Discovered via codebase audit before implementation. Documented here so future implementors understand the starting state and the precise resolutions.

#### Challenge 1 — `correlationId` does not reach compose steps (BLOCKER)

**Current state:** `correlationId` is generated at `src/app/api/ei/command/route.ts:74` and flows into Mastra workflow inputs. Only `composeCheckinViewStep` includes it in its input schema (because it needs it for `recomputeStudentAggregates`). The other three compose steps have no `correlationId` in their input schemas:

| Compose step | Has `correlationId`? | How it's called |
|---|---|---|
| `composeCheckinViewStep` | ✅ Yes | Via `checkinViewWorkflow` — receives it in input |
| `executeComposeP1View` (negotiated path) | ❌ No | Called directly in `appOpenBranchStep`; `correlationId` is in scope but not passed |
| `composeP1ViewStep` (protocol1-ignition path) | ❌ No | `.map()` step calls `getInitData()` which has `correlationId`, but not passed to step |
| `composeP2ViewStep` | ❌ No | `protocol2-activation.ts` has `correlationId` in input but doesn't thread it |
| `composeP3ViewStep` | ❌ No | `protocol3-verification.ts` — same |

**Resolution:** Add `correlationId?: string` to each compose step's `inputSchema`. Thread from workflow inputs. For the `executeComposeP1View` direct call in `ei-app-open.ts`: `correlationId` is available in `inputData` — just pass it. No architectural change; pure wiring.

---

#### Challenge 2 — Variant selection result is not surfaced (BLOCKER)

**Current state:** `selectPhase1Variant(ctx)` is called inside `composeP1View()` → `buildPhase1OpenComponents()`. The variant drives the entire screen structure but is never returned or recorded. There is no way to know which variant was shown after the fact without re-running the same logic against reconstructed state.

**Location:** `src/ei/study-session-orchestration/domain/services/view-composer.ts:717`

```typescript
// Currently called deep inside ViewComposer — result never surfaced:
export function selectPhase1Variant(ctx: PresentationContext): Phase1Variant { ... }
```

**Resolution (preserving ViewComposer purity):** `selectPhase1Variant` is a pure function. In the Mastra compose step, after `buildP1PresentationContext()` computes `ctx` and `composeP1View(domainOutput, ctx)` returns the SDUI view, call `selectPhase1Variant(ctx)` a second time to capture the variant for `ViewComposed`. Deterministic — identical inputs produce identical output; calling twice has no side effect. ViewComposer itself is not modified. Export `selectPhase1Variant` from `view-composer.ts`.

For P2 and P3: no variant concept. `ViewComposed.variant` is `undefined` for these phases.

---

#### Challenge 3 — SDUI response shape has no `domain` field for P1/P2/P3 (NOT A BLOCKER)

**Current state:** `P1WrappedResponse`, `P2WrappedResponse`, `P3WrappedResponse` use `z.merge()` to flatten domain output fields to the top level. There is no separate `domain: { correlationId }` field. The generic `SduiResponseSchema` has `domain: z.unknown()` but the typed wrappers don't use it.

**Impact on ViewComposed:** None. `ViewComposed` is appended to the **Ledger**, not the SDUI response. Ops reads it from the timeline endpoint. This challenge is only relevant if `correlationId` is wanted in the client-visible SDUI response (so clients can include it in bug reports). That is a separate, optional enhancement — backward-compatible addition of `correlationId?: string` at the top level of the wrapped response. Deferred.

---

#### Challenge 4 — Two separate tracing systems, neither reaching compose steps (NOT A BLOCKER)

**Current state:** Two logging/tracing systems exist and neither is used in compose steps:
- `src/ei/infrastructure/logging.ts` — concrete functions (`logGateCall`, `logProjectorSpan`, `logFoldSpan`); no port interface; EI-layer only
- `src/ops/application/tracing/port.ts` — `ITracerPort` + `StructuredSpanLogger`; designed for DB/auth wrapping; Ops-layer only

**Impact on ViewComposed:** None. `ViewComposed` uses `IEventAppender` (`PostgresSsoEventAppenderAdapter`) — the SSO's existing driven port, already used by `composeP2ViewStep` for `FirstActionStarted`. It appends a Ledger event, not a structured log span. Neither tracing system is needed.

**Remaining concern (deferred):** The lack of a port interface around `logGateCall` is a design smell — it's a concrete implementation in `ei/infrastructure/`, not an abstraction in `application/shared/`. If EI gate logs need to become pluggable (e.g. emit to OTel), a `IStructuredLoggerPort` in `application/shared/` would be needed. Not required for `ViewComposed`.

---

#### Challenge 5 — `appOpenBranchStep` is a single Mastra step for the negotiated path (NOT A BLOCKER)

**Current state:** In the negotiated flow, `appOpenBranchStep` calls `executeComposeP1View()` directly (not as a separate `.then()` step). Mastra Studio traces the outer step only — the P1 gate execution and P1 view composition appear as one undifferentiated span, not two.

**Impact on ViewComposed:** None. The Ledger append inside `executeComposeP1View` happens regardless of Mastra step boundaries. `ViewComposed` will land in the Ledger correctly.

**Remaining concern (deferred):** For finer Mastra Studio granularity, `ei-app-open.ts` could be restructured to chain `.then(runP1Gate).then(composeP1ViewStep)` for the negotiated path — but this requires a larger workflow refactor and is not a prerequisite for `ViewComposed`.

### Files to Change (Implementation — Phase 4)

| File | Change |
|---|---|
| `src/ei/schemas/events.ts` | Add `ViewComposedSchema`; add `'ViewComposed'` to `EventTypeEnum` |
| `src/mastra/workflows/steps/compose-p1-view.ts` | Add `correlationId?: string` to `ComposeP1ViewInputSchema`; emit `ViewComposed` after compose |
| `src/mastra/workflows/steps/compose-p2-view.ts` | Same: add `correlationId?`; emit `ViewComposed` (phase=p2, variant=null) |
| `src/mastra/workflows/steps/compose-p3-view.ts` | Same: add `correlationId?`; emit `ViewComposed` (phase=p3, variant=null) |
| `src/mastra/workflows/steps/compose-checkin-view.ts` | Already has `correlationId`; add `ViewComposed` emission after compose |
| `src/mastra/workflows/ei-app-open.ts` | Thread `correlationId` into `executeComposeP1View()` call (negotiated path) |
| `src/mastra/workflows/protocol1-ignition.ts` | Thread `correlationId` into `composeP1ViewStep` via `.map()` step (direct workflow path) |
| `src/mastra/workflows/protocol2-activation.ts` | Thread `correlationId` into `composeP2ViewStep` |
| `src/mastra/workflows/protocol3-verification.ts` | Thread `correlationId` into `composeP3ViewStep` |

### Debug Flow After Implementation

```
Bug report: "Student ABC saw wrong screen at ~14:30 on Tuesday"

1. GET /api/admin/students/ABC/timeline?limit=50
   → FlowSelected:         templateId=negotiated-standard, selectionContext
   → SessionIntentIssued:  mode=Rescue, sessionId=uuid-A
   → ViewComposed:         phase=p1, variant=SILENCE_RE_ENTRY,
                           correlationId=X, presentationSignals.silenceDays=4

2. Cross-reference: all three events share correlationId=X
   → Full "why" trace: silence (4 days) triggered SILENCE_RE_ENTRY variant

3. If full SDUI payload needed → Mastra Studio trace for correlationId=X
```

---

## References

- [canvas-ops-observability.md](../canvas-ops-observability.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md) — invariants (admin-only, redaction, idempotency), privacy boundary
- [03-context-map.md](../03-context-map.md) — Ledger → Ops (Customer-Supplier read-only), Projections → Ops (Customer-Supplier read-only/backfill)
- [ei-event-ledger-tactical-spec.md](ei-event-ledger-tactical-spec.md) — Ledger schema, queryEvents, insertEvent
- [student-aggregates-tactical-spec.md](student-aggregates-tactical-spec.md) — Recompute entrypoint
- `[src/app/api/admin/students/[studentId]/timeline/route.ts](../../src/app/api/admin/students/[studentId]/timeline/route.ts)` — Timeline endpoint
- `[src/ei/infrastructure/logging.ts](../../src/ei/infrastructure/logging.ts)` — Correlation id, structured logging
- `[src/mastra/tools/signal-compute.ts](../../src/mastra/tools/signal-compute.ts)` — computeAggregatesTool, checkOverdueSchedulesTool
- `[src/ei/infrastructure/projector/](../../src/ei/infrastructure/projector/)` — Backfill entrypoints
- `[src/ei/db/queries.ts](../../src/ei/db/queries.ts)` — queryEvents, getAggregates, insertEvent
- [Mastra Observability](https://mastra.ai/docs/observability/overview) — Tracing, DefaultExporter, SensitiveDataFilter
- `[src/ops/application/start-backfill-job/port.ts](../../src/ops/application/start-backfill-job/port.ts)` — IBackfillJobRepository, IProjectorEntrypointPort
- `[src/app/api/admin/backfill/](../../src/app/api/admin/backfill/)` — Backfill API routes

