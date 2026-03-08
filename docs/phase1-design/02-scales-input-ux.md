# Scales Input UX — Energy, Sleep, Pressure, Backlog

> Energy is asked every single session. It is the highest-frequency interaction in the product. If it feels like a form, students will tap random numbers and the P1 gate gets garbage data. This document designs the interaction so that answering feels as natural as glancing at a weather app.

---

## 1. Interaction Design Decision: Why Chips, Not a Slider

Two obvious options for a 1–5 scale: chips or slider. The decision is chips.

| Factor | Chips | Slider |
|---|---|---|
| **Speed** | Single tap, immediate commit | Drag + release — 2 gestures, requires precision |
| **Legibility** | Labels visible at all times | Label only visible when thumb is at that point |
| **Semantic clarity** | "Sharp" is legible → student picks the felt sense | "4" is legible → student picks a number |
| **Error rate** | Near zero — you tap the label you mean | High — slider overshoot is common on small screens |
| **Emotion** | Chips feel like a quick question between friends | Sliders feel like a rating form |
| **Accessibility** | Each chip is a distinct tap target | Requires continuous touch precision |

The scales doc says "labels first, numbers second." Chips embody this natively. Sliders invert it.

---

## 2. Chip Design Spec

### Anatomy

```
┌──────────────────┐
│                  │   height: 44px (comfortable tap target)
│   Sharp          │   padding: 12px horizontal, 10px vertical
│   (5)            │   corner radius: 12px
│                  │
└──────────────────┘
```

- **Label** (primary): 14px, weight 500, `--color-text-primary`
- **Number** (secondary): 12px, weight 400, `--color-text-tertiary` — shown below label OR omitted entirely (see below)
- **Background**: `--color-surface` (unselected), `--color-accent-soft` (selected)
- **Border**: 1px `--color-border` (unselected), 1.5px `--color-accent-border` (selected)

### States

```
Unselected (default):
  bg: --color-surface
  border: 1px --color-border
  label: --color-text-primary

Hovered/pressed (mobile: active):
  bg: --color-surface-subtle
  border: 1px --color-border-strong
  scale: 0.96 (80ms press animation)

Selected:
  bg: --color-accent-soft
  border: 1.5px --color-accent-border
  label: --color-accent
  transition: 120ms ease
```

### Number visibility decision

The number (1–5) can be shown or hidden. Default: **show the number** on first open (Day 1–3) to help students calibrate. **Hide the number** after 7+ sessions — by then the label has meaning and the number is noise.

The server controls this via a `showNumber: boolean` prop in the SDUI payload.

---

## 3. Scale Layout

### Full row layout (5-chip scales: Energy, Pressure, Backlog)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  How's your energy right now?                                    │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Exhausted│ │  Low    │ │  Okay   │ │  Good   │ │  Sharp  │  │
│  │  (1)   │ │  (2)    │ │  (3)    │ │  (4)    │ │  (5)    │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Row rules:**
- All 5 chips fit in a single row on a standard mobile screen (375px wide) with 4px gaps between chips
- Chips expand to fill the row equally (flex: 1 on each chip)
- If a chip label is longer than available space, it wraps to 2 lines (the chip height adjusts)
- No horizontal scrolling — all options always visible

### 4-chip scale layout (Sleep)

```
┌──────────────────────────────────────────────────────────────┐
│  How much did you sleep?                                     │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Sleep-debt│ │Low sleep │ │Okay sleep│ │Fully slept│       │
│  │  (<6h)  │ │ (6–7h)  │ │ (7–8h)  │ │  (≥8h)   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Energy Scale — Full Spec

The only scale asked on every `AppOpen`.

### Prompt text
```
How's your energy right now?
```
14px, `--color-text-secondary`, weight 400. Sits 12px above the chip row.

### The 5 chips (left to right: low → high)

```
Exhausted    Low       Okay       Good      Sharp
  (1)        (2)        (3)        (4)       (5)
```

**Chip order philosophy:** Left = lowest, right = highest. This maps to natural left-right directionality (weak → strong). Students calibrate quickly after a few sessions.

### What happens on selection (immediate, no confirmation)

The app does NOT show a submit button. Selecting a chip is the commit. The screen reacts immediately — ELI's greeting appears or updates based on the selected value.

### Personalization hint (Day 14+, after selection)

After a chip is tapped, a micro-hint may appear below the chip row (one line, 12px, `--color-text-tertiary`):

```
When you pick Sharp (5), you do best with 1 pending check first, then hard work.
```

- One sentence maximum
- Appears with a subtle fade-in (150ms)
- Never appears before 7 completed sessions
- Never shown if the personalization data is insufficient for accuracy

---

## 5. Sleep Scale — Full Spec

Asked only on the **first session of each day** (not on subsequent opens the same day). Also asked when EI needs more context (repeated skips, energy/performance mismatch).

### Prompt text
```
How much did you sleep?
```

### The 4 chips (left to right: worst → best)

```
Sleep-debt    Low sleep    Okay sleep    Fully slept
  (<6h)        (6–7h)       (7–8h)         (≥8h)
```

### What ELI does with this (transparent to student)

Lower sleep → ELI reduces scope silently. The student does NOT see "because you slept badly, I'm reducing your scope." The adjustment is invisible. The product does not lecture.

---

## 6. Pressure Scale — Full Spec

> **The pressure scale is no longer shown to students as a form field.** The "More context" affordance has been removed. Pressure is now collected through a trigger-based greeting when the system detects a known high-stress event. See [Trigger-Based Pressure Signal](../student-ux-architecture/03-ux-scales.md#trigger-based-pressure-signal) in `03-ux-scales.md` for the full mechanism.
>
> The chip definitions below are preserved for engineering reference — they define what the internal `pressure: 4` value means when the trigger-based flow sends it to the P1 gate.

### Prompt text (system reference only — not shown to students)
```
How much pressure are you feeling?
```

### The 5 chips (left to right: lowest → highest — OPPOSITE direction to energy)

```
Calm      Slightly   Uneasy    Very      Panicky
          tense              stressed
 (1)       (2)        (3)       (4)        (5)
```

**Important:** Pressure scale reads left (calm) to right (panicky). Energy reads left (exhausted) to right (sharp). These are opposite semantic directions but the same visual layout. The label is everything — the student never sees a number, they see a felt state.

---

## 7. Backlog Pressure Scale — Full Spec

> **BacklogPressure is never shown to students.** The scale is retired from the student-facing form. Signal source: behavioral inference from `pendingChecks + OpenLoops + ScheduleMisses7d`. See [BacklogPressure](../student-ux-architecture/03-ux-scales.md#backlogpressure-1-5) in `03-ux-scales.md` for the full behavioral signal mapping.
>
> The chip definitions below are preserved for engineering reference only. **Do NOT use these chip definitions in new code.** BacklogPressure is inferred from behavioral signals, never from student input. These values exist solely to document what the internal `backlogPressure: 3` means when the system computes it.

### Prompt text (system reference only — not shown to students)
```
How behind do you feel right now?
```

### The 5 chips (left to right: most caught-up → most behind)

```
On track   Mostly on   Some      Behind    Drowning
            track     pending
  (1)        (2)        (3)       (4)        (5)
```

**Note:** "Drowning" is on the right — this matches the emotional direction. Students never see this scale; the system maps behavioral signals to these equivalent states internally.

---

## 8. Complete AppOpen Check-in Screen

> Assembly diagrams only. For time commitment chips and task type chips full specs, see [`05-phase1-the-open.md` — Scope Presentation Redesign](../student-ux-architecture/05-phase1-the-open.md#scope-presentation-redesign--student-declares-eli-adapts).

### Standard (most sessions)

No "Check in" heading. No "Let's set up your study session" subheading. Greeting IS the opening.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [Contextual greeting — ELI's voice, no admin heading]       │
│                                                              │
│  What are you studying?                                      │
│  ┌──────────────────────────────────────┐ ┌──────────┐      │
│  │  e.g. Thermodynamics, Organic Chem…  │ │  Browse  │      │
│  └──────────────────────────────────────┘ └──────────┘      │
│  [ Thermodynamics ] [ Kinematics ] [ Waves ]  ← recent chips│
│                                                              │
│  How's your energy right now?                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐│
│  │Exhausted │ │  Low     │ │  Okay    │ │  Good    │ │Sharp││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────┘│
│                                                              │
│  How long do you have?              (full spec: doc 05)      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  10 min  │ │  20 min  │ │  45 min  │ │   1h+    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  What kind of work?                 (full spec: doc 05)      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │  Learn   │ │ Practice │ │  Revise  │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Start Thermodynamics                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  CTA reflects selected topic; disabled until topic selected  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### First session of day (adds sleep)

Sleep chips between Energy and Time commitment. No asterisk — appears naturally.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [Contextual greeting]                                       │
│                                                              │
│  What are you studying?                                      │
│  [________________________] [Browse]                         │
│                                                              │
│  How's your energy right now?                                │
│  [ Exhausted ][ Low ][ Okay ][ Good ][ Sharp ]               │
│                                                              │
│  How much did you sleep?                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │Sleep-debt│ │Low sleep │ │Okay sleep│ │  Fully slept │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│                                                              │
│  How long do you have?                                       │
│  [ 10 min ][ 20 min ][ 45 min ][ 1h+ ]                      │
│                                                              │
│  What kind of work?                                          │
│  [ Learn ][ Practice ][ Revise ]                             │
│                                                              │
│  [ Start {Topic} ]                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Trigger day (high-stress event detected)

Trigger greeting replaces the normal greeting section only.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Results are in.                   ← situation-specific copy │
│  How are you holding up?                                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              I'm okay, let's work                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 A bit shaken                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**"I'm okay"** → proceeds to full standard checkin (all inputs).

**"A bit shaken"** → simplified topic-only flow:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  What are you studying?                                      │
│  [________________________] [Browse]                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Start 2 minutes, then decide                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

No energy. No sleep. No time chips. No task type. P1 gate defaults: 2 min fixed, task type null. Routes to V3 HIGH PRESSURE.

### With personalization hint (Day 14+, after energy selection)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Ready to go.                                                │
│                                                              │
│  How's your energy right now?                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐│
│  │Exhausted │ │  Low     │ │  Okay    │ │  Good ✓  │ │Sharp││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────┘│
│                                                              │
│  When you pick Good (4), 2 topics + 1 check works best.     │ ← 12px, tertiary color
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Critical UX Rules for Scales

| Rule | Rationale |
|---|---|
| No submit button — chip tap is the commit | One extra tap before the session starts doubles dropout probability |
| Labels always visible, not just on hover | Students are on mobile. Hover doesn't exist. |
| Never ask more than 2 scales in the minimal state | Energy + Sleep = 2. More than 2 feels like a questionnaire. |
| Never show BacklogPressure scale to students | Signal is computed from behavioral data (`pendingChecks + OpenLoops + ScheduleMisses7d`). Self-report is redundant and habituating. |
| No "More context" affordance | Removed. Pressure signal collected through trigger-based greeting on specific events only. The students who need pressure routing most do not tap opt-in affordances. |
| CTA = "Start [Topic]", not "Start Session" | Confirms what the student chose. Generic CTAs remove the sense that ELI is responding to a specific intent. CTA is disabled until a topic is selected. |
| Personalization hints only when accurate | 7+ sessions with sufficient data. If uncertain, show nothing. A wrong hint breaks trust permanently. |

---

*Next: [03-onboarding-flow.md](03-onboarding-flow.md) — the first-ever open.*
