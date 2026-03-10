# Phase 1 Variants — High-Fidelity Specs

> Every Phase 1 screen is assembled by the ViewComposer from a small set of components. This document specifies all 9 variants with full wireframes, exact copy, component list, and visual notes. Engineers build from these; designers review these against the visual language in [design-language.md](../foundations/design-language.md).

---

## How to Read This Document

Each variant follows the same structure:

1. **When it fires** — the trigger condition
2. **Full wireframe** — exact layout the student sees
3. **Component list** — which SDUI components are used
4. **Exact copy** — the literal strings (copy-pasteable into ViewComposer)
5. **Visual/design notes** — mode-specific adjustments from the visual language doc

---

## Variant Index

| Variant | Mode | Trigger |
|---|---|---|
| [V1: SILENCE RE-ENTRY](#v1-silence-re-entry) | Rescue | `silenceDays >= 3` |
| [V2: LOW ENERGY](#v2-low-energy) | Rescue | Energy 1–2, silence < 3 |
| [V3: HIGH PRESSURE](#v3-high-pressure) | Rescue | Behavioral stress signal (exam proximity / avoidance / mock failure) + student confirms "A bit shaken" |
| [V4: CLEAN START](#v4-clean-start) | Neutral | `pendingChecks = 0`, normal state |
| [V5: PENDING + STANDARD](#v5-pending--standard) | Neutral | `pendingChecks = 1–2` |
| [V6: DEAL CARD](#v6-deal-card) | Neutral | `pendingChecks >= 3` |
| [V7: CHALLENGE](#v7-challenge) | Boost | `pendingChecks = 0`, no risk |
| [V8: CLEAR-THEN-CHALLENGE](#v8-clear-then-challenge) | Boost | `pendingChecks >= 1`, no risk |
| [V9: IDENTITY MOMENT](#v9-identity-moment) | Any | Weekly earned card |
| [V10: ONBOARDING](#v10-onboarding) | First-ever | No prior session |

Precedence: Rescue > Identity > Boost/Neutral > Onboarding.

---

## V1: SILENCE RE-ENTRY

### When it fires
`silenceDays >= 3` — student has not opened the app for 3+ days. Overrides all other mode conditions, including Boost eligibility.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│  Hey. No speeches.                               │  ← greeting, 22px
│                                                  │
│  One small thing.                                │  ← body, 16px, secondary color
│  5 minutes. That's a win.                        │
│                                                  │
│                                                  │
│                                                  │
│  [ 5-minute win ]                                │  ← primary CTA only, 52px
│                                                  │
│                                                  │
│                                                  │
│  ──────────────────────────────────────────────  │  ← footer divider
│  Quiet week. That's okay.                        │  ← footer (warm label, no numbers)
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- `resume-context-card` (variant: `SILENCE_RE_ENTRY`, single CTA)
- `session-summary-footer` (collapsed, silence-label mode)

### Exact copy

| Element | Copy |
|---|---|
| Greeting line 1 | "Hey. No speeches." |
| Body | "One small thing.\n5 minutes. That's a win." |
| Primary CTA | "5-minute win" |
| Footer collapsed | "Quiet week. That's okay." |

### Design / visual notes

- **Page background:** `--color-bg-rescue` (warmer off-white)
- **Top padding:** 48px (extra spacious — less elements, more breathing room)
- **Greeting → CTA gap:** 32px (double standard — Rescue spacing rules apply)
- **Button height:** 52px
- **No pending list** — even if `pendingChecks > 0`, show nothing. The pile adds pressure.
- **No numbers anywhere** — not in footer, not in greeting
- **Footer:** Never expanded. Shows warm label only.
- **No "More context" link** — do not ask for energy, sleep, or pressure on silence re-entry. The student just arrived; do not interrogate them.

### What happens when student taps "5-minute win"

Fires `IntentSet` with the most recent topic from `ei_events` (last studied topic). If no prior topic exists, fires with the topic they'll select in the session. The session begins. Phase 2 starts.

---

## V2: LOW ENERGY

### When it fires
Energy 1 (`Exhausted`) or 2 (`Low`). `silenceDays < 3`. No override condition.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  How's your energy right now?                    │  ← scale prompt
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Exh.✓ │ │ Low  │ │ Okay │ │ Good │ │Sharp │  │  ← selected: Exhausted
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │
│                                                  │
│  Keep it small today.                            │  ← greeting, 22px
│  One tiny thing. That's enough.                  │  ← body, 16px, secondary
│                                                  │
│  [ Short session (15 min) ]                      │  ← primary CTA, 52px
│  [ Just 1 pending check ]                        │  ← secondary CTA, 48px (if pendingChecks > 0)
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 3 sessions · steady                  │  ← footer collapsed
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- Energy scale (chip row, rendered before greeting)
- `resume-context-card` (variant: `LOW_ENERGY`)
- `session-summary-footer` (collapsed)

### Exact copy per energy level

**Energy 1 (Exhausted):**

| Element | Copy |
|---|---|
| Greeting | "Keep it small today." |
| Body | "One tiny thing. That's enough." |
| Primary CTA | "Short session (15 min)" |
| Secondary CTA | "Just 1 pending check" _(only if pendingChecks > 0)_ |

**Energy 2 (Low):**

| Element | Copy |
|---|---|
| Greeting | "Keep it small today." |
| Body | "Small tasks, short blocks. Let's go." |
| Primary CTA | "Short session (15 min)" |
| Secondary CTA | "Just 1 pending check" _(only if pendingChecks > 0)_ |

### Design / visual notes

- **Page background:** `--color-bg-rescue`
- **Scale appears first** — energy chips appear above the greeting. The student selects energy, THEN the greeting appears.
- **Greeting appears after chip selection** — not before. The screen initially shows only the scale prompt + chips. Once a chip is tapped, the greeting fades in (200ms). This makes the response feel personal and reactive, not pre-written.
- **No pending list** — even if `pendingChecks > 0`, don't show the full list. "Just 1 pending check" CTA is enough acknowledgment.
- **Max 2 buttons** — never 3 in low energy state.

---

## V3: HIGH PRESSURE

### When it fires

Behavioral stress signal detected AND student confirms "A bit shaken" on the trigger greeting at checkin.

**Trigger events (system detects at AppOpen):**
- `examProximityDays <= 7` — exam date loaded by institute, exam is within 7 days
- `avoidancePattern` — 3+ AppOpen events with no IntentSet in a 24-hour window
- `recentMockFailure` — mock failure event fired within the last 24 hours

No pressure scale is shown. No "More context" link. The pressure signal is collected through a binary greeting.

### How V3 now fires — checkin flow

**Step 1: Trigger greeting (replaces normal greeting at checkin)**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Results are in.                                 │  ← situation-specific (see copy table)
│  How are you holding up?                         │
│                                                  │
│  [ I'm okay, let's work ]                        │  ← primary
│  [ A bit shaken ]                                │  ← secondary
│                                                  │
└──────────────────────────────────────────────────┘
```

- "I'm okay, let's work" → `pressure: null` → normal checkin proceeds (energy, topic, sleep if first of day, time chips, task type)
- "A bit shaken" → `pressure: 4` → simplified topic-only checkin → P1 gate → V3

**Step 2 (after "A bit shaken"): Simplified checkin**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  What are you studying?                          │
│  [________________________] [Browse]             │  ← topic only
│                                                  │
│  [ Start 2 minutes, then decide ]                │
│                                                  │
└──────────────────────────────────────────────────┘
```

No energy chips. No sleep. No time chips (P1 gate: 2 min fixed). No task type (defaults null). Student names the topic and starts immediately.

### Full P1 screen wireframe (after gate — unchanged)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Your drive is real.                             │  ← greeting, 22px
│  But today's pressure is high.                   │
│                                                  │
│  We're not committing to hours.                  │  ← body, 16px, secondary
│  Start with one tiny step.                       │
│                                                  │
│  [ Start 2 minutes, then decide ]                │  ← primary CTA, 52px
│  [ Make it smaller ]                             │  ← secondary CTA, 48px
│                                                  │
│  ──────────────────────────────────────────────  │
│  Pressure day. Smaller = better.                 │  ← footer (warm label, no numbers)
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

**Checkin (trigger greeting):**
- `trigger-greeting` (variant: `HIGH_PRESSURE`, binary buttons)

**Checkin (simplified — after "A bit shaken"):**
- `topic-input`
- Single primary CTA: "Start 2 minutes, then decide"

**P1 screen:**
- `resume-context-card` (variant: `HIGH_PRESSURE`)
- `session-summary-footer` (collapsed, label-only mode)

### Exact copy

**Trigger greeting — per event type:**

| Trigger | Greeting line 1 | Greeting line 2 |
|---|---|---|
| Mock results | "Results are in." | "How are you holding up?" |
| Exam proximity | "Exam is close." | "How are you holding up?" |
| Avoidance pattern | "You've been circling." | "Let's talk." |

**Binary buttons (all trigger types):**

| Button | Label | Internal value |
|---|---|---|
| Primary | "I'm okay, let's work" | `pressure: null` |
| Secondary | "A bit shaken" | `pressure: 4` |

**P1 screen copy (after gate):**

| Element | Copy |
|---|---|
| Greeting | "Your drive is real.\nBut today's pressure is high." |
| Body | "We're not committing to hours.\nStart with one tiny step." |
| Primary CTA | "Start 2 minutes, then decide" |
| Secondary CTA | "Make it smaller" |
| Footer | "Pressure day. Smaller = better." |

### Design / visual notes

- **No pressure scale shown anywhere.** V3 is now triggered by behavioral detection + binary confirmation. Students never rate their pressure on a 1-5 scale.
- **"then decide" is load-bearing copy** — it removes commitment anxiety. The student is not committing to a session; they're committing to 2 minutes. Do not abbreviate or remove the parenthetical.
- **"Make it smaller" is an escape hatch, not a failure** — tapping it transforms the card in-place (see sub-state below). Never penalize this tap.
- **No pending list** — high pressure + a pile of pending checks = freeze. Hidden.
- **Footer shows label, not numbers** — "Pressure day. Smaller = better." replaces the numeric summary.
- **Trigger greeting replaces the checkin greeting section only** — the rest of the app chrome (footer, "Check in" header if any) stays the same. Only the greeting and buttons change.

### V3 Sub-state: "Make it smaller" tapped

The card transforms in-place. No navigation. The greeting collapses and scope reduces to the absolute minimum.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  [energy + pressure scales — unchanged above]    │
│                                                  │
│  Just 1 minute.                                  │  ← 22px, replaces previous greeting
│  Anything counts.                                │
│                                                  │
│  [ 1 minute, then stop ]                         │  ← single CTA (replaces both previous CTAs)
│                                                  │
│  ──────────────────────────────────────────────  │
│  Pressure day. Smaller = better.                 │  ← footer unchanged
│                                                  │
└──────────────────────────────────────────────────┘
```

| Element | Copy |
|---|---|
| Greeting | "Just 1 minute.\nAnything counts." |
| Single CTA | "1 minute, then stop" |

**What this fires:** `IntentSet(scope=micro, timeboxMin=1)` → P2 gate issues P2-R2 with `timeboxMin=1`. The Phase 2 two-minute timer runs for 1 minute instead of 2. After the minute, "Keep going?" appears as normal.

**Rules:**
- Only one CTA after "Make it smaller" — no further escape hatch below this. This is the floor.
- Body copy and footer do not change — only the greeting and CTA transform.
- Animation: old greeting + CTAs fade out 100ms, new content fades in 150ms.

---

## V4: CLEAN START

### When it fires
Neutral mode, `pendingChecks = 0`, no risk signals, energy 3 (`Okay`) or no pressure override.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  How's your energy right now?                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Exh.  │ │ Low  │ │Okay ✓│ │ Good │ │Sharp │  │  ← selected: Okay
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │
│                                                  │
│  Clean slate. No pending checks.                 │  ← greeting, 22px
│                                                  │
│  What are you working on today?                  │  ← body, 16px, secondary
│                                                  │
│  [ Pick a topic ]                                │  ← primary CTA
│  [ Continue from yesterday ]                     │  ← secondary (if lastTopic exists)
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 3 sessions · 2 loops closed · steady │  ← footer collapsed
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- Energy scale
- `resume-context-card` (variant: `CLEAN_START`)
- `session-summary-footer` (collapsed)

### Exact copy

| Element | Copy |
|---|---|
| Greeting | "Clean slate. No pending checks." |
| Body | "What are you working on today?" |
| Primary CTA | "Pick a topic" |
| Secondary CTA | "Continue from yesterday" _(only if lastTopic exists)_ |

### Design / visual notes

- **Standard spacing** — no Rescue mode adjustments
- **"Continue from yesterday" is the highest-converting CTA** — it requires zero decisions. Pre-populates `IntentSet` with the last topic. Always show it when available.
- **No pending list** — nothing to show (pending = 0)
- **Footer shows full summary** — this is a student in good shape; the numbers reinforce it.

---

## V5: PENDING + STANDARD

### When it fires
Neutral mode, `pendingChecks = 1–2`. Normal energy, no pressure override.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  How's your energy right now?                    │
│  [energy chips]                          [Okay ✓]│
│                                                  │
│  One pending check first,                        │  ← greeting, 22px
│  then anything else.                             │
│                                                  │
│  ▸ Trigonometry · 4 days ago                     │  ← pending item, tappable
│                                                  │
│  [ Clear this check (5 min) ]                    │  ← primary CTA
│  [ Start new topic ]                             │  ← secondary CTA
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 3 sessions · steady                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- Energy scale
- `resume-context-card` (variant: `PENDING_STANDARD`)
- `pending-items-list` (1–2 items shown)
- `session-summary-footer` (collapsed)

### Exact copy

| Element | Copy |
|---|---|
| Greeting | "One pending check first,\nthen anything else." |
| Primary CTA | "Clear this check (5 min)" |
| Secondary CTA | "Start new topic" |

### Design / visual notes

- **Pending list is tappable** — tapping an item directly fires `IntentSet` for that topic. Row tap ≠ just CTA tap. The whole row is the tap target.
- **"(5 min)" on the CTA** — the time anchor reduces commitment anxiety. Use "5 min" consistently for verification-type actions.
- **1 pending check shown** — if `pendingChecks = 2`, show both. If showing 2, the second item is shown in a lighter style (secondary priority).

---

## V6: DEAL CARD

### When it fires
Neutral mode, `pendingChecks >= 3`. The deal card constraint activates.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  How's your energy right now?                    │
│  [energy chips]                          [Good ✓]│
│                                                  │
│  You have 3 pending checks.                      │  ← greeting, 22px
│  Deal: clear the oldest one first, then go big.  │  ← body, 16px (Deal line in primary color)
│                                                  │
│  ▸ Integration · 3 days ago                      │  ← pending items list
│  ▸ Thermodynamics · 2 days ago                   │
│  ▸ Calculus · 1 day ago                          │
│                                                  │
│  [ Clear 1 first, then go big ]                  │  ← primary CTA
│  [ Start something new ]                         │  ← secondary CTA
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 4 sessions · 2 loops closed · ↑      │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- Energy scale
- `resume-context-card` (variant: `DEAL_CARD`)
- `pending-items-list` (up to 5 items)
- `session-summary-footer` (collapsed)

### Exact copy

| `pendingChecks` | Greeting | Deal line |
|---|---|---|
| 3 | "You have 3 pending checks." | "Deal: clear the oldest one first, then go big." |
| 4 | "You have 4 pending checks." | "Deal: close one first (5 min), then anything else." |
| 5+ | "You have 5 pending checks." | "Deal: clear the oldest one first." |

**"Deal" formatting rule:** The word "Deal:" must appear in the body copy, followed by the constraint. It signals negotiation, not instruction. Never say "You must clear..." or "Please verify..." — always "Deal:".

### Design / visual notes

- **"Deal:" visual treatment** — the word "Deal" can be rendered in `--color-text-primary` weight 500 while the rest of the line is `--color-text-secondary` weight 400. Subtle emphasis without bold.
- **Pending list max 5** — if `pendingChecks > 5`, show 5 items + "and X more" in tertiary color at the bottom of the list.
- **"Start something new" is a valid choice** — both buttons are always valid. This is a deal, not a command. If the student picks "Start something new," ELI records this and may tighten the constraint next session.
- **Only one deal card per session** — if the student dismisses it, no second deal card appears.

---

## V7: CHALLENGE

### When it fires
Boost mode, `pendingChecks = 0`, no risk signals, energy 4–5.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  How's your energy right now?                    │
│  [energy chips]                         [Sharp ✓]│
│                                                  │
│  Clean slate. No pending checks.                 │  ← greeting, 22px
│                                                  │
│  Let's raise the bar today.                      │  ← body, 16px
│                                                  │
│  [ Hard practice ]                               │  ← primary CTA
│  [ Advanced problem set ]                        │  ← secondary CTA
│  [ Choose your own ]                             │  ← tertiary CTA (text-only)
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 5 sessions · 4 loops closed · ↑      │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- Energy scale
- `resume-context-card` (variant: `CHALLENGE`, Boost mode)
- `session-summary-footer` (collapsed)

### Exact copy

| Element | Copy |
|---|---|
| Greeting | "Clean slate. No pending checks." |
| Body | "Let's raise the bar today." |
| Primary CTA | "Hard practice" |
| Secondary CTA | "Advanced problem set" |
| Tertiary CTA | "Choose your own" |

### Design / visual notes

- **3 buttons — maximum allowed** — only Boost mode with clean state gets 3 buttons. Any other mode: max 2.
- **Tertiary CTA is text-only** — no border, no fill. Just `--color-text-secondary` with underline on press. Smallest tap target of the three.
- **"Choose your own" fires a topic picker** — not a free text input. A quick picker showing recent topics + "New topic" at the bottom.
- **Footer shows strong numbers** — a student in Boost mode with clean state has good stats. The footer reinforces this. Show it collapsed but let the summary line be optimistic.

---

## V8: CLEAR-THEN-CHALLENGE

### When it fires
Boost mode, `pendingChecks >= 1`. The deal + stretch combo.

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  How's your energy right now?                    │
│  [energy chips]                         [Sharp ✓]│
│                                                  │
│  You've been working hard.                       │  ← greeting, 22px
│  3 things you studied are waiting to be tested.  │
│                                                  │
│  ▸ Integration · 3 days ago                      │  ← pending items list
│  ▸ Thermodynamics · 2 days ago                   │
│  ▸ Calculus · 1 day ago                          │
│                                                  │
│  [ Clear 1 first, then go big ]                  │  ← primary CTA
│  [ Start something new ]                         │  ← secondary CTA
│                                                  │
│  ──────────────────────────────────────────────  │
│  This week: 4 sessions · 2 loops closed · ↑      │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- Energy scale
- `resume-context-card` (variant: `CLEAR_THEN_CHALLENGE`)
- `pending-items-list`
- `session-summary-footer` (collapsed)

### Exact copy

| Element | Copy |
|---|---|
| Greeting | "You've been working hard." |
| Body | "3 things you studied are waiting to be tested." _(number is dynamic)_ |
| Primary CTA | "Clear 1 first, then go big" |
| Secondary CTA | "Start something new" |

### Design / visual notes

- **Greeting validates effort, not just scope** — "You've been working hard." acknowledges the sessions before the constraint. This is the S7 (Ambitious Collector) pattern — celebrate activity before redirecting it.
- **Pending list is tappable** — same as V5/V6. Tapping an item fires `IntentSet` for that topic directly.
- **"Clear 1 first, then go big" is a promise** — the CTA confirms that ELI won't restrict the student forever. After clearing 1 check, the session unlocks normally.
- **No deal copy ("Deal:") needed** — the Boost-mode deal feels less like a constraint and more like a two-step plan. The deal framing is for Neutral mode when the constraint is tighter.

---

## V9: IDENTITY MOMENT

### When it fires
Weekly earned card. All trigger conditions met (see [footer-identity.md](../systems/footer-identity.md)):
- `verification_rate_7d >= 0.70`
- `pending_checks <= 2`
- `sessionsLast7d >= 4`
- No identity card in last 7 days

### Full wireframe

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  This week:                                      │  ← label, 14px, tertiary
│                                                  │
│  You studied 5 topics.                           │  ← 16px, secondary color
│  You proved recall on 4.                         │
│                                                  │
│                                                  │
│  "You're not just studying —                     │  ← identity statement, 22px, weight 600
│   you're closing the loop."                      │
│                                                  │
│                                                  │
│  [ Let's keep going ]                            │  ← single CTA, primary style
│                                                  │
└──────────────────────────────────────────────────┘
```

After tapping "Let's keep going", the normal Phase 1 flow resumes (energy scale appears, then greeting based on mode).

### Component list

- `identity-moment-card`

### Identity statements per pattern

| Pattern | Statement |
|---|---|
| Integrity-consistent (S7) | "You're not just studying — you're closing the loop." |
| Silence-resolved (S5) | "You came back. That matters." |
| Pressure-resolved (S2) | "Pressure days don't break you anymore — you still start." |
| Technique-improved (S6) | "You're studying differently now. It shows." |
| Zero pending | "Everything you've studied, you've also proved." |
| Generic fallback | "Consistency is harder than intensity. You're proving that." |

### Design / visual notes

- **Identity statement is the only weight-600 element in the entire product** — nothing else gets semibold. The statement must visually dominate the card.
- **Statement in quotation marks** — the quotes signal that this is a reflection, a mirror statement. Not ELI issuing a verdict; ELI holding up a mirror.
- **Stats are 2 lines max, no numbers format** — "You studied 5 topics. You proved recall on 4." Not a table, not a list. Plain sentences.
- **Footer is hidden** — the identity card replaces the normal opening view. The footer would be redundant.
- **No energy scale on this screen** — the identity moment is the whole greeting. Energy is asked after the student taps "Let's keep going."

---

## V10: ONBOARDING (First-Ever Open)

### When it fires
No prior `AppOpen` events in `ei_events` for this student. True first session.

### Full wireframe (ELI's first response — after topic + task type selected)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Welcome. Let's set up.                          │  ← 22px, greeting size, weight 400
│                                                  │
│  ELI helps you study smarter —                   │  ← 16px, secondary color
│  not longer.                                     │
│                                                  │
│  You're working on Integration.                  │  ← 16px, primary color (topic name)
│                                                  │
│  [ Start learning (15–20 min) ]                  │  ← primary CTA, matches task type selected
│  [ Start practicing ]                            │  ← secondary (alternate task type)
│                                                  │
│  ──────────────────────────────────────────────  │
│  Your first session starts now.                  │  ← footer, warm label, no numbers
│                                                  │
└──────────────────────────────────────────────────┘
```

### Component list

- `resume-context-card` (variant: `ONBOARDING`)
- `session-summary-footer` (collapsed, first-session label)

### Exact copy

| Element | Copy |
|---|---|
| Greeting | "Welcome. Let's set up." |
| Body line 1 | "ELI helps you study smarter — not longer." |
| Body line 2 | "You're working on [topicName]." |
| Primary CTA | "Start [taskType] (15–20 min)" _(e.g., "Start learning (15–20 min)")_ |
| Secondary CTA | "Start [alternateTaskType]" _(if student wants to switch)_ |
| Footer | "Your first session starts now." |

### Design / visual notes

- **No energy scale on first-ever open** — there's no history to calibrate against. Energy is asked from Day 2 onwards.
- **The topic name appears in ELI's response** — this is the first "it knows me" moment. Even though the student just typed it 10 seconds ago, seeing it reflected back by ELI creates a recognition beat.
- **Time estimate on primary CTA** — "(15–20 min)" anchors expectations. First sessions should feel completable, not open-ended.
- **Footer label, no numbers** — "Your first session starts now." is the only footer content on Day 1.
- **No pending list** — no pending checks on Day 1 (no prior verified sessions).

---

## Variant Summary Reference

| Variant | Mode | Energy scale | Pending list | Buttons | Footer |
|---|---|---|---|---|---|
| V1 Silence re-entry | Rescue | Hidden | Hidden | 1 | Warm label |
| V2 Low energy | Rescue | Shown | Hidden | 1–2 | Collapsed summary |
| V3 High pressure | Rescue | Shown + Pressure | Hidden | 2 | Warm label |
| V4 Clean start | Neutral | Shown | Hidden | 2 | Collapsed summary |
| V5 Pending standard | Neutral | Shown | Shown (1–2) | 2 | Collapsed summary |
| V6 Deal card | Neutral | Shown | Shown (up to 5) | 2 | Collapsed summary |
| V7 Challenge | Boost | Shown | Hidden | 3 | Collapsed summary |
| V8 Clear-then-challenge | Boost | Shown | Shown | 2 | Collapsed summary |
| V9 Identity moment | Any | Hidden (after CTA) | Hidden | 1 | Hidden |
| V10 Onboarding | First-ever | Hidden | Hidden | 2 | First-session label |

---

## Checkin Observations (Session 5+)

> **Not a separate variant.** Checkin observations appear as inline text within the greeting line of applicable variants (V4–V8). They ride on the existing variant, not a separate screen.

Starting at Session 5 (Tier 2 pattern claim data — 5+ data points), ELI can append a short observation to the greeting. This is the first "it sees my pattern" moment. Examples from the [S4 storyboard](../validation/storyboards/S4-flowing-but-avoidant.md):

- Session 5: *"5 sessions in. Good energy most of them."*
- Session 7: *"Good energy again. You tend to show up ready."*

**Rules:**
- One sentence only. Never two observations stacked.
- Hedging language required at Tier 2 (5–6 data points): "most of them", "tends to", "usually"
- Assertive language allowed at Tier 3+ (7+ data points): "you show up ready", "you do best with"
- The observation appends to the greeting; it does not replace it.
- Never shows before Session 5 — the system has not earned the right.

Cross-references: [formation-period.md](../systems/formation-period.md) (pattern claim tier thresholds), [relationship-arc.md](../systems/relationship-arc.md) (session-by-session capability map).

---

## Task Type Auto-Suggestion

> **Not shown in variant wireframes** — this is a behavioral rule that affects the task type chip row in the checkin form, not the Phase 1 variant screen.

| Session range | Behavior |
|---|---|
| Session 1 (onboarding) | All task types shown. No pre-selection. Student picks. |
| Session 2+ (known topic) | **Learn chip hidden** when `topic.priorSessionsCount > 0`. Student can only pick Practice or Revise for a topic they've already studied. |
| Session 8+ | **Previous task type pre-selected as default.** The chip row shows all eligible types, but the student's most recent task type for this topic is pre-highlighted. Reduces decision fatigue. |

**Why hide Learn for revisits:** A student cannot "Learn" a topic they've already had a session on. Learn = first encounter. Practice = active retrieval. Revise = refresher. Hiding Learn for known topics prevents misclassification and keeps the task type signal clean for the engine.

Cross-references: [task-types.md](../systems/task-types.md) (task type definitions and Phase 3 decision matrix), [S4 storyboard Session 3+](../validation/storyboards/S4-flowing-but-avoidant.md).

---

*Phase 1 design complete. Sprint 2 (Phase 3: The Close) and Sprint 3 (Phase 2: in-session + push notifications) are also fully specced. See [docs/ux/phase3/](../phase3/) and [docs/ux/phase2/](../phase2/).*
