# Phase 1 — The Open

> This is the most important screen in the product. It determines whether S5 stays or closes the app, whether S2 starts or freezes, whether S7 clears first or skips ahead.

---

## What Drives Phase 1

Phase 1 fires after the `AppOpen` POST returns. The P1 gate output (mode, labels, aggregates) is processed by `ViewComposer`, which assembles the SDUI component tree for Phase 1.

```
AppOpen POST
    ↓
P1 gate → { mode, labels, aggregates }
    ↓
ViewComposer → SDUI component tree (Phase 1)
    ↓
Render
```

The gate decides **what** to show. `ViewComposer` decides **how** to show it. This document specifies both.

---

## Structure (Always Present)

Every Phase 1 screen has these four elements. Some may be hidden depending on mode, but they always exist in the component tree.

1. **Contextual greeting** (1-2 sentences, tone varies by mode)
2. **Action buttons** (1-3, count varies by mode — see [Button Count Rules](#button-count-rules))
3. **Pending items list** (optional — only when `pendingChecks > 0` AND mode is not Rescue)
4. **"Your Week" footer** (always present, always collapsed)

```
┌─────────────────────────────────────┐
│  Contextual greeting                │  ← 1-2 sentences
│                                     │
│  [Pending items list]               │  ← optional
│                                     │
│  [ Primary CTA ]                    │  ← always
│  [ Secondary CTA ]                  │  ← sometimes
│  [ Tertiary CTA ]                   │  ← rarely
│                                     │
│  ────────────────────────────────── │
│  This week: X sessions · Y closed   │  ← always, collapsed
└─────────────────────────────────────┘
```

---

## Variant Matrix

Mode x pending-state x silence-state determines the layout variant rendered by `ViewComposer`.

| Mode | Pending checks | Silence days | Layout variant |
|---|---|---|---|
| Rescue | any | >=3 | **SILENCE RE-ENTRY:** minimal, 1 button, warm welcome, no numbers |
| Rescue | any | 0-2, energy <=2 | **LOW ENERGY:** minimal, 1-2 buttons, tiny scope |
| Rescue | any | 0-2, pressure >=4 | **HIGH PRESSURE:** reduced, 2 buttons, scope-down copy |
| Neutral | 0 | 0-2 | **CLEAN START:** standard, 2-3 buttons, topic choice |
| Neutral | >=1 | 0-2 | **PENDING + STANDARD:** standard with pending list |
| Neutral | >=3 | 0-2 | **DEAL CARD:** pending list + constraint framed as deal |
| Boost | 0 | 0-2 | **CHALLENGE:** full options, raise difficulty prompt |
| Boost | >=1 | 0-2 | **CLEAR-THEN-CHALLENGE:** pending list + stretch option |
| Identity | (any) | (any) | **IDENTITY MOMENT:** replaces normal greeting (weekly) |
| First-ever | 0 | 0 | **ONBOARDING:** welcome, explain what ELI does, first topic choice |

**Precedence:** Rescue > Identity > Boost/Neutral > First-ever. If mode is Rescue, nothing else overrides it. Identity fires once per week at most, only when earned.

---

## Concrete Examples

These wireframes show what the student actually sees. Each example maps to a specific archetype, state, and variant from the matrix above.

---

### Example 1 — S7: Ambitious, 3 pending, Sharp (5) energy

**Variant:** CLEAR-THEN-CHALLENGE (Boost mode, pending >= 1)

```
You've been working hard.
3 things you studied are waiting to be tested.

  ▸ Integration · 3 days ago
  ▸ Thermodynamics · 2 days ago
  ▸ Calculus · 1 day ago

[ Clear 1 first, then go big ]      ← primary CTA
[ Start something new ]             ← secondary CTA
──────────────────────────────────
This week: 4 sessions · 2 loops closed · ↑
```

**Notes:** Pending list is tappable. Each item fires `IntentSet` for that topic. Primary CTA is the "deal": clear first, then stretch.

---

### Example 2 — S5: Returning after 3+ days silence, Low (2) energy

**Variant:** SILENCE RE-ENTRY (Rescue mode, silence >= 3)

```
Hey. No speeches.

One small thing.
5 minutes. That's a win.

[ 5-minute win ]                    ← only 1 button


──────────────────────────────────
Quiet week. That's okay.
```

**Notes:** Intentionally sparse. Less UI = less pressure. Footer shows warm label, no numbers. No pending list even if `pending > 0`.

---

### Example 3 — S2: Good (4) energy + Panicky (5) pressure

**Variant:** HIGH PRESSURE (Rescue mode, pressure >= 4)

```
Your drive is real.
But today's pressure is high.

We're not committing to hours.
Start with one tiny step.

[ Start 2 minutes, then decide ]    ← primary CTA
[ Make it smaller ]                 ← secondary CTA
──────────────────────────────────
Pressure day. Smaller = better.
```

**Notes:** Even though energy is Good (4), high pressure overrides to Rescue. The parenthetical "then decide" removes commitment anxiety. "Make it smaller" is an escape hatch, not a failure.

---

### Example 4 — S1: Topper, Sharp (5) energy, 0 pending, Boost mode

**Variant:** CHALLENGE (Boost mode, 0 pending)

```
Clean slate. No pending checks.

Let's raise the bar today.

[ Hard practice ]                   ← primary CTA
[ Advanced problem set ]            ← secondary CTA
[ Choose your own ]                 ← tertiary CTA
──────────────────────────────────
This week: 5 sessions · 4 loops closed · ↑
```

**Notes:** Three buttons only in Boost mode with clean state. The tertiary CTA gives agency without overwhelming — it's the smallest, least prominent button.

---

### Example 5 — S5: Stabilising Day 10, Okay (3) energy, Neutral mode

**Variant:** PENDING + STANDARD (Neutral mode, pending >= 1)

```
One pending check first,
then anything else.

  ▸ Trigonometry · 4 days ago

[ Clear this check (5 min) ]       ← primary CTA
[ Start new topic ]                ← secondary CTA
──────────────────────────────────
This week: 3 sessions · steady
```

**Notes:** S5 on Day 10 has stabilised enough for Neutral mode. The pending count is low (1), so no deal card — just a gentle nudge to clear first.

---

### Example 6 — First-ever open (no prior data)

**Variant:** ONBOARDING (First-ever mode)

```
Welcome.

ELI helps you study smarter —
not longer. No schedules. No tracking.
Just 3 moments: open, study, close the loop.

What topic are you working on today?

[ Pick a topic ]
──────────────────────────────────
```

**Notes:** No footer stats (no data yet). Single button. The three-moment framing sets expectations for the entire product. No energy question on first-ever open — go straight to topic.

---

### Example 7 — Identity moment (weekly, earned)

**Variant:** IDENTITY MOMENT (Identity mode)

```
This week:

You studied 5 topics.
You proved recall on 4.

"You're not just studying —
 you're closing the loop."

[ Let's keep going ]
──────────────────────────────────
This week: 4 sessions · 3 loops closed · ↑
```

**Notes:** Identity moments replace the normal greeting once per week, only when earned. The quoted line is the identity reflection — it names what the student is becoming. See [08-footer-and-identity.md](08-footer-and-identity.md) for eligibility rules.

---

### Example 8 — Day 14 personalization variant

Same as standard variant for the mode, but with a micro-hint added below the energy input:

```
[Standard greeting + buttons for current mode]

  When you pick Sharp (5), you do best
  with 1 pending check first, then hard work.

[footer]
```

**Notes:** Personalization hints appear after >= 7 sessions with enough data. One hint per screen, never two. Placed below the scale input in small text. See [03-ux-scales.md](03-ux-scales.md) Personalization Hint Patterns for full rules.

---

## Pending Items List

The pending items list is the most tactically important element in Phase 1. It bridges closure from the last session to action in this one.

### Ordering

Items are ordered by `ei_topic_state.last_scheduled_due_at` ASC (earliest due first). If `last_scheduled_due_at` is null, fall back to `last_effort_at` DESC (most recent effort first).

### Display format

```
▸ [Topic name] · [X days ago]
```

### Tap behavior

Tapping an item fires `IntentSet` for that topic directly, skipping the topic selection step. This reduces friction from open to action by one full screen.

### Max items shown

5 items maximum. If more exist, show an "and X more" link at the bottom of the list.

### Hidden when

- Mode is **Rescue** — too much UI for a burnout state; showing the pile adds pressure
- **First-ever open** — no pending data exists; the list would be empty

---

## Button Count Rules

| Mode | Primary CTA | Secondary CTA | Tertiary CTA |
|---|---|---|---|
| Rescue (silence re-entry) | Always | Never | Never |
| Rescue (low energy / high pressure) | Always | Optional (1 max) | Never |
| Neutral | Always | Usually | Rarely |
| Boost | Always | Usually | Sometimes |

**Rule:** Never more than 3 buttons in Phase 1. Decision fatigue is the enemy of starting.

**Design rationale:**
- Rescue gets 1 button because the student is in a fragile state. One clear action removes the need to decide.
- Neutral gets 2 because the student can handle a choice but shouldn't be overwhelmed.
- Boost gets up to 3 because the student has capacity and energy to evaluate options.
- No mode ever gets 4+. If the design requires 4 buttons, the scope is too wide.

---

*Next: [06-phase2-the-session.md](06-phase2-the-session.md) — session flow and in-session experience.*
