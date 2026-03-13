# Phase 2 — The Session

> Phase 2 is the most humble phase in the product. The student is studying — ELI's job is to stay out of the way.

---

## Companion Docs in This Folder

| Doc | What it covers |
|---|---|
| [activation-entry.md](activation-entry.md) | All P2 plays: firstAction cards, 2-min timer, focus contract, retrieval mode |
| [active-session.md](active-session.md) | The screen while studying: context bar, ELI nudge, End session |
| [push-notifications.md](push-notifications.md) | 3 notification types: copy, timing, deep-link routing |

---

## Key Design Decisions

| Decision | Chosen direction | Detail doc |
|---|---|---|
| Timer direction | Elapsed only (counts up), never countdown | [activation-entry.md](activation-entry.md), [active-session.md](active-session.md) |
| Active session visual | Intentionally empty middle — student should be studying, not looking at app | [active-session.md](active-session.md) |
| ELI mid-session nudge | One nudge per session max, fades in at ~15 min, dismissible | [active-session.md](active-session.md) |
| "End session" affordance | Text-only link (tertiary), always visible, no confirm dialog | [active-session.md](active-session.md) |
| Session end trigger | Student taps "End session" → `SessionEnd` fires → Phase 3 | [active-session.md](active-session.md) |
| Push notification types | 3 types: 24h reminder, silence re-entry, student schedule miss | [push-notifications.md](push-notifications.md) |
| Deep-link routing | Each notification type lands on a specific screen state, not generic Phase 1 | [push-notifications.md](push-notifications.md) |

---

## Overview

Phase 2 is the existing SDUI flow: **IntentSet -> P2 gate (ActivationPlanIssued) -> active session -> SessionEnd**. It is the least changed phase in the experience system. The student is studying — ELI's job here is to stay out of the way.

The core principle: once a student has committed (Phase 1) and the activation plan is issued, the system should facilitate focused work with minimal interruption. Every UI element in Phase 2 exists to reduce friction, not to add features.

---

## Flow

```
Phase 1 (student taps CTA)
    ↓
IntentSet fires (topic, taskType, scope)
    ↓
P2 gate runs → ActivationPlanIssued (mode, firstAction, timeboxMin, focusContract)
    ↓
Activation entry screen          ← designed in activation-entry.md
    ↓
Student taps "I've started" or timebox expires → screen clears
    ↓
Active session screen            ← designed in active-session.md
(ELI nudge fires at ~15 min — once, dismissible)
    ↓
Student taps "End session" → SessionEnd fires
    ↓
Phase 3 (verification ask → close card)
```

The entire Phase 2 lifecycle is bounded by two domain events: `ActivationPlanIssued` (entry) and `SessionEnd` (exit). Everything between those two events is the active session.

---

## The Context Bar

A subtle bar at the top of the session showing what the student committed to:

```
Integration · Practice · ~20 min
```

- **Position:** Top of screen, fixed.
- **Style:** Small text, muted color, non-distracting.
- **Purpose:** Anchors the student to their declared intent — especially useful for S2 types who plan one thing and drift to another.
- **Content:** `[Topic] · [TaskType] · [Scope label]` (e.g., `~20 min`). DifficultyTier was removed from the student-facing UI per [Phase 1 Scope Redesign](../phase1/00-overview.md#scope-presentation-redesign--student-declares-eli-adapts) — scope now shows the student's declared time commitment.
- **Never disappears** during the active session.
- **Disappears** when `SessionEnd` fires (Phase 3 replaces it).

The context bar is not interactive. It has no buttons, no links, no expand/collapse. It is a passive reminder — a mirror reflecting the student's own commitment back at them.

---

## The "2-Minute Start" Pattern (Rescue Mode)

From S2 Storyboard Scene 2: "Start 2 minutes (then decide)."

In Rescue mode, the P2 gate's `ActivationPlanIssued` specifies a very short `firstAction` (30-120 seconds). The SDUI renders this as:

- A single, tiny first step framed as a **condition** (topic + time + motion), never as content instruction. ELI does not have access to textbooks or problem sets — it prescribes "2 minutes on Thermodynamics" not "solve Q1" or "write 3 key points." See [product audit §2.1](../../product-audit/02-realism-failures.md).
- A timer or indicator showing the 2-minute window
- After the window: "Keep going?" with `[Yes, keep going]` and `[Done for today]`

The psychological trick: committing to 2 minutes bypasses the freeze. Once started, momentum takes over — most students continue for 15-30 minutes.

If the student picks `[Done for today]`, that counts as a valid session. `SessionEnd` fires normally. Phase 3 handles the close with appropriate gentleness. Two minutes of studying is infinitely more than zero.

---

## How Phase 2 Duration Affects Phase 3

Session duration is passed forward as context when `SessionEnd` fires. Phase 3 adjusts its tone and ask accordingly:

- **Short session (< 10 min):** Phase 3 uses a gentler close. Copy assumes low energy/time. Default to the smallest proof ask.
- **Normal session (10-45 min):** Standard Phase 3 close.
- **Long session (> 45 min):** Phase 3 can be slightly more celebratory. The student invested time — acknowledge it.

Duration is measured from `ActivationPlanIssued` to `SessionEnd`, excluding any time the app was backgrounded.

---

## Mid-Session Edge Cases

- **Intent change mid-session:** If the student wants to switch topics, a new `IntentSet` fires. The context bar updates. The original session's pending state is preserved (it becomes a pending check if unverified).
- **App backgrounded:** Session state is preserved server-side. On resume, the SDUI re-renders from persisted state. If the background period exceeds 30 minutes, the session is auto-ended and Phase 3 fires on next open.
- **Loss of connection:** Session events are queued locally and synced when connection returns. The student can continue studying offline; the session timeline reconstructs on reconnect.
- **Student idle (no interaction for extended period):** No automatic timeout during Phase 2. The student may be reading, thinking, or working on paper. Only explicit actions (or app background timeout) end the session.

---

## P2 Gate Output to SDUI Components

| ActivationPlanIssued field | SDUI component                                       |
| -------------------------- | ---------------------------------------------------- |
| `firstAction`              | First-action card (the 2-min start prompt)           |
| `timeboxMin`               | Timer indicator (optional, muted)                    |
| `focusContract`            | Focus reminder (shown once, then hidden)             |
| `replanCap`                | (internal — limits replan events, not shown to student) |
| `allowedFallback`          | Fallback option card (shown only if student stalls)  |

All SDUI components in Phase 2 are designed to be dismissible or auto-hiding. The screen should progressively clear as the student settles into work, leaving only the context bar and the study content itself.

---

## How This Connects to Code

```
docs/ei/spec/EI_Protocol_2_Activation.md   ← P2 gate logic (plays, modes, firstAction, timebox)
docs/ux/foundations/design-language.md      ← Design tokens (reused here — same system)
        ↓
docs/ux/phase2/                             ← THIS FOLDER: complete Phase 2 spec
        ↓
src/ei/sdui/view-composer.ts               ← composeP2View() implementation
src/app/sdui/components/session-context-bar ← context bar component
```

**North star storyboard:** [S4-flowing-but-avoidant.md](../validation/storyboards/S4-flowing-but-avoidant.md) — 20 sessions across 12 days. Shows activation entry plays, context bar content, nudge timing, and session duration variance in practice.

**Key cross-references:**
- [task-types.md](../systems/task-types.md) — task type definitions that affect context bar content

---

## Deferred

- Phase 2 visual design for advanced `focusContract` features (distraction blocking) — v2
- Rich-media or audio nudges from ELI — v2
- In-app notification centre or history — deferred
- Institute-facing push notifications — separate product surface

---

*Phase 2's design is defined by restraint. The less the app demands attention during the session, the more the student can actually study.*
