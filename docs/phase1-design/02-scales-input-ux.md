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

Conditional — appears in two situations:

1. **Student taps "More context"** (a small link below the energy chips) — their choice to share
2. **EI auto-requests it** on risk days: after a bad mock, repeated stalls, or when energy ≥ 4 but behavior suggests freeze (e.g., multiple `AppOpen` without `IntentSet`)

### Prompt text
```
How much pressure are you feeling?
```

### The 5 chips (left to right: lowest → highest — OPPOSITE direction to energy)

```
Calm      Slightly   Uneasy    Very      Panicky
          tense              stressed
 (1)       (2)        (3)       (4)        (5)
```

**Important:** Pressure scale reads left (calm) to right (panicky). Energy reads left (exhausted) to right (sharp). These are opposite semantic directions but the same visual layout. This is intentional — the student does not think of pressure as a 1-5 rating; they think of it as a felt state. The label is everything.

### "More context" tap trigger

The link lives below the energy chip row, in small text:

```
How's your energy right now?
[chip row]
+ Add more context (pressure, sleep)
```

`+ Add more context` is `--color-text-tertiary`, 12px. Tap expands to show pressure and sleep chips with a subtle height animation. This keeps the default ask minimal (just energy) while giving students a path to share more.

---

## 7. Backlog Pressure Scale — Full Spec

The most conditional scale. Asked only when EI signals high debt risk (`OpenLoops >= 3` or `ScheduleMisses7d >= 2`).

### Prompt text
```
How behind do you feel right now?
```

### The 5 chips (left to right: most caught-up → most behind)

```
On track   Mostly on   Some      Behind    Drowning
            track     pending
  (1)        (2)        (3)       (4)        (5)
```

**Note:** "Drowning" is on the right — this matches the emotional direction (the more behind you feel, the further right you go). Students understand this intuitively.

### When to ask

Only ask backlog pressure when:
- `OpenLoops >= 3` AND the student hasn't answered this in the last 3 days
- OR the student is voluntarily adding more context via the "More context" link

Never ask backlog pressure on a silence re-entry day. The student just came back — do not hit them with a pile-size question.

---

## 8. Complete AppOpen Check-in Screen

### Minimal (standard) — Energy only

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [contextual greeting based on yesterday's session]          │
│                                                              │
│  How's your energy right now?                                │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐│
│  │Exhausted │ │  Low     │ │  Okay    │ │  Good    │ │Sharp││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────┘│
│                                                              │
│  + Add more context                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Expanded (first session of day OR EI-triggered)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [contextual greeting]                                       │
│                                                              │
│  How's your energy right now?                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐│
│  │Exhausted │ │  Low     │ │  Okay    │ │  Good    │ │Sharp││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────┘│
│                                                              │
│  How much did you sleep?                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │Sleep-debt│ │Low sleep │ │Okay sleep│ │  Fully slept │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### With personalization hint (Day 14+, after selection)

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
| Pressure is never required to proceed | High-pressure students should not have to confirm their pressure level to start studying |
| Never ask backlog pressure on silence re-entry | The student just came back. Don't ask them how far behind they are. |
| "More context" link is small and optional | It exists for students who want to share more, not for students who feel coerced |
| Personalization hints only when accurate | 7+ sessions with sufficient data. If uncertain, show nothing. A wrong hint breaks trust permanently. |

---

*Next: [03-onboarding-flow.md](03-onboarding-flow.md) — the first-ever open.*
