# Silence Detection and Re-Entry — How ELI Reads Absence

> Silence is a calendar event. But what it means depends on where the student is in their journey, what happened before the silence, and how long it lasted. This doc defines the two-clock model, silence duration tiers, formation-aware interpretation, and the V1 differentiation strategy.

---

## What this doc covers

The existing SILENCE_RE_ENTRY variant treats all silence identically: `SilenceDays >= 2` triggers the same re-entry greeting regardless of cause. This doc replaces that flat rule with a structured model:

- The two-clock model (sessions vs. calendar time)
- Silence duration tiers (2–3 / 4–6 / 7+ days)
- Formation-aware interpretation (how session count modifies silence meaning)
- Pre-silence context signals (what ELI can observe before the gap)
- Weekend pattern exemption
- Priority ordering with other Phase 1 variants
- What's not V1 (planned absences, mock correlation)
- Edge cases

Related docs:
- [01-craving-loop.md](01-craving-loop.md) — Loop formation period; silence during formation vs. established loop
- [16-formation-period.md](16-formation-period.md) — Sessions 1–7 design; session-vs-day unit model
- [05-phase1-the-open.md](05-phase1-the-open.md) — Phase 1 variants including SILENCE_RE_ENTRY (V1)
- [15-chat-companion.md](15-chat-companion.md) — Chat layer for deeper silence conversations
- `docs/product-audit/03-engine-gaps.md` — V3 trigger signals (avoidancePattern, recentMockFailure)

---

## The two-clock model

ELI runs two clocks simultaneously. They measure different things and answer different questions.

| Clock | What it measures | Unit | Examples |
|---|---|---|---|
| **Session counter** | Progression — how much ELI knows about the student, what features unlock, what claims ELI can make | Sessions completed | Formation stage (1–7), pattern claim tiers, scope picker appearance (session 3+), topic recommendation (session 5+) |
| **Calendar time** | Decay — how stale knowledge is, how urgent action is, whether the student is drifting | Calendar days | Revisit age, silence duration, `topicRecencyDays`, weekend gaps, `StateTrend7d` |

These clocks are complementary, not competing:

- **"Can ELI say this?"** → session counter (enough data points for the pattern claim tier?)
- **"Is this revisit rotting?"** → calendar days (retention decay is biological, not session-based)
- **"Is this student drifting?"** → calendar days (absence is measured in real time)
- **"What stage is the student in?"** → session counter (formation vs. established)

### The interaction rule

**Session count is context for interpreting calendar events.**

A 3-day silence at Session 4 means something fundamentally different from a 3-day silence at Session 20. The calendar event is the same. The interpretation differs because ELI has different amounts of data at each stage.

---

## Why silence needs differentiation

Re-entry moments are the highest-stakes interactions in the product. A student returning after absence is deciding whether to come back. Getting the tone wrong — treating a weekend trip like burnout, or treating genuine burnout with a chirpy "welcome back!" — is the moment students think "ELI doesn't actually know me."

Silence has radically different causes:

| Silence cause | Student's likely state | Right ELI response |
|---|---|---|
| Scheduled break (weekend, holiday) | Rested, ready | Normal greeting, no re-entry treatment |
| Post-mock silence | Anxious, ashamed | Gentle acknowledgment, tiny win |
| Burnout (energy depleted over time) | Exhausted, hopeless | Maximum warmth, minimum ask |
| Avoidance (opened app, closed it) | Guilty, stuck | Name the pattern, smallest possible step |
| Illness or family event | Irrelevant to study | Don't reference it; just resume |

The current one-size-fits-all re-entry is safe but not loving. The V1 design differentiates using signals ELI already has — no new data inputs required.

---

## Silence duration tiers

Three tiers based on `SilenceDays` (calendar days since last completed session).

### Tier 1: Short silence (2–3 days)

**What it likely is:** Weekend, busy day, minor break, irregular schedule.

**ELI's response:** Light touch. No re-entry ceremony. Greeting acknowledges the gap without dramatizing it.

**Greeting tone:** "Pick up where you left off." References last session topic if continuation is relevant (per topic recommendation algorithm in doc 18). Does not reference the gap explicitly unless the student's established pattern is daily.

**Scope:** Normal. No scope reduction.

### Tier 2: Medium silence (4–6 days)

**What it likely is:** Drift, avoidance beginning, life event, loss of momentum.

**ELI's response:** Gentle re-entry. Acknowledges the gap briefly. Reduces scope expectation.

**Greeting tone:** "It's been a few days. One small session." References oldest open revisit if one exists — gives the student a specific, achievable target rather than an open-ended "what do you want to study?"

**Scope:** Reduced. If time commitment is active (session 3+), ELI pre-selects the shortest bucket (~15 min). If not active, ELI internally scopes to 5 minutes.

### Tier 3: Long silence (7+ days)

**What it likely is:** Burnout, significant life event, app abandonment risk.

**ELI's response:** Full SILENCE_RE_ENTRY. Maximum ease, minimum ask. The entire goal is one completed session — the content and duration are irrelevant.

**Greeting tone:** "Today is not a comeback story. It's a 5-minute win." No mention of pending revisits count (debt feels overwhelming after a week). No pattern claims (ELI's data is stale). Just one tiny step.

**Scope:** Minimum. Time is hidden, fixed at 5 minutes internally (per existing V1 spec). Student can always go longer — the 5-minute frame is an entry ramp, not a ceiling.

---

## Formation-aware interpretation

The duration tiers above apply differently depending on whether the student is in formation (Sessions 1–7) or has an established pattern (Sessions 8+).

### During formation (Sessions 1–7)

ELI doesn't know the student's natural rhythm yet. A student who did 3 sessions on Day 1 and then nothing for 2 days might be a weekend-only user. Triggering re-entry treatment during formation is premature — ELI is pattern-matching against a pattern it hasn't observed.

| Duration | Formation behaviour |
|---|---|
| **2–3 days** | **No re-entry treatment.** Normal greeting. Student may just not be daily yet. ELI has no baseline to call this "silence." |
| **4–6 days** | **Light nudge only.** "Been a few days — want to pick up?" No pattern claims. No reference to what changed. ELI genuinely does not know. |
| **7+ days** | **Gentle re-entry.** This student is at risk of never forming the loop. But the re-entry cannot reference patterns or history (not enough data). Keep it simple: "Start with one session. That's it." |

**Key principle:** During formation, ELI should never imply it knows the student's rhythm, because it doesn't. "Welcome back" after a 2-day gap on Session 3 sounds presumptuous — the student may not consider this a "return" at all.

### After formation (Sessions 8+)

ELI has a baseline. It knows the student's typical session frequency, energy patterns, and topic engagement. Calendar gaps are now meaningful deviations from observed pattern.

| Duration | Established behaviour |
|---|---|
| **2–3 days** | **Light re-entry** if this breaks their established pattern (e.g., student was daily for 2 weeks). **Normal greeting** if this fits their pattern (e.g., student never uses app on weekends). |
| **4–6 days** | **Mid re-entry.** ELI can reference pre-silence context: "Your last session was Thermodynamics. 2 revisits waiting." Specific and actionable. |
| **7+ days** | **Full SILENCE_RE_ENTRY.** ELI has enough data to personalize but should not overwhelm. One line of context max, then the minimum ask. |

**Key principle:** After formation, ELI has earned the right to notice the gap. "It's been a week" is a statement of fact from a companion who was paying attention — not a guilt trip.

---

## Pre-silence context signals (V1)

Duration alone is a blunt instrument. ELI can sharpen it by looking at what happened *before* the silence started. Three signals are available without new data inputs.

### 1. Pre-silence energy trend

**Signal:** Was the student's energy declining in the 3–5 sessions before silence?

**How to compute:** Compare energy taps from the last 3–5 sessions before the gap. If 3+ consecutive sessions had energy trending downward (e.g., 4 → 3 → 2), this is a burnout signature.

**Effect:** If energy was declining, shift the interpretation one tier more serious. A 3-day silence with declining energy is treated like Tier 2, not Tier 1. A 5-day silence with declining energy is treated like Tier 3.

**What ELI does NOT say:** "Your energy was dropping before you left." This is a surveillance claim. ELI uses the signal for tone and scope adjustment, not for explicit commentary.

### 2. Pre-silence session frequency

**Signal:** Was the student's session frequency declining before silence?

**How to compute:** Compare sessions-per-week in the week before silence vs. the week before that. If frequency dropped by 50%+ (e.g., 5 sessions/week → 2 sessions/week), the silence was preceded by gradual disengagement — not a sudden event.

**Effect:** Gradual disengagement → re-entry should be even gentler. The student was already pulling away. Hard re-engagement framing ("Let's get back on track!") will push them further.

**Availability:** Only meaningful after Session 8+ (need two weeks of data).

### 3. Last session outcome

**Signal:** How did the last session before silence end?

**Scenarios:**
- Last session ended with a failed verification ("didn't stick") → silence may be frustration-driven. Re-entry should not reference the failed topic first.
- Last session ended normally → silence is not obviously session-triggered.
- Last session was very short (< 5 minutes actual duration) → student may have been already low-energy. Treat like declining energy trend.

**Effect:** If last session was a failed verification, do not recommend the same topic as the re-entry target. Surface a different topic or let the student choose freely.

---

## Weekend pattern exemption

### The problem

A student who never uses ELI on weekends will trigger `SilenceDays >= 2` every Monday. This is not silence — it's a routine gap. Treating every Monday as a re-entry degrades trust.

### Detection

**Signal:** `hasWeekendPattern(student)` — derived from session history.

**Rule:** If a student has completed 3+ weeks of sessions AND has zero weekend sessions in those weeks, they have a weekend pattern. Saturday–Sunday gaps do not increment toward silence tiers.

**Implementation:** When computing `SilenceDays`, exclude weekend days for students with `hasWeekendPattern = true`. A student whose last session was Friday and who opens on Monday has `SilenceDays = 0`, not `SilenceDays = 2`.

### What this does NOT cover

Holiday patterns (Diwali week, exam breaks) are not predictable from session history alone. These remain false positives in V1. The planned absence feature (future, not V1) would solve this.

---

## Priority ordering with other Phase 1 variants

When multiple conditions are true simultaneously, the most specific context wins.

### Priority stack (highest to lowest)

| Priority | Condition | Variant | Rationale |
|---|---|---|---|
| **1** | `recentMockFailure` active (future signal) | V3 (HIGH_PRESSURE) | Mock failure is the most specific known cause. V3 can absorb the re-entry: "You're back. The mock is just data. 5 minutes on anything." |
| **2** | `avoidancePattern` detected (future signal) | Avoidance-specific re-entry | Open-and-close without studying is more specific than a calendar gap. "You've opened the app 3 times without starting. What's getting in the way?" |
| **3** | `SilenceDays` triggers a duration tier | SILENCE_RE_ENTRY (tiered) | Calendar gap with no known specific cause. Use duration tier + pre-silence context. |
| **4** | No silence, no triggers | Normal variant | Standard greeting per session stage. |

### Compound conditions

**V3 + silence:** V3 takes priority. The greeting references the trigger (mock failure), and the 5-minute scope implicitly handles the re-entry. ELI does not say "Welcome back AND your mock was tough" — it picks the most specific frame.

**Avoidance + silence:** Avoidance takes priority. The student wasn't truly absent — they were opening the app and leaving. This is more specific and more actionable than duration-based re-entry.

**Declining energy + silence:** Not a separate variant. Declining energy modifies the tier severity (shifts one tier up), but the variant is still SILENCE_RE_ENTRY.

---

## What's not V1

### Planned absences

A "taking a break" student action would eliminate false-positive silence detection. The student tells ELI "I'm off for 3 days" → ELI waits without counting silence days → re-entry is normal.

**Why not V1:** Adds UI surface (new action type, new input) for an edge case. Weekend pattern exemption handles the most common predictable gap. Remaining false positives (holidays, family events) are annoying but not trust-breaking — a slightly-too-warm Monday greeting is recoverable.

**Future consideration:** If retention data shows that false-positive re-entries correlate with churn, planned absences move to V2.

### Mock failure correlation

Detecting that a mock happened 48 hours before silence requires `recentMockFailure` — an engine gap documented in `03-engine-gaps.md`. When this signal exists, it feeds into the priority stack at Position 1.

### Avoidance pattern detection

Detecting open-and-close without session start requires `avoidancePattern` — another engine gap. When this signal exists, it feeds into the priority stack at Position 2.

Until these signals exist, ELI uses duration tiers + pre-silence context as the best available differentiation.

---

## The re-entry greeting (per tier)

### Tier 1 (2–3 days, established student)

Light. References what's actionable, not the gap.

- "Thermodynamics — you were mid-chapter." (continuation from doc 18)
- "2 revisits. Electrostatics is oldest." (topic recommendation)
- No explicit mention of absence unless the student was previously daily.

### Tier 2 (4–6 days)

Acknowledges the gap. Offers a small step.

- "It's been a few days. Electrostatics has a revisit from last week — start there?"
- "One session today. That's the whole plan."
- Scope pre-set to ~15 min or shortest bucket.

### Tier 3 (7+ days)

Maximum warmth, minimum ask. No debt, no pressure.

- "Today is not a comeback story. It's a 5-minute win."
- "Pick anything. 5 minutes. That's it."
- No revisit count shown. No pattern claims. No "you've been away for X days."
- Time hidden, fixed at 5 minutes internally.

### Formation student (any duration)

No pattern claims. No "welcome back" framing (student may not consider it a return).

- Sessions 1–7, 2–3 day gap: Normal greeting. No acknowledgment of gap.
- Sessions 1–7, 4–6 day gap: "Want to pick up? One session."
- Sessions 1–7, 7+ day gap: "Start with one session. That's it." Simple, no history reference.

---

## Signals summary

### Existing (no new signals needed for V1)

| Signal | Source | Used for |
|---|---|---|
| `SilenceDays` | Calendar days since last SessionEnd | Duration tier assignment |
| `totalSessionCount` | Count of all completed sessions | Formation vs. established classification |
| Energy history (last 3–5 taps) | Session event history | Pre-silence energy trend |
| Session frequency (sessions per week) | Session event history | Pre-silence frequency decline |
| Last session outcome | Most recent SessionEnd event | Failed verification detection |
| Weekend session history | Session timestamps | `hasWeekendPattern` derivation |

### Future (engine gaps, not V1)

| Signal | What it enables | Gap reference |
|---|---|---|
| `avoidancePattern` | Open-and-close detection → Position 2 in priority stack | `03-engine-gaps.md` §1 |
| `recentMockFailure` | Post-mock silence detection → Position 1 in priority stack | `03-engine-gaps.md` §1 |
| `examProximityDays` | Exam-adjacent silence differentiation | `03-engine-gaps.md` §1 |
| Planned absence action | Eliminate false-positive silence for declared breaks | Not yet documented |

---

## Edge cases

### Student opens app twice in one day after 5-day silence

First open: Tier 2 re-entry greeting. After the session completes, `SilenceDays` resets to 0. Second open (same day): Normal same-day re-entry (per doc 16 same-day re-entry rules). No second re-entry greeting.

### Student's first session was 10 days ago, only 2 sessions total

`totalSessionCount = 2`, `SilenceDays = 8`. This is a formation student (Session 3) with a long gap. Formation rules apply — Tier 3 greeting but without pattern claims: "Start with one session. That's it." Not "Welcome back after 8 days" — ELI has barely met this student.

### Student has weekend pattern but goes silent on a Wednesday

Weekend exemption does not apply. Wednesday silence counts normally. `SilenceDays` increments from Wednesday onward.

### Student was daily for 3 weeks, then silent for 3 days

This is an established student (Session 20+) with a Tier 1 gap that breaks their pattern. ELI can note it lightly: "Been a couple of days. 3 revisits waiting — Thermodynamics is oldest." The gap is short but unusual for this student.

### Energy was declining AND last session was a failed verification AND 5-day silence

Multiple pre-silence signals compound. Energy decline shifts Tier 2 → Tier 3 severity. Failed verification means do not recommend the failed topic. Greeting: "One session. Pick anything you want. 5 minutes." Maximum ease, student chooses the topic (not ELI), minimum scope.

---

## Summary

| Principle | Detail |
|---|---|
| **Two clocks** | Session counter (progression) + calendar time (decay). Complementary, not competing. |
| **Session count = context** | Formation (1–7) interprets silence conservatively. Established (8+) interprets it against baseline. |
| **Three duration tiers** | 2–3 days (light), 4–6 days (gentle), 7+ days (full re-entry) |
| **Pre-silence signals sharpen tiers** | Energy trend, frequency decline, last session outcome — all from existing data |
| **Weekend exemption** | Students with `hasWeekendPattern` skip Saturday–Sunday in SilenceDays count |
| **Most specific context wins** | V3 (mock) > avoidance pattern > duration tier > normal |
| **No surveillance claims** | ELI uses pre-silence data for tone, never tells the student "your energy was dropping" |
| **Formation students get less** | No re-entry treatment for 2–3 day gaps. No pattern references. Simple language. |

---

*Loop mechanics: [01-craving-loop.md](01-craving-loop.md)*
*Formation period: [16-formation-period.md](16-formation-period.md)*
*Phase 1 variants: [05-phase1-the-open.md](05-phase1-the-open.md)*
*Topic recommendation: [18-topic-recommendation.md](18-topic-recommendation.md)*
*Engine gaps (future signals): `docs/product-audit/03-engine-gaps.md`*
