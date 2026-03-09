# Realism Failures Audit

> Moments where ELI is scripted to say or do something the system cannot actually support. Each failure breaks the companion illusion — when students notice ELI claiming to know something it cannot know, or doing something it has no mechanism to do, the trust relationship erodes.

---

## Overview

A companion's credibility depends entirely on the precision of its claims. ELI's design principle is "data before opinion" — every statement should be grounded in what the system actually knows. These failures are places where the storyboards or docs violate that principle, either by scripting ELI to make claims that exceed its data, or by describing product moments that have no implementation path.

| # | Failure | Source | Type |
|---|---|---|---|
| 1 | Content instruction ELI cannot give | S5 Scene 4 | Category confusion — wrong role |
| 2 | Cognitive claim without cognitive data | S7 Scene 3 | Exceeds available signals |
| 3 | Day 15 guardrails with no mechanism | All 3 storyboards | Undesigned feature |
| 4 | Energy × time-of-day pattern claim | Doc 15, storyboards | Exceeds derived signals |
| 5 | Template ceiling on Recognition beat | All storyboards | Unacknowledged design expiration |

---

## 1. Content Instruction ELI Cannot Give

**Source:** `EI_Storyboard_S5_BurnoutRunway_Day1-21.md`, Scene 4

### The exact text

> "Open one page / solve just Q1 / write 3 key points."

This appears under the IntentSet section where ELI frames the tiniest possible study action for a burnout re-entry student (S5) with Energy: Low (2) on Day 4 after a 3-day silence.

### The claim being made

ELI knows what the student should open (a specific page), what problem to start with (Q1), and what kind of output to produce (3 key points). ELI is giving specific content-level instructions for the student's study session.

### What data ELI actually has

From the engine taxonomy, ELI knows at this moment:
- `topic: Trigonometry` (from IntentSet)
- `taskType: Revise` or `Practice` (declared or defaulted)
- `energy: 2` (Low — re-entry session)
- `SilenceDays: 3` (from derived signals)
- `pending_checks` count and age
- `VerificationRate7d`
- Session timestamps

ELI does NOT have:
- The student's textbook or any page reference
- The problem set being used (DPP number, question bank)
- What "Q1" refers to in any resource the student has
- A curriculum map connecting Trigonometry to specific exercises
- Any knowledge of what "3 key points" would be for this topic

### The gap

ELI manages the META of studying: when to study, how long, which topic, in what order. It does not manage the content of studying: which page to open, which problem to solve, what to write. The `firstAction` instruction from `ActivationPlanIssued` is intended to be a study-start nudge — not a tutor instruction.

This is a category confusion: the storyboard wrote what a human elder-brother or tutor would say after sitting with the student and their materials. ELI has access to none of those materials.

### The consequence if left as-is

If implemented as written, ELI would surface these instructions in the Phase 2 activation entry screen. The student would read "Solve just Q1" with no shared understanding of what "Q1" means. The instruction is either:
- Interpreted as generic advice (open your resource, solve the first problem) — in which case "Q1" is noise that makes ELI sound like it knows something it doesn't
- Expected to be specific (this particular Q1 from this particular set) — in which case ELI fails immediately

Either way, the companion illusion cracks the moment the student realizes ELI doesn't actually know what they're studying.

### What ELI can honestly say instead

ELI's legitimate tools in this moment are: the topic name, the task type, a time constraint, and a motion goal. These are sufficient to create the right re-entry instruction:

*"Trigonometry — 5 minutes. Just open it and read for the first 2. That's the whole plan."*

Or: *"Revise just one thing from Trigonometry. Whatever you remember first. 5 minutes."*

The difference: ELI prescribes micro-time and acknowledges what the student knows ("whatever you remember first"). It does not pretend to know the student's textbook.

### The deeper principle

The failure in Scene 4 reveals the correct design constraint for all firstAction instructions:

> ELI prescribes the CONDITIONS of the study session (topic, time, motion threshold). ELI never prescribes the CONTENT (which page, which question, what to write). Once a session starts, what happens inside it belongs to the student and their materials.

This constraint should be added to the `firstAction` design spec.

---

## 2. Cognitive Claim Without Access to Cognitive State

**Source:** `EI_Storyboard_S7_Day1-21.md`, Scene 3

### The exact text

> "You're working hard. But you have 3 pending checks. **That's why recall starts feeling shaky.**"

This appears when ELI confronts S7 (Ambitious Collector) about accumulating pending checks on Day 4.

### The claim being made

ELI asserts that it can observe a causal relationship between the student's pending checks and an internal cognitive state ("recall starts feeling shaky"). ELI is claiming to know that the student's recall is degrading — and specifically, to know the cause.

### What data ELI actually has

ELI knows:
- `pending_checks: 3` (behavioral fact)
- `VerificationRate7d ≈ 0.30` (verification rate is low — implied by the scene context)
- Session history: the student has been studying but deferring verification repeatedly

ELI does NOT have:
- Any measure of the student's recall quality
- Evidence that this specific student's recall is "feeling shaky" vs. intact
- Access to any cognitive state measurement (no recall self-report, no quiz performance data)
- Knowledge of whether the student has even noticed any recall degradation

### The gap

"Recall starts feeling shaky" is an assertion about the student's inner experience. ELI is claiming to perceive a cognitive symptom that:
1. It has no data on (the student hasn't reported any recall difficulty)
2. May not even be true yet (pending checks accumulate before recall degrades — the degradation is future risk, not current state)
3. Cannot be distinguished from the student's general anxiety (a student who feels behind will agree that "recall feels shaky" whether or not it actually does)

This is not data before opinion. It is opinion dressed as data.

### Why this matters beyond the single line

The larger problem: ELI is trying to make an important and legitimate point — that studying without verification accumulates a recall debt. This is true and worth saying. But by framing it as an observable cognitive symptom, ELI oversteps.

The moment a student thinks "how does ELI know my recall feels shaky? It can't know that," the trust relationship takes a hit. ELI's credibility depends on students believing its claims are grounded in real data. One false claim about inner state weakens every future data-grounded claim.

### What ELI can honestly say instead

ELI knows the behavioral facts and can name the consequence honestly:

*"3 pending checks. Your verification rate this week is 30% — the lowest it's been. Sessions without closed loops don't stick. That's the risk here."*

Or more simply: *"3 pending checks. If you don't close these loops, you'll have studied but not retained. That's a real gap."*

The honest version is more effective: it is specific (30% verification rate, 3 checks), factual, and names the consequence without fabricating an inner state. Students respond better to evidence than to claimed empathy.

### The pattern to watch for

Every time ELI says something like "you must be feeling..." or "that's why it feels like..." or "I can tell that..." — these are red flags. ELI doesn't feel. It observes behavioral data and names consequences. Anything that implies ELI knows the student's emotional or cognitive state from behavior alone requires scrutiny.

---

## 3. Day 15 Guardrails with No Mechanism

**Source:** All three storyboards — S2 Scene 10, S5 Scene 10, S7 Scene 10

### The exact text

**S2 Scene 10:**
> "ELI sets two plain rules: 'On pressure days, pick a smaller scope.' 'End every session with one tiny check.'"

**S5 Scene 10:**
> "ELI sets two plain rules: 'Sleep first. Keep sessions short.' 'Do one tiny check at the end.'"

**S7 Scene 10:**
> "ELI sets two plain rules for the week: 'Keep pending checks ≤ 2.' 'New topic comes after you clear 1 pending check today.'"

All three storyboards place this moment at Day 15 — two-thirds through the 21-day journey — framed as a weekly coaching output that anchors the student's behaviour going forward.

### The claim being made

By Day 15, ELI has enough data about this specific student to synthesize two personalized behavioural rules and surface them as a card or message. The student sees a concrete, actionable coaching output that reflects what works for them specifically.

### What mechanism would be needed

For this moment to exist in the product, five things need to be true simultaneously:

**1. A trigger that fires at Day 15 (or equivalent milestone)**
"Day 15" is not an engine event. The taxonomy's `StrategicAdjustmentDecision` fires on "scheduled weekly review OR risk-triggered wrap" — but there is no cron definition, no day-count threshold, and no event that schedules this review.

**2. An algorithm that computes personalized rules from session history**
The rules shown are archetype-specific (S2 rules are different from S5 rules from S7 rules). But they appear to be written by the storyboard author who knows the archetype — not output by an algorithm. What algorithm produces "Sleep first. Keep sessions short" from S5's behavioral data? It would require: identifying that sleep has been the strongest predictor of session completion for this student, and that short sessions have higher completion rates than long ones. Neither of these analyses is a defined derived signal.

**3. An SDUI component that displays this coaching output**
There is no "weekly rules card" component in `types/components.ts`. There is no `coaching-insight-card` or `behavioral-anchor-card` in the SDUI registry. This card has no implementation path.

**4. A persistence model for the rules once shown**
Does the card appear once and disappear? Does it stay pinned to Phase 1 until dismissed? Does it re-appear each session for a week? None of this is defined.

**5. A personalisation model for the rules**
Are the two rules per-student (derived from their actual data) or per-archetype (S2 always gets the pressure-scope rule, S5 always gets the sleep-first rule)? If per-archetype, the "personalisation" is fake — every S2 student gets the same rules. If per-student, there needs to be an algorithm that selects which two rules best match this student's specific pattern.

### This is the largest undesigned feature in the storyboards

The Day 15 guardrail moment is presented as a solved design choice. It reads as natural product behaviour. But it requires:
- A weekly synthesis trigger (undefined)
- A rule derivation algorithm (undefined)
- A student-facing SDUI component (nonexistent)
- A persistence model (undefined)
- A personalisation model (undefined)

None of these exist anywhere in any doc. The moment works as a storyboard because storyboards can describe outcomes without specifying mechanisms. It does not work as a product feature.

### What this reveals about the product vision

The Day 15 guardrails moment is actually a hint at a powerful and valuable product feature: ELI surfaces behavioural insights it has derived from the student's data and presents them as a coaching frame for the coming week. This is genuinely what a smart study companion should do.

The problem is not that the vision is wrong — it is that the vision has been mistaken for a designed feature. Before this can be built, the entire mechanism needs to be designed: the `StrategicAdjustmentDecision` delivery path needs to produce a student-facing card, the rule derivation algorithm needs to be specified, and the SDUI component needs to exist.

---

## 4. Energy × Time-of-Day Pattern Claim

**Source:** `docs/ux/systems/chat-companion.md` §4 and §8, various storyboard scenes

### The exact text

From doc 15:
> "Your completed sessions tend to cluster around 7–10pm."
> "When you pick Good (4), you tend to complete and verify in the same session."
> *ELI response (example):* "Given 9 days on Thermodynamics and your energy pattern (usually Good on evenings) — Thermo first..."

From S7 Scene 9 (UI micro-hint):
> "When you pick Sharp (5), you do best with 1 pending check first, then hard work."

From S5 Scene 9 (UI micro-hint):
> "When you pick Okay (3), a short block + 1 check works best."

### The claim being made

ELI can observe correlations between the student's energy state and their study outcomes, and between the time of day they study and their session completion rates. These are not generic statements — they are presented as specific, personalized insights derived from this student's data.

### What data would be needed

To support these claims, ELI would need:
- **Session timestamp × energy tap × session completion** correlation analysis
- A minimum sample size threshold before the correlation is considered valid (a pattern based on 3 sessions is noise; based on 15 sessions might be signal)
- A confidence threshold for surfacing ("usually" implies at least 60-70% of sessions in that energy bucket follow the stated pattern)
- A threshold for time-of-day clustering ("7–10pm" requires enough sessions in that window to establish a cluster vs. noise)
- Separation of correlation from causation (ELI can say "you tend to complete when energy is Good" but not "Good energy causes completion")

### What ELI actually has

From the engine taxonomy §2, the derived signals are:
- `StateTrend7d` — coarse direction (improving/flat/worsening) of state over 7 days
- `VerificationRate7d` — percentage of sessions with verification
- `StartLatencyMin` — time from IntentSet to start
- `SilenceDays` — days since last event
- Session timestamps (captured in events but not defined as a derived pattern signal)

What is NOT in the taxonomy:
- Any `energyTimePattern` signal
- Any `energyCompletionCorrelation` signal
- Any session clustering analysis
- Any minimum-sample threshold before pattern claims become valid
- Any personalisation data layer for "this student's patterns" vs. general defaults

### The gap

The chat companion is designed to surface genuinely personalized insights drawn from the student's own data. This is exactly what the Recognition beat needs — ELI feeling like it "knows" the student. But the signals that would support these insights don't exist in the derived signals inventory.

There are two possible interpretations:

**Interpretation A (generous):** These signals were always intended to exist — the taxonomy just hasn't documented them yet. The implementation would add `energyTimePattern`, `sessionClusteringHour`, `energyCompletionRate` as derived signals.

**Interpretation B (literal):** The chat doc was written with the storyboard author's knowledge of the archetype, not the system's actual capabilities. "Your energy is usually Good on evenings" is true for S7 (by design) but ELI can only know this if it has analyzed session history with the right queries.

Either way, the gap must be named: the signals that make ELI's personalization claims credible do not currently exist in the taxonomy.

### The minimum viable version

The lowest-effort honest version of these claims: ELI surfaces what it actually knows without correlation analysis.

Instead of: *"Your energy pattern is usually Good on evenings"*
ELI could say: *"4 of your last 7 sessions happened in the evening"* — this only requires counting session timestamps by time-of-day bucket, which is computationally trivial.

Instead of: *"When you pick Good (4), you tend to complete"*
ELI could say: *"Your last 3 sessions at Good energy all had verified closures"* — specific, small-N, not claiming a general pattern.

The distinction: small-N observations vs. pattern claims. ELI can make the former honestly; the latter requires the pattern analysis infrastructure.

---

## 5. Template Ceiling on the Recognition Beat

**Source:** All three storyboards (Days 1–21); `docs/ux/foundations/craving-loop.md` §Beat 2

### The exact text

From `01-craving-loop.md`:
> "The template ceiling is real: the current greeting system has a finite number of state combinations × topic references × microcopy variations. By Day 8–10, a consistent user will have seen every meaningful variation."
> "The long-term solution is AI-generated greetings from student data — not a richer template library."

This is an internal acknowledgement that the template approach expires. The storyboards, however, present 21-day journeys as if ELI's responses naturally deepen and personalise throughout the entire arc — without acknowledging that the mechanism for this deepening is undefined.

### The implicit claim in the storyboards

S2, S5, and S7 each show ELI becoming more specific, more contextually aware, and more personalized as the days progress. By Day 15-21, ELI's outputs feel nothing like Day 1 — they reference specific behavioral patterns, accumulated history, and individualised nudges.

But the storyboard author is producing this deepening by knowing the archetype. ELI's increasing specificity in Days 10-21 is written as if ELI has developed a relationship with this specific student — but the mechanism for generating that specificity is not designed.

### The actual state of the system

Template-based greetings can reference:
- Current energy state
- Topic name
- Pending check count
- Session count (general)
- Silence days

This gives enough variation for roughly 8-12 distinct greeting scenarios. A student who sessions daily will exhaust meaningful variation within 10-14 days.

After this point, one of two things happens:
1. **AI-generated greetings replace templates** — ELI uses actual student data to compose a unique opening for each session. This requires a prompt-based generation system, signal selection logic, output constraints, and a fallback path. None of this is specced.
2. **Students notice the repetition** — The "feels like it knows me" quality degrades. The Recognition beat weakens. Without Recognition, the craving loop loses one of its five formation conditions.

### Why this is a realism failure and not just a gap

The craving loop doc acknowledges the ceiling. The storyboards do not. A reader who uses the storyboards as a product reference (which they are designed to be) would design 21-day journeys as if personalisation deepens naturally. They would not know they need to design an AI generation system because the storyboards don't show the seam where templates end and generation must begin.

The storyboards present Days 1–21 as a continuous arc of deepening relationship. But Days 1–10 are template-deliverable, and Days 11–21 require a different system that does not yet exist.

### The three options at the ceiling

**Option A: Accept a lower ceiling.** Design the template library to be as rich as possible, accept that personalisation plateaus around Day 10, and count on the chat companion (doc 15) to provide the relationship depth the templates can't. Students who want more ELI interaction can get it through chat.

**Option B: Specify AI generation.** Define what signals go into greeting generation, what output constraints apply, and what the fallback is. This requires a proper spec and an architecture decision about generation timing and cost.

**Option C: Hybrid.** Templates for the first 10 days, AI generation after Day 10, with a graceful transition that doesn't feel like a change in ELI's voice.

None of these options is currently chosen or specced. The storyboards implicitly pretend Option C is already working.

### The knock-on effect on storyboards as product references

If a designer reads S7 Days 11-21 and attempts to reproduce ELI's specificity through template design, they will either:
- Build an increasingly complex template library that still runs out of variation
- Or realize mid-implementation that the storyboard's Day 15-21 ELI behaviour cannot be delivered with templates and is missing its real mechanism

The storyboards need to clearly mark where the template system ends and where AI generation must begin.
