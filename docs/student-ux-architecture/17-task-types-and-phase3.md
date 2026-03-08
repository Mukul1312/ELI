# Task Types and Phase 3 — The Complete Decision System

> Task type is the single input that determines what Phase 3 shows after every session. This doc defines the three task types, how ELI auto-suggests them, how Phase 3 adapts to each, and why the blurry lines between them do not break the system.

---

## What this doc covers

`07-phase3-the-close.md` defines the seven Phase 3 scenarios (A–G) — verification completed, reminder set, skip variants, milestone, first-ever. That doc answers "what does Phase 3 look like?" This doc answers the question that comes before: **"how does ELI know which Phase 3 to show?"**

The answer: topic state × task type. Together they produce the Phase 3 decision.

Related docs:
- [07-phase3-the-close.md](07-phase3-the-close.md) — Phase 3 screen spec (scenarios A–G, counter mechanics, Seed rules)
- [16-formation-period.md](16-formation-period.md) — Formation period, session definition, first-encounter behaviour
- [06-phase2-the-session.md](06-phase2-the-session.md) — Active session, context bar
- [01-craving-loop.md](01-craving-loop.md) — Closure beat and Seed beat

---

## Why task types exist

ELI needs to know one thing after every session: **should it open a loop, close a loop, or let the student decide?**

The student's activity determines this. But ELI cannot observe what the student does off-app — it only knows what the student declared before studying. The task type is that declaration.

Without task types, Phase 3 would need to ask the same generic question every time ("What happened?"). With task types, Phase 3 already knows the shape of the session and can ask the right question — or skip the question entirely.

---

## The three task types

### Learn

**What the student means:** "I'm studying this topic for the first time."

**Concrete JEE examples:**
- Opening the Electrostatics chapter in HC Verma for the first time
- Watching a lecture on Organic Chemistry mechanisms they haven't seen before
- Reading about Thermodynamics laws from coaching notes after today's class
- Starting a new chapter in any subject

**What ELI knows:** This topic is new (or the student is declaring it as new). There is nothing to verify — the student just studied it. Retention hasn't been tested yet.

**Phase 3 consequence:** Auto-create a revisit. No question needed. The student will come back later to check if it stuck.

---

### Practice

**What the student means:** "I'm doing problems on a topic I already know."

**Concrete JEE examples:**
- Solving DPP (Daily Practice Problems) on Electrostatics
- Working through previous year JEE questions on Integration
- Doing NCERT back-exercises on Chemical Bonding
- Attempting a mock test section on Mechanics
- Solving numericals from coaching worksheet

**What ELI knows:** The student is actively engaging with a known topic. Problem-solving tests application skill, but doing problems correctly does not guarantee the student will remember the underlying concepts next week.

**Phase 3 consequence:** Depends on whether the topic has an open revisit. If yes — natural verification opportunity. If no — optional, the student can choose to track or skip.

---

### Revise

**What the student means:** "I'm reviewing something I already studied to check if I still remember it."

**Concrete JEE examples:**
- Re-reading notes on Organic Chemistry before tomorrow's test
- Going through highlighted formulas for Thermodynamics
- Reviewing flashcards or summary sheets
- Re-watching a lecture to refresh a concept that's fading
- Flipping through a chapter to see if the concepts still feel solid

**What ELI knows:** The student is intentionally checking their own retention. This is the closest thing to a self-administered test. The student's own assessment of "did it stick?" is meaningful here because the entire purpose of their session was to find out.

**Phase 3 consequence:** Always ask "did it stick?" — the student's answer is the retention signal.

---

## The real difference: Practice vs. Revise

This is where the blurry line lives. A student doing problems on Electrostatics and a student re-reading Electrostatics notes — both are engaging with a known topic. Why distinguish them?

**Practice is about doing. Revise is about checking.**

| | Practice | Revise |
|---|---|---|
| **Student's intent** | "I want to work on this" | "I want to see if I still know this" |
| **Primary activity** | Solving problems, doing exercises | Re-reading, reviewing, scanning notes |
| **Tests retention?** | Indirectly — problems test application, not always recall | Directly — the whole point is "do I remember?" |
| **Phase 3 without a revisit** | "Track a revisit?" (optional — routine practice may not need tracking) | "Did it stick?" (always asked — retention check is the purpose) |
| **Phase 3 with a revisit** | "Did it stick?" (same as Revise) | "Did it stick?" (same as Practice) |

**The last row is the key insight:** When a revisit exists, Practice and Revise produce the same Phase 3. The distinction only matters when there is no open revisit — and in that case, the difference is appropriate:

- Practice without a revisit = routine problem-solving. The student may not need ELI to track this. Offer, don't require.
- Revise without a revisit = intentional retention check. The student came here specifically to see if they remember. Always ask.

---

## ELI auto-suggests based on topic state

The student should not stare at three options and wonder which to pick. ELI already knows the topic's state. It pre-selects the most likely task type. The student can override with a single tap.

### Auto-suggestion rules

| Topic state | What ELI shows | Default selected | Why |
|---|---|---|---|
| **New to ELI** (first encounter) | `[Learn ✓]  [Practice]  [Revise]` | Learn | Topic is new — learning is the expected activity |
| **Known, has open revisit** | `[Practice]  [Revise ✓]` | Revise | An open revisit exists — the student is likely here to check retention |
| **Known, no open revisit** | `[Practice ✓]  [Revise]` | Practice | No open obligation — routine practice is the expected activity |

### Learn disappears for known topics

If ELI already tracks Electrostatics (the student has at least one prior session on it), Learn is no longer a valid choice. The student isn't learning Electrostatics for the first time — they're either practicing or revising. Showing Learn for a known topic would be confusing.

This cuts the choice from 3 options to 2 for the majority of sessions. Less cognitive load, faster flow.

### Override scenarios

The auto-suggestion is a default, not a lock. The student can override:

| Scenario | Auto-suggestion | Student overrides to | Why |
|---|---|---|---|
| New topic, but student studied it at coaching before ELI | Learn | **Practice** or **Revise** | Topic is new to ELI but not new to the student |
| Open revisit exists, but student wants to do problems (not check retention) | Revise | **Practice** | Student's intent is problem-solving, not retention checking |
| No open revisit, but student specifically came to check if they still remember | Practice | **Revise** | Student's intent is retention checking, even though no revisit is open |

Overrides are a single tap. The default handles the common case; the override handles the edge case. Most sessions use the default.

---

## The complete Phase 3 decision matrix

Phase 3 is driven by two inputs: **topic state** (what ELI knows) and **task type** (what the student declared). Together they produce the screen.

### New topic (first encounter in ELI)

| Task type | Phase 3 screen | Options | Outcome |
|---|---|---|---|
| **Learn** | "Done for today. Come back to it in a couple of days to see if it stuck." | None (automatic) | Revisit auto-created |
| **Practice** (override) | "First time practicing this here. Want ELI to schedule a revisit?" | **[Yes, schedule it]** / **[No, skip]** | Yes → revisit created, tracking begins. No → session logged, no tracking |
| **Revise** (override) | "First time revising this here. Want ELI to schedule a revisit?" | **[Yes, schedule it]** / **[No, skip]** | Yes → revisit created, tracking begins. No → session logged, no tracking |

### Known topic with open revisit

| Task type | Phase 3 screen | Options | Outcome |
|---|---|---|---|
| **Practice** | "Did it stick?" | **[Yes, it stuck]** / **[Not yet]** | Yes → Closure fires, revisit closes. Not yet → revisit stays open |
| **Revise** | "Did it stick?" | **[I retained it]** / **[Needs another look]** | Retained → Closure fires, revisit closes. Needs look → revisit stays open |

**These two rows produce the same experience.** The wording of the buttons differs slightly, but the question and the outcomes are identical. This is why misclassifying between Practice and Revise is harmless when a revisit exists.

### Known topic with no open revisit

| Task type | Phase 3 screen | Options | Outcome |
|---|---|---|---|
| **Practice** | "Track a revisit?" | **[Add revisit]** / **[Skip]** | Add → revisit created. Skip → session logged, no obligation |
| **Revise** | "Did it stick?" | **[I retained it]** / **[Needs another look]** | Retained → verified, no revisit. Needs look → revisit created |

**These two rows are meaningfully different.** Practice is lighter — just offers optional tracking. Revise always asks the retention question. This is the only scenario where the task type choice produces a different Phase 3 experience.

---

## What happens when the student picks "wrong"

Task type is a **soft signal, not a contract**. The system is designed to be resilient to misclassification.

### Student revises but picks Practice

**If revisit exists:** Phase 3 asks "Did it stick?" → **Same result as Revise.** No harm.

**If no revisit:** Phase 3 asks "Track a revisit?" → Student says yes or no. The experience is slightly lighter than Revise's retention question, but the outcome (revisit created or not) is functionally equivalent. The student isn't penalised for the "wrong" pick.

### Student practices but picks Revise

Phase 3 asks "Did it stick?" → The question feels slightly off for pure problem-solving ("I was just doing DPP, not checking retention"), but the student can answer honestly. "Retained" = they feel solid. "Needs another look" = they don't. Either way, the system records a valid signal.

### Student picks Learn for a topic they already know (Coaching vs. Learn)

This can only happen on first encounter (Learn is hidden for known topics). When a student learned a topic at coaching and comes home to practice, ELI defaults to `[Learn ✓]` because it's the first encounter in ELI. 

If the student leaves it as `Learn`, the outcome is: revisit auto-created, topic enters ELI tracking. This is perfectly fine — ELI begins tracking it.

If the student overrides to `[Practice]`, the **First Encounter Override** prompt appears: *"First time practicing this here. Want ELI to schedule a revisit?"* This respects the student's reality (they are practicing, not learning) without ELI making assumptions about where they learned it. They can give explicit consent to track it (`[Yes, schedule it]`) or just log a one-off session (`[No, skip]`). This prevents the system from forcing tracking on a topic they might just be doing a one-off practice for.

### The resilience principle

No misclassification produces a broken state. The worst case is a slightly off-tone Phase 3 question. The outcomes always converge to a valid loop state (revisit created, revisit closed, or session logged).

This is intentional design. If misclassification could break the loop, the task type input would be a high-stakes decision — which would make it stressful, which would increase checkin friction, which would reduce session starts. A forgiving system is a system students use.

---

## Mixed sessions

A real 45-minute study block often mixes activities: 20 minutes reading notes (Revise), then 25 minutes solving problems (Practice). The student picks one task type for the whole session.

**Rule: pick the primary activity.** If the session was mostly problems, pick Practice. If the session was mostly reviewing, pick Revise. "Mostly" is the student's own judgement — ELI does not need precision here.

Why this works:
- Phase 3 with a revisit → same experience regardless of Practice or Revise
- Phase 3 without a revisit → slightly different, but both are valid
- The student's overall sense of "did I mostly do problems or mostly review?" is reliable enough for ELI's purposes

If mixed sessions become the norm for a student, the task type becomes less meaningful over time. This is acceptable — the topic state (revisit open or not) increasingly drives Phase 3, and the task type becomes a confirmatory signal rather than the primary driver.

---

## How task types connect to Phase 3 scenarios (doc 07)

Doc `07-phase3-the-close.md` defines seven scenarios (A–G). Here is how task types map to them:

| Scenario | What it is | Which task types trigger it |
|---|---|---|
| **A: Verification completed** | Loop closed, counter drops | Practice (with revisit, "Yes") or Revise ("Retained") |
| **B: 24h reminder set** | Defer verification to tomorrow | Any task type — reminder is a deferral mechanism |
| **C: Skip (Time)** | Student ran out of time | Any task type |
| **D: Skip (Fatigue)** | Student is too tired | Any task type |
| **E: Skip (Confusion)** | Student is stuck/confused | Any task type |
| **F: All checks cleared (milestone)** | Last revisit closed, count hits 0 | Practice or Revise that closes the final revisit |
| **G: First-ever verification** | Student's first loop closure ever | Practice or Revise on first-ever revisit close |

**Missing from doc 07:** The Learn path (auto-create revisit) and the Practice-without-revisit path (offer tracking). These are not "scenarios" in doc 07's framework because they don't involve verification decisions. They are simpler Phase 3 moments that happen before the student has enough revisits for scenarios A–G to apply.

### The Learn close

Learn sessions produce a Phase 3 that doc 07 doesn't cover. It sits outside the 7 scenarios because it has no verification decision:

- Outcome card: "Done for today. We'll suggest this when it's time to verify."
- Counter: Shows revisit count going UP (`2 → 3`). Exception to doc 07's "counter always goes down" rule — but this is Phase 3 for Learn, not for verification. The counter going up is honest: you studied something new, your revisit list grew.
- Seed: None. The Outcome card ("We'll suggest this when it's time to verify") handles the forward-looking expectation. No secondary seed is shown to avoid false urgency.
- CTA: "Done" only. No "Clear one more" — Learn sessions don't close loops.

### The Practice-without-revisit close

Also not in doc 07's 7 scenarios. Similar to the Learn close, but with a choice:

- Outcome card: "Practice session logged."
- Offer: "Track a revisit?" [Add revisit] / [Skip]
- Counter: Only shows if student adds a revisit (count goes up by 1).
- Seed: If revisit added, the revisit is the seed. If skipped, minimal seed ("Session logged. See you next time.")
- CTA: "Done" only.

---

## Task type in other screens

### Phase 1 — confirmation strip

After the student picks a topic and task type, Phase 1 shows a confirmation strip before the session starts:

```
Electrostatics · Practice · Normal
```

(Topic · Task type · Scope, if scope picker is active from session 3+)

### Phase 2 — context bar

During the active session, the context bar at the top shows the declared intent:

```
Electrostatics · Practice
```

This anchors the student to what they said they'd do. It's especially useful for students who tend to drift between activities mid-session.

### Phase 3 — outcome card

The task type determines the outcome card copy:
- Learn → "Done for today..."
- Practice → "Practice done..." or "Did it stick?" (if revisit exists)
- Revise → "Revision done. Did it stick?"

The task type word appears in the Phase 3 copy so the student sees continuity from Phase 1 through Phase 3.

---

## Edge cases

### Student changes topic mid-session

If the student switches topic during Phase 2 (new IntentSet fires), the original session's state is preserved. Phase 3 fires for the original topic with the original task type. The new topic starts a new session cycle.

### Student opens app but doesn't start a session

AppOpen without IntentSet = no session started. No task type was declared. Phase 3 does not fire. The session count does not increment.

### Student wants to verify without studying first

Student opens app, sees "Electrostatics — revisit waiting for 5 days," and wants to close it without a full study session. They pick Electrostatics → Revise → study for 2 minutes (or immediately tap "Done") → Phase 3: "Did it stick?" → [Retained] → Closure fires.

This is a valid and healthy pattern. Quick verification sessions that close revisits without a long study block are encouraged — they reduce debt and fire the Closure beat.

### Multiple revisits on the same topic

A topic can accumulate multiple revisits if the student keeps picking Learn on different sub-aspects, or if they say "Needs another look" repeatedly. Phase 3 closes one revisit at a time. The counter drops by 1, not by all.

### Topic has a revisit but student picks Learn (first encounter only)

This cannot happen for known topics because Learn is hidden. For first-encounter topics, this is the normal path — Learn auto-creates the first revisit.

---

## Summary

| Principle | Detail |
|---|---|
| **Three task types** | Learn (new), Practice (problems), Revise (retention check) |
| **ELI auto-suggests** | Based on topic state: new → Learn, revisit open → Revise, no revisit → Practice |
| **Learn hidden for known topics** | Reduces choice to 2 for most sessions |
| **Phase 3 = topic state × task type** | Both inputs together determine the screen |
| **Convergence** | Practice and Revise produce the same Phase 3 when a revisit exists |
| **Soft signal** | Misclassification never breaks the loop; outcomes always converge |
| **Mixed sessions** | Pick the primary activity; the system is forgiving |
| **Engine term stays** | `pendingCheck` in code; "Revisit" in student-facing copy |

---

*Phase 3 screen spec: [07-phase3-the-close.md](07-phase3-the-close.md)*
*Formation period and first encounters: [16-formation-period.md](16-formation-period.md)*
*Active session: [06-phase2-the-session.md](06-phase2-the-session.md)*
*Craving loop mechanics: [01-craving-loop.md](01-craving-loop.md)*
