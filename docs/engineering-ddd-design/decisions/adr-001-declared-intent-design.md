# ADR-001: Declared Intent — Two-VO Design for SessionIntentIssued

**Status:** Accepted
**Date:** 2026-03-11
**Deciders:** Product + Engineering (AI Study Brother core team)

---

## Context

### The Gate-Bypass Problem

Developers needed to support students declaring their own study intent without ELI interfering — no recommendation, no negotiated timebox, no coaching posture. Rather than modeling this as a first-class domain concept, the team implemented a bypass: direct execution paths that skip the P1/P2 protocols entirely.

This caused a cascade of domain problems:

| Problem | Symptom |
|---------|---------|
| Missing Ledger events | Sessions opened without `NegotiatedIntentIssued`; Ledger was incomplete |
| `ei_study_sessions` dual-write table | Phase state had to be tracked outside the Ledger because events were missing |
| `phase-deriver.ts` bypass patches | Phase derivation logic patched to handle absent events |
| Null verification floor | P3 had no floor from P1; code either panicked or silently skipped enforcement |
| Hardcoded Neutral mode | No `mode` from P1; code defaulted to Neutral regardless of student state |

### The Product Design Requirement

The S4 storyboard ("Flowing but Avoidant") documents the intended student experience:

- **Sessions 1–8:** ELI is a pure recorder. Student declares topic, task type, energy. ELI records, does not interfere. No recommendation, no scope suggestion, no negotiation.
- **Session 9:** ELI's first intervention — a small one (removing an escape hatch in Phase 3 after 3 consecutive defers). P1 declaration is still fully student-controlled.
- **Sessions 10+:** ELI begins mirroring factual state. Coaching posture activates gradually.

**The formation period (Sessions 1–8) is the designed primary experience, not a workaround.** ELI earns the right to intervene only after behavioral signals emerge. The bypass was introduced because "declared entry" was never modeled as a domain concept — it was treated as an absence of negotiation rather than a distinct posture.

### Why This Is a Domain Problem

The domain previously had only one path from `negotiating → activating`: `issueNegotiatedIntent()`. There was no way to express "student declared intent without ELI's involvement" without bypassing the aggregate entirely. That bypass is what broke the Ledger invariants.

---

## Decision

**Approach B: Two Value Objects with asymmetric invariants, unified event name.**

Introduce `DeclaredIntent` as a sibling VO to `NegotiatedIntent`. Both are P1 output VOs. Both transition `StudySession` from `negotiating → activating`. Both emit `SessionIntentIssued` (the renamed event, previously `NegotiatedIntentIssued`).

The `intentSource` field on `SessionIntentIssued` discriminates between the two paths in the Ledger.

---

## Options Considered

### Option A — Single VO with discriminated constructor

One `SessionIntent` VO with two factory methods: `createNegotiated()` and `createDeclared()`. Invariants applied conditionally based on the `intentSource` field set at creation.

**Rejected because:** Conditional invariants in a single VO violate the DDD VO principle of self-validation. The VO would contain guards shaped as `if (this.intentSource === 'negotiated') { ... }`. This makes the invariant logic implicit and fragile — a future developer adding a new guard might not notice it needs to be scoped. The DDD tactical pattern (from [clean-ddd-hexagonal skill](../../.agents/skills/clean-ddd-hexagonal/references/DDD-TACTICAL.md)) is explicit: if two things have different invariants, they are different types.

### Option B — Two Value Objects (CHOSEN)

`NegotiatedIntent` keeps all existing invariants unchanged. `DeclaredIntent` is a new VO with data integrity invariants only (no ELI business rules). The aggregate holds `sessionIntent: NegotiatedIntent | DeclaredIntent | null`. One event type (`SessionIntentIssued`) with `intentSource` discriminator.

**Chosen because:**
- Each VO is self-validating without conditional branches
- The ubiquitous language is explicit: `NegotiatedIntent` (ELI-driven) vs `DeclaredIntent` (student-driven)
- The type system enforces the distinction at compile time
- `NegotiatedIntent` requires zero changes — all existing invariants preserved
- The aggregate's cross-protocol floor invariant (§6.3) becomes a simple `instanceof` check
- DDD-idiomatic: see "Entity or Value Object?" decision tree in CHEATSHEET.md

### Option C — Separate Aggregate

`DeclaredStudySession` aggregate for declared sessions; `NegotiatedStudySession` for negotiated.

**Rejected because:** The session lifecycle (`negotiating → activating → active → verifying → closed`) is identical for both paths. Splitting the aggregate would duplicate the lifecycle state machine, `ActivationPlan`, `VerificationDecision`, and all invariants §6.1, §6.2, §6.4–§6.8. The only difference is the first transition — not enough to justify two aggregates.

---

## Consequences

### Positive

- Ledger is complete for all sessions: both paths emit `SessionIntentIssued`
- `ei_study_sessions` dual-write table: can be removed (session state fully derivable from `SessionIntentIssued`)
- `phase-deriver.ts` bypass patches: can be removed
- P3 verification floor: correctly absent for declared sessions; correctly enforced for negotiated sessions
- `DeclaredIntent` is the **primary case** — it governs Sessions 1–8 of every student's journey
- `NegotiatedIntent` activates only after behavioral signals warrant ELI's involvement (Session 9+)
- All existing negotiated-path behavior and invariants are preserved unchanged

### Structural Changes

| Before | After |
|--------|-------|
| `negotiatedIntent: NegotiatedIntent \| null` (aggregate field) | `sessionIntent: NegotiatedIntent \| DeclaredIntent \| null` |
| `issueNegotiatedIntent()` (only command to reach `activating`) | `issueNegotiatedIntent()` + `issueDeclaredIntent()` (two paths) |
| `NegotiatedIntentIssued` (event name) | `SessionIntentIssued` (unified event, `intentSource` discriminator) |
| P3 floor invariant: always applied | P3 floor: applied only when `sessionIntent instanceof NegotiatedIntent` |
| No `RunDeclaredIntentHandler` | New application use case: `RunDeclaredIntentHandler` |
| No `declared-intent.ts` | New VO: `src/ei/domain/study-session/value-objects/declared-intent.ts` |

### Invariant Asymmetry (by design)

`NegotiatedIntent` invariants (ELI-imposed, unchanged):
- `verificationPlan.minQuestions >= 1`
- `if mode === Rescue: scope.timeboxMin <= 30`
- `if play === P1-R2 OR openLoops >= maxOpenLoops: constraints.closeOpenLoopFirst = true`
- `difficultyTier` computed from mode + energy (no student input)

`DeclaredIntent` invariants (data integrity only):
- `timebox > 0`
- `taskType in ['Learn', 'Practice', 'Test']`
- `energy in [1..5]`
- `sleep in SleepQuality enum`
- `topicId` non-empty (resolved by CurriculumCatalog before VO creation)

ELI does **not** set `verificationFloor`, `timebox`, `mode`, `constraints`, or `difficultyTier` for declared sessions. The student determines all parameters.

### Application Layer Changes

`RunDeclaredIntentHandler` (new use case):
- Runs LoopHealth **passively** (snapshot stored in event; not used to constrain)
- Does **not** call `ProtocolEngine.selectPlay()` — no play selection
- Does **not** derive `mode` — no ELI coaching posture
- Does **not** build `P1GateContext` — not needed
- `energy` and `sleep` are always real student inputs; no defaults

### Routing

`AppOpen` command routing extended:
```
declaredEntry: true  → RunDeclaredIntentHandler
declaredEntry: false, no recent SessionIntentIssued → RunP1GateHandler (negotiated)
recent SessionIntentIssued exists (either source) → P2 Activation (resume)
```

---

## Implementation

**Date:** 2026-03-12 (branch: `cursor-code`)

### Completed

#### `ei_study_sessions` removal (ADR-001 Consequence)

The "can be removed" consequence was implemented in full:

| Change | Details |
|--------|---------|
| `ei_study_sessions` table | Replaced `CREATE TABLE` in `migrate.ts` with `DROP TABLE IF EXISTS ei_study_sessions CASCADE`. Table no longer created on new deployments; dropped on existing deployments. |
| `IStudySessionRepository` port | Interface `src/ei/domain/study-session/repository.ts` deleted. Export removed from `src/ei/domain/study-session/index.ts`. Port has no remaining domain purpose. |
| `StudySessionRepositoryPg` adapter | `src/ei/infrastructure/persistence/study-session-repository.pg.ts` deleted. |
| `InMemoryStudySessionRepo` test double | `src/ei/tests/infrastructure/in-memory-study-session-repo.ts` deleted. |
| Gate handler constructors | `sessionRepo` optional param removed from `RunP1GateHandler`, `RunP2GateHandler`, `RunP3GateHandler`, `RunDeclaredIntentHandler`. All save calls removed. |
| Workflow orchestration | `StudySessionRepositoryPg` removed from all workflow files (`protocol1-ignition.ts`, `protocol2-activation.ts`, `protocol3-verification.ts`, `retrieval-schedule.ts`, `retrieval-skip.ts`, `verification-complete.ts`, `ei-app-open.ts`, `declare-intent.ts`). |
| Deleted integration/unit tests | `study-session-lifecycle.integration.test.ts`, `study-session-repository.test.ts` deleted (tested deleted infrastructure). |

#### `sessionId` in `SessionIntentIssued.payload` (DDD canonical — CQRS-EVENTS.md)

Per the DDD pattern in `.agents/skills/clean-ddd-hexagonal/references/CQRS-EVENTS.md`: every domain event carries the aggregate ID so the aggregate can be reconstituted from the Ledger alone.

- `study-session.ts` — both `issueDeclaredIntent()` and `issueNegotiatedIntent()` now spread `sessionId: this._id` into `SessionIntentIssued.payload`.
- `getSessionIdFromLastIntent(db, studentId, topicId)` added to `queries.ts` — reads `payload.sessionId` from the most recent `SessionIntentIssued` for a given `(studentId, topicId)`.
- P2 + P3 workflow orchestration reads session ID from the Ledger via `getSessionIdFromLastIntent()` instead of `ei_study_sessions`. Fallback `?? crypto.randomUUID()` kept for the micro path (`isAppOpenMicro`) which currently skips P1 — fixing the micro path to emit `SessionIntentIssued` is a follow-up task.

#### Gap 1 + Gap 2 fix (declared-intent path — Phase A)

`RunP2GateHandler` is now called after `RunDeclaredIntentHandler` in `ei-app-open.ts`:
- **Gap 1 (mode):** `mode` passed to `sessionStartWorkflow` is now the real LoopHealth output (was hardcoded `'Neutral'`). Rescue/Boost students on the declared path now receive the correct mode.
- **Gap 2 (ActivationPlanIssued):** `ActivationPlanIssued` is now appended for declared sessions. `findP2WatchOnlyFlagFromEvents` in the P3 cross-protocol read now returns the correct value.

---

## References

- [S4 Storyboard — Flowing but Avoidant](../../ux/validation/storyboards/S4-flowing-but-avoidant.md)
- [EI Runtime Tactical Spec](../tactical/ei-runtime-tactical-spec.md) — aggregate, VOs, invariants, application use cases
- [EI Event Ledger Tactical Spec](../tactical/ei-event-ledger-tactical-spec.md) — EventTypeEnum
- [DDD Tactical Patterns](../../.agents/skills/clean-ddd-hexagonal/references/DDD-TACTICAL.md) — VO self-validation principle
