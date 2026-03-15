# Object Model Dependency Analysis

This document identifies which problems from `09-object-model-problems.md` are structurally linked and must be solved together. Its job is to turn 34 individual problems into a small number of architectural clusters with clear dependencies between them.

This document does not propose solutions. It defines what must be solved together so that the object model redesign addresses structural dependencies rather than patching problems one at a time.

## Why Dependency Analysis Matters

The 34 problems span 10 themes, but themes are organized by *what's wrong.* Clusters are organized by *what structural change is required.* Problems from different themes may require the same architectural change. Problems from the same theme may require different changes.

The question is not "which problems are related?" It is: **which problems share a structural requirement in the object model such that a single architectural change addresses them together, and solving one without the others would be incomplete or contradictory?**

## The Five Structural Clusters

The 34 problems resolve into 5 clusters with a clear dependency order.

```
Cluster 1              Cluster 2              Cluster 3              Cluster 5              Cluster 4
Academic Context  →    Multi-Layer Study  →   Learning State     →   Assessment         →   Adaptation
+ Coaching Profile     Object                                       Timeline                Fuel

(exam, subjects,       (Study Unit +          (retention,            (upcoming tests,       (Phase gates,
coaching schedule,     Session Commitment +   decay, review          results, scope,        feedback loop,
curriculum skeleton)   Study Task,            timing)                study debt,            strengths)
                       activity type,                                gap model)
                       lifecycle states)

Solves: 10 problems    Solves: 11 problems    Solves: 6 problems     Solves: 5 problems     Solves: 4 problems
```

The arrows are dependencies:

- Cluster 2 is strongest with Cluster 1 in place
- Cluster 3 requires Cluster 2
- Cluster 5 requires Clusters 1 and 3
- Cluster 4 requires all other clusters

This is also a build order. Each cluster can ship incrementally, and each makes the product materially better on its own.

---

## Cluster 1: Academic Context Model

**Structural requirement:** The object model needs a **Student Academic Context** — exam, subjects, approximate timeline — a **Curriculum Skeleton** — subjects containing chapters or units, even if lightweight and student-declared — and a **Coaching Profile** — the student's coaching schedule, institute context, and awareness of coaching-driven study patterns.

**One-line summary:** Eli needs to know what the student is studying, when, and what their coaching life looks like.

### Problems that require this

| # | Problem | Why it needs academic context |
|---|---------|-------------------------------|
| 24 | Doesn't know exam/subjects | This IS the missing object |
| 28 | No onboarding signal | This is how the object gets created |
| 27 | Cold-start severity | Academic context is the fastest way to reduce cold start |
| 1 | Topic too flat | Hierarchy requires knowing subjects → chapters |
| 12 | No coverage/gaps | Requires knowing what chapters exist to be studied |
| 15 | No subject-level view | Requires knowing subjects |
| 3 | Curriculum deferred = generic | This cluster IS curriculum context |
| 5 | Topic list graveyard | Grouping under subjects prevents flat list accumulation |
| 17 | Companion breaks multi-subject | Requires cross-subject awareness |
| 20 | No coaching integration | Coaching Profile captures schedule, institute context, and coaching-day awareness |
| 14 | Bursty patterns | Coaching schedule (soft signal) helps Eli time prompts for assignments on coaching days |

### The gateway insight

Problems 24 and 28 are the gateway. You cannot introduce hierarchy (needed for many of the 34 problems) without knowing what exam the student is preparing for. And you cannot know the exam without collecting it.

This means the anti-onboarding stance must be revisited — not to add ceremony, but to find a lightweight, non-ceremonial way to learn: what exam, what subjects, when. Those three facts unlock the entire cluster.

### Coaching Profile

For most Indian exam students, coaching is the primary driver of what they study. The model must acknowledge this without requiring coaching institute cooperation (institutes will cooperate only if there is monetary benefit — there is none in V1). All coaching data is student-declared.

The Coaching Profile captures:

- **Institute name** (optional, freeform): "Allen", "Fiitjee", etc. Context, not integration.
- **Coaching subjects**: Which subjects the student takes coaching for.
- **Weekly schedule (soft signal)**: Which days typically have coaching. No per-day subject mapping. Approximately right, not guaranteed.

**The soft-signal principle:** The coaching schedule is an approximate indicator, not a precise model. Indian coaching reality is messy — students have coaching AND self-study on the same day, schedules shift frequently, some students have coaching every day, some attend multiple institutes. The schedule doesn't need to model all of this. When it's wrong, the consequence is a skipped prompt — no harm.

The Suggestion Engine uses the schedule with judgment:

- On coaching days, it may prompt once for assignments ("Coming back from coaching? Anything assigned?") — subject to frequency caps and skip-awareness
- If the student skips coaching prompts consistently, the engine reduces frequency
- If the student has coaching every day, prompts are capped at 2-3 per week
- The schedule never changes the Arrival Surface greeting, posture, or state — it only affects prompt timing

The Coaching Profile does NOT require:

- API integration with any coaching institute
- Institute cooperation or data sharing
- Detailed coaching curriculum or lesson tracking
- Homework verification or completion tracking
- Per-day subject mapping or time-block modeling

The student is the source of all coaching information — the same way they would tell a study partner "I go to coaching on Monday, Wednesday, Friday."

### What this cluster does NOT require

- A complete syllabus database (the skeleton can be student-declared)
- A formal curriculum import system
- Coaching institute API integration
- Detailed chapter-level tracking from day one (subjects alone unlock grouping and subject-level view)
- Precise daily schedule modeling (the coaching schedule is a soft signal)

### Dependencies

- **Prerequisite for:** Cluster 2 (Study Units group under subjects; Study Tasks reference coaching context), Cluster 3 (learning state per chapter is more useful than per free-text label), Cluster 5 (assessments need subjects and timeline; coaching tests are a primary assessment source)
- **Depends on:** Nothing. This cluster can ship independently.

### Standalone value

Even without Clusters 2-5, this cluster immediately:

- Reduces cold-start (the product knows the student's exam, subjects, and coaching context from the start)
- Enables subject-level grouping on the Arrival Surface
- Makes the product feel non-generic ("a companion that knows I'm preparing for NEET and go to Allen" vs "a blank notebook")
- Enables awareness of the exam timeline
- Enables coaching-aware prompt timing for Study Tasks and Assessments

---

## Cluster 2: Two-Layer Study Object

**Structural requirement:** The object model needs three distinct layers:

- **Study Unit** (persistent continuity object) — e.g., "Organic Chemistry — Alcohols." Has lifecycle states: active, parked, archived. Groups under a subject from Cluster 1. Carries history across sessions.
- **Session Commitment** (ephemeral action object) — e.g., "Practice problems, 30 min." Belongs to one Study Unit. Carries intent, activity type, scope, and frame. Lightweight enough to switch quickly.
- **Study Task** (forward-looking intent object) — e.g., "Finish HC Verma Chapter 4 problems by Friday." Links to a Study Unit. Has a source (coaching or self-declared), optional due date, and status. Represents what the student needs to do, not just what they have done.

**One-line summary:** The continuity object, the commitment object, and the intent object must be separated.

### Problems that require this

| # | Problem | Why it needs a multi-layer model |
|---|---------|----------------------------------|
| 4 | Thread does two jobs | This IS the problem — separate continuity from commitment |
| 2 | One-session-one-topic | With separate layers, multi-topic sittings become natural |
| 13 | Revision vs first-learning same | Session Commitment layer can carry activity type |
| 7 | Frame is decorative | Session Commitment layer can carry meaningful intent and scope |
| 14 | Bursty patterns | Lighter commitment ceremony enables rapid topic switching |
| 19 | No "done forever" vs "done today" | Study Unit gets lifecycle states (active, parked, archived) |
| 18 | Removal irreversible | Archive replaces delete when Study Unit has lifecycle states |
| 5 | Topic graveyard | Lifecycle states + subject grouping prevent flat accumulation |
| 26 | No study preferences | Session patterns become learnable when commitment data is richer |
| 20 | No coaching integration | Study Tasks capture coaching assignments without requiring institute cooperation |
| 29 | No study plan/intent | Study Tasks capture both coaching-assigned and self-declared forward-looking intent |

### The hinge insight

Problem 4 is the hinge. The single "topic" label doing both jobs (continuity AND commitment) is the root cause of session rigidity, list pollution, and the inability to capture activity type. Separating them into Study Unit + Session Commitment + Study Task solves or partially solves 11 problems.

### Study Task: internal data powering companion observations

The Study Task object captures what the student needs or wants to do. It has two sources:

**Coaching-assigned tasks:**
- "Finish HC Verma Chapter 4 problems by Friday"
- "Revise Organic reactions before Saturday test"
- "Complete coaching worksheet — Thermodynamics"

**Self-declared tasks:**
- "I want to finish Chapter 5 this week"
- "Practice integration formulas before the mock"
- "Review my weak topics in Chemistry"

Both are lightweight: one line of text + link to a Study Unit + optional due date. Entry takes 5 seconds.

**Critical design decision: tasks are internal data, not a visible list.**

A list of pending tasks on the Arrival Surface is a to-do list — regardless of copy. Pending tasks with due dates create pressure. This violates the brand's anti-dashboard, anti-pressure promise. Instead:

- Study Tasks are stored internally and power Eli's **Suggestion Engine** — a layer that converts tasks + learning state + assessment proximity into one contextual companion observation.
- The Arrival Surface shows ONE suggestion from Eli (e.g., "Your Chemistry test is Saturday. Organic reactions might need attention."), not a list of tasks.
- The student can pull the full picture on request ("What should I work on?" or "What did coaching assign?") but is never shown an obligation list unprompted.
- If the student doesn't complete a task, Eli does NOT nag, show overdue warnings, or guilt. Expired tasks disappear silently.
- Task status (pending/addressed/expired) is internal bookkeeping, never shown as a checklist.

**The principle: Eli observes and suggests. Eli does not list and track.**

**How tasks enter the system:**
- Student adds manually: description + which Study Unit + optional due date (5-second entry)
- Contextual prompt: After a coaching day, Eli can ask "Did your coaching assign anything for this week?" — one optional question, not a form.

### What the multi-layer model enables

- **Multi-topic study sittings** (Problem 2): The student can close one Session Commitment and start another under a different Study Unit without a full loop reset. The ceremony cost drops from "full Arrival → Commitment → Active Study → Completion" to "quick switch within the session."
- **Activity type capture** (Problem 13): The Session Commitment carries what the student is doing — reading, practice problems, revision, mock test — not just what topic they are on.
- **Meaningful frames** (Problem 7): The Session Commitment carries specific intent ("Finish problems 1-10") that can be referenced in verification. The frame is no longer decorative.
- **Topic lifecycle** (Problems 18, 19): Study Units can be active, parked, or archived. Archive preserves history. Parked keeps the unit available without cluttering the active list. The student no longer chooses between clutter and data loss.
- **Learnable preferences** (Problem 26): With richer session data (activity type, intent, duration patterns per Study Unit), Eli can learn the student's patterns over time.
- **Coaching awareness** (Problem 20): Study Tasks capture coaching assignments as internal data. Eli's Suggestion Engine uses them to generate contextual observations like "Your coaching covered Organic today. Want to work on that?" — without showing a task list or requiring institute cooperation.
- **Forward-looking intent** (Problem 29): Study Tasks capture what the student plans to do, whether coaching-assigned or self-declared. This is not a full planning system — it is lightweight internal data that powers Eli's companion observations, answering "what should I work on today?" through suggestions, not lists.

### Dependencies

- **Prerequisite for:** Cluster 3 (richer session data feeds learning state model)
- **Depends on:** Strongest with Cluster 1 (Study Units group under subjects; coaching schedule enriches task context), but partially viable without it. A student can still separate "Organic Chemistry" (Study Unit) from "Practice alcohol reactions, 30 min" (Session Commitment) without a full curriculum model. However, the graveyard, grouping, and coaching-awareness problems only fully resolve when both Cluster 1 and Cluster 2 are in place.

### Standalone value

Even without Clusters 3-5, this cluster immediately:

- Fixes the most painful daily-use problem (session ceremony for multi-topic study)
- Introduces topic lifecycle (active/parked/archived) which prevents list decay
- Makes the frame meaningful by connecting it to verification
- Captures activity type, enriching every session's data
- Powers contextual coaching-aware suggestions through the Suggestion Engine (without showing a task list)
- Gives the student a companion that knows what coaching assigned and what they planned, surfaced as observations not obligations

---

## Cluster 3: Learning State Model

**Structural requirement:** The object model needs a **Learning State** per Study Unit that represents an estimate of how well the student currently knows this material. This state:

- Updates upward when the student studies effectively (informed by richer verification from Cluster 2)
- Decays over time without review (retention curve)
- Distinguishes between "studied once" and "learned durably"
- Enables the product to suggest review timing

**One-line summary:** Eli needs to track how well material is known, not just whether it was studied.

### Problems that require this

| # | Problem | Why it needs learning state |
|---|---------|----------------------------|
| 16 | No model for knows vs needs to learn | This IS the missing model |
| 6 | Self-report too coarse | Verification must feed into a learning state, not just a log |
| 9 | No quality/difficulty model | Session quality should update learning state differently |
| 34 | "Covered" treated as permanent | Learning state must decay over time |
| 32 | No retention/decay model | Learning state requires a temporal dimension |
| 33 | No spaced repetition | Retention model enables review timing suggestions |

### The chain insight

The problems in this cluster form a chain:

```
Richer commitment data (Cluster 2)
  → Richer verification (activity type + scope + intent inform what "Covered it" means)
    → Learning state model (per Study Unit, informed by verification quality)
      → Retention decay (learning state degrades over time without review)
        → Spaced repetition (the product can suggest when to review)
```

You cannot model retention without knowing how well material was learned initially (which requires Cluster 2's richer session data). And you cannot do spaced repetition without a retention model.

### What the learning state enables

- **"Grounded progress" becomes real** (Problems 9, 16, 34): Confirmation is no longer just activity tracking. Sage Green means the learning state improved, not just that the student showed up.
- **Retention awareness** (Problem 32): The Arrival Surface can indicate not just "when you last studied this" but "this material is fading and needs review."
- **Review timing** (Problem 33): Eli can observe "Thermodynamics is due for review" based on retention decay, without becoming a planner — this is observation, not planning.
- **Honest attribution** (Problem 8): Even though study happens externally, the combination of activity type + scope + richer verification gives Eli a much higher-resolution picture than the current model.

### Dependencies

- **Prerequisite for:** Cluster 5 (study debt requires comparing learning state against assessment scope)
- **Depends on:** Cluster 2 (richer session data feeds the learning state). Benefits from Cluster 1 (learning state per chapter/unit is more useful than per free-text label).

### Standalone value

Even without Clusters 4-5, this cluster immediately:

- Makes progress confirmation honest rather than theatrical
- Introduces retention awareness on the Arrival Surface
- Enables review timing suggestions

---

## Cluster 5: Assessment Timeline

**Structural requirement:** The object model needs an **Assessment** object that represents both upcoming tests (with dates, subject/chapter scope, and source) and completed tests (with results). This is distinct from the academic context (Cluster 1), which gives Eli the final exam and subjects. The Assessment Timeline gives Eli the student's real time horizon: a sequence of tests — coaching unit tests, monthly tests, mocks, pre-boards, and the final exam — each with scope, dates, stakes, and source.

**One-line summary:** The student's time horizon is not one exam date — it's a sequence of assessments, most of which come from coaching.

### Why this is a separate cluster

This structural concept was previously fragmented across Clusters 1, 3, and 4. Extracting it reveals a distinct architectural requirement:

- **Cluster 1** gives Eli the final exam date and subjects. But the student's real time horizon is not one exam — it's a sequence: weekly coaching tests, monthly tests, mocks, pre-boards, unit tests, and the final. Each has different scope, different dates, different stakes. "The exam is in 5 months" is less useful than "your Chemistry test is in 3 days and covers chapters 4-7."

- **Cluster 3** says learning state should respond to outcome data. But it does not define how outcome data enters the system. A test score is its own object — it has a date, subjects/chapters in scope, a result, and a source (coaching test, mock, board exam). It is a structural entity in the student's academic life, not just a signal that updates learning state.

- **Cluster 4** previously held "study debt" and "gap model" as dependent problems. But they share a specific structural requirement: compare the student's learning state against the scope of an upcoming assessment. That computation requires the Assessment object to exist.

### Problems that require this

| # | Problem | Why it needs the Assessment Timeline |
|---|---------|--------------------------------------|
| 11 | No time horizon | The assessment sequence IS the real time horizon, not just the final exam date |
| 22 | No outcome signal | Test results are the primary outcome data; they need a structural entry point |
| 30 | No study debt | Study debt = gap between current learning state and next assessment's scope |
| 31 | No gap model | Gap = current learning state vs what the upcoming assessment requires |
| 17 | Companion breaks multi-subject | "Your Chemistry test is Saturday" requires knowing upcoming tests and their scope |

### What the Assessment Timeline enables

- **Time horizon becomes a series of milestones.** The product can say "next up: Chemistry unit test (Saturday), then Physics mock (next Wednesday), then pre-boards (March 15)." This is the student's real temporal landscape, not a single date months away.
- **Prioritization becomes observation, not planning.** If the next test covers chapters 4-7 of Chemistry, and the student's learning state is weak on chapters 5 and 6, Eli can observe: "Your Chemistry test is in 3 days. Chapters 5 and 6 might need attention." This is not planning — it is reading where the student is, which is what the brand promises.
- **Outcome data has a natural entry point.** After a test, the student enters results. Those results update learning state for the chapters in scope (Cluster 3). The Assessment object is the bridge between the student's external academic life and Eli's internal learning model.
- **Study debt becomes computable.** Gap = (what the next assessment requires) minus (current learning state on those chapters). This powers the most important observation a companion can make for an exam student: "Will I be ready?"
- **The companion metaphor works for the hardest question.** "Will I be ready for Saturday?" requires knowing what Saturday's test covers and how the student's learning state compares. Without the Assessment object, this question is unanswerable.

### Dependencies

- **Prerequisite for:** Cluster 4 (adaptation needs assessment-driven urgency and gap awareness)
- **Depends on:** Cluster 1 (assessments need subjects and curriculum skeleton) and Cluster 3 (study debt requires learning state to compare against assessment scope)

### Standalone value

Even without Cluster 4, this cluster immediately:

- Gives the student a real time horizon (sequence of upcoming tests, not just an exam date)
- Enables test result entry and its downstream effects on learning state
- Makes study debt visible ("3 chapters to cover before Saturday's test, 2 of them weak")
- Allows the companion to participate in the student's most pressing question: "Am I ready?"

---

## Cluster 4: Adaptation Fuel

**Structural requirement:** This is not a new object. It is the **evidence layer** that powers the existing adaptive system (State × Phase × Mirror). The problems here do not require their own structural change; they require Clusters 1, 2, 3, and 5 to exist so the adaptive system has enough fuel to function as designed.

**One-line summary:** The adaptive system was designed correctly. The data model beneath it was not.

### Problems that require all other clusters as prerequisites

| # | Problem | Why it depends on 1+2+3+5 |
|---|---------|----------------------------|
| 23 | Phase gates hollow | Phase evidence requires academic context (1) + session richness (2) + learning state (3) + assessment-driven progression signals (5) |
| 21 | No adaptation feedback | Feedback loop requires outcome signal (5) + session data (2) + learning state change (3) |
| 25 | No strengths/weaknesses | Detectable from learning state variance across subjects (1+3) and assessment results (5) |
| 8 | Attribution problem | Reduced by richer verification (2) + learning state (3) + outcome integration (5) |

### The dependent insight

The adaptive system (Gentle / Focus / Momentum, Arrival / Attunement / Familiarity, Mirror) was designed correctly at the brand level. The problem was never the adaptation model — it was the data model beneath it.

With Clusters 1, 2, 3, and 5 in place, the adaptive system gains:

- **Academic context** → State can respond to subject balance and overall preparation posture
- **Richer session data** → Phase can measure interaction diversity, not just session count
- **Learning state** → Phase evidence becomes meaningful; strengths and weaknesses become detectable
- **Assessment timeline** → State can respond to assessment proximity and study debt; the feedback loop closes through test results

### What becomes possible

- **Phase progression has real gates:** "Move to Attunement when: Eli knows the student's exam, subjects, and timeline (Cluster 1); the student has completed sessions across multiple Study Units with varied activity types (Cluster 2); learning state shows evidence of sustained engagement and verified learning (Cluster 3); and at least one assessment result has confirmed the learning model's accuracy (Cluster 5)." That is a meaningful evidence gate, not a session count.
- **Strengths and weaknesses emerge naturally:** Learning state variance across subjects reveals where the student is strong and where they struggle. Assessment results confirm or challenge those estimates. Eli can detect avoidance patterns (long gaps + low learning state + upcoming assessment = likely weakness the student is avoiding).
- **Study debt becomes visible:** Curriculum coverage (Cluster 1) + learning state (Cluster 3) + assessment scope and timeline (Cluster 5) = the gap between where the student is and where they need to be. This powers the most important observation a companion can make: "Will I be ready?"
- **Mirror earns credibility:** With academic context, session richness, learning state, and assessment data, Eli actually has something meaningful to reflect back. "You've been doing a lot of Physics practice problems this week and your retention on Mechanics is strong — you're well-prepared for Saturday's test" is a Mirror moment grounded in real data, not a generic observation about session count.

### Dependencies

- **Prerequisite for:** Nothing downstream. This is the terminal cluster.
- **Depends on:** Clusters 1, 2, 3, and 5. Cannot be solved independently.

---

## The Build Order

The dependency chain defines a natural build order:

```
Phase 1        Phase 2              Phase 3           Phase 4            Phase 5
Cluster 1  →   Cluster 2        →   Cluster 3     →   Cluster 5      →   Cluster 4
Academic       Two-Layer Study      Learning State     Assessment         Adaptation
Context        Object                                  Timeline           Fuel
```

### Phase 1: Academic Context + Coaching Profile (Cluster 1)
Ship independently. Immediately reduces cold-start, enables subject grouping, introduces coaching-day awareness, makes the product feel non-generic. The foundation for everything else.

### Phase 2: Multi-Layer Study Object (Cluster 2)
Ship with Cluster 1 in place. Fixes session ceremony, introduces topic lifecycle, makes frames meaningful, captures activity type, and introduces Study Tasks for coaching assignments and self-declared intent. The daily-use experience becomes dramatically better and coaching-aware.

### Phase 3: Learning State (Cluster 3)
Ship with Clusters 1-2 in place. Makes progress confirmation honest, introduces retention awareness, enables review timing. The product starts to understand learning, not just activity.

### Phase 4: Assessment Timeline (Cluster 5)
Ship with Clusters 1-3 in place. Gives the student a real time horizon, enables test result entry, makes study debt visible, connects Eli to the student's actual exam prep journey. The companion becomes useful for the hardest question: "Am I ready?"

### Phase 5: Adaptation Fuel (Cluster 4)
Ship with all other clusters in place. Phase progression gets real evidence gates, strengths/weaknesses become visible, Mirror becomes credible. The adaptive system functions as designed.

### Build order vs V1 scope

This build order does not mean all five phases must ship in V1. But it does mean:

- **Cluster 1 must be in V1.** Without it, the product feels generic, the cold-start is severe, and the foundation for everything else is missing.
- **Cluster 2 should be in V1.** Without it, the daily-use experience is painful for real exam students studying multiple subjects.
- **Cluster 3 could be V1 or early V2.** It's the difference between "good companion" and "companion that understands learning."
- **Cluster 5 could be late V1 or V2.** It's the difference between "companion that tracks study" and "companion that understands exam prep."
- **Cluster 4 is V2+.** It's the payoff, but it depends on everything else being in place.

This is a recommendation for discussion, not a binding decision. The object model redesign should address the full problem space; the shipping scope is a separate product decision.

---

## Problem That Doesn't Fit Neatly Into Clusters

**Problem 10 (solo study assumption)** is partially addressed by Cluster 1 (coaching context awareness) and Cluster 2 (Study Tasks capture coaching assignments), but fully solving it requires social features — sharing progress with parents, tutor visibility, peer study modes — that go beyond the object model. The object model should not prevent social features later, but it does not need to solve them in the redesign.

---

## Cross-Reference: Problems By Cluster

For quick reference, every problem mapped to its primary cluster:

| Cluster | Problems | Count |
|---------|----------|-------|
| 1. Academic Context + Coaching Profile | 1, 3, 5, 12, 14, 15, 20, 24, 27, 28 | 10 |
| 2. Multi-Layer Study Object (Study Unit + Session Commitment + Study Task) | 2, 4, 5, 7, 13, 14, 18, 19, 20, 26, 29 | 11 |
| 3. Learning State | 6, 9, 16, 32, 33, 34 | 6 |
| 5. Assessment Timeline | 11, 17, 22, 30, 31 | 5 |
| 4. Adaptation Fuel | 8, 21, 23, 25 | 4 |

Notes:
- Problem 5 (topic graveyard) appears in both Cluster 1 and Cluster 2 because it requires both subject grouping AND lifecycle states to fully resolve.
- Problem 14 (bursty patterns) appears in both Cluster 1 (coaching-day vs self-study-day awareness) and Cluster 2 (within-day lightweight transitions).
- Problem 17 (companion breaks multi-subject) appears in both Cluster 1 and Cluster 5 because it requires both subject awareness AND assessment scope awareness.
- Problem 20 (coaching integration) appears in both Cluster 1 (Coaching Profile) and Cluster 2 (Study Tasks capture coaching assignments).
- Problem 29 (no study plan/intent) is now addressed by Cluster 2's Study Task object, which captures both coaching-assigned and self-declared forward-looking intent.
- Problem 10 (solo study assumption) is partially addressed by multiple clusters but not fully resolved by the object model alone. See above.

Total: 38 assignments across 34 problems (four problems span two clusters, one problem is partially addressed but not fully clustered).

---

## Design Constraints

The following concerns are not structural clusters — they do not require their own objects in the model. But they are real product needs that the redesigned object model must not prevent. Any candidate model should be evaluated against these constraints.

### 1. Study modality must be representable

Students don't just "study." They read textbooks, solve practice problems, watch video lectures, take mock tests, make notes, do past year papers, and quiz each other. These are different activities with different cognitive demands, different value, and different implications for learning state. The redesigned model must allow study modality to be captured. In practice, this means the Session Commitment object (Cluster 2) needs an activity-type field. The specific modalities (reading, practice, revision, mock, etc.) are enum values within that field — not a separate structural concern.

### 2. Within-day energy dynamics must be observable

A student's 4th session of the day is very different from their 1st. Quality and focus degrade across a long study day. The model must allow the adaptation system to observe within-day patterns — session count, cumulative duration, and time-of-day — once session data is rich enough (Cluster 2). This is a signal the adaptation system (Cluster 4) can consume. It does not require its own object, but the model must not aggregate sessions in a way that erases within-day sequencing.

### 3. Emotional arc of exam prep must be inferable

Exam prep has emotional phases larger than Gentle/Focus/Momentum: early confidence, mid-prep anxiety, pre-exam panic, post-failure recovery, burnout. These are multi-week arcs, not moment-to-moment states. The model must allow these arcs to be inferred from the combination of assessment proximity (Cluster 5), learning state trajectory (Cluster 3), and session patterns (Cluster 2). The emotional arc is a computed signal, not a stored object — but the underlying data must be rich enough to support the computation.

### 4. Trust repair must be possible

If Eli makes a bad adaptation — wrong state, premature reflection, unhelpful suggestion — the student must have a way to signal "that wasn't helpful." The model must not prevent a lightweight feedback mechanism (e.g., dismiss, flag, or "not now" on adaptive moments). This is a product behavior question, not an object model question, but the model should include the possibility of negative feedback signals alongside positive ones (session completion, self-report).

### 5. Proactive initiation must be supportable

The current model is entirely reactive — the student opens the app, the student picks a topic. A real companion sometimes reaches out: "You haven't studied Chemistry in a while and your test is coming up." The model must support proactive behavior by making the data available for trigger computation: assessment proximity (Cluster 5), learning state decay (Cluster 3), session recency per Study Unit (Cluster 2), and study debt (Cluster 5). The triggers themselves are product logic built on top of the model, not objects within it. But the model must not require the student to open the app for Eli to know something is worth saying.

### 6. Product value measurement must be instrumentable

The team needs to know whether Eli is working. The model must allow measurement of: whether students study more with Eli than without, whether study quality improves over time, whether learning state correlates with assessment outcomes, and whether the adaptive system's posture changes correlate with better engagement. These are analytics and instrumentation concerns, not student-facing objects. But the model must produce data that is instrumentable — sessions, learning states, assessment results, and adaptation decisions must all be queryable for product analytics.

---

## Next Steps

1. Design candidate object models that address Clusters 1-5
2. Validate candidates against real student behavior (Indian exam prep context)
3. Assess which clusters are V1-critical vs. deferrable
4. Lock the revised object model
5. Update upstream docs (`product-experience-architecture/04-structural-product-model.md`, `v1-ux-spec/01-v1-product-form.md`) to reflect the new model
