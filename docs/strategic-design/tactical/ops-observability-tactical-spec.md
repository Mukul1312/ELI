# Ops & Observability — Tactical DDD Spec

> Docs-only specification for implementing Ops & Observability as a bounded context. Source: [canvas-ops-observability.md](../canvas-ops-observability.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [03-context-map.md](../03-context-map.md).

---

## 1) Purpose and Boundary

- **Primary building block:** Consumer + Ops-level orchestrator. No aggregate. Value Objects, Driver Ports, Driven Ports.
- **Scope:** Debug timeline assembly, correlation/trace propagation, repair/backfill job orchestration; observability sinks (structured logging).
- **Responsibility:** Read from Ledger + Projections for debug; orchestrate repair/backfill by invoking normal write paths of other contexts; ensure admin-only access, tenant isolation, redaction.
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
| `CorrelationId`     | Value Object: request-scoped ID for tracing across contexts. Propagates through gate calls.                                       |
| `TraceId`           | Value Object: end-to-end trace for a flow; links spans across services.                                                           |
| `TimelineDebug`     | Read Model: student or request timeline assembled from Ledger events + Projection state; consumed for debug ("why did EI do X?"). |
| `BackfillJob`       | Job to recompute projection state; scope (studentIds, projection names), version, checkpoint. Idempotent, auditable, throttled.   |
| `ReplayJob`         | Job to re-ingest events; idempotent, auditable, throttled. Optional later.                                                        |
| `Checkpoint`        | Watermark for resumable jobs; enables resume after failure or throttle pause.                                                     |
| `ProjectionVersion` | Version of projection logic; enables safe rollback and audit (e.g. TopicLoop, StudentAggregates, StudentPolicy).                  |
| `DryRun`            | Job mode: validate without persisting. Optional later.                                                                            |
| `Canary`            | Rollout: small scope first before full run. Optional later.                                                                       |
| `Redaction`         | Privacy: no raw PII in logs/traces; tenant isolation for ops views. Per 05-cross-cutting-concerns.                                |


> **Building block note:** Ops has no aggregate. It is a consumer + orchestrator context. Value Objects capture job scope, correlation, and debug semantics. Driver ports define use cases; driven ports abstract Ledger read, Projections read/write (recompute), job state, and observability sinks.

---

## 3) Capabilities / Use-Case Catalog (Driver Ports)

Define the driver-side application interfaces (hexagonal):


| Port                           | Responsibility                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `IGetStudentTimelineUseCase`   | Read-only: assemble TimelineDebug from Ledger + Projections for a student. Admin-only, RBAC-protected.     |
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

**Errors:** Unauthorized (401), Forbidden — admin role required (403).

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

**Errors:** Invalid projection name; authz failure; invalid scope.

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

1. **Admin-only + tenant isolation:** Timeline, backfill, replay require admin role. CohortAccess / RBAC enforce; no cross-tenant leakage.
2. **No raw PII in logs/traces:** Redaction policy enforced. Gate logs use `inputSummary`/`outputSummary` only; no raw event payloads.
3. **Backfill/replay idempotent, auditable, throttled:** Jobs can be re-run without corrupting domain truth. Audit log records job start/end. Throttling protects production.
4. **Ops writes go through standard append/recompute APIs:** No "ops-only" mutation paths. Ops invokes Ledger append, Projections recompute; does not define schemas or bypass normal write paths.

---

## 6) Ports (Driven Ports) and Adapters

List the outbound dependencies Ops needs:


| Port                                   | Role              | Responsibility                                                                                                                          |
| -------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **IQueryEventsPort**                   | Driven            | Fetch ordered EventRecord[] for a student; supports filters (eventTypes, topicId, since/until, limit). Maps to `queryEvents` in Ledger. |
| **IGetStudentAggregatesPort**          | Driven            | Get current aggregates for a student. Maps to `getAggregates` in queries.                                                               |
| **IRecomputeStudentAggregatesUseCase** | Driven (use case) | Invoke RecomputeStudentAggregates handler. Projections write/repair.                                                                    |
| **IProjectorEntrypointPort**           | Driven            | Call existing projector/recompute entrypoints (TopicLoop, StudentPolicy). Projections write/repair.                                     |
| **IStructuredLoggerPort**              | Driven            | Emit structured log entries (correlationId, gate, duration, summaries).                                                                 |
| **IMetricsEmitterPort**                | Driven            | Optional: emit metrics to observability sink.                                                                                           |
| **ITracerPort**                        | Driven            | Optional: span/trace propagation.                                                                                                       |
| **IBackfillJobRepository**             | Driven            | Job state store for BackfillJob (to-be: table + repo port).                                                                             |


**Current implementation:** `IGetStudentTimelineUseCase` and driven ports (`IQueryEventsPort`, `IGetStudentAggregatesPort`) exist in `[src/ops/application/get-student-timeline/port.ts](../../src/ops/application/get-student-timeline/port.ts)`. The timeline route invokes `GetStudentTimelineHandler` via `LedgerTimelineAdapter` (`[src/ops/infrastructure/persistence/ledger-timeline-adapter.ts](../../src/ops/infrastructure/persistence/ledger-timeline-adapter.ts)`). Recompute via `RecomputeStudentAggregatesHandler` and Mastra tools (`signal-compute`, `recompute-topic-loop`, `recompute-student-policy`).

---

## 7) Domain Logic (Code Pointers)

Ops has no domain aggregates. The following table documents the **runtime integration points** (current anchors):


| Operation                              | Location                                                                                                                         | Responsibility                                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Timeline** (events + aggregates)     | `[src/app/api/admin/students/[studentId]/timeline/route.ts](../../src/app/api/admin/students/[studentId]/timeline/route.ts)`     | Admin GET; RBAC via ResolveAuthSession; tenant isolation; invokes `GetStudentTimelineHandler`; adapter calls `queryEvents`, `getAggregates`. Use case: `[src/ops/application/get-student-timeline/](../../src/ops/application/get-student-timeline/)`, adapter: `[ledger-timeline-adapter.ts](../../src/ops/infrastructure/persistence/ledger-timeline-adapter.ts)`. |
| **CorrelationId + structured logging** | `[src/ei/infrastructure/logging.ts](../../src/ei/infrastructure/logging.ts)`                                                     | `createCorrelationId`, `logGateCall` (GateLogEntry with correlationId, gate, duration, summaries)                  |
| **Signal compute / recompute**         | `[src/mastra/tools/signal-compute.ts](../../src/mastra/tools/signal-compute.ts)`, `[recompute-topic-loop.ts](../../src/mastra/tools/recompute-topic-loop.ts)`, `[recompute-student-policy.ts](../../src/mastra/tools/recompute-student-policy.ts)` | `computeAggregatesTool`, `checkOverdueSchedulesTool`, `listStudentsTool`; projector backfill: `recomputeTopicLoopTool`, `recomputeStudentPolicyTool` |
| **Event append + query**               | `[src/mastra/tools/event-store.ts](../../src/mastra/tools/event-store.ts)`                                                       | `appendEventTool`, `queryEventsTool` — Ledger read/write for workflows                                             |
| **Recompute handler**                  | `[src/ei/application/recompute-student-aggregates/handler.ts](../../src/ei/application/recompute-student-aggregates/handler.ts)` | RecomputeStudentAggregatesHandler — backfill entrypoint                                                            |
| **Projectors**                         | `[src/ei/infrastructure/projector/](../../src/ei/infrastructure/projector/)`                                                     | `topic-loop-projector.ts`, `student-aggregates-projector.ts`, `student-policy-projector.ts` — backfill entrypoints |
| **Ledger**                             | `[src/ei/db/migrate.ts](../../src/ei/db/migrate.ts)`, `[src/ei/db/queries.ts](../../src/ei/db/queries.ts)`                       | `insertEvent`, `queryEvents` — Ledger exists                                                                       |
| **Projections**                        | `recompute-student-aggregates`, `projector/`                                                                                     | Projections exist; Ops invokes via tools/handlers                                                                  |


---

## 8) Minimal Launch Slice vs Later

Because the strategy is "ship/monitor/iterate", explicitly define:

**Launch MVP:**

- Correlation id propagation + structured gate logs (`logGateCall`, `createCorrelationId`)
- Timeline debug endpoint (`GET /api/admin/students/[studentId]/timeline`) — admin-only
- Manual backfill tool invocations (`computeAggregatesTool`, projector entrypoints) — no persistent job orchestration yet

**Later:**

- Persistent job orchestration with checkpoints (`BackfillJob` table, `IBackfillJobRepository`)
- Canary / dry-run modes for backfill
- Alerting / SLOs

---

## 9) Test Strategy (Spec Tests)


| Scenario                     | Input                                          | Expected outcome                         |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------- |
| Timeline RBAC — admin        | Valid admin session, studentId                 | Returns events + aggregates              |
| Timeline RBAC — non-admin    | Valid student session                          | 403 Forbidden                            |
| Timeline RBAC — unauthorized | No session                                     | 401 Unauthorized                         |
| Redaction                    | Gate log with PII-like input                   | No raw PII in log output                 |
| Backfill idempotent          | Same student, same projection, run twice       | Second run: same state; no corruption    |
| Scope validation             | Invalid projection name                        | Reject with clear error                  |
| Throttling                   | Backfill with throttle limit                   | Respects rate limit (when implemented)   |
| Cross-tenant                 | Admin of cohort A requests student in cohort B | Implemented: cohort-scoped admin → 403 for student outside cohort. See `[timeline-route.test.ts](../../src/ops/tests/integration/timeline-route.test.ts)`. |


**Test layers:**

- **Unit:** Redaction logic, scope validation, job state transitions (when job repo exists)
- **Integration:** Timeline endpoint RBAC; backfill calls are idempotent
- **Safety/regression:** Throttling, audit log presence, no cross-tenant leakage

---

## 10) Open Questions and Deferred Decisions

- Formal port interface files (e.g. `IQueryEventsPort` in application layer) when hexagonal boundary needs explicit enforcement.
- `BackfillJob` table schema and `IBackfillJobRepository` design.
- SLI/SLO definitions and alerting ownership.
- Redaction policy details for PII in logs/traces (currently GateLogEntry uses summaries only).

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

