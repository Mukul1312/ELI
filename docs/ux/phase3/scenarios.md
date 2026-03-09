# Phase 3 Scenarios — All Close Screens

> Seven scenarios. Each one fires based on what just happened in the verification ask. This document gives full wireframes, exact copy, component lists, and visual notes for each. Engineers build from this; designers review this against [design-language.md](../foundations/design-language.md).

---

## How to Read This Document

Each scenario follows the same structure:

1. **When it fires** — the trigger (what the student tapped in the verification ask)
2. **Full wireframe** — exact layout
3. **Component list** — SDUI components used
4. **Exact copy** — literal strings (copy-pasteable)
5. **Visual / design notes** — mode-specific adjustments, color, spacing

---

## Scenario Index

| Scenario | Trigger | Counter | Seed |
|---|---|---|---|
| [A — Loop Closed](#scenario-a--loop-closed) | Verification completed (Got it / Shaky / Need more) | Yes (N → N-1) | Yes |
| [B — Reminder Set](#scenario-b--reminder-set) | "Remind me tomorrow" | No | Yes (time-based) |
| [C — Skip: Time](#scenario-c--skip-time) | "No time" | No | No |
| [D — Skip: Fatigue](#scenario-d--skip-fatigue) | "Fatigue" | No | No |
| [E — Skip: Confusion](#scenario-e--skip-confusion) | "Confused" | No | Soft forward ref only |
| [F — Milestone: Pending Hits 0](#scenario-f--milestone-pending-hits-0) | Verification + pending drops to 0 | Yes (N → 0, special) | Identity-level seed |
| [G — First Verification Ever](#scenario-g--first-verification-ever) | First `VerificationCompleted` ever | Yes (1 → 0, teaching) | No |

---

## Counter Direction by Task Type

> The counter going DOWN is the core Closure beat. But the counter also goes **UP** when a Learn session creates a new pending check. This section documents the UP direction.

| Task type | Counter direction at Phase 3 | What the student sees |
|---|---|---|
| **Practice** / **Revise** (verification completed) | DOWN: `N → N-1` | Scenarios A, F, or G — loop closed |
| **Practice** / **Revise** (deferred or skipped) | No change | Scenarios B, C, D, or E — no counter shown |
| **Learn** (new topic, first session) | UP: `N → N+1` | New loop opened — pending check created |

**Learn sessions create pending checks, not close them.** This is not a negative event — it is the start of a new loop. The counter going UP is the promise of a future Closure beat.

**Copy framing for counter UP:** "New loop opened. [Topic] added to your checks." Never frame the increase negatively — no "pending increased" or "you now have more." The framing is additive: a loop was born.

**Where the counter UP appears:** After a Learn session ends, Phase 3 shows the counter going UP as part of the close card. The student sees the number rise, accompanied by the "new loop opened" copy. The counter-UP animation is intentionally less celebratory than the counter-DOWN animation (see [counter-animation.md](counter-animation.md)).

Cross-reference: [task-types.md](../systems/task-types.md) for the full Phase 3 decision matrix by task type.

---

## Scenario A — Loop Closed

### When it fires
Student tapped "Got it", "Shaky", or "Need more practice" in the verification ask. `pendingChecks` went from N to N-1 where N-1 ≥ 1.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ✓  Loop closed.                                 │  ← 22px, --color-closed, ✓ character
│                                                  │
│  Integration — you proved you remember it.       │  ← 16px, --color-text-secondary
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  Pending checks                            │  │  ← 14px, --color-text-secondary
│  │       3 → 2                                │  │  ← COUNTER ANIMATION (see 02-counter-animation.md)
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  "One less thing on your mind."                  │  ← 16px, --color-text-secondary, italic-ish (quotes)
│                                                  │
│  2 checks left this week — you're ahead.         │  ← Seed: 14px, --color-text-tertiary
│                                                  │
│  [ Done for today ]                              │  ← primary CTA
│  [ Clear one more ]                              │  ← secondary CTA (conditional)
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 4 sessions · 3 loops closed · ↑      │  ← footer collapsed
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- `loop-closed-card` (variant: `standard`)
- `loop-closed-counter` (variant: `standard`, countBefore: N, countAfter: N-1)
- `session-summary-footer` (collapsed)

### Exact copy

| Element | Copy |
|---|---|
| Headline | "✓  Loop closed." |
| Subline | "[topicName] — you proved you remember it." |
| Quote | "One less thing on your mind." |
| Seed | "[N-1] checks left this week — you're ahead." _(N-1 = new pending count)_ |
| Primary CTA | "Done for today" |
| Secondary CTA | "Clear one more" _(conditional — see below)_ |

### "Clear one more" visibility rules

| Condition | Shown? |
|---|---|
| `energy >= 4` (Good or Sharp) AND `pendingChecks >= 1` after clearing | Yes |
| `energy <= 3` | No |
| `pendingChecks = 0` after clearing | No |
| Verification result was "Need more practice" | No — don't encourage more work if the student flagged confusion |

### Seed copy variations

| `pendingChecks` after clearing | Seed |
|---|---|
| 1 | "1 check left this week. Almost done." |
| 2 | "2 checks left this week — you're ahead." |
| 3 | "3 checks left. Steady progress." |
| 4+ | "[N-1] checks remaining. One at a time." |

### Visual / design notes

- **Background:** `--color-closed-soft` (#EBF6F0) — the card sits on a very subtle green tint. Not the whole screen — just the card surface. The page background stays `--color-bg`. The contrast is subtle, almost unnoticeable consciously, but registers emotionally as "this is a positive state."
- **✓ character:** Unicode `✓` (U+2713), 28px, `--color-closed`. Not an SVG icon. Placed inline with "Loop closed." on the same baseline.
- **"One less thing on your mind."** — rendered in quotes but not italic. The quotes mark it as a reflection, not a data point. Copy stays at `--color-text-secondary`, not bold.
- **Counter box:** has `--shadow-card` on it, sits as a distinct surface within the card. Gives the number visual prominence without over-styling.
- **Seed:** smallest text on the screen (14px, `--color-text-tertiary`). It should feel like a quiet whisper — easy to notice, impossible to feel pressured by.
- **Footer:** shows updated numbers (loops closed has increased by 1 from before the session).

---

## Scenario B — Reminder Set

### When it fires
Student tapped "Remind me tomorrow" in the verification ask. `VerificationDecisionIssued(ScheduleVerify, dueInHours: 24)` was fired.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Good session.                                   │  ← 22px, --color-text-primary
│                                                  │
│  Reminder set: Integration                       │  ← 16px, --color-text-secondary
│  tomorrow at this time.                          │
│                                                  │
│                                                  │
│                                                  │
│  See you tomorrow.                               │  ← Seed: 14px, --color-text-tertiary
│                                                  │
│  [ Done ]                                        │  ← single CTA
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 4 sessions · 2 loops closed · steady │  ← footer collapsed
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- `loop-closed-card` (variant: `reminder_set`)
- `session-summary-footer` (collapsed)

### Exact copy

| Element | Copy |
|---|---|
| Headline | "Good session." |
| Subline | "Reminder set: [topicName]\ntomorrow at this time." |
| Seed | "See you tomorrow." |
| Primary CTA | "Done" |

### Visual / design notes

- **Background:** `--color-bg` (standard) — no green tint. The loop is not closed; this is neutral, not celebratory.
- **No counter** — the loop is not closed. Do not show a pending count here.
- **"Good session."** — short, warm, non-evaluative. Not "Great session!" (exclamation breaks the tone). Not "Session complete." (cold).
- **"tomorrow at this time"** — the time anchor creates a mild commitment (Seed). The reminder will fire as a push notification at that time.
- **No "Clear one more"** — the student chose to defer. Respect that.
- **Single CTA** — there is nothing more to do. One button.

---

## Scenario C — Skip: Time

### When it fires
Student tapped "No time" in the skip flow.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Noted. Short day.                               │  ← 22px, --color-text-primary
│                                                  │
│                                                  │
│                                                  │
│  [ Done ]                                        │  ← single CTA
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 4 sessions · 2 loops closed · steady │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- `loop-closed-card` (variant: `skip_time`)
- `session-summary-footer` (collapsed)

### Exact copy

| Element | Copy |
|---|---|
| Headline | "Noted. Short day." |
| Seed | _(none)_ |
| Primary CTA | "Done" |

### Visual / design notes

- **Minimum content** — this is the sparsest Phase 3 screen. 2 lines of copy + 1 button. No counter, no seed, no quote.
- **"Noted. Short day."** — 2 sentences, 3 words total. The system acknowledges and moves on. No elaboration.
- **No green tint** — neutral page background.
- **No seed** — after a time skip, no forward hook. The student knows they're busy. Don't add "but you have 3 pending checks!" pressure.
- **Footer stays collapsed** — do not auto-expand to show stats after a skip. See [anti-patterns §7](../systems/anti-patterns.md).

---

## Scenario D — Skip: Fatigue

### When it fires
Student tapped "Fatigue" in the skip flow.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Noted. Rest is part of the plan.                │  ← 22px, --color-text-primary
│                                                  │
│                                                  │
│                                                  │
│  [ Done ]                                        │  ← single CTA
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 4 sessions · 2 loops closed · steady │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- `loop-closed-card` (variant: `skip_fatigue`)
- `session-summary-footer` (collapsed)

### Exact copy

| Element | Copy |
|---|---|
| Headline | "Noted. Rest is part of the plan." |
| Seed | _(none)_ |
| Primary CTA | "Done" |

### Visual / design notes

- **Almost identical to Scenario C** — same sparse layout. The only difference is the headline copy.
- **"Rest is part of the plan."** — validates fatigue as a real constraint, not a failure. "Plan" is deliberate — it frames rest as strategy, not weakness.
- **Warmer than C** — this variant can have a slightly warmer tone in page bg if desired. Optional: use `--color-bg-rescue` instead of `--color-bg`. This is a small signal of empathy, not a mode change.

---

## Scenario E — Skip: Confusion

### When it fires
Student tapped "Confused" in the skip flow.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  That's okay.                                    │  ← 22px, --color-text-primary
│  Different approach next time.                   │  ← 22px (continued), same line styling
│                                                  │
│                                                  │
│                                                  │
│  [ Done ]                                        │  ← single CTA
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 4 sessions · 2 loops closed · steady │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- `loop-closed-card` (variant: `skip_confusion`)
- `session-summary-footer` (collapsed)

### Exact copy

| Element | Copy |
|---|---|
| Headline | "That's okay.\nDifferent approach next time." |
| Seed | _(none, but "next time" is a soft forward reference)_ |
| Primary CTA | "Done" |

### Visual / design notes

- **Two-line headline** — unlike C and D (one line each), this has two lines. The second line ("Different approach next time.") acknowledges the confusion and plants a soft forward reference without obligation.
- **"next time" is not a Seed** — it does not name a topic, a count, or a time. It is a vague forward statement that simply says the app is not done with this topic. No anxiety, no pressure.
- **No seed planted in the craving loop sense** — the Seed beat requires specificity (a count, a topic, a time). "Next time" is too vague to qualify. It's comfort copy, not a hook.
- **Do not say "Let's try a different way" or "You can ask ELI for help"** — both imply ELI has an answer to the confusion. ELI does not generate study content. Keep it forward-looking and vague.

---

## Scenario F — Milestone: Pending Hits 0

### When it fires
Student completed verification AND `pendingChecks` drops to 0. This is the "all clear" moment — everything studied has been verified.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ✓  All clear.                                   │  ← 22px, --color-closed (same ✓ treatment)
│                                                  │
│  Everything you've studied —                     │  ← 16px, --color-text-secondary
│  you've also proved.                             │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  Pending checks                            │  │
│  │    "All clear."       ← animated in        │  │  ← number dissolved into label (see 02)
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  "That's rare. Keep that."                       │  ← 16px, quoted, --color-text-secondary
│                                                  │
│                                                  │
│  [ Done ]                                        │  ← single CTA (no "Clear one more")
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 5 sessions · 4 loops closed · ↑      │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- `loop-closed-card` (variant: `milestone_zero`)
- `loop-closed-counter` (variant: `milestone`, dissolves into "All clear." label)
- `session-summary-footer` (collapsed)

### Exact copy

| Element | Copy |
|---|---|
| Headline | "✓  All clear." |
| Subline | "Everything you've studied —\nyou've also proved." |
| Counter label (animated) | "All clear." _(replaces the number in the counter box)_ |
| Quote | "That's rare. Keep that." |
| Seed | _(none — this is a milestone; no forward hook needed)_ |
| Primary CTA | "Done" |

### Visual / design notes

- **No "Clear one more"** — there is nothing to clear. The button does not appear.
- **No Seed** — when `pendingChecks = 0`, there is no pending count to reference. The identity-level copy ("That's rare.") replaces the Seed.
- **Background:** stronger `--color-closed-soft` tint — slightly more saturated than Scenario A. This is the biggest positive moment; the warmth should be perceptibly higher.
- **"That's rare."** — two words. Weight 400. In quotes. This is an identity observation, not a compliment. "Great job!" would break trust. "That's rare." signals genuine rarity without sycophancy.
- **Counter box special state:** the number animates to 0, then dissolves into the text "All clear." (see [counter-animation.md §3](counter-animation.md)). The box remains, but the number is replaced by the milestone label.
- **Footer shows strong numbers** — a student at zero pending checks has excellent stats. The footer summary should reflect this. If the week pattern is `improving`, the trend shows `↑`.

---

## Scenario G — First Verification Ever

### When it fires
`VerificationCompleted` fires for the very first time in this student's history. `loopsClosedLast7d === 0` before this session. This is Scenario G from the UX spec.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ✓  First loop closed.                           │  ← 22px, --color-closed
│                                                  │
│  That's what "closing the loop" means —          │  ← 16px, --color-text-secondary
│  you studied it AND proved you remember it.      │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  First loop closed          ← animated in  │  │  ← label replaces "Pending checks" (see 02)
│  │       1 → 0                                │  │  ← counter drop: 1 to 0
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│                                                  │
│  [ Done ]                                        │  ← single CTA
│                                                  │
│  ──────────────────────────────────────────────  │
│  Your first week starts now.                     │  ← footer, first-session label style
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- `loop-closed-card` (variant: `first_ever`)
- `loop-closed-counter` (variant: `first-ever`, countBefore: 1, countAfter: 0)
- `session-summary-footer` (collapsed, first-session label mode)

### Exact copy

| Element | Copy |
|---|---|
| Headline | "✓  First loop closed." |
| Subline | "That's what \"closing the loop\" means —\nyou studied it AND proved you remember it." |
| Counter label (animated) | "First loop closed" _(replaces "Pending checks" simultaneously with counter drop)_ |
| Seed | _(none — the teaching moment is enough)_ |
| Primary CTA | "Done" |
| Footer | "Your first week starts now." |

### Visual / design notes

- **Teaching moment, not celebration** — the subline explains the concept. Not "Amazing! You did it!" — just a clear, plain explanation of what just happened. The student is being taught what "closing the loop" means through the experience of doing it.
- **No Seed** — do not overwhelm the first close with a forward hook. The teaching moment is the entire payload.
- **No "Clear one more"** — after the first verification ever, `pendingChecks = 0`. Nothing to clear.
- **Footer stays in first-session mode** — "Your first week starts now." This is Day 1 or Day 2. The footer shows no numbers yet.
- **Counter drops from 1 to 0** — the student had exactly 1 pending check (the one they just verified). Seeing it go to 0 creates the first Closure beat.
- **Background:** `--color-closed-soft` tint, same as Scenario A.

---

## Shared Rules Across All Scenarios

### Phase 3 page structure

Every Phase 3 screen uses the same vertical layout:

```
[page background]
    [outcome card]           ← always present
    [counter box]            ← only if loop was closed
    [quote / reflection]     ← only if loop was closed
    [seed copy]              ← only if applicable
    [CTA buttons]            ← always present (1 or 2)
[footer divider]
[footer collapsed]
```

Elements are never rearranged between scenarios. The layout is predictable — students don't have to relearn the screen each time.

### Card-level design

| Property | Value |
|---|---|
| Card background | `--color-closed-soft` for A/F/G (loop closed) · `--color-bg` for B/C/D/E |
| Card padding | 20px all sides |
| Card border radius | 16px |
| Card shadow | `--shadow-card` |
| Card max-width | Full width (no side margins beyond page padding) |

### CTA rules summary

| Scenario | Primary CTA | Secondary CTA |
|---|---|---|
| A (loop closed) | "Done for today" | "Clear one more" (conditional) |
| B (reminder set) | "Done" | — |
| C (skip: time) | "Done" | — |
| D (skip: fatigue) | "Done" | — |
| E (skip: confusion) | "Done" | — |
| F (milestone: 0) | "Done" | — |
| G (first ever) | "Done" | — |

**"Done for today" vs "Done":** Only Scenario A uses "Done for today" — the "for today" signals that the student is finished and the loop is closed, but tomorrow there's more. All other scenarios use "Done" — more neutral, less forward-looking. This is intentional: skip and deferral scenarios should not signal "come back tomorrow."

### CTA button styles

All Phase 3 CTAs follow the same button spec as Phase 1 (see [design-language.md §6.1](../foundations/design-language.md)):

| Button role | Style | Height | Radius | Text |
|---|---|---|---|---|
| Primary ("Done for today", "Done") | `--color-accent` fill, white label | 48px | `--radius-lg` (16px) | 16px, weight 500 |
| Secondary ("Clear one more") | Outline, `1.5px --color-border-strong`, transparent bg | 44px | `--radius-lg` (16px) | 16px, weight 400, `--color-text-primary` |

All buttons are full-width. No fixed-width buttons in Phase 3.

### Footer behavior in Phase 3

| Scenario | Footer shows |
|---|---|
| A, F, G (loop closed) | Full summary (numbers updated) |
| B (reminder set) | Full summary (unchanged from Phase 1) |
| C, D (skip) | Full summary (collapsed — do not auto-expand) |
| E (skip: confusion) | Full summary (collapsed) |
| Silence re-entry sessions | Warm label only ("Quiet week. That's okay.") |

---

## Variant Summary

| Scenario | Headline | Counter | Quote | Seed | CTAs |
|---|---|---|---|---|---|
| A — Loop closed | "✓ Loop closed." | Yes, N→N-1 | "One less thing on your mind." | Pending count | Done / Clear one more |
| B — Reminder | "Good session." | No | — | "See you tomorrow." | Done |
| C — Skip: Time | "Noted. Short day." | No | — | — | Done |
| D — Skip: Fatigue | "Noted. Rest is part of the plan." | No | — | — | Done |
| E — Skip: Confusion | "That's okay.\nDifferent approach next time." | No | — | — | Done |
| F — Milestone 0 | "✓ All clear." | Yes, N→0 (special) | "That's rare. Keep that." | — | Done |
| G — First ever | "✓ First loop closed." | Yes, 1→0 (teaching) | — | — | Done |

---

*Phase 3 design complete. Sprints 1, 2, and 3 now fully specced. Phase 2 (in-session) and push notifications are in [docs/ux/phase2/](../phase2/).*
