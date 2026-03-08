# Active Session — The Screen While Studying

> The student is studying. They are not in the app. This screen should feel like a quiet room — present if needed, invisible by default. Every element that doesn't serve the student's focus is removed.

---

## The Core Design Principle

Phase 2's active session screen has one job: **signal that the session is live, then get out of the way.**

The empty middle is not an oversight. It is the design. The student's attention belongs in their notebook, their DPP, their textbook. The app exists in the background. The screen they see when they glance at the phone should reassure them ("session is active") and return them to studying, not pull them back into the app.

---

## Screen Layout — Default Active State

```
┌──────────────────────────────────────────────────┐
│  Integration · Practice · ~20 min     18 min     │  ← context bar (fixed, top)
│                                                  │
│                                                  │
│                                                  │
│                                                  │
│                                                  │
│              [intentionally empty]               │
│                                                  │
│                                                  │
│                                                  │
│                                                  │
│                                                  │
│                                                  │
│             End session                          │  ← text link (bottom, always visible)
└──────────────────────────────────────────────────┘
```

Three elements. That is the entire screen.

---

## Element 1 — The Context Bar

### What it shows

```
Integration · Practice · ~20 min     18 min
```

Left side: `[Topic] · [TaskType] · [Scope label]`

> **Note:** DifficultyTier has been removed from the student-facing UI. The third segment now shows the student's declared time commitment (scope) as `~N min`. See [05-phase1-the-open.md — Scope Presentation Redesign](../student-ux-architecture/05-phase1-the-open.md#scope-presentation-redesign--student-declares-eli-adapts).
Right side: elapsed time

### Elapsed time

- Format: `X min` — not `00:18:24`, not a progress bar
- Updates every minute
- 12px caption size, `--color-text-tertiary` — the dimmest text in the system
- Right-aligned within the context bar

**Why elapsed, not countdown:**
A countdown says "you only have X minutes left" — forward pressure. Elapsed says "you've been at this for X minutes" — backward progress. For a student in burnout re-entry doing a 5-minute session, seeing "5 min" on the bar is more rewarding than seeing "0:00 remaining."

### Context bar visual spec

```
Token                   Value
──────────────────────────────────────────────────
Background              --color-surface-subtle
Padding                 12px horizontal, 10px vertical
Border-bottom           1px --color-border
Text (left)             14px, weight 400, --color-text-secondary
Text (right, elapsed)   12px, weight 400, --color-text-tertiary
Position                Fixed, top of screen
```

The bar never disappears during Phase 2. It is the student's anchor — reflecting their own commitment back at them (especially useful for S2 types who plan one thing and drift to another).

---

## Element 2 — ELI Nudge Card (conditional)

### When it appears

ELI sends one mid-session nudge per session. It fades in after a mode-specific delay. It never fires twice.

| Mode at session start | Nudge fires at | Fires at all? |
|---|---|---|
| Rescue (silence re-entry) | ~20 min | Yes |
| Rescue (low energy / high pressure) | ~20 min | Yes |
| Neutral | ~15 min | Yes |
| Boost | — | **No** — Boost students are in flow. Don't interrupt. |
| Session < 10 min total | — | **No** — too short to nudge |

### What it looks like

```
┌──────────────────────────────────────────────────┐
│  Integration · Practice · ~20 min     15 min     │
│                                                  │
│                                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  Still in it? Good.            ×           │  │  ← nudge card, fades in
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│                                                  │
│                                                  │
│             End session                          │
└──────────────────────────────────────────────────┘
```

### Nudge card visual spec

```
Background              --color-surface
Shadow                  --shadow-card
Border radius           --radius-lg (16px)
Padding                 16px horizontal, 14px vertical
Text                    16px body, weight 400, --color-text-secondary
Dismiss (×)             14px, --color-text-tertiary, right-aligned
Position                Middle of screen, full-width within page padding
Animation in            opacity 0→1, translateY 8px→0, 200ms ease-out, no delay after trigger
```

### Dismissing the nudge

Tapping anywhere on the card (or the × icon) dismisses it:
- Card fades out: `opacity 1→0`, 150ms ease-in
- Screen returns to empty state
- The nudge never re-appears during this session

**No interaction required.** The student does not need to respond. The nudge is a statement, not a question. It requires nothing from them.

### Nudge copy by mode and context

| Condition | Copy |
|---|---|
| Neutral, ~15 min | "Still in it? Good." |
| Rescue (any sub-type), ~20 min | "Still here. No rush." |
| Long session (> 35 min) | "Strong session. Wrap up when ready." |
| Short session (< 10 min) | *(no nudge)* |
| Boost mode | *(no nudge)* |

**Copy rules:**
- Maximum 1 sentence. Never 2.
- No question that requires an answer. "Still in it? Good." is rhetorical — it doesn't need a response chip.
- No time reference ("you've been at this for...") — the context bar already shows that.
- No performance assessment ("you're doing great", "keep pushing") — the nudge is neutral, not evaluative.

---

## Element 3 — End Session Link

### What it looks like

```
             End session
```

- Position: Bottom of screen, centered
- Style: text-only link, 14px, `--color-text-secondary`
- No border, no fill — same as tertiary CTA pattern from Phase 1
- Always visible — never hidden behind the nudge card

### What happens when tapped

`SessionEnd` fires immediately. No confirm dialog.

The verification ask (Phase 3 entry) is the de facto confirmation — the student can still defer or skip there. Adding a "Are you sure?" modal before that would create two barriers where one is enough.

**If the student taps "End session" while the nudge card is visible:** nudge card dismisses simultaneously as the transition to Phase 3 begins. No separate dismiss step.

---

## Focus Contract Reminder (Boost mode only)

When the P2 gate issued a `focusContract` (plays P2-B1 or P2-B2), a single reminder line appears at the very top of the active session — above the context bar — for 5 seconds, then fades out permanently.

```
┌──────────────────────────────────────────────────┐
│  Focus contract: no switching for 25 min         │  ← 12px, --color-text-tertiary, fades out at 5s
├──────────────────────────────────────────────────┤
│  Integration · Practice · ~30 min     2 min      │
│                                                  │
│                ...                               │
│             End session                          │
└──────────────────────────────────────────────────┘
```

After 5 seconds this line is gone permanently. It is a one-time reminder, not a persistent constraint display. The student made the commitment — they don't need to be reminded every minute.

---

## Edge Case States

### App backgrounded (student switches apps)

Session state is preserved. On return, the active session screen renders exactly as it was. The elapsed timer continues from the correct value. (Duration is tracked server-side, not client-side, so background time does not count toward session elapsed time — consistent with the spec in `06-phase2-the-session.md`.)

The nudge fires based on **elapsed active time**, not wall-clock time. If the student backgrounds for 10 minutes, the 15-minute nudge timer does not advance during that window.

### Intent change mid-session

If the student wants to switch topics, they tap "End session" → Phase 3 fires for the original topic. After Phase 3, Phase 1 re-renders with the new topic in scope. There is no "switch topic" shortcut inside Phase 2 — switching always routes through the proof gate.

This is intentional. Switching without a proof opportunity is the avoidance pattern the P3 gate exists to prevent.

### Stale session (app backgrounded > 30 min)

As per the UX spec, if the background period exceeds 30 minutes, the session auto-ends. On next open, Phase 3 fires. The student sees a short-session close card ("Short session — that still counts."). No penalty, no warning.

---

## What Is Not on This Screen

| Element | Why absent |
|---|---|
| Progress bar or percentage | Creates performance anxiety mid-session |
| "X minutes remaining" countdown | Forward pressure; contradicts elapsed-only philosophy |
| Statistics or pending checks | This is study time. The data can wait for Phase 3. |
| ELI chat or free text | ELI does not interact via chat; nudges are statements only |
| Navigation or settings | One screen, zero navigation. Always. |
| Footer ("Your Week") | Only present in Phase 1 and Phase 3 |

---

## Transition: Active Session → Phase 3

When the student taps "End session":

1. `SessionEnd` fires (persisted)
2. Context bar fades out: `opacity 1→0`, 100ms
3. Verification ask screen fades in: `opacity 0→1`, translateY 8px→0, 200ms ease-out

The transition is the same whether the student tapped "End session" after 5 minutes or 55 minutes. The session duration is passed forward as context to the Phase 3 verification ask, which adjusts its tone accordingly (short / standard / long — see [phase3-design/01-verification-ask.md](../phase3-design/01-verification-ask.md)).

---

## Visual Mode Summary

| Element | Rescue | Neutral | Boost |
|---|---|---|---|
| Page background | `--color-bg-rescue` | `--color-bg` | `--color-bg` |
| Context bar bg | `--color-surface-subtle` | `--color-surface-subtle` | `--color-surface-subtle` |
| Nudge fires | Yes (~20 min) | Yes (~15 min) | No |
| Focus contract reminder | No | No | Yes (5s, then hidden) |
| Middle content | Empty | Empty | Empty |
| End session style | Text link, tertiary | Text link, tertiary | Text link, tertiary |

---

*Next: [03-push-notifications.md](03-push-notifications.md) — the app's voice when the screen is off.*
