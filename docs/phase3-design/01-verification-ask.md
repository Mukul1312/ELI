# Verification Ask — The Proof Moment

> The proof ask is the most sensitive screen in the product. The student just finished studying. They're tired but receptive. The ask must be light enough that saying yes is easier than saying no — but real enough that the answer is meaningful.

---

## 1. What This Screen Is

The verification ask is an **interstitial screen** that appears between Phase 2 (session end) and Phase 3 (the close card). It fires when the P3 gate returns `verificationDecision = VerifyNow`.

It is NOT:
- A quiz (ELI doesn't generate questions)
- A test (no right/wrong judgment from ELI)
- An evaluation (the student self-reports; ELI accepts the answer)

It IS:
- A prompt to do 1 question independently (in notebook, in textbook, in head)
- A self-report of how that went (honest, no penalty for "Shaky")
- A gateway to the loop-closed card (completing this = loop closed)

---

## 2. The Self-Reporting Design Decision

**Why self-reporting?**

ELI does not have access to the student's practice material. JEE/NEET students work from DPPs, textbook exercises, PYQ banks — all outside the app. ELI cannot show them a question. It can only prompt them to retrieve one themselves.

This is intentional, not a limitation. Self-reporting has a real psychological advantage: the student chooses to prove it. The agency is theirs. An externally generated quiz feels like a test; a self-prompt feels like a personal standard.

**Why 3 options, not binary (pass/fail)?**

Binary verification — "Did you get it? Yes/No" — creates:
- Shame when the answer is No
- Dishonesty when the student picks Yes despite uncertainty

Three honest options — Got it / Shaky / Need more practice — mirror real cognitive states without pass/fail framing. All three options close the loop (the session is verified regardless of result). The result informs the next P1 gate, not a score.

---

## 3. Screen Design

### 3.1 Single-screen layout (standard)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Quick check so this session counts.                         │  ← 16px, --color-text-secondary
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │  Integration                                         │    │  ← topic name, 22px, primary
│  │                                                      │    │
│  │  Do 1 question. In your head or on paper.            │    │  ← 16px, secondary
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  How did it go?                                              │  ← 14px, tertiary, sits above chips
│                                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐   │
│  │    Got it       │ │     Shaky       │ │  Need more   │   │  ← 3 result chips
│  └─────────────────┘ └─────────────────┘ └──────────────┘   │
│                                                              │
│  [ Remind me tomorrow ]                                      │  ← secondary CTA, outline
│                                                              │
│  Can't right now ↓                                           │  ← small link, tertiary color
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 What each tap fires

| Student taps | Event fired | Result value | What happens next |
|---|---|---|---|
| "Got it" | `VerificationCompleted(topic, result: confident)` | `confident` | Phase 3 Scenario A (loop closed) |
| "Shaky" | `VerificationCompleted(topic, result: partial)` | `partial` | Phase 3 Scenario A (loop closed — counts as verified) |
| "Need more practice" | `VerificationCompleted(topic, result: needs_review)` | `needs_review` | Phase 3 Scenario A (loop closed — topic flagged for quicker recall) |
| "Remind me tomorrow" | `VerificationDecisionIssued(ScheduleVerify)` | — | Phase 3 Scenario B (reminder set) |
| "Can't right now" → Skip reason | `VerificationDecisionIssued(SkipWithReason, reason: X)` | — | Phase 3 Scenario C / D / E |

**Key rule:** All three result chips (Got it / Shaky / Need more practice) fire `VerificationCompleted` and close the loop. None of them are failures. The result is stored for P1 gate calibration but never surfaced as a score to the student.

---

## 4. The Result Chips — Detailed Design

```
┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│                 │ │                 │ │                  │
│   Got it        │ │   Shaky         │ │  Need more       │
│                 │ │                 │ │  practice        │
└─────────────────┘ └─────────────────┘ └──────────────────┘
```

- **Chip height:** 56px — taller than energy chips (this is a more deliberate tap, not a quick selection)
- **Layout:** equal-width row (flex: 1 each), 8px gaps
- **Unselected:** same chip style as scales (`--color-surface`, `1px --color-border`)
- **Selected:** `--color-accent-soft` bg, `1.5px --color-accent-border`, label in `--color-accent`
- **Label size:** 15px, weight 500 — slightly heavier than energy chip labels (more deliberate)
- **No number label** — these are not a scale, they're a state description

### Copy rationale

| Label | Why this wording |
|---|---|
| "Got it" | Confident, casual. Not "Correct" (test framing). Not "I remember" (too long). |
| "Shaky" | Honest, non-judgmental. Not "Partially got it" (too hedged). Not "Unsure" (implies something bad). |
| "Need more practice" | Forward-looking. Not "Wrong" or "Failed" or "Didn't get it" (all shame-adjacent). "More practice" implies a path forward, not a deficit. |

### What ELI does with the result (invisible to student)

- `confident` → topic's TMS (mastery score) improves; recall scheduled at longer interval
- `partial` → topic's TMS stays flat; recall scheduled at standard interval
- `needs_review` → topic's TMS decreases slightly; recall scheduled sooner; P1 gate may surface this topic as a pending priority

None of these are shown to the student in Phase 3. The result is consumed silently by the engine.

---

## 5. "Remind me tomorrow" — Secondary CTA

This is the deferral path. The student verifies later (24h).

```
[ Remind me tomorrow ]   ← full-width outline button, 48px height
```

- Style: secondary CTA (outline, `--color-border-strong`, `--color-text-primary` label)
- Tapping this fires `VerificationDecisionIssued(ScheduleVerify, dueInHours: 24)`
- Goes to Phase 3 Scenario B (reminder confirmed card)
- This does NOT close the loop — the loop closes only when the reminder is honored

### When this is not shown

| Condition | "Remind me tomorrow" shown? |
|---|---|
| Standard session | Yes |
| Short session (< 10 min) | Yes — the ask is the same, the session length doesn't change the deferral option |
| Rescue mode at SessionEnd | Yes, but it is the **primary** CTA — order flips (see §8 below) |
| Already deferred twice in a row for this topic | No — the system enforces at least one attempt; see §6 |

---

## 6. Skip Flow — "Can't right now"

Skip is the exit. It is accessible but deliberately non-primary.

### Trigger

The text link `Can't right now ↓` sits below "Remind me tomorrow" in small tertiary type (12px, `--color-text-tertiary`). Tapping it expands a set of 3 reason chips inline (no modal, no sheet, no overlay).

### Expanded state

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Quick check so this session counts.                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Integration                                         │    │
│  │  Do 1 question. In your head or on paper.            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  How did it go?                                              │
│  [ Got it ]  [ Shaky ]  [ Need more practice ]               │
│                                                              │
│  [ Remind me tomorrow ]                                      │
│                                                              │
│  Why are you skipping?                                       │  ← replaces the link text
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐       │
│  │   No time     │ │    Fatigue    │ │   Confused    │       │
│  └───────────────┘ └───────────────┘ └───────────────┘       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### The 3 skip reasons

| Chip | Reason value | Phase 3 scenario |
|---|---|---|
| "No time" | `time` | Scenario C |
| "Fatigue" | `fatigue` | Scenario D |
| "Confused" | `confusion` | Scenario E |

**Design rules:**
- No free text field — ever. See [anti-patterns 12-anti-patterns.md §10](../student-ux-architecture/12-anti-patterns.md). Free text is a privacy risk and an interrogation feel.
- All 3 chips are equal — no chip is more prominent than another. No "wrong" reason.
- Tapping a reason chip immediately fires the skip event and transitions to the appropriate Phase 3 scenario. No confirm step.
- The chips are full-width of the label text (not equal-width row) — each sits on its own natural size.

### Anti-patterns for the skip flow

| Never do | Why |
|---|---|
| Modal / bottom sheet for skip reasons | Feels like an intervention, not a gentle exit |
| "Are you sure?" confirmation | Interrogates the student's decision |
| "You're skipping again" note | Shame; the system should adapt silently |
| Counting skips visibly | Same as above |
| "No time" chip that looks different from others | Implies one skip reason is more acceptable |

---

## 7. Session Duration Variants

The session length (from `ActivationPlanIssued` to `SessionEnd`) affects the framing of the proof ask.

### Short session (< 10 min)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Short session — that still counts.                          │  ← warmer framing
│                                                              │
│  Integration                                                 │
│  1 quick question. In your head.                             │  ← "quick" added
│                                                              │
│  [ Got it ]  [ Shaky ]  [ Need more practice ]               │
│                                                              │
│  [ Remind me tomorrow ]                                      │
│  Can't right now ↓                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Opening line changes from "Quick check so this session counts." → "Short session — that still counts."
- "1 quick question" instead of "Do 1 question" — "quick" acknowledges the brevity

### Long session (> 45 min)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Strong session. One thing to make it stick.                 │  ← light celebration
│                                                              │
│  Integration                                                 │
│  Do 1 question. In your head or on paper.                    │
│                                                              │
│  [ Got it ]  [ Shaky ]  [ Need more practice ]               │
│                                                              │
│  [ Remind me tomorrow ]                                      │
│  Can't right now ↓                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Opening line: "Strong session. One thing to make it stick." — acknowledges the investment before asking for the proof

### Rescue mode session (P3 gate mode = Rescue)

When the session ran in Rescue mode, the proof ask is minimized. The order flips: deferral becomes primary.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Good session.                                               │
│                                                              │
│  Integration                                                 │
│  1 question when you're ready.                               │  ← no urgency
│                                                              │
│  [ Remind me tomorrow ]                                      │  ← PRIMARY (order flipped)
│                                                              │
│  [ Got it ]  [ Shaky ]  [ Need more ]                        │  ← secondary (still there)
│                                                              │
│  Can't right now ↓                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- "1 question when you're ready" removes the urgency pressure
- "Remind me tomorrow" is promoted to primary CTA — a student in Rescue mode should not be pressured to verify immediately
- Result chips are still shown (the student can verify now if they want) but are visually secondary

---

## 8. Component Spec

### Verification ask card

```
Component: verification-ask-card
Props:
  topic:         string         — the topic name
  mode:          'standard' | 'short' | 'long' | 'rescue'
  canDefer:      boolean        — shows "Remind me tomorrow" button
  deferCount:    number         — if >= 2 for same topic, canDefer = false
  onGotIt:       () => void
  onShaky:       () => void
  onNeedsReview: () => void
  onDefer:       () => void
  onSkip:        (reason: 'time'|'fatigue'|'confusion') => void
```

### Page background by mode

| Mode | Background |
|---|---|
| standard | `--color-bg` |
| short | `--color-bg` |
| long | `--color-bg` |
| rescue | `--color-bg-rescue` — maintains the warmth the student has experienced since Phase 1 |

### Strings (server-driven by mode)

| Mode | Opening line | Topic prompt |
|---|---|---|
| standard | "Quick check so this session counts." | "Do 1 question. In your head or on paper." |
| short | "Short session — that still counts." | "1 quick question. In your head." |
| long | "Strong session. One thing to make it stick." | "Do 1 question. In your head or on paper." |
| rescue | "Good session." | "1 question when you're ready." |

---

## 9. Transition: Verification Ask → Phase 3 Close

Once the student taps a result chip (or a skip reason):

1. All elements fade out: `opacity 1 → 0`, 150ms ease-in
2. Phase 3 close card fades in: `opacity 0 → 1`, translateY 8px → 0, 200ms ease-out

For the loop-closed scenarios (Got it / Shaky / Need more practice): the counter animation begins after the card fades in. See [02-counter-animation.md](02-counter-animation.md).

For skip and deferral scenarios: no counter animation. The transition is the same (fade), but the card that appears is simpler.

---

*Next: [02-counter-animation.md](02-counter-animation.md) — the most important animation in the product.*
