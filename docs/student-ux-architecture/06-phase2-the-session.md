# Phase 2 — The Session

## Overview

Phase 2 is the existing SDUI flow: **IntentSet -> P2 gate (ActivationPlanIssued) -> active session -> SessionEnd**. It is the least changed phase in the experience system. The student is studying — ELI's job here is to stay out of the way.

The core principle: once a student has committed (Phase 1) and the activation plan is issued, the system should facilitate focused work with minimal interruption. Every UI element in Phase 2 exists to reduce friction, not to add features.

---

## Flow

```
Phase 1 (student taps action button)
    |
IntentSet fires (topic, taskType, scope)
    |
P2 gate runs -> ActivationPlanIssued (mode, firstAction, timebox)
    |
SDUI renders activation plan
    |
Student studies (active session)
    |
SessionEnd fires -> Phase 3
```

The entire Phase 2 lifecycle is bounded by two domain events: `ActivationPlanIssued` (entry) and `SessionEnd` (exit). Everything between those two events is the active session.

---

## The Context Bar (New Addition)

A subtle bar at the top of the session showing what the student committed to:

```
Integration . Practice . ~20 min
```

- **Position:** Top of screen, fixed.
- **Style:** Small text, muted color, non-distracting.
- **Purpose:** Anchors the student to their declared intent — especially useful for S2 types who plan one thing and drift to another.
- **Content:** `[Topic] . [TaskType] . [Scope label]` (e.g., `~20 min`). DifficultyTier was removed from the student-facing UI per [05-phase1-the-open.md](05-phase1-the-open.md) — scope now shows the student's declared time commitment.
- **Never disappears** during the active session.
- **Disappears** when `SessionEnd` fires (Phase 3 replaces it).

The context bar is not interactive. It has no buttons, no links, no expand/collapse. It is a passive reminder — a mirror reflecting the student's own commitment back at them.

---

## The "2-Minute Start" Pattern (Rescue Mode)

From S2 Storyboard Scene 2: "Start 2 minutes (then decide)."

In Rescue mode, the P2 gate's `ActivationPlanIssued` specifies a very short `firstAction` (30-120 seconds). The SDUI renders this as:

- A single, tiny first step framed as a **condition** (topic + time + motion), never as content instruction. ELI does not have access to textbooks or problem sets — it prescribes "2 minutes on Thermodynamics" not "solve Q1" or "write 3 key points." See [product audit §2.1](../product-audit/02-realism-failures.md).
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

Next: [Phase 3 — The Close](07-phase3-the-close.md)
