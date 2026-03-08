# Activation Entry — The First Moment of Phase 2

> The student just tapped a CTA in Phase 1. They committed to something. This screen honours that commitment by making the first action impossibly small. It is not a session overview. It is a starting block.

---

## What This Screen Is

After `IntentSet` fires, the P2 gate runs and issues an `ActivationPlanIssued` event. The activation entry screen renders that plan as a single, specific first action. It exists for one reason: **to eliminate the gap between intention and motion.**

Once the student taps "I've started" (or the 2-minute timebox expires), this screen is done. The screen clears and the active session begins. The activation entry is intentionally transient.

---

## P2 Gate Output → Screen Mapping

| `ActivationPlanIssued` field | What it drives on screen |
|---|---|
| `mode` (Rescue / Neutral / Boost) | Visual weight, copy tone, spacing |
| `firstAction` | The central instruction card |
| `timeboxMin` | Soft timer (elapsed, counts up) — only shown in Rescue 2-min mode |
| `focusContract` | Focus reminder line — shown once at the top of active session, then hides |
| `replanCap` | Internal only — no student-facing display |
| `allowedFallback` | Fallback option — shown only if student stalls |

---

## Screen Structure

Every activation entry screen has exactly three elements, in this order:

```
[Context bar — always]
[First action card — always]
[Confirmation tap — always]
```

No pending list. No footer. No energy scale. The student has already committed — they don't need to reconfigure.

---

## All P2 Plays — Wireframes

### Play P2-N1 — Standard firstAction (Neutral default)

**When:** Neither stalled nor clearly flowing. Normal session start.

```
┌──────────────────────────────────────────────────┐
│  Integration · Practice · ~20 min              │  ← context bar, 12px
│                                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  One topic. ~20 minutes.                   │  │  ← firstAction, 22px greeting size
│  │  Start when ready.                         │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│                                                  │
│  [ Got it. Starting. ]                           │  ← primary CTA, full-width
│                                                  │
└──────────────────────────────────────────────────┘
```

**Component list:**
- `session-context-bar`
- `first-action-card` (variant: `neutral`)

**Copy pattern:**
- `firstAction` is scope-framed: topic + time commitment + "start when ready." ELI decides HOW MUCH, the student decides HOW.
- No time estimate — the student sets their own pace
- CTA: "Got it. Starting." — present tense, definitive, no question mark

---

### Play P2-R1 — Micro-start (Rescue default)

**When:** High start-latency, stalled, anxiety present. The task feels heavy.

```
┌──────────────────────────────────────────────────┐
│  Integration · Practice · ~20 min              │  ← context bar, 12px
│                                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  Just one thing. 5 minutes.                │  │  ← firstAction, 22px
│  │  That's a win.                             │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Motion creates momentum.                        │  ← rationale, 14px, tertiary color
│                                                  │
│  [ I've opened it ]                              │  ← primary CTA
│                                                  │
└──────────────────────────────────────────────────┘
```

**Component list:**
- `session-context-bar`
- `first-action-card` (variant: `rescue_micro`)

**Copy pattern:**
- `firstAction` is the absolute minimum: time commitment + "that's a win." No content prescription.
- Rationale line: 14px, `--color-text-tertiary`, one sentence only — context, not motivation speech
- CTA: past-perfect tense ("I've opened it") — the student is confirming an action already done, not promising a future one

**Rationale copy per play:**

| Play | Rationale line |
|---|---|
| P2-R1 (micro) | "Motion creates momentum." |
| P2-R2 (two-minute) | *(none — the timer is the rationale)* |
| P2-R3 (watch-only) | "Low start. Full proof at the end." |

---

### Play P2-R2 — Two-Minute Rule (Rescue, high anxiety)

**When:** Student is resisting; task feels overwhelming; anxiety high.

This is the one place in the entire product where a timer appears. It counts **up** (elapsed), never down.

#### Sub-state A: Timer running

```
┌──────────────────────────────────────────────────┐
│  Integration · Practice · ~20 min              │
│                                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  2 minutes. That's all.                    │  │  ← firstAction, 22px
│  │  Open anything. Just start.                │  │
│  │                                            │  │
│  │         0:47                               │  │  ← elapsed timer, 28px display size
│  │                                            │  │     --color-text-tertiary (muted)
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [ I've started ]                                │  ← primary CTA (can tap before 2 min)
│                                                  │
└──────────────────────────────────────────────────┘
```

**Timer rules:**
- Counts up from 0:00 in `MM:SS` format
- 28px display size, `--color-text-tertiary` (not prominent, not accent)
- Sits centered inside the first-action card
- Student can tap "I've started" at any point — they are not locked to 2 minutes
- Timer is informational, not a deadline

#### Sub-state B: After 2 minutes (card transforms)

The first-action card transforms in place after 2 minutes. The screen does not navigate away. The card content changes:

```
┌──────────────────────────────────────────────────┐
│  Integration · Practice · ~20 min              │
│                                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  2 minutes done.                           │  │  ← 22px, --color-text-primary
│  │                                            │  │
│  │  Keep going?                               │  │  ← 16px, --color-text-secondary
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [ Yes, keep going ]                             │  ← primary CTA
│  [ Done for today ]                              │  ← secondary CTA (outline)
│                                                  │
└──────────────────────────────────────────────────┘
```

**"Keep going?" rules:**
- "Yes, keep going" → `FirstActionStarted` fires, screen clears to active session
- "Done for today" → `SessionEnd` fires (valid session, even if only 2 minutes). Phase 3 handles the close with short-session treatment.
- **Never show "Done for today" before the 2 minutes elapse.** Only appears after the timer completes.
- No shame in "Done for today" — 2 minutes of studying is more than 0 minutes.

**Component list:**
- `session-context-bar`
- `first-action-card` (variant: `rescue_two_min`, transforms to `rescue_keep_going`)

---

### Play P2-R3 — Watch-only (Rescue, overwhelmed state)

**When:** Stalled AND low energy. Active retrieval is too demanding. Reading or watching is the fallback — but only with guaranteed proof at the end.

```
┌──────────────────────────────────────────────────┐
│  Integration · Practice · ~20 min              │
│                                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  Read or watch only today.                 │  │  ← firstAction, 22px
│  │  That's okay.                              │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Low start. Full proof at the end.               │  ← rationale, 14px, tertiary
│                                                  │
│  [ Starting now ]                                │  ← primary CTA
│                                                  │
└──────────────────────────────────────────────────┘
```

**Important:** When watch-only fires, the P3 gate is pre-configured to enforce `VerifyNow(minQuestions=1)` at SessionEnd. The student gets an easier entry; the exit proof requirement stays the same. This is not shown to the student — it is an engine-level guardrail.

---

### Play P2-B1 — Isolation Contract (Boost default)

**When:** Student starts quickly, adherence is healthy, focus should be protected.

```
┌──────────────────────────────────────────────────┐
│  Integration · Practice · ~30 min              │
│                                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  You're in flow.                           │  │  ← firstAction/focus contract, 22px
│  │  Start hard. No switching for 25 min.      │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│                                                  │
│  [ Starting now ]                                │  ← primary CTA
│                                                  │
└──────────────────────────────────────────────────┘
```

**Notes:**
- "No switching for 25 min" surfaces the `focusContract.noSwitchingUntil` field as copy — not a UI lock. The student can switch; ELI just named the commitment.
- No rationale line in Boost mode — no explanation needed. The student is already motivated.

---

### Play P2-B2 — Hard-First Start (Boost, willpower on the bottleneck)

```
┌──────────────────────────────────────────────────┐
│  Integration · Practice · ~30 min              │
│                                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  Start with the hardest part.              │  │  ← firstAction, 22px
│  │  Willpower first. Then the rest.           │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [ On it ]                                       │  ← primary CTA
│                                                  │
└──────────────────────────────────────────────────┘
```

---

### Play P2-B3 — Continue-Last (Boost, reduce context switching)

**When:** Boost eligible + active open thread from last session.

```
┌──────────────────────────────────────────────────┐
│  Integration · Practice · ~30 min              │
│                                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  Pick up where you left off.              │  │  ← firstAction, 22px
│  │  Integration — you were mid-way through.  │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [ Continuing ]                                  │  ← primary CTA
│                                                  │
└──────────────────────────────────────────────────┘
```

**"Continuation beats restarting"** — the topic name appears in ELI's statement. The first "it knows me" moment of Phase 2.

---

## Pending Check Clearance — Retrieval Mode

This is a distinct activation pattern. It fires when `IntentSet` is triggered by:
- Student tapping a pending item in the Phase 1 list
- Student tapping "Clear 1 first, then go big" (V6/V8 CTAs)
- Student tapping "Clear one more" in Phase 3 Scenario A

The student already studied this topic. They are not starting fresh — they are retrieving. The firstAction is a proof action, not a study action.

### Wireframe

```
┌──────────────────────────────────────────────────┐
│  Integration · Retrieval                         │  ← context bar (TaskType = "Retrieval")
│                                                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  Do 1 question from Integration.           │  │  ← firstAction, 22px
│  │  In your head or on paper.                 │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [ I've done it ]                                │  ← primary CTA
│                                                  │
└──────────────────────────────────────────────────┘
```

### What's different from a study session

| Attribute | Study session | Retrieval session |
|---|---|---|
| Context bar task type | Practice / Learn / Revise | Retrieval |
| firstAction | "One topic. ~20 minutes. Start when ready." | "Do 1 question. In your head or on paper." |
| After CTA tap | → Active session screen | → Phase 3 verification ask (directly) |
| Active session | Yes (student studies) | **No** — skips straight to Phase 3 |
| Session duration | Variable | ~5 minutes by design |

**The retrieval session has no active session sub-state.** After the student taps "I've done it", `FirstActionStarted` and `SessionEnd` fire immediately in sequence. The screen transitions directly to the Phase 3 verification ask for that topic. There is no empty session screen, no nudge, no "End session" link.

This is intentional: clearing a pending check is a retrieval loop, not a study session. The 5-minute CTA copy promise must be honoured.

### Copy

| Element | Copy |
|---|---|
| Context bar task type | "Retrieval" |
| firstAction instruction | "Do 1 question from [topicName].\nIn your head or on paper." |
| CTA | "I've done it" |

### Transition: Retrieval Mode → Phase 3

When the student taps "I've done it":

1. `FirstActionStarted` fires, then `SessionEnd` fires immediately (duration recorded as ~0 active session time, classified as short session)
2. First-action card fades out: `opacity 1→0`, 150ms ease-in
3. Phase 3 verification ask fades in: `opacity 0→1`, translateY 8px→0, 200ms ease-out

The verification ask receives `mode: 'short'` (since session duration is near-zero). Copy: "Short session — that still counts." + the 3 result chips.

---

## Transition: Activation Entry → Active Session

When the student taps the confirmation CTA (standard study sessions only — not retrieval mode):

1. `FirstActionStarted` fires
2. First-action card fades out: `opacity 1→0`, 150ms ease-in
3. Active session screen fades in: `opacity 0→1`, translateY 8px→0, 200ms ease-out

The context bar stays fixed throughout. It does not animate.

If a `focusContract` was issued, a single focus reminder line appears at the top of the active session for 5 seconds, then fades out permanently. See [02-active-session.md](02-active-session.md).

---

## Variant Summary

| Play | Mode | Timer | Rationale line | CTA | To active session? |
|---|---|---|---|---|---|
| P2-N1 Standard | Neutral | No | No | "Got it. Starting." | Yes |
| P2-R1 Micro-start | Rescue | No | Yes | "I've opened it" | Yes |
| P2-R2 Two-minute | Rescue | Yes (elapsed) | No | "I've started" → "Keep going?" | Yes |
| P2-R3 Watch-only | Rescue | No | Yes | "Starting now" | Yes |
| P2-B1 Isolation | Boost | No | No | "Starting now" | Yes |
| P2-B2 Hard-first | Boost | No | No | "On it" | Yes |
| P2-B3 Continue-last | Boost | No | No | "Continuing" | Yes |
| Retrieval mode | Any | No | No | "I've done it" | **No → Phase 3 directly** |

---

## Design / Visual Notes (All Variants)

- **Page background:** `--color-bg-rescue` for all Rescue plays. `--color-bg` for Neutral and Boost.
- **First-action card:** `--color-surface`, `--shadow-card`, `--radius-lg` (16px), 20px padding — same card system as Phase 3 close cards.
- **The first-action instruction text:** `greeting` size (22px), weight 400. Not bold. It reads like ELI speaking, not a form label.
- **CTA button:** full-width, `--color-accent` fill for primary, outline for secondary. Same as Phase 1.
- **No footer in activation entry** — the student is transitioning into work; the weekly summary is irrelevant here.
- **No pending list** — the student committed to a topic. Showing the pile now adds guilt, not clarity.

---

*Next: [02-active-session.md](02-active-session.md) — what the student sees while working.*
