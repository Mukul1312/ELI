# Lovable Product Gaps

> Entire experience categories that no current document addresses. These are not bugs in existing specs — they are missing specs entirely. A product without these designed cannot develop the craving loop past Day 7, cannot sustain student retention, and cannot deliver on the "elder brother who knows you" promise.

---

## Overview

The existing documentation correctly describes the mechanics of what ELI does (routing, verification, scope negotiation). It does not describe the full arc of what it feels like to use ELI for 21 days. The gaps below are the difference between a product that students use and a product that students crave.

| # | Gap | Loop Beat affected | Risk if undesigned | Resolution status |
|---|---|---|---|---|
| 1 | Day 1–7 formation period | All beats (formation window) | Loop never forms — students leave in Week 1 | **RESOLVED** → [16-formation-period.md](../student-ux-architecture/16-formation-period.md) |
| 2 | Topic recommendation intelligence | Anticipation (Beat 1) | ELI feels arbitrary — trust erodes | **RESOLVED** → [18-topic-recommendation.md](../student-ux-architecture/18-topic-recommendation.md) |
| 3 | ELI greeting generation at scale | Recognition (Beat 2) | Craving loop expires at Day 10 | **MITIGATED** — pattern claim tiers extend template useful life; AI generation deferred |
| 4 | Emotional event detection | Rescue (Beat 3), Closure (Beat 4) | Re-entry experience is one-size-fits-all | **RESOLVED** → [19-silence-and-reentry.md](../student-ux-architecture/19-silence-and-reentry.md) |
| 5 | Success criteria that measure product love | — | We optimise for the wrong signals | **RESOLVED** → [20-success-criteria.md](../student-ux-architecture/20-success-criteria.md) |
| 6 | The ELI relationship arc over 21 days | All beats | No arc = no deepening = loop stays shallow | **RESOLVED** → [21-relationship-arc.md](../student-ux-architecture/21-relationship-arc.md) |

---

## 1. Day 1–7 Formation Period Experience

### What the gap is

`docs/student-ux-architecture/01-craving-loop.md` explicitly defines Days 1–7 as a formation period where the craving loop is not yet circular. Anticipation (Beat 1) does not function — students haven't developed the "I wonder what ELI has for me" pull yet. Recognition (Beat 2) is shallow because ELI has minimal data.

But no document designs what the first seven days actually look like. Every storyboard starts mid-journey with students who already have session history, pending checks, and behavioural patterns. Day 1 is a blank slate with no spec.

### What ELI actually knows on each day

| Day | ELI knows |
|---|---|
| Day 1 | Energy: whatever they tap. Sleep if first of day. Topic they chose. Nothing else. |
| Day 2 | 1 session history. Possibly 1 pending check or 1 verified closure. Energy from yesterday. |
| Day 3–4 | 2-3 sessions. Starting to see if the student consistently defers verification. Energy pattern across 2 days. |
| Day 5–6 | Enough sessions to detect a pattern (energy level tends to be X, sessions happen in the evening, verification rate is Y). |
| Day 7 | One week of data. Can start making session-level claims ("you've done 5 sessions this week"). |

The product behaviour for Days 1–4 has almost no design. ELI opening with "What's your energy?" and routing to Phase 1 based on session history it doesn't have yet — this needs explicit design.

### Why it matters for product love

The critical retention window is Days 3–7. If students don't return after Day 1, the loop never forms. If they return but feel like ELI isn't getting smarter or more relevant, they stop by Day 5. The storyboards only show the loop working — they don't show how it bootstraps.

A first-time user on Day 1 sees:
- No pending checks (the pending counter starts at zero, which feels irrelevant)
- No session history for ELI to reference
- No pattern for ELI to have noticed
- The greeting must be warm but cannot be specific

The ONBOARDING greeting variant exists (`resume-context-card` variant: `ONBOARDING`) but has no deep spec. What does ELI say to a student who has never used the app before? "Let's get started" is too generic. "I'm ELI — I'll help you manage the meta of your studying, not the content" is too formal. The elder-brother tone for a complete stranger is different from the elder-brother tone after two weeks.

### Questions that need answering before design

1. **Day 1 greeting**: What is the right opening when ELI knows nothing? What does the elder-brother tone look like without data to reference?
2. **When does ELI start citing history?** Day 2 (after 1 session)? Day 3? Is there a minimum session count before ELI references past data?
3. **What does the Phase 1 screen look like with zero pending checks?** The pending items list is empty. The session summary footer has no data. What fills these spaces?
4. **Is there a Day 7 milestone?** The formation period ending should feel like something — the first time ELI says "you've been at this for a week, here's what I've noticed." Is this designed? Where?
5. **What is the onboarding journey for topic setup?** A brand-new student has no topics added. Do they add topics before their first session? During? Is there a syllabus import? This is completely unspecced.

### Resolution

**RESOLVED** by [16-formation-period.md](../student-ux-architecture/16-formation-period.md). All five questions answered:
1. Session 1 greeting designed (purposeful but not warm — warmth comes from data)
2. Session 2 (memory-based greeting); Session 5+ (pattern claims, Tier 2 minimum)
3. Phase 1 with zero pending: show topic search directly, no pending list
4. Session 7 = week-level observations (Tier 2+ claims available)
5. Topic setup via [14-topic-selection-system.md](../student-ux-architecture/14-topic-selection-system.md) — recent chips, type-ahead, browse tree

---

## 2. Topic Recommendation Intelligence

### What the gap is

ELI's most valuable daily action is telling students what to study. The storyboards show ELI making specific recommendations ("Thermodynamics hasn't been touched in 9 days") — but the algorithm that generates these recommendations has never been designed.

See `03-engine-gaps.md` §6 for the data contract gap. This section addresses the product design gap: what should the ordering algorithm actually do?

### Why it matters for product love

The Anticipation beat ("I wonder what ELI has for me today") depends on students trusting that ELI's recommendation is the right one. If the recommendation is wrong or feels arbitrary, students start ignoring it. If they ignore ELI's recommendations consistently, the app becomes a session logger, not a companion.

"What should I study today?" is the question every JEE/NEET student struggles with. The answer requires weighing recency, urgency, energy, exam proximity, and personal pattern. A student who asks this question every morning and finds ELI has a consistently good answer will open the app every morning — not because of a habit loop, but because ELI is genuinely useful.

### The competing signals and how they conflict

**When signals agree**, the recommendation is easy:
- Topic with 9-day gap + pending check + upcoming exam = strong recommendation

**When signals conflict**, the algorithm needs a decision rule:
- High-urgency topic (9-day gap, pending check) vs. continuation (student just started something yesterday and is mid-way)
- Pending check clearance vs. new topic student is excited about
- Hardest topic first (optimal for learning) vs. easiest topic first (optimal for starting when energy is low)
- What the student keeps picking vs. what ELI thinks they should pick

### Questions that need answering before design

1. **What is the primary ordering criterion?** Oldest pending check? Most overdue topic? Or is it energy-dependent (different recommendation for Sharp vs. Low energy)?
2. **How does ELI handle the "student keeps avoiding this topic" signal?** If a student has Organic Chemistry as the oldest pending check but consistently picks something else, does ELI keep surfacing Organic Chemistry or eventually infer that the student is avoiding it and needs a different approach?
3. **How does ELI show its reasoning?** The storyboards show ELI explaining ("9 days on Thermodynamics"). Is this always shown, or only in chat? Does the Phase 1 screen show the reasoning for the recommendation?
4. **What if the student disagrees?** The Phase 1 "pending items list" allows students to tap a different topic. When a student consistently rejects ELI's recommendation in favour of their own choice, does ELI learn from this? Or does it keep recommending the same way?
5. **Is there a concept of a "study plan" that ELI uses as a frame?** Or is every recommendation purely reactive (based on recency and urgency with no forward planning)?

### Resolution

**RESOLVED** by [18-topic-recommendation.md](../student-ux-architecture/18-topic-recommendation.md). All five questions answered:
1. Primary ordering: 4-level priority stack (overdue revisit 5+ days → continuation → youngest revisit → free pick)
2. Avoidance detection: 3+ skips in 7 days → stop pushing in Phase 1, surface in chat
3. Reasoning shown as one-line label below recommended topic in pending list
4. Student override always allowed; system observes but doesn't block
5. No study plan — purely reactive with per-topic signal weighting. Energy-adjusted ordering within each tier.

---

## 3. ELI Greeting Generation at Scale

### What the gap is

Template-based greetings run out of meaningful variation around Day 8–10 for a student who sessions daily. After this point, without AI-generated greetings, the Recognition beat degrades.

The craving loop doc acknowledges this ceiling. The solution (AI-generated greetings from student data) is named but not specced. There is no:
- Definition of what signals go into generation
- Output constraints (length, tone rules, what ELI can and cannot reference)
- Minimum data threshold before generation is attempted
- Fallback path when signals are thin or contradictory
- Architecture decision (prompt-based? template-with-slots hybrid?)

### Why it matters for product love

Recognition is the beat where students feel "ELI knows me." It is the most emotionally resonant part of the interaction — the moment before the session starts where ELI demonstrates it has been paying attention.

For the first 10 days, well-crafted templates can deliver this. But "4 sessions this week, 2 loops closed, Thermodynamics: 9 days untouched — what's on your mind?" on Day 21 is only meaningful if ELI composed it from real data about this specific student. A template that says "X sessions, Y loops closed, [topic]: Z days untouched" is trivially distinct from a genuine observation — students notice the pattern by Day 15.

The difference between a product students recommend to their friends and one they quietly stop using is often the Recognition beat. The template version feels like a form populated with their data. The generated version feels like ELI noticed something.

### Questions that need answering before design

1. **What signals should go into greeting generation?** The chat companion doc lists 10 data points ELI can reference. Should the opening greeting use all of them? Or only the 2-3 most salient for this session?
2. **What are the generation constraints?** The microcopy rules for ELI (max 3 sentences, no exclamation marks, data before opinion, never starts with "Hi!") apply. But what else? Can the greeting reference a specific date ("since Tuesday")? A specific count ("71% verification rate")? Can it express concern without stating cognitive states?
3. **When should generation activate?** Day 1: use onboarding template. Day 7: use standard templates. Day 10: switch to generation? Or is there a data sufficiency test (minimum 5 sessions, minimum 2 energy patterns observed)?
4. **What is the fallback?** If generation fails or data is insufficient, which template fires? Should there be a graceful degradation path?
5. **Architecture decision**: Is this a prompt sent to the Claude API at session open time? A pre-generated cache? A real-time call? This is an engineering constraint that affects latency, cost, and reliability.

### Resolution

**MITIGATED** — not fully resolved. Pattern claim tiers ([16-formation-period.md](../student-ux-architecture/16-formation-period.md)) extend template useful life by multiplying combinations (data slots × tier-gated language × variant). The [usable-to-lovable roadmap](05-usable-to-lovable-roadmap.md) categorizes AI-generated greetings as "Maybe Never" — template greetings with data slots ("3 loops closed this week") might never feel stale if the data changes every session. AI generation deferred beyond Session 20+. If students at Session 20+ report recognition fatigue, this becomes a Tier 3 feature.

---

## 4. Emotional Event Detection Gap

### What the gap is

The engine detects `SilenceDays >= 2` but treats all silence identically. A student returning after 3 days of silence gets the same re-entry experience regardless of why they were silent.

But silence has radically different causes with radically different appropriate responses:

| Silence cause | Student's likely state | Right ELI response |
|---|---|---|
| Scheduled break (weekend, holiday) | Rested, ready | Energized re-entry, normal session |
| Post-mock silence (avoiding bad result) | Anxious, ashamed | Gentle acknowledgment, tiny win |
| Burnout (energy depleted over weeks) | Exhausted, hopeless | Maximum warmth, minimum ask |
| Avoidance (opened app, closed it, repeated) | Guilty, stuck | Name the pattern, offer the smallest possible step |
| Illness or family event | Irrelevant to study | Don't reference it; just resume |

The current design routes all of these to the same re-entry greeting: "Welcome back. Today is not a comeback story. It's a 5-minute win." This is correct for burnout and avoidance. It is unnecessary for a scheduled break. It might feel odd for a student who was sick.

### Why it matters for product love

Re-entry moments are the highest-stakes interactions in the product. They are the moments when students most need ELI to feel intelligent and caring. Getting re-entry wrong — treating a student who had a weekend trip like they're in burnout, or treating a genuinely burned-out student with a chirpy "welcome back!" — is the moment students think "ELI doesn't actually know me."

The current one-size-fits-all re-entry experience is safe but not loving. A lovable product would differentiate.

### What signal differentiation would require

**Post-mock silence:**
- Requires `recentMockFailure` detection (gap documented in `03-engine-gaps.md`)
- If a mock event occurred in the 48h before silence started, re-entry can be framed around the result

**Burnout vs. situational silence:**
- Energy trend before silence: was energy declining for 5+ days before the student went quiet? (burnout signature)
- Avoidance pattern before silence: did the student open-and-close multiple times without starting? (`avoidancePattern` signal from `03-engine-gaps.md`)
- Length of silence: 2-day silence vs. 7-day silence have different urgency

**Scheduled break:**
- This is hard to detect without exam dates or explicit student input ("I'm taking the weekend off")
- One proxy: if the student has a consistent weekend gap pattern, 2-day weekend silence should not trigger re-entry mode

### Questions that need answering before design

1. Should students be able to signal planned absences? ("I'm taking 3 days off for Diwali" → ELI waits without counting silence days, re-entry is normal). This would require a new student action but would eliminate false-positive burnout detections.
2. What is the minimum differentiation ELI should make? Even without sophisticated detection, can the re-entry greeting vary between "2-day silence" and "7-day silence" as a proxy for severity?
3. Should the avoidance pattern (opened-and-closed without studying) be surfaced in re-entry? "You've opened the app 3 times in the last 2 days without starting. What's getting in the way?" This is more specific and more honest than "Welcome back."
4. How does the re-entry experience connect to the trigger-based pressure greeting (V3)? If `recentMockFailure` is active AND `SilenceDays >= 2`, do both fire? Or does V3 take priority?

### Resolution

**RESOLVED** by [19-silence-and-reentry.md](../student-ux-architecture/19-silence-and-reentry.md). Key design decisions:
- **Two-clock model:** Sessions measure progression, calendar time measures decay — distinct dimensions, not interchangeable
- **Three duration tiers:** Tier 1 (2–3 days, light touch), Tier 2 (4–6 days, reduced scope), Tier 3 (7+ days, maximum ease)
- **Formation-aware interpretation:** Formation students (Sessions 1–7) get gentler treatment, no pattern claims
- **Pre-silence context signals:** Energy trend, session frequency decline, last session outcome — inform tier interpretation
- **Weekend pattern exemption:** Students with consistent weekend gaps get Saturday–Sunday excluded from SilenceDays
- **Priority ordering:** V3 (mock) > avoidance pattern > duration tier > normal — answers question 4 directly

Remaining gap: Planned absences feature not designed (student saying "I'm off for Diwali"). The [roadmap](05-usable-to-lovable-roadmap.md) categorizes full emotional event cause detection as "Maybe Never" — simple duration tiers may be sufficient.

---

## 5. Success Criteria That Measure Product Love

### What the gap is

The current success criteria (`ux-design-brief.md §10`) measure engineering performance and UI completion:

| Current criterion | What it actually measures |
|---|---|
| AppOpen completion time < 10 seconds | Form speed |
| Student accepts ELI's scope reframe | Compliance with ELI's recommendation |
| Student picks one of 3 options at SessionEnd | UI completion (didn't abandon) |
| Pending checks ≤ 2 over 21 days | Behavioural outcome (actually good) |
| Student doesn't feel "watched" | Trust perception (good, but unmeasurable) |
| Mentor identifies 3 at-risk students in < 2 min | Institute usability (not student love) |

None of these measure whether students want to come back. None measure whether ELI improved their studying. None measure whether the craving loop formed.

### What lovable product metrics look like

| Metric | What it measures | Target |
|---|---|---|
| **D7 retention** | Does the student return on Day 7? Critical formation period gate | > 60% of onboarded students |
| **D14 retention** | Does the craving loop hold past the template ceiling? | > 45% of D7 students |
| **D21 retention** | Did the loop fully form? | > 35% of D14 students |
| **Verification rate trend over 21 days** | Does ELI actually improve behaviour, or just record it? | Upward trend for >60% of active students |
| **Honest skip rate vs. silent exits** | Skip-with-reason = healthy; closed app without choosing = trust failure | Silent exit rate < 10% of sessions |
| **Chat open rate after Day 7** | Is the relationship developing beyond transactional gate interactions? | > 30% of sessions with chat usage by Day 21 |
| **Pending check velocity** | Does the student's debt go down over 21 days? | Net negative (more closed than created) by Day 14 |
| **V3 trigger → session start conversion** | Does the HIGH_PRESSURE flow get students studying, or do they leave? | > 50% of "A bit shaken" → session start |
| **ELI recommendation acceptance rate** | Does the student follow ELI's topic recommendation? | > 60% acceptance |
| **"Feel known" perception** | Does the student feel ELI understands them? | Qualitative; tested in user research |

### The broader principle

The current success criteria measure whether the product works. Lovable product criteria measure whether students want to use it. These are different questions.

A student who completes AppOpen in 8 seconds, accepts ELI's scope reframe, and picks "Remind me tomorrow" at SessionEnd has met all current success criteria. But if they don't return the next day, the product has failed.

Designing for D7 retention looks different from designing for AppOpen speed. It means prioritising the experiences that create the pull to return — Anticipation, Recognition, and Closure — over the friction metrics that measure in-session compliance.

### Resolution

**RESOLVED** by [20-success-criteria.md](../student-ux-architecture/20-success-criteria.md). Comprehensive metrics framework:
- **Launchable (Day 1):** S7/S14/S21 retention gates, session milestones, loop closure rate, verification rate trend, completion rate, scope accuracy, recommendation acceptance, re-entry success
- **Signal-dependent (future):** Silent exit rate, V3 conversion, chat engagement, "feel known" perception
- **Checkpoint metrics:** Day 7/14/21 thresholds with warning signals
- **What NOT to measure:** AppOpen speed, number of topics, total session count, scope compliance, streaks

---

## 6. The ELI Relationship Arc Over 21 Days

### What the gap is

The craving loop says the loop "deepens" over time. The storyboards show ELI becoming more specific. But no document answers the fundamental question: **what changes in the product between Day 1 and Day 21?**

Day 1 ELI and Day 21 ELI are described as the same entity, with the same interface, producing the same type of outputs. The difference in quality is entirely attributed to "more data" — but data by itself doesn't produce a richer experience. Product design produces a richer experience.

### What a relationship arc would look like

A relationship between a student and a companion deepens when:
1. The companion references shared history
2. The companion stops asking things it already knows
3. The companion notices patterns and names them unprompted
4. The companion starts anticipating rather than just responding

Translating this to ELI:

| Day range | What ELI does that creates relationship depth |
|---|---|
| Days 1–3 | Learns the basics — energy pattern, topic area. Asks everything because it knows nothing. |
| Days 4–7 | Stops asking sleep every day (remembers it from yesterday). Starts referencing 2-day patterns. "You've had low energy two evenings in a row." |
| Days 8–14 | Stops repeating the same type of scope guidance. ELI's suggestions feel more tailored. Chat companion becomes meaningful (enough history to reference). |
| Days 15–21 | ELI knows what works for this student specifically. "You do better with short blocks. You close loops when energy is Good. You avoid Organic Chemistry." These are earned observations. |

The Day 15 guardrails moment (however it ends up being designed — see `02-realism-failures.md` §3 and `03-engine-gaps.md` §4) is the most obvious manifestation of this arc. ELI synthesizing what it has learned and surfacing it is the most visible "relationship deepening" moment in the product.

### What changes are needed per phase

**Phase 1 changes over time:**
- Days 1–3: Greeting is generic but warm (no data to reference)
- Days 4–10: Greeting starts referencing session history ("your third session this week")
- Days 10+: Greeting references specific patterns ("you tend to close loops when you start with Okay energy")
- The Phase 1 view itself — does it change? Do more components appear as history accumulates? Or does it always look the same?

**Checkin changes over time:**
- Days 1–3: All fields shown (ELI needs all inputs)
- Days 7+: Energy is still asked, but ELI might show "you've been Good (4) three days in a row" before the student taps — pre-filling with a confirmation ask instead of a blank slate
- This is called "progressive personalisation" — the form becomes smarter as data accumulates, not more complex

**Chat companion changes over time:**
- Days 1–6: Chat available but thin (ELI can't say much because it doesn't know much)
- Days 7+: Chat becomes genuinely useful — ELI can reference patterns, correlations, and named observations
- The chat opening message evolves from generic ("Welcome. What's on your mind?") to specific ("4 sessions this week. 2 loops closed. Thermodynamics: 9 days untouched.")

### Questions that need answering before design

1. **Does the UI visibly change as the relationship deepens?** Or does the deepening happen only in ELI's copy, with the layout staying constant? Both have merit: visible UI evolution signals progress; consistent UI reduces learning curve.
2. **Is there an explicit "ELI knows you now" moment?** After enough sessions, does ELI surface something like "After [N] sessions, here's what I've noticed about how you study best"? Or is deepening always implicit?
3. **What is the "minimum history required" for each type of observation?** Before ELI can say "you do better in evenings," it needs N sessions with timestamps. Before it can say "your verification rate has improved," it needs enough sessions to show a trend. These thresholds affect when the relationship arc starts feeling real.
4. **Does ELI ever ask the student to confirm a pattern it has inferred?** "I've noticed you tend to study better in the evenings — is that right?" This would make the inference explicit and the student feels heard. Or does ELI just state patterns as observed facts?
5. **What is the ELI arc for students who session irregularly (1-2 times per week)?** The 21-day arc assumes near-daily use. For students who use the app less frequently, Day 21 equivalent in session count might be Day 45 or 60. Does the arc scale with sessions rather than calendar days?

### Resolution

**RESOLVED** by [21-relationship-arc.md](../student-ux-architecture/21-relationship-arc.md). Key design decisions:
- **Session-by-session capability map:** Sessions 1–2 (Stranger) → 3–4 (Acquaintance) → 5–7 (Early Trust) → 8–10 (Established) → 11–20 (Deepening) → 20+ (Companion)
- **Pattern claim tiers** gate what ELI can say at each stage (Tier 1–4 with minimum data thresholds)
- **Checkin evolution:** Observation line appears at Session 5+, tier-gated language
- **Day 15 guardrails SUPERSEDED:** Distributed deepening via pattern tiers + recommendation + identity moments replaces synthesis card
- **Question 5 answered:** Arc scales with **session count**, not calendar days. A student who sessions 2x/week reaches "Established" at ~4 weeks calendar time, not 10 days.
- **Remaining gap:** Template ceiling beyond Session 20+ (AI generation deferred)
