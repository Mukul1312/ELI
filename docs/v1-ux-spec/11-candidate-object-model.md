# Candidate Object Model

This document proposes a redesigned product object model that addresses the 5 structural clusters identified in `10-object-model-dependency-analysis.md`. It replaces the current three-object model (Session, Study Thread, Curriculum Context) with a richer model grounded in how Indian exam students actually study.

This is a candidate for discussion and validation, not a locked decision.

## Design Principles

Before defining objects, these principles constrain the design:

1. **Student-declared first, system-enriched later.** The student types what they know. Eli structures it over time. Never force taxonomy before value.
2. **Lightweight capture, rich inference.** Every interaction should collect the minimum the student is willing to give. The system infers the rest from patterns.
3. **No object without a job.** Every object in the model must serve at least one of the 5 clusters. No speculative objects.
4. **Companion, not manager.** The model should power observation and support, not control and measurement. Every object should pass the test: "Would a good study companion know this?"
5. **Incremental enrichment.** The model must work with minimal data (Cluster 1 only) and get better as more clusters come online. It must never require all 5 clusters to be useful.
6. **No institute cooperation required.** All coaching data is student-declared. Coaching institutes will cooperate only if there is monetary benefit — there is none in V1. Eli must be useful without any external system integration.

---

## The Object Model

### Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Student Profile                                                  │
│  (exam, subjects, timeline, coaching profile, preferences)        │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  Subject                                                  │    │
│  │  (Physics, Chemistry, Biology — from exam context)        │    │
│  │                                                           │    │
│  │  ┌─────────────────────────────────────────────────────┐  │    │
│  │  │  Study Unit                                         │  │    │
│  │  │  (chapter / topic — persistent continuity)          │  │    │
│  │  │  lifecycle: active | parked | archived              │  │    │
│  │  │  learning state: retention estimate + decay         │  │    │
│  │  │  initial confidence: strong | okay | weak | fresh   │  │    │
│  │  │                                                     │  │    │
│  │  │  ┌───────────────────────────────────────────────┐  │  │    │
│  │  │  │  Session Commitment                           │  │  │    │
│  │  │  │  (what I'm doing right now)                   │  │  │    │
│  │  │  │  activity type, intent, frame, duration       │  │  │    │
│  │  │  │  verification: stage 1 + stage 2 + intent     │  │  │    │
│  │  │  └───────────────────────────────────────────────┘  │  │    │
│  │  │                                                     │  │    │
│  │  │  ┌───────────────────────────────────────────────┐  │  │    │
│  │  │  │  Study Task                                   │  │  │    │
│  │  │  │  (what I need to do — coaching or self)       │  │  │    │
│  │  │  │  source, due date, status                     │  │  │    │
│  │  │  └───────────────────────────────────────────────┘  │  │    │
│  │  └─────────────────────────────────────────────────────┘  │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  Assessment                                               │    │
│  │  (upcoming or completed test)                             │    │
│  │  source: coaching | school | self | mock                  │    │
│  │  scope: subjects/units, date, result                      │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  Study Sitting                                            │    │
│  │  (one study period containing 1+ Session Commitments)     │    │
│  │  date, total duration, session sequence                   │    │
│  └───────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

**Object count: 9** (Student Profile, Coaching Profile, Subject, Study Unit, Session Commitment, Study Task, Study Sitting, Assessment, Learning State)

---

## Object Definitions

### 1. Student Profile

**Cluster:** 1 (Academic Context + Coaching Profile)

**What it is:** The persistent identity of the student within Eli. Created during first use. Enriched over time. Includes the Coaching Profile as a structured sub-object.

**Fields:**

| Field | Source | When collected | Required |
|-------|--------|---------------|----------|
| `exam` | Student declares | First session (lightweight) | Yes |
| `subjects` | Derived from exam or student declares | First session | Yes |
| `examDate` | Student declares | First session or soon after | No (strongly encouraged) |
| `coachingProfile` | Student declares | First session or soon after | No |
| `initialConfidence` | Student declares per subject | Early sessions | No |
| `studyPreferences` | Learned from session patterns | Over time (Cluster 2+) | No |
| `createdAt` | System | Auto | Yes |

**How it gets created (the anti-ceremony approach):**

The first session is NOT a setup wizard. It's a natural conversation embedded in the first Arrival moment:

```
"What exam are you preparing for?"
[Student types or picks: NEET]

→ Eli knows: NEET, subjects = Physics + Chemistry + Biology
→ Optional follow-up: "When's the exam?"
→ Optional follow-up: "Do you go to coaching?"
→ Student can skip any question. Eli works without answers, just less usefully.
```

This is 1-3 questions, not a form. The student can be studying within 30-45 seconds. The difference from the current spec: Eli now knows the exam, subjects, and optionally that the student attends coaching, which unlocks grouping, subject-level awareness, coaching-aware prompting, and the curriculum skeleton.

**Design notes:**
- Exam → subjects mapping is a lightweight lookup (JEE → Physics/Chemistry/Math, NEET → Physics/Chemistry/Biology, Boards → student declares). Not a database — a simple mapping.
- `studyPreferences` is system-learned, never student-configured. Eli observes: typical session length, preferred study times, activity type distribution. This replaces the static "20 min" default with learned defaults.

---

### 2. Coaching Profile (sub-object of Student Profile)

**Cluster:** 1 (Academic Context + Coaching Profile)

**What it is:** A lightweight representation of the student's coaching life. All data is student-declared. No institute cooperation required. The schedule is a **soft signal** — an approximate indicator of when coaching happens, consumed by the Suggestion Engine with judgment, not a hard rule that fires mechanically.

**Fields:**

| Field | Source | Notes |
|-------|--------|-------|
| `instituteName` | Student declares | Optional. "Allen", "Fiitjee", "Unacademy", etc. Context, not integration. |
| `coachingSubjects` | Student declares | Which subjects the student takes coaching for. |
| `weeklySchedule` | Student declares | Which days typically have coaching. No per-day subject mapping. |
| `isCoachingDay(date)` | Derived | Soft signal: "today probably has coaching." Approximately right, not guaranteed. |

**How it gets created:**

```
"Do you go to coaching?"
[Student: Yes]
"Which days?"
[Student taps: Mon, Wed, Fri]
```

Two taps. No per-day subject mapping. The student can update this anytime if the schedule changes. If they don't update it, the schedule is approximately right and gracefully wrong on exception days.

**The soft-signal principle:**

The coaching schedule is an **approximate indicator**, not a precise model. Indian coaching reality is messy:

- A student has coaching 8am-2pm and self-studies 4pm-10pm — the same day is both coaching and self-study
- Coaching schedules shift frequently (extra classes before exams, cancelled classes, seasonal changes)
- Some students have coaching every day
- Some students attend multiple institutes
- Online + offline hybrid schedules don't fit a simple weekly pattern

The schedule doesn't need to model all of this. It needs to be approximately right most of the time. When it's wrong, the consequence is a skipped prompt — no harm.

**How the Suggestion Engine uses the schedule:**

The schedule is one input to the Suggestion Engine. The engine applies judgment:

| Schedule says | Suggestion Engine behavior |
|--------------|---------------------------|
| Coaching day, student opens Eli in the evening | Consider prompting for assignments once ("Coming back from coaching? Anything assigned?") |
| Coaching day, but student already added tasks today | Don't prompt — the student already told Eli |
| Coaching day, but student has been skipping coaching prompts | Reduce frequency — the student doesn't want to be asked |
| Coaching every day | Cap coaching prompts at 2-3 per week, not daily |
| Schedule is probably wrong (holiday, reschedule) | Student skips the prompt — no harm, no follow-up |
| No coaching today | Don't prompt for coaching assignments |

**Frequency cap:** Even if the schedule says coaching every day, coaching-related prompts fire at most 2-3 times per week. The engine learns from the student's response pattern — if the student consistently engages, maintain frequency. If they consistently skip, reduce.

**What the Coaching Profile enables:**

- **Prompt timing:** Eli knows approximately when coaching happens and can time prompts for Study Tasks and Assessments accordingly. This is the primary job of the schedule.
- **Coaching subject awareness:** Eli knows the student takes coaching for Physics and Chemistry, which enriches subject setup and task context.
- **Coaching test context:** When the student adds an Assessment with `source: coaching`, Eli has coaching context to connect it to.

**What the Coaching Profile does NOT do:**

- Does not change the Arrival Surface greeting or posture based on coaching day
- Does not infer which specific subjects the student studied today
- Does not model the student's daily time blocks or routine
- Does not integrate with any coaching institute's systems
- Does not require the institute's knowledge or cooperation
- Does not verify attendance or coaching completion
- Does not turn Eli into a coaching management tool
- Does not fire prompts mechanically — the Suggestion Engine applies judgment and frequency caps

The student is the source of all coaching information — the same way they would tell a study partner "I go to coaching on Monday, Wednesday, Friday."

---

### 3. Subject

**Cluster:** 1 (Academic Context)

**What it is:** A top-level grouping of the student's study work. Derived from the exam or declared by the student.

**Fields:**

| Field | Source | Notes |
|-------|--------|-------|
| `name` | Derived from exam or student-declared | "Physics", "Chemistry", "Biology" |
| `studentId` | System | Belongs to one student |
| `initialConfidence` | Student declares (optional) | "Strong" / "Okay" / "Weak" / "Haven't started" |
| `createdAt` | System | Auto |

**Initial confidence declaration:**

During early use (first few sessions, not first session), Eli can ask per-subject:

```
"How are you feeling about Physics overall?"
→ Strong / Okay / Weak / Haven't started
```

This is NOT an assessment. It is the student telling Eli where they are. It sets initial learning-state estimates for Study Units under that subject. Not accurate, but far better than zero. Assessment results recalibrate quickly.

**Why this matters:** A student who has been studying for a year before discovering Eli has learning state = 0 on everything in the current model. The initial confidence declaration gives Eli a rough starting point so the product doesn't spend weeks treating a well-prepared student as a blank slate.

**Design notes:**
- For known exams (JEE, NEET, common boards), subjects are auto-created from the exam. The student can add, rename, or remove.
- For unknown exams, the student declares subjects manually.
- Subjects are containers with lightweight metadata. Their primary job is grouping and subject-level aggregation.
- The student never needs to "manage" subjects actively.

**Optional curriculum checklist for known exams:**

For well-known exams (JEE, NEET, common boards), Eli can offer an optional curriculum checklist per subject — a list of standard chapters the student can confirm, dismiss, or skip:

```
"Here are the standard Physics chapters for NEET.
Tap the ones you've already started studying."

☐ Mechanics
☐ Thermodynamics
☐ Optics
☐ Electromagnetism
...
[Skip — I'll add topics as I go]
```

This is NOT mandatory. Students who skip get the same experience as student-declared Study Units. Students who engage get pre-populated Study Units with initial confidence levels, which dramatically reduces coverage blindness (Problem 12) and the gap-model limitation (Problem 31).

---

### 4. Study Unit

**Cluster:** 2 (Multi-Layer Study Object) + parts of 3 (Learning State)

**What it is:** The persistent continuity object. This is what the current model calls a "study thread" and the student sees as a "topic." It represents an ongoing line of work: a chapter, a concept area, a practice domain. It persists across sessions and carries history and learning state.

**Fields:**

| Field | Source | Notes |
|-------|--------|-------|
| `name` | Student-declared | Free text: "Thermodynamics", "Organic — Alcohols", "Integration formulas" |
| `subjectId` | Student assigns or Eli infers | Groups under a Subject. Can be reassigned. |
| `lifecycle` | System + student | `active` / `parked` / `archived` |
| `learningState` | System-computed | Retention estimate (Cluster 3). See Learning State below. |
| `initialConfidence` | Student declares or inherited from Subject | Sets starting learning state. |
| `sessionCount` | System | Running total of completed sessions |
| `lastStudiedAt` | System | Timestamp of most recent session completion |
| `createdAt` | System | Auto |

**Lifecycle states:**

| State | Meaning | How it transitions |
|-------|---------|-------------------|
| `active` | Currently relevant, appears in primary list | Default on creation |
| `parked` | Not currently active, but preserved for later | Student parks it; or auto-park after configurable inactivity period |
| `archived` | Done or no longer relevant, hidden from active views | Student archives it |

**Key design decisions:**
- **Student-declared names, system-organized structure.** The student types "Thermodynamics" and Eli places it under Physics. The student can correct the placement. Eli never forces taxonomy.
- **Subject assignment can be inferred.** If the student types "Organic Chemistry" and a Chemistry subject exists, Eli can suggest the placement. If wrong, the student corrects with a tap.
- **Parked is not deleted.** The student can park a Study Unit to remove it from the active list without losing history. They can reactivate it anytime. This solves Problem 18 (irreversible removal) and Problem 19 (no lifecycle).
- **Auto-park after inactivity.** Study Units untouched for a configurable period (e.g., 3+ weeks) could auto-park with a quiet note. This prevents the graveyard (Problem 5) without requiring manual cleanup.
- **Learning state lives on the Study Unit.** This is where retention, decay, and review-readiness are tracked (Cluster 3). See Learning State section below.
- **Initial confidence sets starting state.** If the student declared "Strong" on Physics and creates a Study Unit under Physics, its learning state starts higher than zero. Assessment results and session data recalibrate over time.

---

### 5. Session Commitment

**Cluster:** 2 (Multi-Layer Study Object)

**What it is:** The ephemeral action object. One bounded study attempt. This is what the student is doing *right now.* It belongs to one Study Unit and carries intent, activity type, scope, and frame. It is lightweight enough to create quickly and switch between within a Study Sitting.

**Fields:**

| Field | Source | Notes |
|-------|--------|-------|
| `studyUnitId` | Student selects | Which Study Unit this session is under |
| `studySittingId` | System | Which Sitting this belongs to |
| `studyTaskId` | System (optional) | If this session addresses a Study Task, link it |
| `activityType` | Student selects | See Activity Types below |
| `intent` | Student declares (optional) | Free text: "Finish problems 1-10", "Review chapter summary" |
| `frame` | Student accepts/edits/clears | Duration or scope: "30 min", "10 problems", frameless |
| `startedAt` | System | Auto |
| `endedAt` | System | Auto on completion |
| `elapsedMinutes` | System | Computed |
| `verification` | Student self-reports | See Verification below |

**Activity Types:**

| Type | Meaning | Default frame | Cognitive load |
|------|---------|--------------|----------------|
| `reading` | First-pass learning, textbook reading | "30 min" | Medium |
| `practice` | Solving problems, exercises, numericals | "10 problems" | High |
| `revision` | Reviewing previously learned material | "15 min" | Low-Medium |
| `mock` | Taking a practice test or timed exam | Test duration | Very High |
| `notes` | Making or reviewing notes, flashcards | "20 min" | Medium |
| `other` | Anything that doesn't fit above | "30 min" | Varies |

**Design notes:**
- Activity type is a single tap, not a form. The commitment surface shows 4-5 activity type options as tappable chips alongside the Study Unit and frame.
- The frame default adapts by activity type AND by learned preferences over time. If the student consistently studies for 45 minutes, Eli adjusts the default.
- `intent` is optional free text. Most students will skip it. Those who type specifics are giving Eli rich signal.
- `studyTaskId` links a Session Commitment to a Study Task when the student starts studying a task from the Arrival Surface. This is how tasks get "addressed" — by natural study, not by checkbox completion.

**Verification (enriched self-report):**

The current 4-option self-report is preserved but enriched in two ways:

**Stage 1 (same as current — required):**
- Covered it
- Partially
- Got stuck
- Didn't get to it

**Stage 2 (optional, 1 tap — new):**

Shown only after "Covered it" or "Partially." One optional signal about effort quality:

| Option | Meaning | Signal value |
|--------|---------|-------------|
| "Felt solid" | Confident in understanding | High learning-state update |
| "Shaky" | Got through it but not confident | Moderate learning-state update |
| *(skip)* | Student doesn't want to answer | Default moderate update |

**Intent-aware verification (when intent exists):**

When the student set a specific intent (e.g., "Finish problems 1-10"), Stage 1 can reference it:

| Without intent | With intent |
|---------------|-------------|
| "How did it go?" | "Did you finish problems 1-10?" |
| Covered it / Partially / Got stuck / Didn't get to it | All of them / Most of them / Got stuck partway / Didn't get to them |

The intent-aware version connects commitment to verification — the frame is no longer decorative. When intent is absent, the generic version appears. This solves the frame-verification disconnect (Gap 2 from regression).

**What verification does NOT become:**
- No "rate your focus 1-5"
- No "what percentage did you cover?"
- No "what went wrong?" follow-ups
- No multi-step evaluation form

The brand's anti-assessment stance is preserved. The enrichment is one optional signal plus intent-awareness, not an evaluation ritual.

---

### 6. Study Task

**Cluster:** 2 (Multi-Layer Study Object) — forward-looking intent

**What it is:** A lightweight **internal data object** representing something the student needs or wants to do. Has two sources: coaching-assigned and self-declared. Study Tasks are **never shown as a list** on any surface. They are internal data that powers Eli's contextual suggestions. The student sees Eli's observations, not a to-do list.

**Why tasks are internal, not visible:**

A list of pending tasks on the Arrival Surface is a to-do list — regardless of how gentle the copy is. If the student has 5 unaddressed coaching assignments visible every time they open Eli, the product becomes a dashboard of obligations. This violates the brand's anti-pressure, anti-dashboard promise. The Arrival Surface's job is "welcome back, here's what I notice" — not "here's what you haven't done."

A real study companion doesn't hand you a to-do list. They mention one relevant thing: "Hey, your coaching assigned Chapter 4 problems for Friday. Want to do those?" One observation, not a list. That's the posture Study Tasks should power.

**The design principle: Eli observes and suggests. Eli does not list and track.**

**Fields:**

| Field | Source | Notes |
|-------|--------|-------|
| `description` | Student declares | Free text: "HC Verma Ch4 problems", "Revise Organic reactions" |
| `studyUnitId` | Student links (optional) | Which Study Unit this relates to |
| `source` | Student indicates | `coaching` / `self` |
| `dueDate` | Student declares (optional) | "Friday", "Before Saturday test", or none |
| `suggestedActivityType` | Student or Eli infers | practice, revision, reading, etc. |
| `status` | System | `pending` / `addressed` / `expired` |
| `createdAt` | System | Auto |

**Status transitions:**

| Transition | Trigger |
|-----------|---------|
| `pending` → `addressed` | Student completes a Session Commitment linked to this task's Study Unit (or manually marks it) |
| `pending` → `expired` | Due date passes. Quiet expiry — no notification, no "you missed this." |
| `addressed` → stays `addressed` | Terminal state. The task was worked on. |

**How tasks enter the system:**

Two entry points, both lightweight:

1. **Manual add:** Student taps "Add task" → types description → optionally links Study Unit + due date. Takes 5 seconds. Available via a subtle affordance, not a primary action.
2. **Contextual prompt (coaching days):** On a coaching-day evening, Eli can ask: "Did your coaching assign anything for this week?" — one optional question, not a form. If the student answers, Eli creates Study Tasks internally.

**How tasks surface (the companion posture):**

Study Tasks NEVER appear as a list on any default surface. Instead, they power Eli's contextual suggestions through the **Suggestion Engine** (see below). The student experiences tasks as Eli's awareness:

| What the student DOES NOT see | What the student DOES see |
|-------------------------------|---------------------------|
| "Pending tasks: HC Verma Ch4 (due Fri), Organic revision (due Sat), Thermo worksheet (due Mon)" | "Your Chemistry test is Saturday. Organic reactions might need attention." |
| A to-do list with checkboxes and due dates | One contextual observation from Eli |
| "3 tasks overdue" | Nothing. Expired tasks disappear silently. |

**Full task visibility on request (pull, not push):**

The student can access all their tasks when they choose to:

- **Conversational Eli:** "What did my coaching assign this week?" → Eli responds with pending tasks in conversational form, not a list.
- **Inside a Study Unit:** When viewing a Study Unit detail, related pending tasks are visible as context.
- **"What should I work on?":** A pull-action (subtle affordance or conversational) that shows Eli's full suggestion set, informed by tasks + learning state + assessments.

The information exists and is accessible. But the student controls when they see it. Eli never pushes the full list unprompted.

**Design notes:**
- Study Tasks are thin. Description + optional link + optional date. No priority, no subtasks, no dependencies. This is not a task manager.
- Self-declared tasks let the student capture forward intent: "I want to finish Chapter 5 this week." This partially solves Problem 29 (no study plan) without building a full planning system.
- The `suggestedActivityType` pre-fills the Session Commitment when the student starts from a task-informed suggestion. "HC Verma problems" → activity type pre-set to `practice`.
- Study Task status is never shown as a checklist. "Addressed" and "expired" are internal bookkeeping that prevent Eli from re-suggesting resolved tasks.

---

### 7. Study Sitting

**Cluster:** 2 (Multi-Layer Study Object) — supports multi-topic study and within-day dynamics

**What it is:** A container for one study period. When the student opens Eli and starts studying, a Study Sitting begins. It contains one or more Session Commitments. It ends when the student is done studying for now.

**Fields:**

| Field | Source | Notes |
|-------|--------|-------|
| `studentId` | System | Belongs to one student |
| `startedAt` | System | Auto when first Session Commitment begins |
| `endedAt` | System | Auto when student explicitly ends or after inactivity |
| `sessionCommitments` | System | Ordered list of Session Commitments within this sitting |
| `totalElapsedMinutes` | System | Computed sum |

**Why this object exists:**

The Study Sitting solves Problem 2 (multi-topic sessions) and Problem 14 (bursty patterns). Without it, switching topics requires a full loop reset. With it:

```
Student opens Eli
  → Study Sitting starts
    → Session Commitment 1: Physics — Practice problems, 30 min
    → [completes, quick verification]
    → Session Commitment 2: Chemistry — Revision, 15 min
    → [completes, quick verification]
    → Session Commitment 3: Math — Reading new chapter, 45 min
    → [completes, quick verification]
  → Student taps "Done for now"
→ Study Sitting ends
```

The transition between Session Commitments within a Sitting is lightweight — no return to Arrival, no full loop. The student picks the next Study Unit, selects activity type, and goes.

**Design notes:**
- A Study Sitting with only 1 Session Commitment is the normal case for most students. The model doesn't force multi-topic behavior — it just stops penalizing it.
- The "Done for now" action ends the Sitting and returns to Arrival. This is the only point where the full loop resets.
- Study Sittings enable within-day energy tracking (Design Constraint #2): the adaptation system can observe that this is the student's 3rd session in 2 hours.
- On days the schedule suggests coaching happened, the Suggestion Engine may offer a relevant observation when the student starts a Sitting: "Want to work on something from coaching today?" This is a soft prompt, not a guaranteed trigger.

---

### 8. Assessment

**Cluster:** 5 (Assessment Timeline)

**What it is:** A test, exam, or evaluation event — either upcoming (with scope and date) or completed (with results). This is the student's real time horizon. Coaching tests are the most common source.

**Fields:**

| Field | Source | Notes |
|-------|--------|-------|
| `name` | Student declares | "Chemistry unit test", "JEE Mains mock", "Pre-board Physics" |
| `date` | Student declares | When the test is/was |
| `status` | System | `upcoming` / `completed` |
| `source` | Student indicates | `coaching` / `school` / `self` / `mock` |
| `scope` | Student declares or Eli infers | Which Subjects and/or Study Units are covered |
| `result` | Student enters (after completion) | Score, grade, or qualitative ("went well" / "struggled") |
| `resultPerSubject` | Student enters (optional) | Per-subject breakdown if available |
| `createdAt` | System | Auto |

**How assessments enter the system:**

Assessments are student-declared, not imported. Three entry points:

1. **Proactive:** The student adds an upcoming test anytime. "Add test" → name, date, source, which subjects → done.
2. **Coaching-contextual:** Eli knows the student's coaching schedule. It can prompt: "Your coaching usually has tests. Any coming up this week?"
3. **Post-test:** After the student returns from a gap or mentions a test, Eli can ask: "Did you have a test recently? Want to log how it went?"

**What assessments enable:**

- **Time horizon:** The Arrival Surface can show "Next: Chemistry unit test (Saturday)" — the student's real temporal context.
- **Prioritization observation:** "Your Chemistry test covers Organic. You might want to focus there." Observation, not planning.
- **Outcome integration:** Test results update learning state for covered Study Units.
- **Study debt computation:** Gap = (assessment scope) - (current learning state on those units).
- **Coaching test pattern:** Most assessments for Indian exam students are coaching tests. The `source: coaching` field makes this explicit and connects assessments to the coaching schedule.

**Design notes:**
- Assessment entry is always optional. Eli works without it — just less usefully.
- Scope can be coarse ("Chemistry") or fine ("Organic Chemistry — Alcohols"). Start coarse.
- Results can be qualitative. "Went well" / "Okay" / "Struggled" is sufficient signal.
- Post-test is a natural Mirror moment with genuinely grounded data.

---

### 9. Learning State (per Study Unit)

**Cluster:** 3 (Learning State)

**What it is:** A computed estimate of how well the student currently knows the material in a Study Unit. Not a score — an estimate that informs retention awareness, review timing, and honest progress confirmation.

**Model:**

| Property | Type | Meaning |
|----------|------|---------|
| `retentionEstimate` | 0.0 - 1.0 | Current estimated retention (1.0 = fully fresh, 0.0 = fully decayed) |
| `lastReinforcedAt` | Timestamp | When the learning state was last meaningfully updated |
| `reinforcementCount` | Integer | How many times the material has been studied with positive verification |
| `decayRate` | Float | How quickly this material decays without review (affected by reinforcement count) |
| `nextReviewSuggested` | Timestamp or null | When this Study Unit is estimated to need review |
| `initialConfidence` | Enum | Starting point: `strong` / `okay` / `weak` / `fresh` (no prior study) |

**How learning state is initialized:**

| Condition | Initial retention estimate |
|-----------|---------------------------|
| Student said "Strong" for the parent Subject | 0.7 (high but not certain — needs verification) |
| Student said "Okay" for the parent Subject | 0.4 (moderate — some knowledge, needs reinforcement) |
| Student said "Weak" for the parent Subject | 0.15 (low — aware of the material but struggling) |
| Student said "Haven't started" or no declaration | 0.0 (fresh — no prior knowledge assumed) |
| Created from curriculum checklist, marked as "already started" | 0.3 (some exposure assumed) |

These are rough starting points. The first assessment result or the first few sessions recalibrate quickly. The point is to avoid treating a well-prepared student as a blank slate.

**How learning state updates:**

| Event | Effect on learning state |
|-------|--------------------------|
| Session: "Covered it" + "Felt solid" | Strong upward update. Decay rate slows. |
| Session: "Covered it" + "Shaky" | Moderate upward update. Decay rate unchanged. |
| Session: "Covered it" + skipped stage 2 | Moderate upward update. Decay rate unchanged. |
| Session: "Partially" | Small upward update. |
| Session: "Got stuck" | No change or tiny upward (attempted). |
| Session: "Didn't get to it" | No change. |
| Time passes without study | Retention decays along the decay curve. |
| Assessment result: strong on scoped units | Confirms retention. Slows decay rate. |
| Assessment result: weak on scoped units | Reduces retention estimate. Increases review urgency. |
| Activity type: `practice` or `mock` | Stronger signal than `reading` or `notes` (active recall > passive). |
| Intent-aware verification: "All of them" | Stronger signal than generic "Covered it" (scope completion confirmed). |

**How learning state appears in the product:**

Learning state should NOT be shown as a number or bar. It powers product behavior:

- **Arrival Surface:** Study Units that are decaying show a subtle indicator — not a score, not a percentage, but a quiet signal like "needs review" or a visual treatment that distinguishes fresh units from fading ones.
- **Completion Surface:** Sage Green confirmation is reserved for sessions that meaningfully improved learning state. A quick review of already-strong material might get a quieter acknowledgment.
- **Review suggestions:** "Thermodynamics might need a review — it's been 3 weeks" is a learning-state-driven observation.
- **Study debt:** "Your Chemistry test covers Organic. Alcohols and Reactions might need attention" — learning state below threshold for assessment-scoped units.

**What learning state does NOT become:**
- No numeric scores shown to the student
- No progress bars or completion percentages
- No comparative rankings between Study Units
- No "you're at 73% mastery" language

The brand's anti-dashboard, anti-performance-theater constraints apply fully.

---

## Object Relationships

```
Student Profile
  │
  ├── has one Coaching Profile
  │
  ├── has many Subjects
  │     └── has many Study Units
  │           ├── has a Learning State
  │           ├── has many Session Commitments
  │           └── has many Study Tasks
  │
  ├── has many Study Sittings
  │     └── has many Session Commitments
  │
  └── has many Assessments
        └── scoped to Subjects and/or Study Units
```

**Cardinality rules:**
- A Student has 1 Profile, 0-1 Coaching Profiles, many Subjects, many Study Units, many Assessments, many Study Sittings, many Study Tasks
- A Subject has many Study Units
- A Study Unit has many Session Commitments, many Study Tasks, and one Learning State
- A Session Commitment belongs to exactly one Study Unit and one Study Sitting, and optionally links to one Study Task
- A Study Task belongs to one Study Unit (optionally) and has a source (coaching/self)
- An Assessment is scoped to one or more Subjects and/or Study Units, and has a source (coaching/school/self/mock)
- A Study Sitting contains one or more Session Commitments

---

## Suggestion Engine (How Tasks Become Companion Observations)

Study Tasks, Learning State, and Assessments are internal data. The student should never feel like they're interacting with a database. The **Suggestion Engine** is the layer that converts internal data into companion-like observations.

### How it works

When Eli needs to make a contextual suggestion (Arrival greeting, within-sitting transition, or on-request), it considers:

1. **Pending Study Tasks** — what has the student told Eli they need to do? Weighted by due date proximity.
2. **Learning State decay** — which Study Units are fading and need review? Weighted by retention estimate.
3. **Assessment proximity** — is there an upcoming test? What does it cover? Which covered Study Units are weakest?
4. **Coaching schedule (soft signal)** — does the schedule suggest coaching happened today? Used for prompt timing, not posture changes. Subject to frequency caps and skip-awareness.
5. **Session history** — what has the student studied recently? What haven't they touched?

From these inputs, Eli selects **one** observation to surface. The observation is always framed as Eli noticing something, not as a task being assigned:

| Internal data | What the student sees |
|--------------|----------------------|
| Task: "HC Verma Ch4 by Friday" + Assessment: "Physics test next week" + Learning State: Mechanics is fading | "Your Physics test is next week. Mechanics might need some practice." |
| Task: "Revise Organic reactions" + Learning State: Organic retention is low + Assessment: "Chemistry test Saturday" | "Your Chemistry test is Saturday. Organic reactions might need attention." |
| No tasks, but Learning State: Thermodynamics decaying + last studied 3 weeks ago | "It's been a while since Thermodynamics. Might be worth a quick review." |
| Coaching schedule suggests coaching today + student opens Eli in evening + prompt frequency cap not hit | "Coming back from coaching? Want to work on something from today?" |
| No tasks, no assessments, all learning states healthy | No suggestion. Just the greeting and topic list. Eli doesn't suggest for the sake of suggesting. |

### The key rule

**If there's nothing useful to say, say nothing.** The Suggestion Engine should remain silent rather than generating noise. A companion that always has a suggestion becomes a nag. A companion that speaks when it has something worth saying is trusted.

---

## How The Model Addresses Each Cluster

### Cluster 1: Academic Context + Coaching Profile
- **Student Profile** captures exam, subjects, timeline, and initial confidence
- **Coaching Profile** captures institute, coaching subjects, and approximate weekly schedule as a soft signal for prompt timing
- **Subject** provides grouping, subject-level aggregation, and optional curriculum checklist
- Lightweight first-session collection replaces the anti-onboarding stance

### Cluster 2: Multi-Layer Study Object
- **Study Unit** is the persistent continuity object with lifecycle states
- **Session Commitment** is the ephemeral action object with activity type, intent, frame, and intent-aware verification
- **Study Task** is an internal data object capturing coaching-assigned and self-declared forward-looking intent; powers the Suggestion Engine but is never shown as a visible list
- **Study Sitting** enables multi-topic study without ceremony

### Cluster 3: Learning State
- **Learning State** on each Study Unit tracks retention, decay, and review readiness
- Initial confidence declaration sets a non-zero starting point for returning students
- Richer verification (Stage 2 + intent-aware) feeds the learning state model
- Activity type affects learning-state update strength

### Cluster 5: Assessment Timeline
- **Assessment** captures upcoming tests (with scope, date, and source) and completed tests (with results)
- Coaching tests are the most common source, connected to the Coaching Profile
- Results update learning state for scoped Study Units
- Study debt = assessment scope minus current learning state on those units

### Cluster 4: Adaptation Fuel
- All objects together provide the evidence the adaptive system needs:
  - **Student Profile + Coaching Profile** → exam context, coaching prompt timing (soft signal), temporal position
  - **Subject + Study Unit + Learning State** → cross-subject patterns, strengths/weaknesses, avoidance detection
  - **Session Commitment + Verification** → interaction diversity, effort quality, activity breadth
  - **Study Task** (internal) → what the student needs to do next; powers the Suggestion Engine's contextual observations
  - **Study Sitting** → within-day patterns, energy dynamics
  - **Assessment** → outcome signal, urgency context, feedback loop closure

---

## How The Model Maps To The Current UX

### Arrival Surface (Cluster 1 + 2)

**Before:** Flat list of free-text topic labels sorted by recency.

**After:** Study Units grouped by Subject. Active units shown, parked/archived hidden. Each unit shows learning-state-driven indicators (fresh vs fading) instead of just recency. Upcoming assessment shown if close ("Chemistry test — Saturday"). One contextual suggestion from the Suggestion Engine if relevant (powered by Study Tasks, learning state, and assessments internally — never a task list). "Something new" becomes "Add a study unit."

**What the Arrival Surface does NOT show:**
- No task list. No "Pending coaching assignments" section.
- No count of unaddressed tasks.
- No due dates on the main surface.
- Tasks power the contextual suggestion, but the suggestion is framed as Eli's observation, not as an obligation list.

### Commitment Surface (Cluster 2)

**Before:** Topic name + "20 min" frame + "Let's go."

**After:** Study Unit confirmed + activity type selection (quick chips: Reading / Practice / Revision / Mock / Notes) + frame pre-filled by activity type + optional intent text + "Let's go." One additional tap (activity type), everything else same speed. If started from a Study Task, activity type and intent may be pre-filled.

### Active Study Surface (unchanged)

Same minimal, quiet surface. Topic name, elapsed time, "I'm done." The model enrichment is invisible during active study.

### Completion Surface (Cluster 2 + 3)

**Before:** 4 options, auto-advance.

**After:** Same 4 options (Stage 1), optionally intent-aware when intent was set. After "Covered it" or "Partially," one optional "Felt solid / Shaky" follow-up (Stage 2). Auto-advance after. Sage Green reserved for sessions that meaningfully improved learning state. If a Study Task was linked internally, it moves to "addressed" — but this status change is invisible to the student. No "task completed" confirmation.

### Within-Sitting Transition (Cluster 2 — new)

**New moment:** After completing a Session Commitment within a Study Sitting, instead of returning to Arrival, the student sees a lightweight prompt:

```
"Continue studying?"
[Pick another Study Unit]  or  [Done for now]
```

If the Suggestion Engine has a relevant observation (powered by tasks, learning state, assessment proximity), it appears as a single companion suggestion — e.g., "Organic reactions might need some time before Saturday." The student can follow the suggestion or pick a different Study Unit. Tapping "Done for now" ends the Sitting and returns to Arrival.

No task list is shown during the transition. The suggestion is one line of Eli's awareness, not a menu of obligations.

---

## What This Model Does NOT Include

- **Coaching institute API integration.** All coaching data is student-declared. No institute cooperation required.
- **Detailed curriculum database.** Subjects and Study Units are student-declared. The optional curriculum checklist offers standard chapter lists for known exams, but never requires formal curriculum import.
- **Social features.** No parent dashboard, no tutor view, no peer features. The model doesn't prevent these later, but doesn't include them now.
- **Full planning system.** Study Tasks capture lightweight intent. There is no weekly planner, no study calendar, no goal hierarchy.
- **Content integration.** No textbook references, no video links, no problem banks. Eli wraps around external study.
- **Numeric scores shown to students.** Learning state powers observations and product behavior. It is never exposed as a number, percentage, or progress bar.
- **Visible task lists.** Study Tasks are internal data that powers Eli's contextual suggestions. They are never shown as a to-do list, a pending count, or an obligation surface. The student sees Eli's observations, not a task manager.
- **Task management.** No priority, no subtasks, no overdue warnings, no completion tracking visible to the student. Study Task status (pending/addressed/expired) is internal bookkeeping only.

---

## Validation Questions

Before locking this model, validate against real student behavior:

1. **First-session flow:** Can a student go from opening Eli to studying in under 45 seconds with the new model? (Exam question + optional coaching + first topic + activity type + begin)
2. **Multi-topic switching:** Does the within-sitting transition feel lighter than a full loop reset? Test with a student who studies 3 subjects in one evening.
3. **Activity type selection:** Do students pick an activity type naturally, or does it feel like a form? Test with real students.
4. **Verification enrichment:** Does the "Felt solid / Shaky" follow-up feel acceptable or burdensome? Test completion flow timing.
5. **Intent-aware verification:** Does "Did you finish problems 1-10?" feel natural when intent was set? Or does it feel like being checked on?
6. **Assessment entry:** Will students actually log upcoming tests? Test whether the entry friction is low enough for regular use.
7. **Study Task entry:** Will students enter coaching assignments regularly? Is 5-second entry fast enough, or does it still feel like overhead? Given tasks are internal (not visible as a list), does the student trust that Eli remembers?
8. **Coaching-day prompts:** Does "Did your coaching assign anything?" feel helpful or nagging? Test frequency and timing.
9. **Suggestion credibility:** Does Eli's single contextual suggestion feel like a companion noticing something, or does it feel like a hidden to-do list leaking through? Test with students who have 1 task vs 5 tasks.
10. **Pull access for tasks:** When the student asks "What should I work on?" or "What did coaching assign?", does the conversational response feel supportive or does it feel like revealing a hidden obligation list? Test the framing.
11. **Subject grouping:** Does the grouped Arrival Surface feel organized or over-structured? Test with 3-5 subjects and 10-15 active Study Units.
12. **Learning state indicators:** Do "fading" indicators on the Arrival Surface feel helpful or anxiety-inducing? Test against the brand's anti-pressure constraint.
13. **Initial confidence:** Does "How are you feeling about Physics?" feel natural or like an assessment? Test the phrasing.
14. **Curriculum checklist:** Do students engage with "here are the standard chapters" or does it feel like a syllabus import?
15. **Auto-park:** Does auto-parking inactive Study Units feel helpful or surprising? Test the threshold.

---

## Next Steps

1. Walk through real student scenarios (daily routine of a JEE/NEET student) end-to-end with this model
2. Validate against the 6 design constraints in `10-object-model-dependency-analysis.md`
3. Identify any remaining gaps or contradictions
4. Lock the model and begin updating upstream docs
