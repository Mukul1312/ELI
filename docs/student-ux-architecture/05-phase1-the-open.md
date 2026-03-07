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

## Scope Presentation Redesign — Student Declares, ELI Adapts

> The current scope card shows prescriptive numbers ("20 min . 1 question . Med") that the student can tell are generic. This section specifies how Phase 1 should present scope instead.

### The Problem

After the student submits checkin (topic + energy), the P1 gate runs and produces a `NegotiatedIntentIssuedOutput` with `scope: { timeboxMin, questionCount, difficultyTier }`. The P1 view then displays these as a scope card:

```
Chemical Kinetics
20 min . 1 question . Med
Verification: 1 question min
```

This looks personalized but isn't. The values are mode-based constants:

| Mode    | timeboxMin | questionCount | difficultyTier |
|---------|------------|---------------|----------------|
| Rescue  | always 20  | always 1      | always easy    |
| Neutral | always 45  | always 3      | always med     |
| Boost   | always ~68 | always 5      | always hard    |

`questionCount` is literally `Math.round(timeboxMin / 15)`. These numbers only change when Strategic Adjustment sets policy dials (requires 7-14 days of data). For most students, most sessions, the same mode produces the same numbers regardless of topic.

**Three failures this creates:**

1. **False authority.** "1 question" implies ELI chose that number for Chemical Kinetics specifically. The student who wants 5 questions feels overruled by a system that hasn't earned the right to prescribe.
2. **Meaningless metric.** "1 question" of Kinematics (5 min solve) vs "1 question" of Organic Chemistry mechanisms (25 min) — the unit "question" has no stable meaning across topics. The student knows this.
3. **Static feel.** The student comes back 10 days in a row in Neutral mode and sees "45 min . 3 questions . Med" every time. It stops feeling adaptive. It feels like a template.

### The Fix: Flip Who Owns Scope

Instead of ELI prescribing scope and the student accepting/editing, the student declares their availability and ELI adapts internally.

**Current flow (ELI prescribes):**

```
Checkin screen:
  Topic: [________________]
  Energy: [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]
  [Start Session]
      |
      v
P1 screen:
  "Chemical Kinetics"
  "20 min . 1 question . Med"          <-- fake precision
  Task type: [ Learn ] [ Practice ] [ Revise ]
  Difficulty: [ Easy ] [ Med ] [ Hard ] [ Advanced ]
  [Accept] [Edit] [Reject]
```

**New flow (student declares):**

```
Checkin screen:
  Topic: [________________]               <-- stays (becomes topic-input from doc 14)
  Energy: [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]  <-- stays
  How long do you have?
    [ 10 min ] [ 20 min ] [ 45 min ] [ 1h+ ]  <-- NEW: student declares time
  What kind of work?
    [ Learn ] [ Practice ] [ Revise ]      <-- MOVED from P1 screen to checkin
  [Start Session]
      |
      v
P1 screen:
  Greeting (mode-personalized)
  Pending items list (if any)
  "Chemical Kinetics . Practice . ~20 min"  <-- reflects what STUDENT chose
  [Let's go]
```

### What Changes

| Element | Current | New |
|---|---|---|
| **Scope card** | Prescriptive: "20 min . 1 question . Med" | Confirmatory: reflects student's own choices |
| **Time commitment** | Computed by P1 gate (mode midpoint) | Student declares via chips on checkin |
| **Task type scale** | On P1 screen (after scope card) | Moved to checkin screen (before P1 gate) |
| **Difficulty scale** | On P1 screen (student picks) | Removed from UI. Computed internally by ELI |
| **Question count** | Shown on scope card | Never shown to student. Internal planning detail |
| **Verification summary** | Shown on scope card | Never shown to student. Internal planning detail |
| **Accept/Edit/Reject** | 3 buttons on P1 screen | Replaced by single "Let's go" CTA |

### Time Commitment Chips

New input on the checkin screen, below the energy scale.

**Prompt:** "How long do you have?"

| Chip | Value | Band |
|---|---|---|
| **10 min** | `timeCommitment: 10` | Short — between classes, quick win |
| **20 min** | `timeCommitment: 20` | Standard — focused single-topic session |
| **45 min** | `timeCommitment: 45` | Full — committed study block |
| **1h+** | `timeCommitment: 60` | Extended — multi-topic or deep practice |

**UX Rules:**

| Rule | Detail |
|---|---|
| **Required** | Yes. Must select one before submitting checkin |
| **Default selection** | None pre-selected. Student must actively choose |
| **Position** | Below energy scale, above task type |
| **Hidden when** | V1 SILENCE RE-ENTRY (no inputs beyond topic), V3 HIGH PRESSURE (fixed "2 minutes" scope), V9 IDENTITY MOMENT (no session input), V10 ONBOARDING (simplified first flow) |
| **Styling** | Same chip style as task type scale — pill chips, single-select |

**Why 4 fixed options, not a slider or free input:**
- Decision speed. One tap is faster than typing or sliding. 4 chips cover all meaningful bands without creating choice paralysis
- Honest bands. 10/20/45/1h+ maps to real study situations (between classes / standard session / full block / deep work). "30+" was dishonest — it could mean anything from 35 min to 2 hours, which changes ELI's internal planning significantly
- Commitment anchoring. Each chip is a real time commitment, not an open-ended vague signal
- Mode alignment. Rescue students naturally land on 10. Boost students naturally land on 45 or 1h+. The system doesn't need to prescribe — students self-select

**What ELI does differently per band:**

| Band | Internal planning |
|---|---|
| 10 min | Light scope: 1 question max, simple verification, no pending check routing |
| 20 min | Standard scope: 2 questions, standard verification |
| 45 min | Full scope: 3-4 questions, can route to pending check before new topic |
| 1h+ | Extended scope: 5+ questions, multi-topic planning possible, full SA dial application |

**Variant interaction:**

| Phase 1 Variant | Time chips shown? | Reason |
|---|---|---|
| SILENCE RE-ENTRY (V1) | No | Minimal UI. Fixed "5-minute win" framing. Time is implicit |
| LOW ENERGY (V2) | Yes | Student declares their real capacity. 10 min is the natural pick |
| HIGH PRESSURE (V3) | No | Fixed "2 minutes, then decide" framing. Time is pre-set |
| CLEAN START (V4) | Yes | Standard flow |
| PENDING + STANDARD (V5) | Yes | Standard flow |
| DEAL CARD (V6) | Yes | Student still declares time before the deal |
| CHALLENGE (V7) | Yes | Boost students naturally land on 45 or 1h+ |
| CLEAR-THEN-CHALLENGE (V8) | Yes | Standard flow |
| IDENTITY MOMENT (V9) | No | Identity screen has no session inputs |
| ONBOARDING (V10) | No | First-ever flow is simplified. Default to 15-20 min internally |

### What the P1 Gate Receives (New Inputs)

The `AppOpen` payload gains `timeCommitment` and `taskType`:

```
Before:
  { topic, energy, sleepBucket, pressure, backlogPressure }

After:
  { topic, energy, sleepBucket, pressure, backlogPressure, timeCommitment, taskType }
```

The P1 gate uses `timeCommitment` as the student's declared timebox instead of computing `timeboxMin` from mode ranges. The mode ranges become fallbacks for variants where time chips are hidden.

### What the P1 Screen Shows (After Gate)

The scope card becomes a **confirmation strip**, not a prescription:

```
+---------------------------------------------+
|  One pending check first,                    |  <-- greeting (unchanged)
|  then anything else.                         |
|                                              |
|  > Trigonometry . 4 days ago                 |  <-- pending list (unchanged)
|                                              |
|  Chemical Kinetics . Practice . ~20 min      |  <-- confirmation strip
|                                              |
|  [ Let's go ]                                |  <-- single CTA
|                                              |
|  --------------------------------------------+
|  This week: 3 sessions . steady              |  <-- footer (unchanged)
+---------------------------------------------+
```

The confirmation strip shows: **topic . task type . time** — all values the student chose. No question count. No difficulty tier. No verification summary.

**Confirmation strip styling:**

```
Background:   --color-surface
Border:       1px solid --color-border
Radius:       --radius-md (12px)
Padding:      12px 16px
Font:         14px, weight 500, --color-text-primary
Layout:       single line, dot-separated
```

### Difficulty: Why It Leaves the UI

The difficulty scale ("How hard should this feel today?") currently sits on the P1 screen. It's removed because:

1. **The student already answered this implicitly.** Energy level + mode + topic history (when available) tell ELI more about appropriate difficulty than a 4-point self-report scale
2. **Students don't calibrate difficulty well.** A student who picks "Hard" for Organic Chemistry doesn't know if that means "JEE Advanced level" or "NCERT back-of-chapter." The label is ambiguous without topic context
3. **It contradicts the scope card.** The scope card says "Med" and then the scale asks "How hard?" — the student doesn't know which one wins
4. **Fewer inputs = faster to start.** Phase 1's job is to get the student from open to action with minimum friction. Every input is a decision point that slows the start

**Where difficulty goes:** ELI computes `difficultyTier` internally using:
- Mode (Rescue = easy, Boost = hard baseline)
- Strategic Adjustment policy dials (when available)
- TMS for this topic (Layer 2 — when stable TopicIds exist, see [14-topic-selection-system.md](14-topic-selection-system.md))
- Student's energy input (low energy = reduce difficulty by 1 tier)

The student never sees the difficulty value. If the questions feel too easy or too hard, that signal comes through verification results and Strategic Adjustment adapts over time.

### Adaptive Scope Layers (Progressive)

The time chips and confirmation strip work on day 1. As data accumulates, the system earns the right to be smarter:

**Layer 1 — Student patterns (no catalog needed, 3+ sessions of history):**
- Pre-select the time chip the student usually picks. "You usually pick 20 min" — chip is pre-highlighted, student can override with a single tap to a different chip
- **Editable pre-selection:** When a chip is pre-selected by the system, it becomes inline-editable — the student can tap the highlighted chip a second time to type a custom value (e.g. they usually pick 20 min but today want exactly 35 min). The custom value replaces the chip label temporarily. This is the right moment for free input: it's a correction to a suggestion, not a cold open-ended question

```
Day 1 (no data):                    Layer 1 (pre-selected):
[ 10 min ] [ 20 min ]               [ 10 min ] [● 20 min] [ 45 min ] [ 1h+ ]
[ 45 min ] [ 1h+    ]                            ↑ tap again to edit inline
                                                 [● 35 min]  ← student typed
```

- Gentle mismatch note (optional): If the student's actual median session duration is significantly shorter than their selected chip — e.g. they always end at 12 min but pick 45 — ELI can surface a one-line note: "Your last 5 sessions averaged 12 min. Still going with 45?" This note is never blocking and disappears after 2 seconds if ignored

**Layer 2 — Topic history (needs stable TopicIds from [14-topic-selection-system.md](14-topic-selection-system.md)):**
- Pre-select time based on this student's average session duration *for this specific topic*
- Compute `difficultyTier` from TMS — low mastery topics get easier questions, high mastery topics get harder
- Adjust internal question count based on how many questions the student typically completes for this topic

**Layer 3 — Cross-student intelligence (needs Stage 1 + scale):**
- Adjust internal question count based on median question duration for this topic across all students
- Surface topic-specific time suggestions: "Most students spend ~15 min on Chemical Kinetics" (only when confidence is high)

Each layer makes internal planning smarter. The student-facing UI stays the same: time chips + confirmation strip. What changes is the intelligence behind pre-selections and internal scope computation.

### Rescue Mode Overrides

In Rescue variants where time chips are hidden, the system handles time internally:

| Variant | Time handling |
|---|---|
| V1 SILENCE RE-ENTRY | Fixed at 5 min ("5-minute win"). No input needed |
| V3 HIGH PRESSURE | Fixed at 2 min ("Start 2 minutes, then decide"). No input needed |

These variants already communicate time through their CTA copy. Adding time chips would add friction to flows designed to be frictionless.

### Impact on Phase 2 Context Bar

The session-context-bar in Phase 2 currently shows:

```
Chemical Kinetics . Practice . Medium
```

After this redesign:

```
Chemical Kinetics . Practice . ~20 min
```

The difficulty tier label is replaced with the student's declared time. This is more useful during the session — the student can glance at how long they committed to, not an abstract difficulty label.

### Anti-Patterns

| Do NOT | Why |
|---|---|
| Pre-select a time chip on day 1 | No data to justify a default. Forcing the student to choose is honest |
| Show question count anywhere | "3 questions" is a system-internal planning detail. It means nothing to the student across different topics |
| Show difficulty tier to the student | ELI computes this internally. Showing it invites disagreement without giving the student enough context to calibrate |
| Add more than 4 time options | Decision paralysis. 10/20/45/1h+ covers all meaningful bands. Adding a 5th chip (e.g. "2h+") creates negligible planning difference over 1h+ and slows the decision |
| Show free input on day 1 | Free input without a suggestion is an open-ended question the student has to think about. The editable pre-selection (Layer 1) is different — it's a correction to a known default, which is fast and purposeful |
| Override the student's time choice visually | If SA dials reduce scope internally, that's fine — plan less content. But the confirmation strip shows what the student chose, not what ELI overrode it to |

### Engineering Handoff Notes

- **`AppOpen` payload change.** Gains `timeCommitment: number` and `taskType: string`. These move from P1 screen inputs to checkin screen inputs
- **P1 gate input change.** `NegotiatedIntent.create()` receives `timeCommitment` instead of computing `timeboxMin` from mode ranges. The mode ranges become fallbacks for variants where time chips are hidden
- **Scope card component change.** `scope-card` becomes `confirmation-strip` — simpler component, no `scopeSummary` or `verificationSummary` props
- **Difficulty scale removal.** `difficultyTier` scale-input removed from `composeP1View`. Difficulty computed internally in `NegotiatedIntent.create()` using mode + policy dials + energy
- **Task type scale move.** Moves from `composeP1View` to `composeCheckinView`
- **Session context bar update.** Replace `difficultyTier` display with `timeCommitment` display
- **Dependency on doc 14:** Layer 2 adaptive scope requires stable TopicIds from [14-topic-selection-system.md](14-topic-selection-system.md). Without them, per-topic history isn't reliable enough for pre-selection

---

*Next: [06-phase2-the-session.md](06-phase2-the-session.md) — session flow and in-session experience.*
