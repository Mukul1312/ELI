# Launch Requirements Checklist (P0 + P1)

## Scope

This document defines the minimum **production launch requirements** for EI v1 (500 students, cohort-based exams) on Vercel + Next.js + Neon Postgres.

## Format

Each requirement includes:

- **Feature** — What is being required
- **Who uses** — Student, Admin/Institute, or Ops
- **Acceptance criteria** — Testable conditions
- **Data required** — Tables, stores, or APIs
- **Async?** — Whether the feature runs asynchronously (e.g. background jobs)
- **SLO** — Service level or reliability target

---

## P0 — Launch Essentials (must-have)

### Identity, Access, and Cohorts

*Cohort membership* is the data model and read-time enforcement (who is in which cohort; authz on every request). *Enrollment* is the flow that changes membership (admin enroll by email; student enter coupon). Same underlying membership data; enrollment is the write path, membership is the invariant and read path.


| Field                   | Detail                                                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Student authentication (Google OAuth via Neon Auth SDK)                                                                                                                                                                            |
| **Who uses**            | Student                                                                                                                                                                                                                            |
| **Acceptance criteria** | Student can sign in with Google and gets a stable internal `student_id`. Auth session persists across refreshes and new visits. Server-side routes can reliably identify the student without trusting client-provided `studentId`. |
| **Data required**       | Auth provider session (Neon Auth). App table mapping `auth_user_id` → `student_id` (internal UUID).                                                                                                                                |
| **Async?**              | No                                                                                                                                                                                                                                 |
| **SLO**                 | 99.9% sign-in success excluding upstream OAuth outages; session validation p95 < 150ms                                                                                                                                             |



| Field                   | Detail                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Cohort membership + role model                                                                                                                          |
| **Who uses**            | Student, Admin/Institute                                                                                                                                |
| **Acceptance criteria** | Every student is assigned to exactly one active cohort at a time (or explicitly "unassigned"). Institute/admin views are restricted by cohort and role. |
| **Data required**       | `institutes`, `cohorts`, `students`, `student_cohort_membership`, `roles`                                                                               |
| **Async?**              | No                                                                                                                                                      |
| **SLO**                 | 0 cross-student data leaks; authorization checks enforced on every request                                                                              |



| Field                   | Detail                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Feature**             | Enrollment mechanism (initially manual; coupon code can be P1)                                                           |
| **Who uses**            | Student, Admin                                                                                                           |
| **Acceptance criteria** | Admin can enroll students (by email / auth_user_id) into a cohort. Student cannot access cohort features until enrolled. |
| **Data required**       | `enrollments` table (or membership table above)                                                                          |
| **Async?**              | No                                                                                                                       |
| **SLO**                 | Enrollment changes propagate immediately (read-your-writes)                                                              |


### Core EI Loop (gates + event set)

The Core EI Loop has three distinct requirements: **(1) Protocol execution** — P1/P2/P3 run reliably at the gates (deterministic, no partial writes, latency). **(2) Event completeness** — the full minimum event set is emitted by the UI and consumed by the engine so aggregates and signals are correct. **(3) Idempotent writes** — retries and duplicate requests do not create duplicate events; write endpoints support idempotency keys. All three are needed for a production-ready loop.


| Field                   | Detail                                                                                                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Gate-triggered protocols run reliably (P1 Ignition, P2 Activation, P3 Verification)                                                                                                                                                 |
| **Who uses**            | Student                                                                                                                                                                                                                             |
| **Acceptance criteria** | AppOpen triggers P1 output (Negotiated Intent) deterministically from current state. IntentSet triggers P2 output (Activation plan / first action). SessionEnd triggers P3 output (verification decision / schedule / skip reason). |
| **Data required**       | Event store (append-only) + topic state + aggregates + policy + radar (as needed).                                                                                                                                                  |
| **Async?**              | No (synchronous at gate)                                                                                                                                                                                                            |
| **SLO**                 | p95 gate response < 2.5s; no partial writes; deterministic outputs for same inputs                                                                                                                                                  |



| Field                   | Detail                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Feature**             | Minimum viable event set is complete (including IntentResponse + VerificationCompleted)                                                                                                                                                                                                                                                    |
| **Who uses**            | Student (implicitly), Engine                                                                                                                                                                                                                                                                                                               |
| **Acceptance criteria** | UI emits: `AppOpen`, `IntentSet`, `IntentResponse`, `FirstActionStarted`, `Replan`, `SessionEnd`, `VerificationCompleted` (payload: raw counts — `questionsAttempted`, `correct`, optional `confidence`; `score` derived). Engine consumes these to compute: pending checks, verification rate, start latency, replan loops, silence days. |
| **Data required**       | `ei_events` with strict schemas per event type.                                                                                                                                                                                                                                                                                            |
| **Async?**              | No                                                                                                                                                                                                                                                                                                                                         |
| **SLO**                 | 99.99% event write success; event write p95 < 200ms                                                                                                                                                                                                                                                                                        |



| Field                   | Detail                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Idempotent event writes + protocol outputs                                                                                                         |
| **Who uses**            | Student (indirectly), Ops                                                                                                                          |
| **Acceptance criteria** | Duplicate requests (refresh/retry) do not create duplicate events. Every write endpoint supports an `idempotency_key` (or deterministic event id). |
| **Data required**       | `ei_events` unique constraint (e.g. `(student_id, idempotency_key)` or `event_id`). Optional `idempotency_keys` table.                             |
| **Async?**              | No                                                                                                                                                 |
| **SLO**                 | 0 duplicate events from retries; safe at-least-once client behavior                                                                                |


### Student Continuity ("it remembers")


| Field                   | Detail                                                                                                                                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Resume state on app open                                                                                                                                                                                                                                       |
| **Who uses**            | Student                                                                                                                                                                                                                                                        |
| **Acceptance criteria** | Resume header is computed from server state (not local UI): student sees pending checks count, next due verification (if any), last intent topic, and a deterministic "continue" affordance. Student can complete a verification later without losing context. |
| **Data required**       | `ei_topic_state` (pending checks / scheduled verify). `ei_student_aggregates` for dashboard header (e.g. `pending_checks`).                                                                                                                                    |
| **Async?**              | No                                                                                                                                                                                                                                                             |
| **SLO**                 | p95 dashboard load < 1.0s; no missing pending checks                                                                                                                                                                                                           |



| Field                   | Detail                                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Verification completion UX (fast, minimal friction)                                                                                                                                                                                                           |
| **Who uses**            | Student                                                                                                                                                                                                                                                       |
| **Acceptance criteria** | Student can submit `questionsAttempted`, `correct`, optional `confidence`. Submitting emits `VerificationCompleted` and immediately updates pending checks (read-your-writes). `score` is derived from `correct`/`questionsAttempted` (not a required input). |
| **Data required**       | `VerificationCompleted` event schema (includes `correct` + optional `confidence`). Topic state update logic.                                                                                                                                                  |
| **Async?**              | No                                                                                                                                                                                                                                                            |
| **SLO**                 | p95 submit < 800ms; updates reflected immediately                                                                                                                                                                                                             |


### Safety, Privacy, Abuse Protection


| Field                   | Detail                                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Strict per-student data isolation                                                                                                                         |
| **Who uses**            | Student                                                                                                                                                   |
| **Acceptance criteria** | Server derives `student_id` from auth session, never trusts client `studentId`. Student cannot query another student's events/aggregates by guessing ids. |
| **Data required**       | Auth session + server-side authorization checks.                                                                                                          |
| **Async?**              | No                                                                                                                                                        |
| **SLO**                 | 0 cross-tenant reads/writes                                                                                                                               |



| Field                   | Detail                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| **Feature**             | Rate limiting + payload limits                                                                    |
| **Who uses**            | All                                                                                               |
| **Acceptance criteria** | Event ingestion endpoints enforce reasonable per-user limits. Oversized payloads rejected safely. |
| **Data required**       | Rate limit store (in-memory / edge KV / Upstash — implementation choice).                         |
| **Async?**              | No                                                                                                |
| **SLO**                 | Protect against accidental client loops; no DB overload from a single user                        |


| Field                   | Detail                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Authentication enforced on every EI endpoint (no anonymous writes/reads)                                                                                             |
| **Who uses**            | All                                                                                                                                                                 |
| **Acceptance criteria** | All `/api/ei/*` routes reject requests without a valid auth session. Server derives `student_id` from session (never from request body/query). Session expiry handled correctly. |
| **Data required**       | Auth session middleware (e.g. Neon Auth). Server-side mapping `auth_user_id` → `student_id`.                                                                         |
| **Async?**              | No                                                                                                                                                                  |
| **SLO**                 | 0 unauthorized access; session validation p95 < 150ms                                                                                                                |



| Field                   | Detail                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Admin / institute RBAC on privileged endpoints                                                                                                       |
| **Who uses**            | Admin/Institute                                                                                                                                      |
| **Acceptance criteria** | Admin-only endpoints (debug timeline, backfill/replay, radar recompute) require admin role. Institute views are cohort-scoped and never expose raw events. |
| **Data required**       | `roles` + cohort membership, server-side authorization checks on every admin/institute route.                                                        |
| **Async?**              | No                                                                                                                                                   |
| **SLO**                 | 0 privilege escalation; 0 cross-cohort visibility                                                                                                    |



| Field                   | Detail                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Feature**             | Strict schema validation + unknown field rejection on ingestion                                                                                              |
| **Who uses**            | All                                                                                                                                                          |
| **Acceptance criteria** | Every event/protocol endpoint validates request bodies against strict Zod schemas and rejects unknown keys / invalid types. Oversized payloads are rejected. |
| **Data required**       | Zod schemas for events/outputs; request validation layer shared across routes.                                                                               |
| **Async?**              | No                                                                                                                                                           |
| **SLO**                 | 0 malformed events accepted; validation p95 < 10ms                                                                                                           |



| Field                   | Detail                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Feature**             | CORS + session transport hardening (CSRF-safe)                                                                                                                                                          |
| **Who uses**            | Student, Admin/Institute                                                                                                                                                                                |
| **Acceptance criteria** | Only allow requests from configured origins. If using cookie-based auth, enforce CSRF protections (Origin/Referer checks + SameSite cookies) and require HTTPS in production.                            |
| **Data required**       | Next.js route middleware / headers config; auth/session settings.                                                                                                                                       |
| **Async?**              | No                                                                                                                                                                                                      |
| **SLO**                 | 0 cross-site request abuse; no production auth cookies sent over insecure transport                                                                                                                     |



| Field                   | Detail                                                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Log redaction policy (no secrets, no raw student content)                                                                                                                     |
| **Who uses**            | Ops/Admin                                                                                                                                                                     |
| **Acceptance criteria** | Structured logs never include secrets (tokens, cookies, DB URLs) or raw student-entered free text. Protocol logs include only safe summaries + correlation IDs for debugging. |
| **Data required**       | Structured logger with redaction rules; correlation id propagation.                                                                                                           |
| **Async?**              | No                                                                                                                                                                            |
| **SLO**                 | 0 secret leakage in logs                                                                                                                                                      |


### Observability + Admin Debug (minimum)


| Field                   | Detail                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Protocol invocation logs + correlation id                                                                                                                        |
| **Who uses**            | Ops/Admin                                                                                                                                                        |
| **Acceptance criteria** | Every gate call logs: student_id, gate, input summary, output summary, duration, correlation id. Errors include actionable reason + safe redaction (no secrets). |
| **Data required**       | Structured logs (provider-based).                                                                                                                                |
| **Async?**              | No                                                                                                                                                               |
| **SLO**                 | 100% of protocol invocations traceable by correlation id                                                                                                         |



| Field                   | Detail                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **Feature**             | Admin debug timeline (per student)                                                                      |
| **Who uses**            | Admin (internal)                                                                                        |
| **Acceptance criteria** | View last N events and last computed aggregates for a student. Can diagnose "why did EI suggest this?". |
| **Data required**       | Read access to events + aggregates, gated by admin role.                                                |
| **Async?**              | No                                                                                                      |
| **SLO**                 | p95 admin timeline load < 2s for last 200 events                                                        |


#### Mastra observability options (reference)

Options from Mastra docs that align with the above (source: user-mastra MCP — tracing overview, logging, OTEL bridge):

- **Protocol invocation logs + correlation id**
  - **Tracing**: Use Mastra Observability with `DefaultExporter` (or OTEL exporter). Set `requestContextKeys: ["student_id", "gate"]` and pass `RequestContext` on each gate invocation; trace id acts as correlation id. Attach custom metadata per span: input summary, output summary, duration (and error reason when applicable) via `context?.tracingContext.currentSpan?.update({ metadata: { ... } })`.
  - **Safe redaction**: Use built-in `SensitiveDataFilter` span processor and/or `tracingOptions: { hideInput: true, hideOutput: true }` for sensitive gates.
  - **Structured logs**: Use `PinoLogger` (e.g. with FileTransport or your log provider); in each gate call log one structured line with student_id, gate, correlation_id (trace id), duration, and optional input/output summary so 100% of invocations are traceable and queryable.

- **Admin debug timeline**
  - **Storage-backed tracing**: `DefaultExporter` persists traces to Mastra storage (e.g. LibSQL). Admin UI can query by student_id (via requestContextKeys metadata) to show last N spans (gate calls) and drill into why EI suggested an action.
  - **Events + aggregates**: Keep using the event store and aggregates for “last N events” and “last computed aggregates”; use tracing/logs for protocol-level detail and correlation. Use `configSelector` to always sample traces for specific students when debugging.

- **Optional: OpenTelemetry**
  - With existing OTEL (e.g. Datadog, New Relic): use **OtelBridge** so Mastra spans join existing traces; W3C trace context provides correlation id across services.
  - Without OTEL: use **OTEL Exporter** to send Mastra traces to any OTEL-compatible backend (e.g. SigNoz, Zipkin, New Relic).


---

## P1 — Scale + Retention (should-have for 500 users)

### Background jobs ("async-lite")


| Field                   | Detail                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Feature**             | Background recomputation jobs (aggregates / radar / strategic adjustment)                                    |
| **Who uses**            | Student (indirectly), Admin                                                                                  |
| **Acceptance criteria** | Periodic recompute keeps aggregates fresh even if some gates are skipped. Jobs are retryable and idempotent. |
| **Data required**       | `jobs` table or external queue (implementation choice). `ei_student_aggregates`, `ei_radar_alerts`.          |
| **Async?**              | Yes                                                                                                          |
| **SLO**                 | 99% jobs complete within 5 minutes of scheduled time; retries don't duplicate effects                        |



| Field                   | Detail                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Scheduled verification reminders (non-spam)                                                                                                                         |
| **Who uses**            | Student                                                                                                                                                             |
| **Acceptance criteria** | One reminder near due time; one after grace; then stop. Student can snooze or mark "done elsewhere". Misses feed into aggregates and tighten next protocol outputs. |
| **Data required**       | Scheduled verify state + reminder log (to avoid repeats).                                                                                                           |
| **Async?**              | Yes                                                                                                                                                                 |
| **SLO**                 | Reminder delivery within ±5 minutes of target; 0 reminder storms                                                                                                    |


### Student retention surfaces


| Field                   | Detail                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Student dashboard (weekly pattern + pending checks)                                                                                           |
| **Who uses**            | Student                                                                                                                                       |
| **Acceptance criteria** | Shows pending checks trend, verification rate, next due check. Shows "this week's pattern" derived from aggregates (no surveillance framing). |
| **Data required**       | Aggregates + derived labels.                                                                                                                  |
| **Async?**              | No (reads); Yes (to keep aggregates fresh).                                                                                                   |
| **SLO**                 | p95 dashboard render < 1.2s                                                                                                                   |


### Institute / sponsor model (can be after launch; define contract now)


| Field                   | Detail                                                                                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Coupon / sponsor enrollment (student enters institute-issued code)                                                                                                                                    |
| **Who uses**            | Student, Admin/Institute                                                                                                                                                                              |
| **Acceptance criteria** | Student can enter coupon after login and becomes associated with an institute/cohort. Coupon can be one-time or multi-use with limits and expiration. Audit trail exists for issuance and redemption. |
| **Data required**       | `coupons` (code hash, institute_id, cohort_id, max_redemptions, expires_at). `coupon_redemptions` (student_id, redeemed_at).                                                                          |
| **Async?**              | No                                                                                                                                                                                                    |
| **SLO**                 | 0 unauthorized cohort joins; coupon redemption is atomic                                                                                                                                              |


### Institute dashboard


| Field                   | Detail                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| **Feature**             | Institute dashboard (privacy-safe)                                   |
| **Who uses**            | Admin/Institute                                                      |
| **Acceptance criteria** | Radar alerts only (no raw events). Filters by cohort / exam / batch. |
| **Data required**       | `ei_radar_alerts` + cohort membership.                               |
| **Async?**              | No                                                                   |
| **SLO**                 | p95 load < 2s; no PII in export                                      |


### Operational excellence


| Field                   | Detail                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**             | Backfill / replay tooling (admin)                                                                                                               |
| **Who uses**            | Ops/Admin                                                                                                                                       |
| **Acceptance criteria** | Can recompute aggregates for a student for last X days without code changes. Can rerun protocol decision computation (read-only) for debugging. |
| **Data required**       | Admin-only endpoints; read-only replay mode.                                                                                                    |
| **Async?**              | Yes (for bulk backfills).                                                                                                                       |
| **SLO**                 | Backfill completes without impacting live traffic (rate limited)                                                                                |


---

## Suggested implementation order (500-student scale)

Use this backlog to prioritize work; complete P0 before P1.

1. **Auth + isolation** — Neon Auth SDK (Google OAuth), `auth_user_id` → `student_id` mapping, server-derived `studentId` on all EI routes.
2. **Cohorts + enrollment** — Tables and checks so every student has one active cohort; admin enrollment path.
3. **Idempotency** — Idempotency keys on event append and protocol emit; unique constraints.
4. **Core EI loop** — Ensure P1/P2/P3 gates and full event set (including IntentResponse, VerificationCompleted) are wired and tested.
5. **Continuity UX** — Resume state (pending checks, next due, last intent) on app open; verification submit flow.
6. **Safety** — Rate limiting, payload limits, audit that no route trusts client `studentId`.
7. **Observability** — Correlation ids, structured logs, admin debug timeline.
8. **Async-lite** — Background jobs for aggregates/radar/strategic adjustment (e.g. Vercel Cron + queue).
9. **Reminders** — Scheduled verification reminders with non-spam policy.
10. **Student dashboard** — Pending checks trend, verification rate, next due, light "week pattern".
11. **Institute dashboard** — Radar-only, cohort-filtered.
12. **Coupon/sponsor** — Coupon table, redemption flow, audit trail (can ship post-launch).
13. **Backfill/replay** — Admin tooling for recompute and read-only protocol replay.

---

## Implementation references (Neon Auth + Next.js)

These notes align with the Neon Auth rules (e.g. `.cursor/rules/neon-auth.mdc`) and Next.js App Router.

### Neon Auth SDK (Google OAuth)

- **Package**: `@neondatabase/auth` (auth only; use `@neondatabase/neon-js` if you also need Neon Data API).
- **Next.js App Router**:
  - API route: `app/api/auth/[...path]/route.ts` → `authApiHandler()` from `@neondatabase/auth/next`.
  - Client: `createAuthClient()` from `@neondatabase/auth/next` (e.g. in `lib/auth/client.ts`).
  - Session: `authClient.useSession()` (client); `auth.getSession()` (server).
- **Auth UI**: Use `AuthView` for sign-in/sign-up; wrap app with `NeonAuthUIProvider` (pass `authClient`, `navigate`, `replace`, `onSessionChange`, `Link`). Import `@neondatabase/auth/ui/css` in layout or globals.
- **Google (social)**: Enable in Neon Console (Auth settings) and add `social` prop to `NeonAuthUIProvider` (e.g. `social={{ providers: ['google'] }}`).
- **Env**: `NEON_AUTH_BASE_URL`, `NEXT_PUBLIC_NEON_AUTH_URL` (see Neon Auth docs for exact names and format).

### Current repo state

- The app currently has **no auth dependency** in `package.json`; OAuth is net-new and will replace `PILOT_SECRET`-based gating for production.
- After adding Neon Auth, all EI API routes (events, aggregates, protocol1/2/3) must derive `student_id` from the authenticated session (or from a server-side mapping of `auth_user_id` → `student_id`) and must not trust `studentId` from the request body or query.

### References

- Neon Auth setup (Next.js): [Setup Reference - Next.js](https://raw.githubusercontent.com/neondatabase-labs/ai-rules/main/references/neon-auth-setup-nextjs.md)
- Neon Auth UI (Next.js): [UI Components Reference - Next.js](https://raw.githubusercontent.com/neondatabase-labs/ai-rules/main/references/neon-auth-ui-nextjs.md)
- Local rules: `.cursor/rules/neon-auth.mdc`, `.cursor/rules/neon-serverless.mdc`, `.cursor/rules/neon-js.mdc` (as applicable)

