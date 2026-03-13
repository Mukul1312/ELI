# Phase 3 — The Close

> This is where addiction is born. Phase 3 creates the Closure beat (the reward) and the Seed beat (the hook for next time). If Phase 1 earns trust, Phase 3 earns return visits.

---

## Companion Docs in This Folder

| Doc | What it covers |
|---|---|
| [verification-ask.md](verification-ask.md) | Proof ask screen: self-report flow, skip flow, session-duration variants |
| [counter-animation.md](counter-animation.md) | Animation contract: the 3→2 drop, milestone (→0), first-ever, counter-UP (new loop) |
| [scenarios.md](scenarios.md) | All 7 scenarios (A–G) with wireframes, copy, components, visual notes |

---

## Key Design Decisions

| Decision | Chosen direction | Detail doc |
|---|---|---|
| Verification interaction | Self-reporting: student does 1 question independently, then taps result | [verification-ask.md](verification-ask.md) |
| Self-report options | 3 options: Got it / Shaky / Need more practice (no binary pass/fail) | [verification-ask.md](verification-ask.md) |
| Skip trigger | Small "Can't right now" link below CTAs → expands to 3 reason chips | [verification-ask.md](verification-ask.md) |
| Counter animation duration | ~1900ms total for DOWN (closure), ~540ms for UP (new loop) | [counter-animation.md](counter-animation.md) |
| Milestone (`→ 0`) treatment | Distinct scenario (F) — special copy, no "Clear one more" | [counter-animation.md](counter-animation.md) |
| Phase 3 background | Same `--color-bg` for skip/reminder; `--color-closed-soft` tint for loop-closed card | [scenarios.md](scenarios.md) |
| Checkmark | Text character `✓`, styled with `--color-closed`, 28px — no SVG icon | [scenarios.md](scenarios.md) |

---

## 1. What Drives Phase 3

Phase 3 fires after the **SessionEnd** event. The P3 gate runs, and its output
(`VerificationDecisionIssued`) is processed by the **ViewComposer**.

The student has just finished studying. This is the most receptive moment for a
tiny ask — they feel completion, and they are still paying attention. Phase 3
capitalises on that narrow window.

**Trigger chain:**

```
SessionEnd
  → P3 Gate evaluates (energy, pendingChecks, skipReason)
  → VerificationDecisionIssued
  → ViewComposer renders Phase 3 screen
```

**Full flow:**

```
Phase 2 (student studying)
    ↓
Student ends session → SessionEnd fires
    ↓
P3 Gate runs → VerificationDecisionIssued
    ↓
ViewComposer renders "proof ask" screen   ← designed in verification-ask.md
    ↓
Student self-reports result (or defers / skips)
    ↓
ViewComposer renders Phase 3 close card   ← Scenarios A–G: designed in scenarios.md
    ↓ (counter animates if loop closed)
Student taps "Done" or "Clear one more"
    ↓
Phase 1 re-renders with updated aggregates
```

---

## 2. Structure

Every Phase 3 screen contains exactly four elements, in this order:

| # | Element                  | Purpose                                      |
|---|--------------------------|----------------------------------------------|
| 1 | **Outcome card**         | What just happened (verification / skip / reminder) |
| 2 | **Counter**              | If a pending check was cleared — shows the number dropping |
| 3 | **Forward-looking signal** | The "Seed" — what is next                   |
| 4 | **CTA**                  | 1-2 buttons: "Done" and optionally "Clear one more" |

Elements 2 and 3 are conditional. The outcome card and the CTA are always present.

---

## 3. All Scenarios

### Scenario A — Verification completed (loop closed)

```
 ┌─────────────────────────────────────────────┐
 │                                             │
 │  checkmark  Loop closed.                    │
 │                                             │
 │  Integration — you proved you remember it.  │
 │                                             │
 │  ┌────────────────────┐                     │
 │  │  Pending: 3 -> 2   │  <- Counter anim.  │
 │  └────────────────────┘                     │
 │                                             │
 │  "One less thing on your mind."             │
 │                                             │
 │  2 checks left this week —                  │
 │  you're ahead.                  <- Seed     │
 │                                             │
 │  [ Done for today ]                         │
 │  [ Clear one more ]   <- only if energy     │
 │                          >= Good (4) AND    │
 │                          pendingChecks >= 1 │
 └─────────────────────────────────────────────┘
```

### Scenario B — 24h reminder set

```
 ┌─────────────────────────────────────────────┐
 │                                             │
 │  Good session.                              │
 │                                             │
 │  Reminder set: Algebra                      │
 │  tomorrow at this time.         <- Seed     │
 │                                             │
 │  [ Done ]                                   │
 │                                             │
 └─────────────────────────────────────────────┘
```

No counter animation — the loop is not closed yet. Tone is neutral.

### Scenario C — Skip (Time)

```
 ┌─────────────────────────────────────────────┐
 │                                             │
 │  Noted. Short day.                          │
 │                                             │
 │  [ Done ]                                   │
 │                                             │
 └─────────────────────────────────────────────┘
```

No Seed after a skip. No counter. No forward-looking signal.
Do not add pressure after a skip.

### Scenario D — Skip (Fatigue)

```
 ┌─────────────────────────────────────────────┐
 │                                             │
 │  Noted. Rest is part of the plan.           │
 │                                             │
 │  [ Done ]                                   │
 │                                             │
 └─────────────────────────────────────────────┘
```

Same pattern as Time skip — warm acknowledgment, no Seed.

### Scenario E — Skip (Confusion)

```
 ┌─────────────────────────────────────────────┐
 │                                             │
 │  That's okay.                               │
 │  Different approach next time.              │
 │                                             │
 │  [ Done ]                                   │
 │                                             │
 └─────────────────────────────────────────────┘
```

Slightly different from the other skips. Acknowledges the confusion, plants a
soft forward reference ("next time") without creating obligation.

### Scenario F — Pending checks hit 0 (milestone)

```
 ┌─────────────────────────────────────────────┐
 │                                             │
 │  checkmark  All clear.                      │
 │                                             │
 │  0 pending checks.                          │
 │  Everything you've studied —                │
 │  you've also proved.                        │
 │                                             │
 │  "That's rare. Keep that."                  │
 │                                             │
 │  [ Done ]                                   │
 │                                             │
 └─────────────────────────────────────────────┘
```

This is a milestone moment. Distinct from normal close. Special copy.
The statement "That's rare" gives it weight without being patronising.
No "Clear one more" button — there is nothing to clear.

### Scenario G — First verification ever (new student, first loop close)

```
 ┌─────────────────────────────────────────────┐
 │                                             │
 │  checkmark  First loop closed.              │
 │                                             │
 │  That's what "closing the loop" means —     │
 │  you studied it AND proved you remember it. │
 │                                             │
 │  ┌────────────────────┐                     │
 │  │  Pending: 1 -> 0   │                     │
 │  └────────────────────┘                     │
 │                                             │
 │  [ Done ]                                   │
 │                                             │
 └─────────────────────────────────────────────┘
```

Special first-time copy that teaches the concept. Only shown once ever.

### Exceptions Outside the 7 Scenarios

There are two Phase 3 moments that happen *before* the 7 verification scenarios apply (see [task-types.md](../systems/task-types.md) for full details):

1. **The Learn close:** Auto-creates a revisit without asking.
   *(Copy: "Done for today. We'll suggest this when it's time to verify.")*
   No bottom Seed text — the Outcome Card acts as the hook. Showing "Topic is waiting for a revisit" would contradict the future-state promise and create false urgency.
2. **First Encounter Override (Practice/Revise):** The student selects Practice or Revise for a topic ELI has never seen. Instead of assuming tracking is wanted, ELI asks for explicit consent.
   *(Copy: "First time practicing this here. Want ELI to schedule a revisit?" → `[Yes, schedule it]` / `[No, skip]`)*

---

## 4. The Counter Mechanic

The counter shows `Pending: [before] -> [after]` only when a check was cleared
during this session.

**Animation:** the number should visually transition from old to new. It should
feel like crossing off a list item — satisfying, not flashy. See [counter-animation.md](counter-animation.md) for the frame-by-frame spec.

**Direction rule:** the count ALWAYS goes DOWN in Phase 3 for verification closures. For Learn sessions (new topic, first session), the counter goes UP — see [counter-animation.md §5](counter-animation.md#5-counter-up--new-loop-opened-learn-sessions).

- If a new pending check is created (student chose "Remind me tomorrow"), the
  increased count is shown in **Phase 1 next time**, not here.

**Milestone:** when pending reaches 0, the counter shows `1 -> 0` with the
milestone treatment (Scenario F copy).

**Counter is NOT shown for:**

| Scenario            | Counter shown? | Reason                        |
|---------------------|----------------|-------------------------------|
| Verification done   | Yes            | A loop was closed             |
| Reminder set        | No             | No loop was closed            |
| Skip (any reason)   | No             | No loop was closed            |
| First verification  | Yes            | First loop closed (teaching)  |
| Pending = 0         | Yes            | Milestone variant             |

---

## 5. The "Clear One More" Button

This optional button creates an immediate re-entry into **Beat 3 (Micro-win)**
of the craving loop.

### Visibility rules

| Condition                                      | Button shown? |
|------------------------------------------------|---------------|
| energy >= Good (4) AND pendingChecks >= 1 AND student just cleared a check | Yes |
| energy <= Okay (3)                             | No            |
| pendingChecks = 0                              | No            |
| Student skipped or deferred                    | No            |

### What it does

Fires a new `IntentSet` for the next pending topic, returning the student to
Phase 2. This creates a mini-loop within the session.

### Why it exists

S7 (ambitious) student types want to keep clearing on high-energy days. This
button channels that ambition productively rather than letting them leave with
unused momentum.

### Hard rule

Never shown after skip or deferral. Do not create pressure on low-energy or
skip sessions. The button is a reward for effort, not a reminder of what
remains.

---

## 6. Forward-Looking Signals (The "Seed")

The Seed plants anticipation for the next session.

| Phase 3 outcome            | Seed copy                                              | Why                                                    |
|----------------------------|--------------------------------------------------------|--------------------------------------------------------|
| Verification completed     | "[X] checks left this week — you're ahead."            | Specific count creates curiosity for next time          |
| 24h reminder set           | "See you tomorrow." / "Tomorrow at this time."         | Time anchor creates mild obligation                     |
| Skip (any reason)          | _(no seed)_                                            | Do not add pressure after a skip                        |
| Pending = 0                | "Everything you've studied, you've also proved."       | Identity statement replaces seed — nothing to anticipate, just to savor |
| First verification ever    | _(no seed — teaching moment is enough)_                | Do not overwhelm the first close                        |

### Seed rules

1. **Exactly one** seed per Phase 3 (never two).
2. Seed must be **specific** (count, topic name, time) — never vague ("keep it up").
3. Seed must feel like **invitation, not obligation**: "when you're ready" not "you still have".
4. Seed is the **last text element** before the CTA button.

---

## 7. Copy Patterns per Mode

The student's Mode at SessionEnd determines copy tone across all scenarios.

| Mode at SessionEnd | Verification copy                                          | Skip copy                                | Seed tone             |
|--------------------|------------------------------------------------------------|------------------------------------------|-----------------------|
| Rescue             | "Loop closed. Good." (short)                               | "Noted." (minimal)                       | Gentle or absent      |
| Neutral            | "Loop closed. [Topic] — you proved you remember it."       | "Noted. [acknowledgment per reason]."    | Specific count        |
| Boost              | "Loop closed. Strong session."                             | (rare — Boost students rarely skip)      | Count + challenge hint |

**Rescue mode** uses the shortest possible copy. Students in Rescue are
fragile — do not over-celebrate or under-acknowledge. Just confirm.

**Boost mode** can afford slightly warmer language because the student is
already engaged. The Seed can hint at challenge ("3 left — could you clear
them all this week?") without crossing into pressure.

---

## 8. Connection to Craving Loop

Phase 3 owns two of the five craving loop beats:

```
Beat 1 (Trigger)     <- Phase 1
Beat 2 (Desire)      <- Phase 1
Beat 3 (Micro-win)   <- Phase 2
Beat 4 (Closure)     <- Phase 3   ** this section **
Beat 5 (Seed)        <- Phase 3   ** this section **
```

### Beat 4 — Closure

The counter drop. The "loop closed" message. The relief of one less pending
item. This is the reward. Without it, the student did effort but received
nothing in return.

**If Beat 4 is missing:** effort without reward. The student feels like the
system takes but does not give back. Trust erodes.

### Beat 5 — Seed

The forward-looking signal that creates anticipation for tomorrow's Beat 1.
This is the hook. It turns a completed session into an incomplete story — the
student knows something is waiting.

**If Beat 5 is missing:** the session feels complete but also final. No reason
to return. The loop ends instead of cycling.

### Both beats together

```
Closure (Beat 4)  +  Seed (Beat 5)  =  Satisfied AND curious
Closure only                        =  Satisfied but done
Seed only                           =  Anxious (unresolved)
Neither                             =  Empty (worst case)
```

Phase 3 must deliver both. The only exception is skip scenarios, where neither
beat fires — and that is intentional. Skips should feel neutral, not like a
broken loop.

---

## How This Connects to Code

```
docs/ei/spec/EI_Protocol_3_Verification.md  ← P3 gate logic (VerificationDecisionIssued)
docs/ei/EI_Engine_Taxonomy.md §5.3          ← verificationDecision output shape
docs/ux/foundations/design-language.md      ← Design tokens (reused here)
        ↓
docs/ux/phase3/                             ← THIS FOLDER: complete Phase 3 spec
        ↓
src/ei/sdui/view-composer.ts               ← composePhase3View() implementation
src/app/sdui/components/loop-closed-card   ← Counter animation component
```

**North star storyboard:** [S4-flowing-but-avoidant.md](../validation/storyboards/S4-flowing-but-avoidant.md) — 20 sessions across 12 days.

**Key cross-references:**
- [task-types.md](../systems/task-types.md) — task type definitions, Phase 3 decision matrix

---

## Deferred

- Institute-facing risk dashboard — separate product surface
- Strategic adjustment screen — deferred (weekly cadence, low priority for v1 student UX)

---

*Phase 3 owns the Closure beat and the Seed beat — the two beats that determine whether the student returns tomorrow.*
