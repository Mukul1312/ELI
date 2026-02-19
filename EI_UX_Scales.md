# EI UX Scales (Student-Facing Dictionary)

This document defines **student-facing scales** for EI so storyboards and UI can stay consistent.

**Rule:** show **labels first**, keep **numbers second** (numbers exist for consistency/analytics, not for “scoring” the student).

---

## Principles (how to use these scales)

- **Pick closest, don’t overthink.** “Close enough” is correct.
- **Labels first.** In copy and storyboards, write `Sharp (5)` not just `5`.
- **No judgement words.** These are “today’s conditions,” not personality traits.
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

Ask **Sleep** and **BacklogPressure** only when helpful:

- **Once/day** (first study session of the day), OR
- When the student indicates they’re struggling (e.g., “I’m behind / overwhelmed”), OR
- When EI needs more context to route support (e.g., the student has many “pending checks,” repeated skips, or repeated delayed verification)

### `Pressure` (optional)

Pressure is available as a “More context” tap when the student wants to share it, and can also be asked on risk days (e.g., after a bad mock / repeated stalls). It is **never required** for the student to proceed.

### Product decision (vs original MVP instrumentation)

Some earlier docs imply **Energy + Anxiety/Pressure** are asked on every `AppOpen`.  
This UX contract intentionally reduces friction:

- `AppOpen` **always asks Energy**
- `Pressure` is **optional/conditional**

---

## UI rendering guidance (SHOULD)

- **Control type**: segmented chips (5 options) with **labels visible** and number secondary (or hidden).
- **Default selection**: none (student taps once); don’t force extra confirmation.
- **Microcopy**: show once and then collapse:
  - “Pick the closest. Don’t overthink.”
- **Accessibility**: always show labels; do not rely on color to convey meaning.

---

## `Energy` (1–5)

What this captures: **how much focused work feels possible right now**.


| Label (what student sees) | Number | Quick anchor (felt sense) | Example (“what I can do”)          |
| ------------------------- | ------ | ------------------------- | ---------------------------------- |
| **Sharp**                 | 5      | Locked in, high drive     | Hard problems, long focus block    |
| **Good**                  | 4      | Ready to work             | Normal study + one stretch         |
| **Okay**                  | 3      | Average capacity          | Regular practice/revision          |
| **Low**                   | 2      | Heavy/head tired          | Small tasks, short blocks          |
| **Exhausted**             | 1      | Can’t focus               | Minimum viable win, recovery-first |


Suggested prompt text:

- “How’s your energy right now?”

What ELI will do (plain language):

- Lower energy → suggest **smaller scope** and **tiny proof** so the session still “counts.”
- Higher energy → allow **harder work**, but still keep proof-of-learning intact.

---

## `Pressure` (1–5)

What this captures: **mental pressure / stress load right now** (the student term for “anxiety”).

Important: **high Pressure can coexist with high Energy** (e.g., “revenge planning” after a bad mock).


| Label (what student sees) | Number | Quick anchor (felt sense) | Example (“what it looks like”)     |
| ------------------------- | ------ | ------------------------- | ---------------------------------- |
| **Panicky**               | 5      | Racing thoughts           | Hard to start, urgent/guilty       |
| **Very stressed**         | 4      | Restless                  | Keeps checking phone, can’t settle |
| **Uneasy**                | 3      | Distracted                | Starts, but mind keeps jumping     |
| **Slightly tense**        | 2      | Mild pressure             | Noticeable but manageable          |
| **Calm**                  | 1      | Clear                     | No urgency feeling                 |


Suggested prompt text:

- “How much pressure are you feeling?”

What ELI will do (plain language):

- High pressure → reduce planning load (smaller scope, calmer prompts).
- Low pressure → allow higher challenge **if** integrity stays good.

---

## `BacklogPressure` (1–5)

What this captures: **how “behind” the student feels** (syllabus/tests/unfinished topics).  
This is different from `Pressure`:

- **Pressure** = inner stress right now
- **BacklogPressure** = perceived workload debt / “pending pile”


| Label (what student sees) | Number | Quick anchor (felt sense) | Example (“what it looks like”) |
| ------------------------- | ------ | ------------------------- | ------------------------------ |
| **Drowning**              | 5      | Too much pending          | “I’ll never finish this”       |
| **Behind**                | 4      | Big pending pile          | Avoids hard topics due to debt |
| **Some pending**          | 3      | Manageable backlog        | Needs prioritization           |
| **Mostly on track**       | 2      | Small pending             | Can follow plan                |
| **On track**              | 1      | No backlog worry          | Can push quality/difficulty    |


Suggested prompt text:

- “How behind do you feel right now?”

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

- “How much did you sleep?”

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

- Lower sleep → recommend shorter blocks and minimal proof; avoid “go harder” prompts.

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

What this captures: **how challenging the student wants the work to be**, not how long they’ll sit.


| Label (what student sees) | Tier number | Quick anchor   | Example                            |
| ------------------------- | ----------- | -------------- | ---------------------------------- |
| **Advanced**              | 4           | Highest signal | Mixed/advanced traps, “rank-level” |
| **Hard**                  | 3           | Stretch        | Tough PYQs / tricky sets           |
| **Medium**                | 2           | Standard       | Regular practice set               |
| **Easy**                  | 1           | Warm-up        | Basics, confidence builder         |


Suggested prompt text:

- “How hard should this feel today?”

Microcopy guardrail (recommended):

- “Hard = better questions, not more hours.”

---

## Example pack (copy/paste)

Use this exact notation in storyboards and UI specs: `**Label (Number)`**.

- `Energy: Sharp (5)`
- `Energy: Low (2)`
- `Energy: Okay (3), Sleep: Sleep-debt (<6h)`
- `Energy: Sharp (5), Pressure: Very stressed (4)` (high energy can coexist with high pressure)
- `Energy: Good (4), BacklogPressure: Behind (4)` (motivated but “pending pile” is heavy)
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

Keep the “ask” tiny and concrete:

- “Quick check so this session counts.”
- Buttons: `Do 1 question now (2 min)` / `Remind me in 24h`

