# ADR-002: Declared-Intent Bypass Fix — RunDeclaredIntentHandler + Silent P2

**Status:** Accepted
**Date:** 2026-03-12
**Deciders:** Product + Engineering (AI Study Brother core team)

---

## Context

### The Bypass Problem

When a student declared their own study intent (Sessions 1–8 per the S4 storyboard), the system had no first-class domain path for it. ADR-001 introduced `DeclaredIntent` as a sibling VO to `NegotiatedIntent`, but the application-layer routing still contained a bypass: `ei-app-open.ts` routed declared-entry students directly to `sessionStartWorkflow`, skipping `RunDeclaredIntentHandler` and `RunP2GateHandler` entirely.

**Consequences of the bypass:**

| Problem | Symptom |
|---------|---------|
| Missing `SessionIntentIssued` event | Ledger incomplete for declared sessions |
| Missing `ActivationPlanIssued` event | P3 `findP2WatchOnlyFlagFromEvents` could not find the flag |
| Hardcoded `mode = 'Neutral'` | Rescue/Boost students on the declared path received wrong mode |
| `getSessionIdFromLastIntent` fallback triggered | `?? crypto.randomUUID()` path used instead of real session ID |

The bypass existed because the `ei-app-open.ts` routing was written before `RunDeclaredIntentHandler` was connected to the P2 silent path.

---

## Decision

Connect `RunDeclaredIntentHandler` → `RunP2GateHandler` → `upsertTopicState` as sequential steps in `ei-app-open.ts` for the declared-entry path.

`RunP2GateHandler` runs silently on the declared path: it calls `assessLoopHealth` (passive read), emits `ActivationPlanIssued`, but does **not** show any P2 UI. The P2 output (real LoopHealth mode) is passed directly to `sessionStartWorkflow`.

---

## Options Considered

### Option A — Keep bypass, patch individual gaps (Rejected)

Patch `mode` by passing LoopHealth output into `sessionStartWorkflow` independently. Separately ensure `ActivationPlanIssued` is appended. Keep `RunP2GateHandler` out of the declared path.

**Rejected because:** Each patch would diverge from the negotiated path's event structure. The Ledger would have a different event sequence for declared vs. negotiated sessions. PhaseDeriver and cross-protocol reads would need conditional logic per path.

### Option B — Run full `RunDeclaredIntentHandler` + silent P2 (Chosen)

Connect both handlers in sequence. `RunDeclaredIntentHandler` emits `SessionIntentIssued(intentSource='declared')`. `RunP2GateHandler` emits `ActivationPlanIssued`. Both paths now produce identical Ledger event sequences.

**Chosen because:** Both declared and negotiated sessions produce the same protocol event sequence in the Ledger. PhaseDeriver, `getSessionIdFromLastIntent`, and all cross-protocol reads see consistent event presence regardless of path.

---

## Consequences

### Positive

- Both declared and negotiated sessions emit `SessionIntentIssued` + `ActivationPlanIssued` in Ledger
- `findP2WatchOnlyFlagFromEvents` in P3 cross-protocol read returns correct value for declared sessions
- `mode` passed to `sessionStartWorkflow` is the real LoopHealth output (Rescue/Boost/Neutral), not hardcoded `'Neutral'`
- `getSessionIdFromLastIntent` finds a real event for declared sessions; fallback `?? crypto.randomUUID()` no longer triggered for this path

### Structural Changes

| Before | After |
|--------|-------|
| Declared path: `ei-app-open.ts` → `sessionStartWorkflow` (bypass) | Declared path: `RunDeclaredIntentHandler` → silent `RunP2GateHandler` → `sessionStartWorkflow` |
| `SessionIntentIssued` missing for declared sessions | `SessionIntentIssued(intentSource='declared')` present for all sessions |
| `ActivationPlanIssued` missing for declared sessions | `ActivationPlanIssued` present for all sessions |
| `mode = 'Neutral'` hardcoded for declared path | Real `mode` from LoopHealth passed through |

### Latency Note

Running `RunDeclaredIntentHandler` + silent `RunP2GateHandler` sequentially in `ei-app-open.ts` adds steps to the declared-entry flow. Post-ADR-002, declared-entry AppOpen is `4712ms` (vs `1228ms` warm checkin). The dominant cost is P2 signals contention (`3173ms`) — this is addressed separately by Fix B1 (merge `getSignals` to 1 CTE) in `06-infrastructure-optimization.md`.

---

## Implementation

**Date:** 2026-03-12 (branch: `cursor-code`)

| Change | Details |
|--------|---------|
| `ei-app-open.ts` | Declared-entry path now calls `RunDeclaredIntentHandler`, then `RunP2GateHandler` (silent), then `upsertTopicState`, then `sessionStartWorkflow` |
| `RunP2GateHandler` | Runs without emitting UI response on declared path; passes real `mode` from LoopHealth |
| `PhaseDeriver` | Updated to accept `FirstActionStarted` as valid active-session evidence for declared path |

---

## References

- [ADR-001: Declared Intent — Two-VO Design](adr-001-declared-intent-design.md) — foundation decision
- [06-infrastructure-optimization.md](../06-infrastructure-optimization.md) — trace evidence, fix B1
- [canvas-ei-runtime.md](../canvas-ei-runtime.md) — StudySession lifecycle
- [S4 Storyboard — Flowing but Avoidant](../../ux/validation/storyboards/S4-flowing-but-avoidant.md)
