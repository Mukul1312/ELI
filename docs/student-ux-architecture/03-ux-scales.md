# EI UX Scales (Student-Facing Dictionary)

> Moved from project root `EI_UX_Scales.md`. This is the canonical location. Enhanced with state-adaptive UI rules, micro-copy patterns, and personalization hints.

This document defines **student-facing scales** for EI so storyboards, UI, and the experience system can stay consistent.

**Rule:** show **labels first**, keep **numbers second** (numbers exist for consistency/analytics, not for "scoring" the student).

---

## Principles (how to use these scales)

- **Pick closest, don't overthink.** "Close enough" is correct.
- **Labels first.** In copy and storyboards, write `Sharp (5)` not just `5`.
- **No judgement words.** These are "today's conditions," not personality traits.
- **Same scale, different people.** Later, we can personalize microcopy while keeping the numeric backbone stable.

---

## Data contract (MUST)

These are the **only** meanings storyboards and UI should use.

### Required fields

- `energy: 1|2|3|4|5`

### Optional fields (only when asked)

- `pressure: 1|2|3|4|5`
- `backlogPressure: 1|2|3|4|5`
- `sleepHours: number` (optional raw; used to derive `sleepBucket`)
- `sleepBucket: "<6"|"6-7"|"7-8"|">=8"`
- `difficultyTier: 1|2|3|4` (only when the student is choosing difficulty)
- `taskType: "learn"|"practice"|"revise"` (selected at `IntentSet`)

---

## When we ask (cadence rules)

Goal: keep `AppOpen` friction low (5–10 seconds), while still collecting enough signal.

### `AppOpen` (default)

- Always ask: **Energy**

### `AppOpen` (conditional add-ons)

Ask **Sleep** only when helpful:

- **Once/day** (first study session of the day)

**BacklogPressure is never asked.** The system computes it from behavioral data: `pendingChecks + OpenLoops + ScheduleMisses7d`. Self-report is redundant — the system has better data than the student's subjective recall. See [BacklogPressure](#backlogpressure-1-5) section below.

### `Pressure` (trigger-based only — not a form field)

Pressure is **not collected via a scale or "More context" affordance**. It is collected through a trigger-based greeting on specific high-stress events (mock results, exam proximity, avoidance pattern). See [Trigger-Based Pressure Signal](#trigger-based-pressure-signal) section below.

### Product decision (vs original MVP instrumentation)

Some earlier docs imply **Energy + Anxiety/Pressure** are asked on every `AppOpen`.
This UX contract intentionally reduces friction:

- `AppOpen` **always asks Energy**
- `AppOpen` **asks Sleep once/day** (first session)
- **BacklogPressure is never student-facing** — computed from behavioral signals
- **Pressure is never a form field** — collected through trigger greeting on specific events only

---

## UI rendering guidance (SHOULD)

- **Control type**: segmented chips (5 options) with **labels visible** and number secondary (or hidden).
- **Default selection**: none (student taps once); don't force extra confirmation.
- **Microcopy**: show once and then collapse:
  - "Pick the closest. Don't overthink."
- **Accessibility**: always show labels; do not rely on color to convey meaning.

---

## `Energy` (1–5)

What this captures: **how much focused work feels possible right now**.


| Label (what student sees) | Number | Quick anchor (felt sense) | Example ("what I can do")          |
| ------------------------- | ------ | ------------------------- | ---------------------------------- |
| **Sharp**                 | 5      | Locked in, high drive     | Hard problems, long focus block    |
| **Good**                  | 4      | Ready to work             | Normal study + one stretch         |
| **Okay**                  | 3      | Average capacity          | Regular practice/revision          |
| **Low**                   | 2      | Heavy/head tired          | Small tasks, short blocks          |
| **Exhausted**             | 1      | Can't focus               | Minimum viable win, recovery-first |


Suggested prompt text:

- "How's your energy right now?"

What ELI will do (plain language):

- Lower energy → suggest **smaller scope** and **tiny proof** so the session still "counts."
- Higher energy → allow **harder work**, but still keep proof-of-learning intact.

---

## `Pressure` (1–5)

> **The 5-point scale and "More context" affordance have been removed from the student-facing checkin.** Pressure is now collected through a trigger-based greeting on specific high-stress events. The student never sees a pressure scale — they respond to a binary prompt ("I'm okay" / "A bit shaken") when the system detects a known stress event.
>
> - "I'm okay, let's work" → internally maps to `pressure: null` (normal routing)
> - "A bit shaken" → internally maps to `pressure: 4` (routes to V3 HIGH PRESSURE)
>
> See [Trigger-Based Pressure Signal](#trigger-based-pressure-signal) for the full trigger model. The scale definition below is preserved for engineering reference — it defines what `pressure: 4` means in the P1 gate.

What this captures: **mental pressure / stress load right now** (the student term for "anxiety").

Important: **high Pressure can coexist with high Energy** (e.g., "revenge planning" after a bad mock).


| Label (what student sees) | Number | Quick anchor (felt sense) | Example ("what it looks like")     |
| ------------------------- | ------ | ------------------------- | ---------------------------------- |
| **Panicky**               | 5      | Racing thoughts           | Hard to start, urgent/guilty       |
| **Very stressed**         | 4      | Restless                  | Keeps checking phone, can't settle |
| **Uneasy**                | 3      | Distracted                | Starts, but mind keeps jumping     |
| **Slightly tense**        | 2      | Mild pressure             | Noticeable but manageable          |
| **Calm**                  | 1      | Clear                     | No urgency feeling                 |


Suggested prompt text:

- "How much pressure are you feeling?"

What ELI will do (plain language):

- High pressure → reduce planning load (smaller scope, calmer prompts).
- Low pressure → allow higher challenge **if** integrity stays good.

---

## `BacklogPressure` (1–5)

> **This scale has been removed from the student-facing checkin.** Signal is computed internally from behavioral data. The scale definition is preserved here for engineering reference only.
>
> **Behavioral signals that replace it:**
> | Behavioral signal | Equivalent BacklogPressure state |
> |---|---|
> | `pendingChecks >= 3` | Behind (4) or Drowning (5) |
> | `OpenLoops >= 3` | Some pending (3) to Behind (4) |
> | `ScheduleMisses7d >= 2` | Behind (4) |
> | All three elevated together | Drowning (5) |
>
> **Why self-report was removed:** After week 1, the student's subjective answer correlates almost perfectly with these three objective measures. Where it diverges — student feels behind despite clean metrics — that is anxiety, not backlog, and the Pressure signal captures it. Asking the student to report their own backlog to a system that already has the data is both redundant and habituating.

What this captures: **how "behind" the student feels** (syllabus/tests/unfinished topics).
This is different from `Pressure`:

- **Pressure** = inner stress right now
- **BacklogPressure** = perceived workload debt / "pending pile"


| Label (what student sees) | Number | Quick anchor (felt sense) | Example ("what it looks like") |
| ------------------------- | ------ | ------------------------- | ------------------------------ |
| **Drowning**              | 5      | Too much pending          | "I'll never finish this"       |
| **Behind**                | 4      | Big pending pile          | Avoids hard topics due to debt |
| **Some pending**          | 3      | Manageable backlog        | Needs prioritization           |
| **Mostly on track**       | 2      | Small pending             | Can follow plan                |
| **On track**              | 1      | No backlog worry          | Can push quality/difficulty    |


Suggested prompt text:

- "How behind do you feel right now?"

What ELI will do (plain language):

- Higher backlog pressure → bias toward **closing pending checks** before starting new topics.

---

## `SleepHours` (bucketed)

What this captures: **sleep debt risk** without forcing precision.


| Label (what student sees) | Sleep bucket |
| ------------------------- | ------------ |
| **Sleep-debt**            | **< 6h**     |
| **Low sleep**             | **6–7h**     |
| **Okay sleep**            | **7–8h**     |
| **Fully slept**           | **≥ 8h**     |


Suggested prompt text (optional):

- "How much did you sleep?"

Storyboard notation example:

- `Sleep: Okay sleep (7–8h)`

### SleepHours → sleepBucket mapping (MUST)

If raw sleep is collected, store both:

- `sleepHours` (optional raw number)
- `sleepBucket` (canonical, derived) using:
  - `<6` hours → `sleepBucket="<6"`
  - `6–7` hours → `sleepBucket="6-7"`
  - `7–8` hours → `sleepBucket="7-8"`
  - `>=8` hours → `sleepBucket=">=8"`

What ELI will do (plain language):

- Lower sleep → recommend shorter blocks and minimal proof; avoid "go harder" prompts.

---

## `TaskType` (selected at `IntentSet`)

What this captures: **what kind of work the student is doing right now**.


| Label (what student sees) | Contract value | Quick anchor             | Example                               |
| ------------------------- | -------------- | ------------------------ | ------------------------------------- |
| **Learn**                 | `learn`        | First-time understanding | Lecture/video + concept building      |
| **Practice**              | `practice`     | Solve questions          | DPP/PYQs/problem sets                 |
| **Revise**                | `revise`       | Refresh + consolidate    | Spaced revision / formula run-through |


Storyboard notation example:

- `TaskType: Practice (practice)`

---

## `DifficultyTier` (student-selectable; 1–4)

What this captures: **how challenging the student wants the work to be**, not how long they'll sit.


| Label (what student sees) | Tier number | Quick anchor   | Example                            |
| ------------------------- | ----------- | -------------- | ---------------------------------- |
| **Advanced**              | 4           | Highest signal | Mixed/advanced traps, "rank-level" |
| **Hard**                  | 3           | Stretch        | Tough PYQs / tricky sets           |
| **Medium**                | 2           | Standard       | Regular practice set               |
| **Easy**                  | 1           | Warm-up        | Basics, confidence builder         |


Suggested prompt text:

- "How hard should this feel today?"

Microcopy guardrail (recommended):

- "Hard = better questions, not more hours."

---

## Trigger-Based Pressure Signal

Pressure self-report is replaced by a **trigger-based greeting** — when the system detects a known high-stress event, ELI names the situation and offers two binary buttons. The student makes a single human choice, not a 5-point rating.

### Trigger events

| Trigger | Condition | Copy pattern |
|---|---|---|
| **Mock results day** | `recentMockFailure` event fired within 24h | "Results are in. How are you holding up?" |
| **Exam proximity** | `examProximityDays <= 7` (exam date loaded by institute) | "Exam is close. How are you holding up?" |
| **Avoidance pattern** | 3+ `AppOpen` events with no `IntentSet` within a 24h window | "You've been circling. Let's talk." |

### What the student sees

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Results are in.                                 │  ← situation text (trigger-specific)
│  How are you holding up?                         │
│                                                  │
│  [ I'm okay, let's work ]                        │  ← primary button
│  [ A bit shaken ]                                │  ← secondary button
│                                                  │
└──────────────────────────────────────────────────┘
```

### Routing

| Student response | Internal value | Routing |
|---|---|---|
| "I'm okay, let's work" | `pressure: null` | Normal checkin proceeds (energy, topic, sleep if first of day, time, task type) |
| "A bit shaken" | `pressure: 4` | Checkin simplifies to topic-only → P1 gate → V3 HIGH PRESSURE |

### V3 simplified checkin (after "A bit shaken")

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  What are you studying?                          │
│  [________________________] [Browse]             │  ← topic only, required
│                                                  │
│  [ Start 2 minutes, then decide ]                │
│                                                  │
└──────────────────────────────────────────────────┘
```

- No energy chips — pressure day, minimal inputs
- No time chips — P1 gate uses 2 min fixed (consistent with V3 time handling in doc 05)
- No task type chips — P1 gate defaults internally
- Student names what they want to study and starts immediately

### Why binary buttons, not the 5-point scale

1. **Signal quality at low cost.** Two buttons collect the routing signal in one tap. The 5-point scale collected the same routing signal (≥4 = HIGH PRESSURE) in one tap *if the student happened to tap it* — but required the student to notice and open a "More context" disclosure first.
2. **The right student taps it.** A panicking student won't voluntarily open "More context." But a panicking student *will* read a greeting that names their situation and tap "A bit shaken."
3. **The system earned the right to ask.** The trigger fires only when the system has detected a known event. ELI isn't asking how stressed the student feels in general — it's acknowledging a specific situation and asking one precise question.

---

## Checkin Screen Design Principles

> This section documents the design rationale behind the checkin screen layout. It is not a copy spec — see `docs/phase1-design/02-scales-input-ux.md` for the full form spec.

### The Problem: Clinical Feel

The original checkin screen had 5 diagnosable problems:

| Problem | Symptom | Fix |
|---|---|---|
| **Admin chrome** | "Check in" heading + "Let's set up your study session" subheading — sounds like hotel lobby registration | Remove both. The greeting card IS the opening. No heading needed. |
| **Decoupled greeting** | Greeting card says something warm, then a hard divider separates it from a form below. They feel like two different screens | Greeting leads directly into the first input — no divider, no box |
| **Four required asterisks** | Topic \* · Energy \* · Sleep \* · BacklogPressure \* — cognitive model = "fill this out to get access" | Remove BacklogPressure. Sleep has no asterisk visible — just appears naturally. Only required fields the student notices are topic and energy. |
| **Generic CTA** | "Start Session" could be a Zoom button | CTA = "Start [Topic]" — reflects what the student chose. Disabled until topic is selected. |
| **Dead chips** | All inputs same visual weight — topic field smallest, scales largest | Topic input is the hero. Energy is companion question. Sleep is contextual. Everything else is secondary. |

### The Correct Mental Model

The checkin is not a form. It is a declaration:

> "I'm going to study Thermodynamics for 20 minutes. Let's do it."

ELI's job is to receive that declaration and respond — not to interrogate the student before they can start.

### Assembled Checkin Layout

**Most sessions (standard):**

```
  [Contextual greeting — no heading, no subheading]

  What are you studying?
  [________________________] [Browse]     ← hero, large
    Thermodynamics  Kinematics  Waves     ← recent chips (if any)

  How's your energy right now?
  [ Exhausted ][ Low ][ Okay ][ Good ][ Sharp ]

  How long do you have?                   ← time commitment chips (spec: doc 05)
  [ 10 min ][ 20 min ][ 45 min ][ 1h+ ]

  What kind of work?                      ← task type chips (spec: doc 05)
  [ Learn ][ Practice ][ Revise ]

  [ Start Thermodynamics ]                ← CTA updates live as topic is selected
```

**First session of day (adds sleep):**

```
  [same as above, with Sleep chips between Energy and Time]

  How much did you sleep?
  [ Sleep-debt ][ Low sleep ][ Okay sleep ][ Fully slept ]
```

**Trigger day (detected stress event):**

```
  Results are in. How are you holding up?
  [ I'm okay, let's work ]  [ A bit shaken ]

  → If "I'm okay": proceeds to full standard checkin above
  → If "A bit shaken": topic-only simplified checkin (see Trigger-Based Pressure Signal above)
```

### Rules

| Rule | Rationale |
|---|---|
| No "Check in" heading | The greeting IS the heading. Admin labels remove warmth. |
| No "Let's set up your study session" | "Set up" = configuration. This is a study start, not a software installation. |
| CTA = "Start [Topic]" | Confirms the student's choice. Generic "Start Session" could mean anything. |
| CTA disabled until topic selected | Topic is the one input ELI genuinely can't infer. Everything else has a fallback. |
| Topic input is hero | Largest element on screen. Most prominent. Student's eye goes here first. |
| Never show asterisks for Sleep | Sleep appears once/day, naturally. Marking it required creates form energy that slows the student down. |

---

## Example pack (copy/paste)

Use this exact notation in storyboards and UI specs: `**Label (Number)`**.

- `Energy: Sharp (5)`
- `Energy: Low (2)`
- `Energy: Okay (3), Sleep: Sleep-debt (<6h)`
- `Energy: Sharp (5), Pressure: Very stressed (4)` (high energy can coexist with high pressure)
- `Energy: Good (4), BacklogPressure: Behind (4)` (motivated but "pending pile" is heavy)
- `Energy: Low (2), Pressure: Uneasy (3), BacklogPressure: Drowning (5)` (protect dignity; keep asks tiny)
- `TaskType: Learn (learn)`
- `TaskType: Practice (practice)`
- `DifficultyTier: Easy (1)` (warm-up day)
- `DifficultyTier: Advanced (4)` (only when the student is stable and wants high-signal work)

---

## How storyboards should reference scales

### AppOpen (state) example

- **Good:** `Energy: Sharp (5), Pressure: Uneasy (3), BacklogPressure: Behind (4), Sleep: Low sleep (6–7h)`
- **Avoid:** `Energy=5, Anxiety=3` (numbers without meaning)

### IntentSet example

- `Topic: Integration`
- `TaskType: Learn`
- `DifficultyTier: Hard (3)`

### SessionEnd example (proof prompt)

Keep the "ask" tiny and concrete:

- "Quick check so this session counts."
- Buttons: `Do 1 question now (2 min)` / `Remind me in 24h`

---

# Enhanced Sections (Experience System)

> The sections below extend the original scales document with experience-specific rules. They translate scale values into UX behavior, copy patterns, and Phase 1 layout decisions.

---

## Scale → Phase 1 UI Complexity Mapping

How scale values drive what the student sees when the app opens. The routing logic lives in [`EI_Engine_Taxonomy.md`](../../EI_Engine_Taxonomy.md) Section 3 (labels) + Section 4 (precedence rules). This table shows the **UX consequence** of those routing decisions.

| Energy | Pressure | Other signals | → EI Mode | Phase 1 UI | Button count |
|---|---|---|---|---|---|
| 1–2 (Exhausted/Low) | any | — | **Rescue** | Minimal, sparse, short copy | 1 |
| 3 (Okay) | ≤3 or unknown | — | **Neutral** | Standard coaching card | 2–3 |
| 4–5 (Good/Sharp) | ≤2 or unknown | `OpenLoops ≤ 2`, no active risk | **Boost** (if eligible) | Full options, pending list | 2–3 + list |
| 4–5 (Good/Sharp) | ≥4 (Very stressed/Panicky) | — | **Rescue** (pressure override) | Reduced, scope-down | 2 |
| 4–5 (Good/Sharp) | ≤2 | `OpenLoops ≥ 3` or `SilenceDays ≥ 2` | **Neutral** (risk blocks Boost) | Standard + deal card | 2 |
| any | any | `SilenceDays ≥ 3` (re-entry) | **Rescue** | Minimal, warm welcome, no numbers | 1 |

**Key rule from Engine Taxonomy Section 4:** Risk overrides ambition. Even `Sharp (5)` + `Calm (1)` routes to Neutral/Rescue if `OpenLoops` or `SilenceDays` are elevated.

---

## Micro-Copy per Scale Value

What ELI's internal read is when each scale value is selected, and the resulting copy tone:

### Energy

| Value | ELI's internal read | Copy tone | Example opening |
|---|---|---|---|
| Sharp (5) | High capacity, can stretch | Challenging, ambitious | "You're fully charged." |
| Good (4) | Ready for normal work + one stretch | Conversational | "Ready to go." |
| Okay (3) | Average — keep it standard | Neutral coaching | "Let's keep it steady." |
| Low (2) | Protect rest, tiny ask only | Warm, minimal, no questions | "Keep it small today." |
| Exhausted (1) | Recovery mode; minimum viable win | Very short, warm | "One tiny thing. That's enough." |

### Pressure (when available)

| Value | ELI's internal read | Copy tone | Example opening |
|---|---|---|---|
| Panicky (5) | Freeze risk; reduce planning load | Calm, scope-reducing | "Your drive is real. Let's start small." |
| Very stressed (4) | High load; smaller scope | Steady, no extra asks | "Pressure day. Smaller = better." |
| Uneasy (3) | Mild distraction; standard approach | Normal with gentle nudge | (no special copy — standard flow) |
| Slightly tense (2) | Manageable; allow full plan | No change | (no special copy) |
| Calm (1) | Clear; can push if integrity is good | Can challenge | (no special copy) |

### BacklogPressure (when available)

| Value | ELI's internal read | Copy tone |
|---|---|---|
| Drowning (5) | Avoidance risk; protect dignity | "No speeches." / tiny ask only |
| Behind (4) | Bias toward closing debt | Suggest clearing 1 pending first |
| Some pending (3) | Manageable; normal flow | Standard deal card if pending ≥ 3 |
| Mostly on track (2) | Can follow plan | Normal |
| On track (1) | Can push quality/difficulty | Allow Boost |

---

## Personalization Hint Patterns (Day 14+)

After ≥7 sessions, scale inputs generate micro-hints that reflect the student's own patterns:

**Format:** "When you pick **[Label (Number)]**, [observed pattern]."

**Examples:**
- "When you pick **Sharp (5)**, you do best with **1 pending check first**, then hard work."
- "When you pick **Okay (3)**, a **short block + 1 check** works best."
- "When you pick **Low (2)**, a **5-minute session** usually turns into 15."

**Rules:**
- One hint per screen, never two
- Only for the scale value the student just selected
- Only after ≥7 sessions with enough data to be accurate
- Placed below the scale input, small text, not a card
- Never on Day 1 — the system must earn the right to reflect

---

## "Never Say" Rules per Scale Value

These are copy constraints that protect trust. Violating them causes dropout for specific archetypes.

| Scale value | Never say | Why | Archetype most hurt |
|---|---|---|---|
| Exhausted (1) | "You should try harder" / any ambition-raising copy | Invalidates their state; causes shame | S5 (Burnout) |
| Exhausted (1) | "Try to get more sleep" | Obvious and unhelpful; adds guilt | S5 (Burnout) |
| Low (2) | "You can do more than you think" | Motivational toxicity; they know their capacity | S5 (Burnout) |
| Panicky (5) | "Calm down" / "Don't worry" / any minimizing language | Invalidates pressure; breaks trust | S2 (Revenge Planner) |
| Panicky (5) | "You need to manage your time better" | Lecture; causes freeze | S2 (Revenge Planner) |
| Drowning (5) | Reference to count of pending items / pile-size language | Overwhelm; confirms their fear | S5 (Burnout) |
| Sleep-debt (<6h) | "You should sleep more" | Patronizing; they know | S5 (Burnout) |
| Sharp (5) + OpenLoops ≥ 3 | "Great, let's tackle 3 topics today!" | Enables the collector trap | S7 (Ambitious) |

*Next: [04-one-screen-architecture.md](04-one-screen-architecture.md) — the three phases of the student experience.*