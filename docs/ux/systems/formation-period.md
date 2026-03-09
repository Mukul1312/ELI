# Formation Period — Session 1 to First Full Loop

> The craving loop is not circular from the start. This doc designs what the product looks like during the formation period: before Anticipation exists, before revisits accumulate, before ELI has enough data to observe patterns. Every decision here directly determines whether students return past Day 3.

---

## What this doc covers

`craving-loop.md` defines the loop and acknowledges a formation period exists. `escalation-arc.md` covers how ELI evolves across 21 days. This doc fills the gap between them: the specific mechanics, screen states, and ELI behaviour for a student's first 7 sessions, before the loop is self-sustaining.

---

## The unit: sessions, not calendar days

The craving loop uses "Day N" language throughout. This is a simplification that breaks for real students.

**Why calendar days fail as the primary unit:**
- A student who does 3 sessions on Day 1 has more data than a student who does 1 session/day for 3 days — their loop forms faster
- A student who sessions once a week hits "Day 7" language after 7 weeks, not 7 days
- Formation is driven by data accumulation, not time passing

**The correct framing:**

| Unit | What it measures | Where it applies |
|---|---|---|
| **Sessions** | ELI's data accumulation, pattern formation, loop strength | Formation milestones ("after 5 sessions, ELI can claim patterns") |
| **Calendar hours/days** | Time between opens, reminder timing, "days ago" labels | Anticipation beat, Seed timing, revisit staleness |

"Day 7" in `09-escalation-arc.md` means "approximately session 7 for a daily student." For a student who sessions twice a day, the loop forms in 3–4 calendar days. Both are correct.

### What one session includes

One session = one complete study-and-close cycle:

1. **Phase 1** — checkin (energy, sleep if first of day), topic + task type declaration
2. **Study** — happens off-app; the student goes and works on their topic
3. **Phase 3** — closure (student returns, taps done; revisit created or closed depending on task type)

Phase 3 may happen in the same app open right after studying, or in the next open (student comes back an hour later to close). Either way it is the same session. **Session count tracks completed cycles, not app opens.**

### Loop state by session

Session 1 is a partial loop — there are no topics to revisit yet, so the Closure beat cannot fire. The full loop first completes at Session 2.

| Session | Loop state | Key moment |
|---|---|---|
| **Session 1** | Partial — no Closure available | First revisit created (Learn → "come back to check if it stuck") |
| **Session 2** | First full loop | First Closure fires — revisit counter drops for the first time |
| **Session 3** | Second full loop | Anticipation is real — student came back because of the open revisit |
| **Session 5+** | Pattern data accumulates | Tier 2 claims become valid; scope picker appears |

---

## Multiple sessions in a single day

A JEE/NEET student may open ELI 2–3 times in a single day — morning to log a coaching session, afternoon for a verification, evening to check status. The craving loop cycles each time. This is healthy: more sessions means faster closure accumulation means faster loop formation.

**What changes when a student has already sessioned today:**

### Same-day re-entry (last session < 6 hours ago)

The Recognition beat must detect the time delta from the last session. A student returning 4 hours after their last close does NOT get a "welcome back" greeting — they were just here.

**Recognition copy for same-day re-entry:**
- "Back again. What's next?" — default, no data recap needed
- "1 revisit still open. Pick up where you left off?" — if a loop was left open from the morning session
- "All clear from this morning. Starting something new?" — if morning session closed its loop

**What does NOT change on same-day re-entry:**
- The Anticipation beat still works — the morning Seed becomes the afternoon pull
- The Closure beat is unchanged — each verification fires its own counter animation
- The Seed beat is unchanged — Phase 3 always leaves a forward hook

### Same-day checkin rules

The gap is computed from `currentTime − lastSessionEndTimestamp`. Each field has its own re-ask logic:

| Gap since last session end | Sleep | Energy | Exam type | Session-week summary |
|---|---|---|---|---|
| **< 2 hours** | Skip — asked at day's first open | Skip — use prior reading | Skip — account-level, never repeated | Skip — shown once per day |
| **2–6 hours** | Skip — asked at day's first open | **Re-ask** — energy may have shifted | Skip | Skip |
| **6+ hours same calendar day** | Skip — asked at day's first open | **Re-ask** — treat as a new segment | Skip | May show again if new data since last display |
| **Next calendar day (overnight)** | **Ask** — new day | **Ask** — fresh reading | Skip | Reset — show again |

Sleep is anchored to the calendar day, not the session. It is asked once at the first app open of each calendar day and skipped on all subsequent opens that day, regardless of gap size.

**What changes on same-day re-entry:**
- Recognition copy is brief and present-tense, not retrospective
- No "this week" summary shown again if it was already shown earlier the same day

### Next-day return (last session > 8 hours ago)

Standard Recognition beat applies. Time delta determines greeting register:
- 8–24 hours: normal return; standard greeting with session reference
- 24–48 hours: slight acknowledgment of the gap ("Yesterday you started Electrostatics — revisit waiting")
- 48+ hours: silence re-entry handling (see `../phase1/00-overview.md`)

---

## Session 1 — Setup mode

On first ever open, ELI knows nothing. The product must acknowledge this honestly and collect what it needs to begin tracking.

### What ELI knows at Session 1

| Signal | Available | Source |
|---|---|---|
| Student name | Maybe | Account signup |
| Exam type (JEE/NEET) | Not yet | Collected at session open |
| Topics in scope | None | First topic added during this session |
| Task type (Learn/Practice/Revise) | Not yet | Collected after topic selection |
| Energy level | Not yet | Collected in checkin |
| Session history | None | — |
| Open revisits | None | — |
| Patterns | None | — |

### Screen shape on Session 1

Session 1 is **setup mode**, not a thin version of normal Phase 1. The layout is different:

| Normal Phase 1 | Session 1 (setup mode) |
|---|---|
| Greeting references session history | Greeting is purposeful but not warm — warmth requires shared history |
| Revisit list | Does not render — nothing to revisit yet |
| Energy checkin | Present — first data point |
| ELI's recommendation | Not present — ELI has nothing to base it on |
| Topic picker | **Primary action** — first topic enters tracking here |

### Session 1 greeting

ELI cannot be an elder brother with a stranger. The elder-brother tone comes from data. Day 1 has none.

**Correct register for Session 1:**
Direct and purposeful. Not warm. Not generic motivational.

- "What are you preparing for?" — collects exam type
- "Which topic are you starting with today?" — first topic enters tracking
- "Good. Let's track it from here." — acknowledges the start without over-promising

**Wrong register for Session 1:**
- "Your drive is real." — no data behind it
- "Let's get started!" — could be any app
- "I'm ELI, your study companion..." — app-introduction copy belongs in onboarding screens, not the study session

### What Session 1 collects

The checkin is split into two steps: session-level inputs first, then topic-level inputs after the topic is picked.

**Session-level (collected once at open):**
1. Exam type (JEE / NEET / other) — sets syllabus context for topic browser; asked once ever (account-level), never repeated
2. Sleep quality (last night) — asked once per calendar day at the first open. Skipped on all same-day re-entries regardless of gap.
3. Today's energy level (standard checkin scale) — session-level; re-asked on same-day re-entry if the gap since last session end is > 2 hours

**Topic-level (collected immediately after topic selection):**
4. Topic — student picks from a searchable syllabus list; this topic enters ELI's tracking
5. Task type — a single 3-option tap attached to the topic: **Learn / Practice / Revise**

Task type is not a separate checkin field — it appears inline after the topic is chosen, before the session starts. It is necessary because it determines what Phase 3 expects:

| Task type | What it means | Phase 3 outcome |
|---|---|---|
| **Learn** | First engagement with this topic in ELI | Auto-creates a revisit: "Electrostatics — come back to check if it stuck" |
| **Practice** | Doing problems on a known topic | If topic has an open revisit → verification opportunity; if not → offers to create one |
| **Revise** | Reviewing something already studied | Asks "did it stick?" — closes revisit if retained, keeps/creates revisit if not |

Full task type spec (auto-suggestion, decision matrix, blurry-line analysis): [task-types.md](task-types.md)

**What Session 1 does NOT ask:**
- Pressure / difficulty — too early, no baseline
- Time available — student can stop when they need to (no time picker until session 3+; see time commitment section below)

Do not add fields. Every field added to Day 1 increases drop-off. The four above are the minimum necessary for ELI to do its job from Session 1 onward.

### Phase 1 CTA on Session 1

No revisits exist. The primary action is starting the first session on the topic they just picked.

- Primary CTA: "Start [Topic name]" — direct, no time estimate
- No "revisit first" — nothing to revisit
- No secondary options yet — one action, no decision fatigue

---

## First-encounter topic behaviour

Most JEE/NEET students come to ELI mid-journey — they have already studied multiple topics at coaching before using the app. When they log a topic for the first time, ELI has no record of it. **ELI's starting point:** ELI trusts the student's declared task type. The student knows their own history; ELI does not. The declared task type is the only signal ELI has.

**Phase 3 for first-encounter topics** depends on the task type the student declared. The complete decision matrix — including first-encounter rows, the Practice vs. Revise distinction, and misclassification resilience — is in [task-types.md](task-types.md). The short version: Learn auto-creates a revisit, Practice offers one, Revise asks "did it stick?"

### The bulk history problem

A student joining ELI 3 months into their JEE preparation has studied 20+ topics. They do not need to retroactively log all of them. ELI's value is forward-tracking — topics surface organically as the student chooses to engage with them. Over 2–3 weeks of regular use, their active topic map fills in naturally.

**Do not attempt to solve this on Day 1.** A bulk "I've already studied these" import flow would make Session 1 extremely heavy and most students would fill it out inaccurately (over-claiming or under-claiming confidence). The lightweight path — topics added session by session — is more accurate and universally deployable.

The one future enhancement worth considering: a lightweight "add prior topic" option available any time (not just Session 1), where the student can mark a topic as "studied before ELI" with a single confidence tap. This is not a Day 1 requirement — it is an enhancement for students with heavy prior history who want to bring old topics under ELI's tracking sooner.

---

## Phase 3 — what happens per task type

Phase 3 varies by task type. The complete spec — decision matrix, auto-suggestion rules, blurry-line resilience, misclassification analysis, and connection to doc 07 scenarios — lives in [task-types.md](task-types.md).

**Quick reference for formation context:**

| Task type | Loop effect | Closure beat? |
|---|---|---|
| **Learn** | Always opens (revisit auto-created) | No |
| **Practice** | Opens or closes depending on revisit state | Yes, if revisit verified |
| **Revise** | Primarily closes (retention check) | Yes, if retained |

Learn always opens loops. Revise primarily closes them. Practice can go either way. This is why ELI's recommendation "revisit Electrostatics first" naturally pushes toward Practice or Revise — those are the task types that can fire the Closure beat and reduce debt.

---

## Terminology: engine vs. student-facing

Engine terms (`pendingCheck`, `verification`, `checkClosed`) are stable domain contracts. Student-facing terms ("Revisit", "Check if it stuck", "It stuck. Done.") live in the microcopy layer and can evolve independently — including future per-student language variants (English formal / Hinglish). Full mapping table in [task-types.md](task-types.md).

---

## Time commitment — progressive model

Time is the most unreliable self-report. A student who says "I'll study for an hour" may stop in 20 minutes or run for 90. Asking upfront and treating the answer as accurate produces noisy data that degrades ELI's scope recommendations.

The solution is a two-point model:

| Point | What | When | How |
|---|---|---|---|
| **Declared scope** | What the student intends to do | Phase 1, from session 3+ | 4-option tap: **[~15 min] [~30 min] [~45 min] [1h+]** |
| **Actual duration** | How long they actually studied | Phase 3, from session 1 | Inferred from timestamps — never asked. Tap-to-edit if wrong. |

The gap between declared and actual calibrates ELI's per-student model. A student who consistently picks "~45 min" but sessions for 25 minutes is over-declaring — ELI silently adjusts scope recommendations toward observed behaviour rather than stated intent.

### Progressive introduction

| Stage | Time commitment | Rationale |
|---|---|---|
| **Sessions 1–2** | Not asked | Student can stop when they need to. No session length history for ELI to calibrate from. |
| **Sessions 3–9** | Optional 4-tap scope picker: **[~15 min] [~30 min] [~45 min] [1h+]** | By session 3, student has completed one full loop and understands what a session is. Scope is optional — leaving it blank is valid. |
| **Sessions 10+** | ELI pre-fills the picker from observed session length pattern | Default is the closest bucket to the student's typical session length. Student can override. |

The `~` prefix signals "approximately" — the student picks the closest bucket to their available time, not a commitment. ELI uses the declared scope for P1 gate scope calculation alongside energy and open revisits.

### Phase 3 — actual duration (always-on from session 1)

Phase 3 passively displays the inferred duration alongside the topic from the very first session. This runs independently of the scope picker — even in sessions 1–2 when no scope is declared, actual duration is tracked. Early sessions build the per-student baseline that makes the scope picker useful when it appears at session 3.

> Electrostatics · 45 min

This is display-only — it is not a question. The student does not have to confirm it.

**Tap-to-edit:** If the student taps the duration, a simple input lets them adjust it. This handles cases ELI cannot correctly infer:
- App was left open while the student left the desk
- Phone idle time counted as study time
- Student did additional work off-app and wants to log it

**3-hour cap:** If the inferred duration exceeds 3 hours, ELI flags it as uncertain rather than displaying a potentially wrong number:

> Session logged. Duration unclear — phone may have been idle. Tap to adjust.

This prevents a spurious 9-hour figure from entering the model and corrupting the per-student time baseline.

**ELI calibration from corrections:** When the student corrects a duration, ELI uses the delta to recalibrate idle-detection thresholds for that student. A student who consistently corrects "3 hours → 40 minutes" tells ELI that long idle gaps are common for them — ELI learns to apply a tighter cap for that student specifically.

---

## Sessions 2–4 — ELI starts remembering

By Session 2, ELI has 1 data point. It can reference what happened in Session 1 — but it cannot yet claim patterns.

### What ELI can reference

| Session count | What ELI can say |
|---|---|
| Session 2 | "Yesterday you started [Topic]" / "You've got 1 revisit from yesterday" |
| Session 3 | "Two sessions so far. [Topic] still needs a revisit." |
| Session 4 | "You've been coming back consistently." (only if sessions are on consecutive days) |

**What ELI cannot say yet (sessions 2–4):**
- "You tend to study in the evenings" — 2 timestamps is not a pattern
- "Your energy has been Medium this week" — 2 energy readings is not a pattern
- "You do better when you start with verification" — no baseline established

During sessions 2–4, ELI remembers — it does not observe. These are different. Remembering is citing a specific past fact ("yesterday you started Electrostatics"). Observing is asserting a regularity ("you tend to..."). No pattern language before session 5. See the tiered threshold table in the next section.

### Phase 1 during sessions 2–4

The revisit list now renders if any topics are open. For a student who started Electrostatics in Session 1 and hasn't verified yet:

```
Revisit (1)
• Electrostatics — studied yesterday
```

ELI's recommendation: "Revisit Electrostatics first. Then today's topic."

This is the first time the Closure beat can fire. The first `1 → 0` or `2 → 1` counter drop is the most important screen moment in the formation period — it proves the loop works.

---

## Sessions 5–7 — First pattern claims

By Session 5, ELI has enough data to begin making legitimate pattern observations.

### Pattern claim thresholds

Not all claims are equal. ELI uses three tiers of claim language, each with a different data requirement. Using a higher-tier claim before the threshold makes ELI sound like it's guessing — and students notice. This erodes trust early, when trust is still fragile.

**Tier 1 — Observations (facts about counts)**
No minimum. These are arithmetic, not inference.
- "You've done 3 sessions this week." — valid at session 3
- "Electrostatics — revisit waiting for 9 days." — valid whenever true
- "You closed 2 loops yesterday." — always valid

**Tier 2 — Tentative patterns (hedged language)**
Minimum **5 data points for that specific signal.** Use softening language: "seems like", "lately", "in the last few sessions", "it looks like".
- "You seem to study better in the evenings." — valid after 5 sessions, majority in evenings
- "Energy has been Okay most of this week." — valid after 5 energy readings
- "Lately you've been skipping Organic Chemistry." — valid after 3+ skip events (avoidance is a strong signal; lower count acceptable because the behaviour is binary and deliberate)

**Tier 3 — Confident patterns (assertive language)**
Minimum **7 data points for that specific signal.** Use direct language: "consistently", "you tend to", "your pattern is", "when you...".
- "You consistently study in the evenings." — valid after 7 sessions, majority in evenings
- "Your energy tends to be Okay (3). You close loops on those days." — valid after 7 energy readings with visible closure correlation
- "Your energy pattern is clear now." — this phrase should never appear before session 7

**Tier 4 — Correlation claims (X causes or predicts Y)**
Minimum **10 instances of both signals co-occurring.**
- "When you pick Sharp (5), you do best starting with 1 check." — valid after 10+ Sharp sessions
- "You close loops at a higher rate when energy is Good or above." — valid after enough sessions to establish a rate

| Claim tier | Minimum | Language | Example |
|---|---|---|---|
| Observation | Any | Factual, specific | "3 sessions this week. 2 revisits open." |
| Tentative pattern | 5 per signal | "seems like", "lately" | "You seem to prefer evenings." |
| Confident pattern | 7 per signal | "consistently", "tend to" | "You consistently study in the evenings." |
| Correlation | 10 co-occurrences | "when X, you Y" | "When energy is Sharp, you close loops." |

### Anticipation beat forming (sessions 5–7)

This is when the loop starts approaching circularity. The student now has:
- Multiple open revisits (Anticipation driver: open-loop anxiety is real)
- A first Closure event on record (proof the system delivers)
- A Seed from the last session (something specific to return for)

The uncomfortable awareness of open revisits — "Thermodynamics is sitting there" — is now the pull to open the app. This is the Anticipation beat igniting. It does not require ELI's personality; it requires revisits to exist and a prior Closure to have proven that opening the app makes the count go down.

---

## Session 7+ — First week-level observation

At approximately session 7 (or after the student's first full calendar week), ELI can make its first week-level observations.

**No badge. No ceremony. No "you've been here 7 days" notification.** That is gamification. What happens instead: ELI's greeting becomes qualitatively different — it can now reference a week's worth of data for the first time.

### What a session-7 greeting can say

- "First week done. Here's what I've noticed: you study in the evenings, energy tends to be 3–4, and you've got 2 open revisits."
- "5 sessions this week. You've closed 3 revisits and opened 5. The debt is growing — let's work on that."
- "Your energy pattern is clear now. You come in Okay (3) most days. You close loops on those days."

The student reads this and thinks: "Yes. That's accurate." That moment — when ELI's observation lands as true — is the formation period ending. The loop is now real to them.

### What the session-7 greeting is NOT

- A streak notification: "7 days in a row!" — never
- A summary of stats for their own sake: "You did 5 sessions, 180 minutes, 3 closures." — data without insight
- A congratulatory message: "Great work this week!" — affirmation without data

The greeting must contain an observation, not a report. "5 sessions, 3 closures, debt growing" is a report. "Your debt is growing — you're studying faster than you're closing" is an observation. Only observations create the "ELI noticed something" feeling that anchors Recognition.

---

## Phase 1 screen states by formation stage

| Stage | Greeting | Revisit list | ELI recommendation | Energy checkin |
|---|---|---|---|---|
| **Session 1** (setup) | Purposeful, data-collecting | Hidden — nothing to revisit yet | Absent — no basis | Minimal (energy only) |
| **Sessions 2–4** | Memory-based ("yesterday you...") | Renders if any revisits open | Revisit-first when 1+ open | Standard |
| **Sessions 5–7** | Pattern-aware ("consistently...") | Full revisit list, ordered by staleness | Data-grounded priority ("Thermodynamics — 9 days") | Standard |
| **Session 7+** | Week-level observation | Full, with "studied X days ago" labels | Confident recommendation with reasoning visible | Standard |

---

## How topics enter ELI's tracking

Topics are NOT pre-selected from a syllabus on Session 1. A topic enters ELI's tracking when the student first logs a session on it.

- Session 1: student picks 1 topic (searchable list from JEE/NEET syllabus — see [topic-selection.md](topic-selection.md))
- Session 3–4: 2–3 topics in tracking naturally
- Session 7+: 4–6 topics; ELI can begin cross-topic observations

The syllabus browser provides structure for searching; it does not require pre-configuration. The student never needs to "set up their syllabus" — they just pick what they're studying today, and ELI accumulates the map over time.

Institute syllabus import (pre-populating topics from enrollment data) is a future enhancement. It cannot be required for Day 1 — it would make the product dependent on institute cooperation before a single student can use it.

---

## What can break the loop during formation

| Risk | When | What happens | Prevention |
|---|---|---|---|
| First CTA is too large | Session 1 | Student doesn't start; drops on Day 1 | Session 1 CTA is "Start [Topic]" — no scope, no time estimate |
| First "did it stick?" feels clinical | Sessions 2–3 | Student skips Phase 3; no Closure fires; Seed is never planted | Phase 3 must feel like a natural close, not a quiz |
| Revisits pile faster than Closures | Sessions 3–6 | Debt grows; student feels behind; quits | ELI surfaces oldest revisit as primary recommendation; never shows total count without also showing path to reduce it |
| Pattern claims made too early | Sessions 2–3 | ELI sounds like it's guessing; trust erodes early | Tier 2 (tentative, "seems like") requires minimum 5 data points; Tier 3 (confident, "consistently") requires 7. See pattern claim thresholds above. |
| Session 1 greeting is too warm | Session 1 | Feels like marketing; student is sceptical | Warmth comes from data. Day 1 is purposeful, not warm |
| Same-day re-entry gets "welcome back" treatment | Any day | ELI looks like it doesn't know the student was just here | Recognition beat must check time delta from last session |

---

*Loop mechanics: [Craving Loop](../foundations/craving-loop.md)*
*Task types and Phase 3 decisions: [task-types.md](task-types.md)*
*21-day arc: [escalation-arc.md](escalation-arc.md)*
*Topic selection: [topic-selection.md](topic-selection.md)*
*Phase 1 deep spec: [Phase 1 — The Open](../phase1/00-overview.md)*
