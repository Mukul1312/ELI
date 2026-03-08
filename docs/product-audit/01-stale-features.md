# Stale Features Audit

> Removed design decisions still present verbatim in source documents. If any of these documents were used as implementation references today, the product would include interactions that have been explicitly retired.

---

## Overview

Three student-facing features were removed or replaced between the original UX brief and the current `docs/student-ux-architecture/` specs. Two additional taxonomy mismatches exist independently of these removals.

| # | Stale Feature | Status | Routing Impact |
|---|---|---|---|
| 1 | BacklogPressure as student-tapped input | Removed — replaced by behavioral inference | HIGH — routing condition references ghost value |
| 2 | "More context" toggle → Pressure scale | Removed — replaced by trigger-based binary | LOW — routing logic still valid, collection mechanism changes |
| 3 | DifficultyTier as student pick | Removed from student UI — ELI determines it | MEDIUM — IntentSet payload changes |
| 4 | `taskType` in IntentSet | Moved to AppOpen | MEDIUM — P1 gate loses taskType before it needs it |
| 5 | `timeCommitment` missing from AppOpen | New field not yet added anywhere | HIGH — scope calculation has no input basis |

Each section below documents: what the feature was, why it was removed (the real reasoning, not just "decision changed"), the routing impact, every occurrence with exact quoted text, and open questions that must be answered before a fix can be designed.

---

## 1. BacklogPressure as a Student-Tapped Input

### What it was

A 5-point conditional scale asked at AppOpen, once per day or on "risk days." Presented as chips:
`On track (1)` / `Mostly on track (2)` / `Some pending (3)` / `Behind (4)` / `Drowning (5)`

Intent: give ELI a self-reported sense of the student's perceived backlog weight, which it could use alongside pending check counts to route session tone and scope.

### Why it was removed — the real reasoning

**Self-report habituates on exactly this kind of question.** A student who tapped "Some pending (3)" on Day 5 will tap "Some pending (3)" on Day 14 without re-evaluating — because they remember their last answer, nothing clearly changed since then, and the 5-point scale gives them no anchor to recalibrate against. By Week 2, this scale reads autopilot responses, not genuine assessments. The data degrades precisely as the student's situation becomes more interesting to track.

**The scale is least reliable when it matters most.** The two archetypes most in need of correct backlog routing are S5 (burnout risk) and S7 (ambitious collector):
- S5 students systematically over-report: they are overwhelmed, so everything feels like "Drowning (5)" even when behavioral data shows only 2 pending checks.
- S7 students systematically under-report: acknowledging "Behind (4)" would require confronting the backlog they are actively avoiding. They tap "Some pending (3)" because it feels safer.

The scale is therefore most unreliable for the two archetypes that most depend on it being accurate.

**Behavioral data is more honest than self-report on this specific question.** `pendingChecks + OpenLoops + ScheduleMisses7d` reflects what actually happened — independent of how the student feels about it. The engine knows more about the student's actual backlog state than the student's self-assessment can capture. This is the uncommon case where we should prefer objective data over the student's own report.

### Routing impact

The LOW_ENERGY routing condition in `EI_Engine_Taxonomy.md §3.1` includes:
```
backlogPressure ≥ 4
```
as one of the triggers for Rescue routing. If BacklogPressure is no longer a student input, this condition references a value that will never exist in the AppOpen payload.

Two resolution paths — neither is documented:
1. **Remove condition** and rely on `OpenLoops ≥ 3` as the behavioral equivalent
2. **Replace with a derived signal**: define `computedBacklogLevel ∈ {low, medium, high}` computed from `pendingChecks + OpenLoops + ScheduleMisses7d`, with threshold mapping, and route on that

Similarly, the HIGH_ENERGY routing condition includes `backlogPressure ≤ 3` as a gate condition for Boost eligibility. Same ghost-value problem.

### Every occurrence — exact text

| Document | Section | Exact text |
|---|---|---|
| `EI_Storyboard_S5_BurnoutRunway_Day1-21.md` | Scene 1 | `(Conditional add-on) BacklogPressure: Drowning (5)` |
| `EI_Storyboard_S7_Day1-21.md` | Scene 3 | `(Conditional add-on) ELI asks: BacklogPressure: Some pending (3) (student picks)` |
| `ux-design-brief.md` | §5.1 — What is sometimes asked | `BacklogPressure — how behind the student feels: On track / Mostly on track / Some pending / Behind / Drowning` |
| `ux-design-brief.md` | §6 — BacklogPressure scale table | Full 5-row scale table with labels, numbers, felt sense, and ELI behavior |
| `ux-design-brief.md` | §11 — In Scope (v1) | `All 6 scales as UI components (Energy, Pressure, BacklogPressure, Sleep, TaskType, DifficultyTier)` |
| `EI_Engine_Taxonomy.md` | §1.1 — Student-tapped inputs | `backlogPressure: 1\|2\|3\|4\|5 (optional)` |
| `EI_Engine_Taxonomy.md` | §1.2 — AppOpen event | `AppOpen(energy, pressure(optional), sleepBucket(optional), backlogPressure(optional), openedAt)` |
| `EI_Engine_Taxonomy.md` | §3.1 — LOW_ENERGY condition | `backlogPressure ≥ 4` as a routing trigger |
| `EI_Engine_Taxonomy.md` | §3.1 — HIGH_ENERGY condition | `backlogPressure ≤ 3` as a routing gate |

### Note on S7 Scene 3 specifically

This scene shows ELI actively prompting for BacklogPressure — not just passively receiving it:
> `(Conditional add-on) ELI asks: BacklogPressure: Some pending (3) (student picks)`

This raises a second-order question: was the intent that ELI could ask for BacklogPressure conditionally when behavioral signals suggested it was needed? If so, removing the student-facing input also removes this conditional ask. The replacement (behavioral inference) means ELI never asks — it computes.

### Open questions before removal

1. Does removing `backlogPressure ≥ 4` from LOW_ENERGY routing lose meaningful routing coverage? Is `OpenLoops ≥ 3` a sufficient behavioral substitute, or do we lose the "feels behind but has few pending checks" student state?
2. Should a `computedBacklogLevel` derived signal be formally defined in the taxonomy? What are the thresholds? At what `pendingChecks + OpenLoops + ScheduleMisses7d` combination does this tip into "high"?
3. In S7 Scene 3, ELI's conditional ask was a moment of ELI surfacing its concern. If behavioral inference replaces it, how does ELI communicate to the student that it notices the backlog issue without a self-report prompt? (This connects to the realism failure in doc 02.)

---

## 2. "More Context" Toggle → Pressure Scale

### What it was

An optional "More context" button on the AppOpen checkin screen. Tapping it revealed the Pressure scale:
`Calm (1)` / `Slightly tense (2)` / `Uneasy (3)` / `Very stressed (4)` / `Panicky (5)`

The design intent: students who were stressed could voluntarily disclose without the pressure scale being surfaced to everyone on every session.

### Why it was removed — the real reasoning

**The opt-in mechanism optimised for the wrong thing.** It was designed to protect students who were calm from an unnecessary question. But the students who need pressure routing are not the calm students — they are the panicking ones. The design implicitly assumed: "students who are stressed will recognize they are stressed and choose to disclose." That assumption fails under panic.

**Students in genuine high-pressure states do not stop to tap "More context."** A student who scored badly on a mock, or whose exam is in 6 days, or who has been avoiding the app for 3 days out of guilt — they open the app, feel overwhelmed, and leave. The opt-in toggle captures comfortable disclosure, not necessary disclosure. It is systematically most useful to the students who need it least.

**The toggle creates a perception problem.** An always-visible "More context" button implicitly signals: "ELI would like to know more about you." For students who are already worried about their data reaching the institute, this is a subtle but real friction point.

**The trigger-based replacement is the correct model.** Instead of asking students to self-identify high-pressure states, ELI detects external events (`examProximityDays <= 7`, `avoidancePattern`, `recentMockFailure`) and names the situation first. "Results are in. How are you holding up?" with `[I'm okay, let's work]` / `[A bit shaken]` is the opposite design: ELI notices, ELI names, student confirms or dismisses. This reaches the students the opt-in toggle misses.

### Routing impact

The taxonomy's LOW_ENERGY routing condition `pressure ≥ 4` remains valid. The routing logic itself doesn't change — only the collection mechanism. `pressure: 4` is still the internal representation of a "A bit shaken" response; the P1 gate still uses it to route to HIGH_PRESSURE.

What changes is only the AppOpen payload: `pressure` can no longer be sent by a student tapping the "More context" toggle, because that toggle no longer exists. In V3 trigger scenarios, `pressure: 4` arrives via the trigger-based binary. In non-trigger sessions, `pressure` is null/absent (no disclosure path exists).

### Note on S7 Scene 8 — the edge case

S7 Scene 8 shows an optional pressure disclosure in a routine, non-event scenario:
> `(Optional) student taps "More context": Pressure: Uneasy (3)`

This is not a high-stress event day — it is a time-crunch weeknight where the student has Okay (3) energy. The storyboard shows the student voluntarily disclosing mild pressure during a normal session.

The trigger-based model does not cover this case. `avoidancePattern` and `examProximityDays` and `recentMockFailure` do not fire for a routine time-crunch session. This raises a genuine question: is there any remaining role for optional pressure disclosure in non-event sessions?

The answer depends on whether `Uneasy (3)` changes routing meaningfully. LOW_ENERGY requires `pressure ≥ 4`. Uneasy (3) does not cross that threshold — so disclosing `Uneasy (3)` in a routine session would not change routing at all. The disclosure has no effect. Which suggests: removing the toggle for routine sessions loses nothing from the routing perspective.

### Every occurrence — exact text

| Document | Section | Exact text |
|---|---|---|
| `EI_Storyboard_S2_RevengePlanning_Day1-21.md` | Scene 1 | `(Optional "More context") Pressure: Panicky (5)` |
| `EI_Storyboard_S5_BurnoutRunway_Day1-21.md` | Scene 1 | `(Optional "More context") Pressure: Very stressed (4)` |
| `EI_Storyboard_S7_Day1-21.md` | Scene 8 | `(Optional) student taps "More context": Pressure: Uneasy (3)` |
| `ux-design-brief.md` | §5.1 — Optionally tapped | `"More context" button → reveals Pressure: Calm / Slightly tense / Uneasy / Very stressed / Panicky` |
| `ux-design-brief.md` | §6 — Pressure scale table | Full 5-row table with labels, numbers, felt sense, routing behavior |
| `EI_Engine_Taxonomy.md` | §1.1 — Student-tapped inputs | `pressure: 1\|2\|3\|4\|5 (optional)` |
| `EI_Engine_Taxonomy.md` | §1.2 — AppOpen event | `pressure(optional)` in AppOpen payload |

### Open questions before removal

1. Should the taxonomy distinguish between `pressure` (trigger-collected binary) and `pressure` (student-tapped scale)? Or should both map to the same internal field with different collection mechanisms?
2. In the trigger-based model, what happens when a trigger event exists but the student taps "I'm okay"? Does `pressure` get set to null, or to a low value like 1? The routing implications differ.
3. S7 Scene 8's optional disclosure (Uneasy/3) has no routing effect. Is losing this disclosure acceptable? Or does the data have value for `StateTrend7d` calculation even when it doesn't change routing?

---

## 3. DifficultyTier as a Student Pick

### What it was

A 4-option input at IntentSet: `Easy (1)` / `Medium (2)` / `Hard (3)` / `Advanced (4)`. The student declared how hard they wanted the session to feel. ELI could override (Boost: raise one tier, Rescue: lower one tier), but the student's declaration was the starting point for negotiation.

The UX brief framed it as: *"How hard should this feel today?"* with microcopy: *"Hard = better questions, not more hours."*

### Why it was removed — the real reasoning

**Students systematically misevaluate difficulty.** This is not a UI preference question — it is a capability assessment question. High-energy students (S7, S1) systematically overestimate what they can handle: they pick Hard or Advanced, which contributes to the overscoping that leads to freezing. Anxious students (S2 post-mock, S5 burnout) systematically underestimate: they pick Easy, which ELI overrides anyway, making the self-pick useless while adding an extra tap to the flow.

**Student-selected difficulty creates override friction.** When a student picks Hard (3) and ELI outputs Medium (2), the student experiences ELI as "taking away" something they chose. This is a trust-damaging frame: the student's plan being visibly downgraded by the system. If ELI determines difficulty without the student declaring a preference first, the same routing produces "ELI gave me Medium" instead of "ELI lowered my Hard to Medium." The framing is everything.

**Difficulty is a function of topic history and current state, not preference.** A student doing Thermodynamics for the first time needs Medium difficulty questions. The same student returning to Thermodynamics after a 9-day gap needs Easy retrieval to re-anchor before going harder. The student cannot know this — ELI knows this from session history, pending check age, and `VerificationRate7d`. Asking them to pick is asking them to make a decision with worse information than the system already has.

### Critical note on outputs vs. inputs

Removing DifficultyTier as a student input does NOT remove it from ELI's output. `NegotiatedIntentIssued` still outputs `difficultyTier ∈ { easy, med, hard, advanced }`. ELI still determines difficulty — the student just no longer pre-declares it.

The storyboard pattern of `student picks DifficultyTier: Hard (3) → ELI may lower to Medium` must become `ELI surfaces DifficultyTier: Medium in firstAction text, without student declaring a preference first`.

The open design question: when ELI outputs a difficulty recommendation, does the student see it explicitly? Or is it embedded silently in the firstAction instruction text without labeling?

### Every occurrence — exact text

| Document | Section | Exact text |
|---|---|---|
| `EI_Storyboard_S2_RevengePlanning_Day1-21.md` | Scene 1 | `DifficultyTier: Hard (3)` in IntentSet |
| `EI_Storyboard_S2_RevengePlanning_Day1-21.md` | Scene 4 | `DifficultyTier: Medium (2)` in IntentSet |
| `EI_Storyboard_S2_RevengePlanning_Day1-21.md` | Scene 6 | `DifficultyTier: Hard (3)` in student's attempted IntentSet |
| `EI_Storyboard_S2_RevengePlanning_Day1-21.md` | Scene 8 | `DifficultyTier: Medium (2)` in IntentSet |
| `EI_Storyboard_S2_RevengePlanning_Day1-21.md` | Scene 11 | `DifficultyTier: Hard (3)` when autonomy returns |
| `EI_Storyboard_S5_BurnoutRunway_Day1-21.md` | Scene 1 | `DifficultyTier: Easy (1)` in IntentSet |
| `EI_Storyboard_S5_BurnoutRunway_Day1-21.md` | Scene 11 | `DifficultyTier: Medium (2)` in IntentSet |
| `EI_Storyboard_S7_Day1-21.md` | Scene 1 | `DifficultyTier: Hard (3)` in IntentSet |
| `EI_Storyboard_S7_Day1-21.md` | Scene 2 | `DifficultyTier: Hard (3)` in IntentSet |
| `EI_Storyboard_S7_Day1-21.md` | Scene 3 | `DifficultyTier: Hard (3)` in attempted IntentSet |
| `EI_Storyboard_S7_Day1-21.md` | Scene 7 | `DifficultyTier: Hard (3)` in IntentSet |
| `EI_Storyboard_S7_Day1-21.md` | Scene 11 | `DifficultyTier: Hard (3)` / `Advanced (4)` as autonomy expands |
| `ux-design-brief.md` | §5.2 — IntentSet | `DifficultyTier: Easy (1) / Medium (2) / Hard (3) / Advanced (4)`. Prompt: "How hard should this feel today?" |
| `ux-design-brief.md` | §6 — DifficultyTier scale | Full 4-row table with labels, tiers, anchors, examples |
| `ux-design-brief.md` | §11 — In Scope (v1) | `All 6 scales as UI components` — DifficultyTier listed |
| `EI_Engine_Taxonomy.md` | §1.1 — Student-tapped inputs | `difficultyTier: 1\|2\|3\|4 (optional; only when the user selects difficulty)` |
| `EI_Engine_Taxonomy.md` | §1.2 — IntentSet event | `IntentSet(topic, taskType, scope(optional), difficultyTier(optional), setAt)` |

### The "autonomy returns" storyboard pattern

Scenes 11 in S2 and S7 specifically show DifficultyTier: Hard or Advanced appearing as a signal that the student has earned autonomy. "ELI lets the student pick Hard (3) again" is how these scenes describe the Boost-mode recovery.

If difficulty is no longer student-picked, the autonomy signal must change form. ELI outputting Hard in NegotiatedIntentIssued is the equivalent — but the storyboard narrative ("student earns the right to pick hard again") is a student-facing experience that no longer has a visible moment if difficulty is silent.

### Open questions before removal

1. When ELI outputs a difficulty recommendation in NegotiatedIntentIssued, does the student see it? Options: (a) surfaced as a card ("Today's difficulty: Hard"), (b) embedded in firstAction text only, (c) shown in context bar during Phase 2.
2. The "autonomy returns" narrative: if students no longer pick difficulty, what is the visible signal that ELI is trusting them with harder work? How does the product communicate the Principle 6 autonomy reward without a visible difficulty pick?
3. Does DifficultyTier stay in the IntentSet event shape as an engine-internal field (set by P1 gate output, confirmed by P2 gate)? Or does it disappear from events entirely and live only as a routing parameter?

---

## 4. `taskType` in IntentSet (Should Be in AppOpen)

### What it was

`taskType` is the student's declaration of session intent: `Learn` / `Practice` / `Revise`. The engine taxonomy places it in `IntentSet`:
```
IntentSet(topic, taskType, scope(optional), difficultyTier(optional), setAt)
```

### What changed and why

`docs/student-ux-architecture/05-phase1-the-open.md` moved task type chips to the checkin screen (AppOpen). The rationale: taskType shapes the entire Phase 1 experience — a student declaring "Practice" gets different scope negotiation, different firstAction framing, and different verification defaults than a student declaring "Learn." If taskType is collected only at IntentSet (after topic pick), the P1 gate is composing the Phase 1 view without knowing task type. It then has to re-compose after IntentSet, creating a two-step design problem.

Moving taskType to AppOpen means the P1 gate has all routing inputs before rendering Phase 1.

### The mismatch in detail

The AppOpen event in the taxonomy:
```
AppOpen(energy, pressure(optional), sleepBucket(optional), backlogPressure(optional), openedAt)
```
No `taskType` field.

The IntentSet event still carries `taskType`. This creates a question: if taskType is collected in the checkin (AppOpen-time), does IntentSet also carry it as a confirmation echo? Or does IntentSet drop it entirely, treating it as already-captured?

The NegotiatedIntentIssued output includes `taskType ∈ { learn, practice, revise }` — this is the gate's output recommendation, which is fine regardless of where input collection happens.

### Every occurrence — exact text

| Document | Section | Issue |
|---|---|---|
| `EI_Engine_Taxonomy.md` | §1.2 — IntentSet event | `IntentSet(topic, taskType, scope(optional), difficultyTier(optional), setAt)` — taskType in IntentSet payload |
| `EI_Engine_Taxonomy.md` | §1.2 — AppOpen event | `AppOpen(energy, pressure(optional), sleepBucket(optional), backlogPressure(optional), openedAt)` — no taskType field |
| All storyboards | Throughout | `TaskType: Learn (learn)` / `Practice (practice)` / `Revise (revise)` shown at IntentSet, not at AppOpen |

### Open questions before fix

1. Does IntentSet retain `taskType` as a confirmation (echo of what was declared at AppOpen)? This would be useful for cases where the student changes task type between checkin and topic pick. Or does IntentSet drop it entirely?
2. Does the checkin screen always show task type chips? Or only on certain session types (first-of-day? certain variants)?
3. If taskType is now in AppOpen, does it affect how Phase 1 CTAs render before the student has picked a topic? ("Practice something" vs "Learn something" as a CTA label requires taskType before topic.)

---

## 5. `timeCommitment` Missing from AppOpen

### What it is

`docs/student-ux-architecture/05-phase1-the-open.md` specifies time commitment chips at the checkin screen: 4 options (10 min / 20 min / 45 min / 1h+). The student's declared time is a primary routing input — it directly affects scope calculation, and it shapes ELI's firstAction instruction.

### The gap

The taxonomy's AppOpen event:
```
AppOpen(energy, pressure(optional), sleepBucket(optional), backlogPressure(optional), openedAt)
```
No `timeCommitment` field.

`NegotiatedIntentIssued` outputs `scope` described as "coarse; timebox minutes or question-count" — but scope calculation has no stated input basis. Without `timeCommitment` in AppOpen, how does the P1 gate compute scope? Energy alone is insufficient: a student with Good (4) energy who has 10 minutes needs a radically different scope than a student with Good (4) energy who has 1 hour.

### The V3 and V1 special cases

`docs/student-ux-architecture/05-phase1-the-open.md` documents two variants where time is not student-declared but internally fixed:
- **V3 (HIGH_PRESSURE)**: time hidden from checkin, fixed at 2 min internally
- **V1 (SILENCE_RE_ENTRY)**: time hidden from checkin, fixed at 5 min internally

This "do not ask, set internally" behaviour has no contract in the taxonomy. How does the P1 gate know to use 2 min when it hasn't received a `timeCommitment`? The gate would need either a null-handling rule ("if timeCommitment is absent and variant is V3, use 2 min") or a separate signal that flags the variant before AppOpen completes.

### Every occurrence — exact text

| Document | Section | Issue |
|---|---|---|
| `EI_Engine_Taxonomy.md` | §1.2 — AppOpen event | No `timeCommitment` field |
| `EI_Engine_Taxonomy.md` | §5.1 — NegotiatedIntentIssued | `scope` output field has no stated input basis |
| All storyboards | Throughout | Time commitment never appears in any AppOpen tap notation — implied but not captured |

### Open questions before fix

1. Does `timeCommitment` belong in AppOpen or IntentSet? The case for AppOpen: it is part of "what capacity do I have right now," alongside energy and sleep. The case for IntentSet: it is session-specific planning that depends on topic. The doc 05 decision puts it in the checkin (AppOpen-equivalent), which implies AppOpen.
2. What does ELI do when `timeCommitment = 10 min` but energy is Sharp (5)? Does it honour the declared limit and compress scope, or does it recommend a longer session? (Principle 3: ELI negotiates at the margin — it should not override a declared time limit.)
3. For V3 and V1: should the taxonomy define a special field like `variantOverrideTimeMin` that the P1 gate uses when `timeCommitment` is absent? Or should null handling be defined in the gate logic?
4. Does the student see their declared time commitment reflected anywhere in Phase 1? Or is it purely an input to scope calculation?
