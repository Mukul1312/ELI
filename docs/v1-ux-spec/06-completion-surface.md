# Completion Surface

## Emotional Job

Verify that progress counted. Make completion feel grounded. Accept all outcomes equally. Close the loop cleanly.

## When It Appears

This spec applies whenever the architecture layer resolves the student into the `Completion` moment.

## Presentation States

The Completion Surface has two sequential stages. Each stage has distinct presentation and interaction rules.

| Stage | Condition | What the student sees |
|-------|-----------|------------------------|
| **Stage 1: Self-report** | Student has not yet selected a response | Question + four options |
| **Stage 2: Confirmation** | Student has selected a response | Confirmation copy, then auto-advance or tap to dismiss |
| **Transitioning** | Brief moment between Stage 1 and Stage 2 | Smooth transition; no loading indicator |

## Stage 1: Self-Report

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│  How did it go with             │  ← Question (Voice Type)
│  Organic Chemistry?             │
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Covered it               │  │  ← Option A
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Partially                │  │  ← Option B
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Got stuck                │  │  ← Option C
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Didn't get to it         │  │  ← Option D
│  └───────────────────────────┘  │
│                                 │
│                                 │
└─────────────────────────────────┘
```

### Question

- **Copy:** "How did it go with [topic name]?"
- **Type:** Voice Type — this is Eli speaking, not a form label
- **Visual:** Deep Charcoal on Warm Paper. Generous whitespace above.

### Response Options

Four options, single-select. Tapping one immediately triggers the confirmation (Stage 2).

| Option | Meaning | What Eli records |
|--------|---------|------------------|
| **Covered it** | Student completed what they planned | Full completion |
| **Partially** | Some progress, not everything | Partial completion |
| **Got stuck** | Attempted but hit a block | Blocked attempt |
| **Didn't get to it** | Honest non-completion | Non-completion |

### Option Design Rules

- **All options are visually equal.** Same size, same weight, same treatment. "Covered it" must not look like the "right" answer.
- **No icons or color coding.** No green checkmark on "Covered it". No red X on "Didn't get to it". The options are neutral.
- **Visual treatment:** Soft card surfaces (like topic cards on Arrival). Structure Type. Deep Charcoal text. Tappable but not button-like.
- **No "skip" option.** The student must choose one. Every choice feels acceptable.

---

## Stage 2: Confirmation

After the student taps an option, the self-report is replaced by a confirmation moment. This is a brief, grounded acknowledgment — not a results screen.

### Confirmation by Response

**"Covered it" → Grounded confirmation**
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│  Organic Chemistry — done.     │  ← Confirmation (Voice Type, Sage Green)
│  2nd session.                   │  ← Session count (if applicable, per 08)
│                                 │
│                                 │
└─────────────────────────────────┘
```

- **Copy:** "[Topic name] — done." Brief. Specific. Calm.
- **Session count:** Per `08-embedded-continuity.md`, a quiet session count may appear from the 2nd session onward ("2nd session.", "3rd session.") — only for "Covered it" and "Partially". Warm Charcoal, secondary.
- **Color:** Sage Green (`#2D7A52`). This is the earned confirmation moment — the only place in the loop where Sage Green appears.
- **Type:** Voice Type. This is Eli acknowledging real progress.
- **Not:** "Great job!", "Amazing work!", "Keep it up!" — no hype.

**"Partially" → Neutral acknowledgment**
- **Copy:** "Noted. You moved it forward."
- **Session count:** Same rule as "Covered it" if applicable.
- **Color:** Deep Charcoal. No Sage Green — partial is acknowledged, not confirmed as complete.
- **Tone:** Factual. Supportive without being performative.

**"Got stuck" → Supportive acknowledgment**
- **Copy:** "That happens. It's still here for next time."
- **Session count:** Not shown for "Got stuck" or "Didn't get to it" (per `08-embedded-continuity.md`).
- **Color:** Deep Charcoal.
- **Tone:** Normalizing. No problem-solving. No "what went wrong?" follow-up.

**"Didn't get to it" → Clean acceptance**
- **Copy:** "No problem. It'll be here."
- **Color:** Deep Charcoal.
- **Tone:** Zero guilt. Clean. The topic stays in the student's list for whenever they're ready.

### Confirmation Timing and Dismissal

- **Auto-advance:** The confirmation displays for a brief pause (2–3 seconds), then automatically transitions to the Arrival Surface.
- **Tap to dismiss:** The student can tap anywhere to dismiss and go to Arrival immediately.
- **Validation note:** The exact auto-advance duration (2–3 sec) is a V1 implementation choice to validate. Principle: the student should feel the moment without being forced to wait.

### Interruption During Confirmation

If the app is backgrounded or closed during the confirmation moment:

- The architecture layer owns whether the completion is considered recorded.
- **UX principle:** Once the student has tapped a response, the completion should be committed. On return, resolve to Arrival. Do not return the student to Stage 1 or Stage 2 of Completion.

## Interaction Model

| Action | Result |
|--------|--------|
| Tap a response option | Stage 1 transitions to Stage 2 (confirmation) |
| Wait on confirmation (2–3 sec) | Architecture-owned post-close return → Arrival Surface |
| Tap anywhere on confirmation | Post-close return → Arrival Surface immediately |
| System back (during Stage 1) | Back behavior defined by canonical transition model |
| System back (during Stage 2) | Same as tap to dismiss → Arrival |

## Continuity Alignment

Per `08-embedded-continuity.md`:

- Session count appears only for "Covered it" and "Partially"
- Session count starts from 2nd session (no "1st session")
- Shown as quiet, factual note in Warm Charcoal — secondary to main confirmation line
- Per-topic count only; not cumulative across topics

## What This Surface Must Never Become

- A celebration screen with confetti, animations, or theatrical praise
- A performance recap showing time spent, topics covered, or productivity metrics
- A surface that follows up with "What went wrong?" or "Want to try again?"
- A place where different responses trigger different product behaviors visible to the student (all are treated equally in the UI)
- A sharing surface ("Share your progress!")

## Accessibility

- **Focus order:** Question (if focusable) → Covered it → Partially → Got stuck → Didn't get to it. Logical top-to-bottom.
- **Screen reader:** Each option must have an accessible label. The question must be announced. Confirmation copy must be announced when Stage 2 appears.
- **Auto-advance:** If the confirmation auto-advances, ensure screen reader users are not interrupted mid-announcement. Consider extending the pause when VoiceOver/TalkBack is active, or making auto-advance optional. **Validation note:** Auto-advance accessibility is a V1 implementation choice to validate.
- **Reduced motion:** Transition from Stage 1 to Stage 2 should respect reduced-motion preference. Prefer crossfade or instant swap over animated transitions.
- **Tap targets:** Minimum 44×44 pt for each option.

## Visual Notes

- **Stage 1 background:** Warm Paper
- **Question text:** Deep Charcoal, Voice Type
- **Option cards:** Soft surfaces, Structure Type, Deep Charcoal. Visually identical to each other.
- **Stage 2 background:** Warm Paper
- **"Covered it" confirmation:** Sage Green text. Maximum negative space. The green text on the warm paper IS the moment. Nothing else.
- **Other confirmations:** Deep Charcoal text. Same layout and spacing as the Sage Green confirmation — the difference is only the color and the copy.
- **Transition:** Settle, don't snap. The transition from Stage 1 to Stage 2 should feel like a quiet resolution, not a page flip.

## Design Principle

The Completion Surface exists so that progress feels real without feeling theatrical. The student should leave this surface feeling grounded — "I did something" or "I didn't, and that's fine" — never judged, never hyped.
