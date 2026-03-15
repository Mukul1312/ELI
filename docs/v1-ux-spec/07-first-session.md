# First Session

## Design Principle

The best onboarding IS the loop. The student learns Eli by using Eli once. No tutorial, no feature tour, no multi-step wizard.

## When This Applies

The very first time the student opens Eli. No topics exist yet. No session history. The relationship phase is Arrival at its earliest point.

**Structural exception:** For the first session only, Arrival and Commitment are **merged** into one surface. There is nothing to orient around yet — no topic list, no continuity — so the product skips the standard "pick a topic or add new" moment and goes straight to "name your first topic."

This exception is justified: showing an empty topic list with "Something new" would add a tap without adding value. The merged flow gets the student into the loop faster.

## Flow

The first session follows the same loop as every subsequent session: Arrival → Commitment → Active Study → Completion. The only difference is the merged first Arrival + Commitment surface.

```
First open → Merged Arrival+Commitment → Active Study → Completion → (next open = standard Arrival)
```

---

## Merged First Arrival + Commitment Surface

```
┌─────────────────────────────────┐
│                        [avatar] │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│  "What are you studying         │  ← Greeting (Voice Type, welcoming)
│   today?"                       │
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Type a topic...          │  │  ← Text input (auto-focused)
│  └───────────────────────────┘  │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │        Let's go           │  │  ← CTA (Terracotta, inactive until topic entered)
│  │                           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### What Is Different From Standard Arrival + Commitment

| Aspect | First session | Standard flow |
|--------|--------------|---------------|
| Topic list | Absent (none exists) | Present with existing topics |
| "Something new" | Absent (input IS the primary action) | Present as tertiary action |
| Topic input | On this surface, auto-focused | On Commitment Surface after topic selection |
| Greeting | "What are you studying today?" — calm, direct | "Hey. What are you working on today?" |
| Frame field | Appears after topic entered, pre-fill "20 min" | On Commitment Surface |
| CTA | "Let's go" — inactive until topic entered | "Begin" or equivalent on Commitment |

### What Does NOT Change

- Visual system (Paper, Charcoal, Terracotta CTA)
- Interaction model (type topic → optional frame → tap CTA)
- Emotional posture (calm, inviting, no pressure)

### Greeting Rules

- Acknowledge first visit without ceremony.
- **Good:** "What are you studying today?"
- **Avoid:** "Welcome to Eli!" (fanfare), "Let's get started on your learning journey!" (hype), "First, let's set up your profile..." (setup ritual)

### Frame Field Behavior

After the student types a topic and the field loses focus, Eli pre-fills "20 min". The student can adjust or clear it, same as the standard Commitment Surface. **Validation note:** The "20 min" default is a V1 implementation choice to validate.

---

## First Active Study Surface

Identical to the standard Active Study Surface. No modifications. The student studies externally; Eli stays quiet.

---

## First Completion Surface

Identical structure to the standard Completion Surface. Self-report options are the same.

### Confirmation Copy (First-Session Variant)

Confirmation copy may be slightly warmer for the first completion, while still grounded:

| Option | First-session confirmation |
|--------|----------------------------|
| Covered it | "Organic Chemistry — done. First one in." (Sage Green) |
| Partially | "You started something. That counts." |
| Got stuck | "That happens. It's here for next time." |
| Didn't get to it | "No problem. It'll be here whenever." |

The word "first" in the "Covered it" confirmation is the only acknowledgment of the first session. It's factual, not celebratory.

---

## After the First Session

When the student returns (second app open), they see the **standard** Arrival Surface:

- Greeting line (generic, Arrival phase)
- Topic list with ONE topic (the one they just created)
- "Something new" action

From this point forward, the experience is the standard loop. No special "second session" treatment.

---

## What This Approach Rejects

- **Onboarding wizards** — "Step 1 of 4: Tell us about yourself" creates ceremony before value
- **Feature tours** — "Tap here to see your topics" patronizes and delays
- **Account setup as first experience** — name, exam date, subject selection as gates before studying. Auth happens at the system level; it is not the first UX experience.
- **Eli introducing itself** — "Hi! I'm Eli, your study companion. Here's what I can do..." is brand theater. The student discovers what Eli does by using it.
- **Sample topics or suggested topics** — pre-populated examples ("Try: Biology 101") would make Eli feel like a product demo, not a companion.

## Edge Cases

### Student Closes Before Completing First Session

If the student closes the app during the merged Arrival+Commitment surface (before tapping "Let's go") or during Active Study:

- No topic has been completed. On next open, the architecture resolves to Arrival.
- First-use condition may still apply (no topics exist). The merged surface appears again.
- No "resume" or "incomplete session" message. The student starts fresh. Quiet.

### Student Abandons Mid-First Completion

If the student taps a self-report option but closes the app before the confirmation advances:

- Architecture owns whether the completion is committed. **UX principle:** Once an option is tapped, treat as committed. On return, resolve to Arrival with one topic in the list.

## Accessibility

- **Focus order:** Greeting (if focusable) → topic input → frame field (when visible) → CTA. Same as standard Commitment flow.
- **Screen reader:** Topic input must have accessible label. CTA must announce disabled state when topic is empty.
- **Tap targets:** Minimum 44×44 pt for CTA and input area.
- **Dynamic type:** Layout should accommodate larger text. Merged layout should remain usable.

## Success Criterion

A student who opens Eli for the first time should be studying within 30 seconds. The first session teaches the student everything they need to know: name a topic, set a frame (or don't), study, tell Eli how it went. That IS Eli.
