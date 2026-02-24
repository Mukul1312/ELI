---
name: study-session-repo-wiring
overview: Wire the new `ei_study_sessions` persistence into EI Runtime orchestration so P1/P2/P3 share a stable session identity per (student, topic), preventing concurrent duplicate gate outputs and enabling lifecycle-driven routing from a single source of truth.
todos:
  - id: repo-port
    content: Expand `IStudySessionRepository` to support active session lookup / get-or-create per (student, topic).
    status: completed
  - id: repo-pg
    content: Implement active-session queries + conflict-safe insert in `StudySessionRepositoryPg` and `db/queries.ts`.
    status: completed
  - id: workflow-wiring
    content: Update P1/P2/P3 (+ Replan if desired) workflows to obtain sessionId from repository instead of random UUIDs.
    status: completed
  - id: handler-wiring
    content: Persist session status transitions from RunP1/RunP2/RunP3 (and close session on verification outcome workflows).
    status: completed
  - id: tests
    content: Add unit/integration tests proving concurrency safety and stable lifecycle transitions.
    status: completed
isProject: false
---

## Goal

- Make `StudySession` lifecycle **stable across commands** (P1→P2→P3) by persisting/looking up an active session per `(studentId, topicId)`.
- Use the `ei_study_sessions` unique partial index to prevent two concurrent “active” sessions for the same topic.

## Why this is still missing

Right now each gate workflow generates a fresh random `sessionId` (e.g. `crypto.randomUUID()` in `protocol1-ignition.ts`, `protocol2-activation.ts`, `protocol3-verification.ts`). The gate handlers then `StudySession.open/reconstitute(...)` using that random id, so the persisted `ei_study_sessions` state can’t actually be used to de-dupe or derive lifecycle.

## Key design decision (must pick one)

- **Option A (recommended)**: Server owns session identity.
  - For any command that includes `topic`, fetch-or-create an **active** row in `ei_study_sessions` for `(studentId, topicId)` and use its `id` as `sessionId`.
  - Client does not need to know sessionId.
- **Option B**: Client sends a `sessionId` (or uses `idempotencyKey` as `sessionId`) in every command.
  - Stronger replay/debug correlation, but requires SDUI contract + client changes.

This plan must choose **Option A**.

## Data model expectations

- Table + index already exist in `[src/ei/db/migrate.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/ei/db/migrate.ts)`:
  - `ei_study_sessions(id, student_id, topic_id, status, negotiated_intent_id, created_at, updated_at)`
  - unique partial index on `(student_id, topic_id)` where status in `('negotiating','activating','active')`

## Implementation approach

### 1) Expand the domain port (repository interface)

Update `[src/ei/domain/study-session/repository.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/ei/domain/study-session/repository.ts)` to support the orchestration need:

- Add `findActiveByStudentTopic(studentId, topicId)`
- Add `getOrCreateActiveSession(studentId, topicId, now)` (or `startOrResumeSession`)
- Keep existing `findById(sessionId)` + `save(session)`

### 2) Implement the new queries + adapter

- Add DB helpers in `[src/ei/db/queries.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/ei/db/queries.ts)`:
  - `findActiveStudySession(studentId, topicId)` (status in active set)
  - `insertStudySession(...)` (new id + status)
  - `updateStudySessionStatus(id, status, negotiatedIntentId?)`
- Update `[src/ei/infrastructure/persistence/study-session-repository.pg.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/ei/infrastructure/persistence/study-session-repository.pg.ts)` to:
  - Implement `getOrCreateActiveSession` using **select → insert → on-unique-violation re-select**.
  - Never rely on `ON CONFLICT (id)` for active-session uniqueness (because the partial unique index is on `(student_id, topic_id)`).

### 3) Wire session lookup into Mastra workflows (so `sessionId` stops being random)

Update workflows that currently pass `sessionId: crypto.randomUUID()`:

- `[src/mastra/workflows/protocol1-ignition.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/mastra/workflows/protocol1-ignition.ts)`
- `[src/mastra/workflows/protocol2-activation.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/mastra/workflows/protocol2-activation.ts)`
- `[src/mastra/workflows/protocol3-verification.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/mastra/workflows/protocol3-verification.ts)`
- Also consider `[src/mastra/workflows/replan.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/mastra/workflows/replan.ts)` if replan should keep the same session.

Workflow change pattern:

- Before calling the gate handler, call repository `getOrCreateActiveSession(studentId, topic)` and pass that `sessionId` into the handler.

### 4) Wire session persistence into gate handlers (status transitions)

Update handlers to persist lifecycle transitions after issuing outputs:

- `[src/ei/application/run-p1-gate/handler.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/ei/application/run-p1-gate/handler.ts)`
  - After `issueNegotiatedIntent(...)` → save session status `activating`
- `[src/ei/application/run-p2-gate/handler.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/ei/application/run-p2-gate/handler.ts)`
  - After `issueActivationPlan(...)` → save session status `active`
- `[src/ei/application/run-p3-gate/handler.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/ei/application/run-p3-gate/handler.ts)`
  - After `issueVerificationDecision(...)` → save session status `verifying`

If you want closure semantics:

- In workflows that emit `VerificationCompleted` / `RetrievalScheduled` / `RetrievalSkipped`, mark the session `closed`.

### 5) Align phase derivation and guards (optional but recommended)

Once sessions are persisted, decide whether phase guards should:

- **Continue using Ledger-derived phase** (current `PhaseDeriver`), or
- Prefer the `ei_study_sessions.status` as the primary source.

If switching to session-table phase:

- Update `[src/ei/application/run-ei-command/phase-deriver.ts](c:/Users/Mukul/code/personal-projects/ai-study-brother/src/ei/application/run-ei-command/phase-deriver.ts)` to read `ei_study_sessions` first and fall back to Ledger events.

## Test plan

- Add unit tests for `StudySessionRepositoryPg.getOrCreateActiveSession`:
  - Two concurrent creates for same `(student, topic)` result in one active session.
- Add/extend integration test:
  - Simulate two P1 runs for same `(student, topic)` without idempotency key → ensure only one active session row exists and handlers reuse the same `sessionId`.

## Acceptance criteria

- P1/P2/P3 workflows no longer generate random `sessionId`; they reuse a stable active session per `(studentId, topic)`.
- Two tabs/concurrent requests cannot create two active sessions for the same topic.
- Session status transitions are visible in `ei_study_sessions` and match the `StudySession` lifecycle (`negotiating → activating → active → verifying → closed`).

