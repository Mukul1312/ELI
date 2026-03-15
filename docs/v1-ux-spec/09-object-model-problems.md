# Object Model Problems

This document catalogs the fundamental problems with the current product object model (Session, Study Thread, Curriculum Context) that were surfaced during a design-director audit of the full documentation stack.

These problems are severe enough to block V1 shipment. The object model must be rethought before the UX spec can be finalized.

This document does not propose solutions. Its job is to make the problem space fully visible so that any redesign addresses the complete set of issues rather than patching them one at a time.

## Current Object Model (What The Docs Define)


| Object             | Definition                  | Student sees              | V1 behavior                           |
| ------------------ | --------------------------- | ------------------------- | ------------------------------------- |
| Session            | One bounded study attempt   | Implicit in flow          | One session, one topic, one loop pass |
| Study thread       | Ongoing line of work        | "Topic" (free text label) | Student types whatever they want      |
| Curriculum context | Optional academic structure | Nothing                   | Fully deferred                        |


Source docs:

- `docs/product-experience-architecture/04-structural-product-model.md`
- `docs/v1-ux-spec/01-v1-product-form.md`

## The Root Tension

The brand promises adaptive, observant companionship. The V1 data model gives Eli almost nothing to observe.

- Free-text topic labels → no structure to reason over
- Time-only frames → no scope to verify against
- 4-option self-report → no granularity to learn from
- External study → no direct observation of behavior
- No curriculum context → no academic grounding
- No hierarchy → no ability to see patterns across related work

The adaptive system (State × Phase × Mirror) is sophisticated. The data feeding it is thin.

## Problem Themes

The 34 problems cluster into ten themes:

| Theme | Problems | Core issue |
|---|---|---|
| A. Object model is too flat | 1, 5, 12, 15, 18, 19 | Free-text topics with no hierarchy, no lifecycle, no grouping |
| B. Signal set is too thin | 6, 7, 8, 9, 16 | Eli can't observe enough to power the adaptive system it promises |
| C. Session model is too rigid | 2, 13, 14 | One-topic, one-session, full-ceremony loop doesn't match real study patterns |
| D. No temporal/contextual awareness | 11, 17, 20 | No exams, no deadlines, no cross-subject view, no external schedule |
| E. Lifecycle gaps | 3, 4, 10 | No topic lifecycle, no quality model, no social context |
| F. No feedback loop | 21, 22, 23 | Eli adapts but can't learn if adaptations work; no outcome signal; Phase gates are hollow |
| G. No student profile | 24, 25, 26 | Eli doesn't know who the student is, what they're preparing for, or what they need |
| H. Cold-start severity | 27, 28 | Generic phase may outlast the product's useful window; no early signal collection |
| I. No forward-looking model | 29, 30, 31 | Entirely retrospective; no plans, no study debt, no gap analysis |
| J. No learning dynamics model | 32, 33, 34 | No retention decay, no spaced repetition, "covered" treated as permanent |


---

## Theme A: Object Model Is Too Flat

### Problem 1: "Topic" is too flat for how students organize work

**Description:** A student preparing for JEE, NEET, or board exams thinks in terms of subjects (Physics, Chemistry, Math), chapters (~30-40 per subject), and sub-areas within chapters. The current model offers one layer: a free-text topic label. This forces naturally hierarchical study organization into a flat list.

**Real-world example:** A student studying Organic Chemistry might create topic labels like "Organic Chemistry," "Organic — Alcohols," "Organic reactions," and "Chemistry revision." These are all part of the same subject and partially overlapping, but Eli sees them as four unrelated strings. The student has no way to express the relationship between them, and Eli has no way to infer it.

**Consequence:** Eli cannot group related work, cannot reason about subject-level patterns, and cannot help the student see their own study structure. The continuity object (topic list) becomes a collection of disconnected labels rather than a structured picture of what the student is working through.

**Affected docs:**

- `docs/product-experience-architecture/04-structural-product-model.md` (product object model)
- `docs/v1-ux-spec/01-v1-product-form.md` (topic model decisions)
- `docs/v1-ux-spec/03-arrival-surface.md` (topic list as primary continuity)
- `docs/v1-ux-spec/08-embedded-continuity.md` (continuity mechanics)

---

### Problem 5: The topic list becomes a graveyard

**Description:** After a few weeks of use, the Arrival Surface topic list accumulates topic labels that the student created but will never return to — one-off sessions, misspelled entries, test-specific cramming topics, and duplicates. The list is sorted by recency, so active topics may be buried below stale ones the student happened to touch recently.

**Real-world example:** A student uses Eli for 3 weeks and has typed: "Organic Chemistry," "Thermo," "Physics Ch4," "Math — Integration," "Organic — Alcohols," "Thermodynamics numericals," "Chemistry revision," "Math formulas," "Physics — Waves," "Organic Chemistry again." Ten topics. Some are duplicates. Some are sub-areas of others. Some are dead. The Arrival Surface shows a flat, messy list of 10 equal-weight cards.

**Consequence:** The product's main continuity surface becomes noisy within weeks. The student scrolls past dead topics to find the one they care about. This is the anti-pattern the product is designed to reject: clutter before clarity. Recency sorting means a topic touched once yesterday sits above a topic studied 8 times over the past month. Recency is not importance.

**Affected docs:**

- `docs/v1-ux-spec/03-arrival-surface.md` (topic list, ordering)
- `docs/v1-ux-spec/08-embedded-continuity.md` (ordering behavior, removal)
- `docs/product-experience-architecture/04-structural-product-model.md` (continuity definition)

---

### Problem 12: No concept of coverage or gaps

**Description:** A student preparing for NEET has ~97 chapters across Physics, Chemistry, and Biology. They have studied some of them at various depths. They have not touched others. Eli has no concept of "what exists to be studied" and therefore no concept of "what has been touched vs. untouched." It can only see what the student has explicitly created topic labels for.

**Real-world example:** A student has studied 40 of 97 chapters. They have Eli topic labels for maybe 15 of those (some chapters were studied without using Eli, some chapters were lumped under broader labels). Eli sees 15 topic strings. It cannot tell the student "you haven't touched Optics" because it does not know that Optics is a chapter that exists in the student's syllabus.

**Consequence:** Eli cannot help the student identify gaps in their preparation. A companion that cannot acknowledge "you haven't worked on Physics in two weeks" because it does not understand that Physics is a subject containing chapters is a companion with a very limited view. The student must track coverage themselves, which is exactly the overhead Eli should reduce.

**Affected docs:**

- `docs/product-experience-architecture/04-structural-product-model.md` (curriculum context, deferred)
- `docs/v1-ux-spec/01-v1-product-form.md` (curriculum context not surfaced)
- `docs/product-experience-architecture/02-core-experience-model.md` (product job #2: clarify the next step)

---

### Problem 15: No concept of "how the student is doing" at the subject level

**Description:** Students, parents, and coaching institutes think about preparation at the subject level. "How is your Physics going?" is a real question. Eli tracks individual topic labels with no aggregation to the subject level. There is no way to see subject-level patterns, imbalances, or trends.

**Real-world example:** A student has done 8 sessions on various Organic Chemistry topics, 2 on Physical Chemistry, and 0 on Inorganic Chemistry. Their Chemistry preparation is heavily skewed. Eli cannot surface this because it does not know that "Organic — Alcohols," "Organic reactions," and "Chemistry revision" all belong to Chemistry, let alone to different branches of Chemistry.

**Consequence:** Eli cannot support the most common self-assessment question a student has: "Am I giving enough time to each subject?" The companion sees trees but not the forest. Cross-subject balance, which is critical for multi-subject exams, is invisible.

**Affected docs:**

- `docs/product-experience-architecture/04-structural-product-model.md` (product object model, no subject concept)
- `docs/product-experience-architecture/02-core-experience-model.md` (product job #1: meet the student where they are)

---

### Problem 18: Topic removal is irreversible and lossy

**Description:** The current model for removing a topic is: long-press → "Remove" → gone. No archive. No undo. No confirmation dialog. The student's entire session history associated with that topic label disappears from the visible continuity surface.

**Real-world example:** A student finishes Chapter 4 — Thermodynamics and removes it from the active list to reduce clutter. Three weeks later, before the final exam, they want to revise Thermodynamics. The topic is gone. They must create a new one. The session count, the continuity, and the thread identity start from zero. The student lost their study history by trying to keep their list clean.

**Consequence:** For a product that promises "continuity" and has a brand law of "reconnection over reset" (law 6 in `02-core-identity.md`), permanent deletion of the continuity object is a direct contradiction. Students are forced to choose between a cluttered list and lost history.

**Affected docs:**

- `docs/v1-ux-spec/08-embedded-continuity.md` (removal behavior)
- `docs/v1-ux-spec/03-arrival-surface.md` (long-press interaction)
- `docs/eli-brand/02-core-identity.md` (brand law: reconnection over reset)

---

### Problem 19: No distinction between "done with this topic forever" and "done for today"

**Description:** Session completion ("I'm done") closes the current session. But there is no concept of thread-level lifecycle: finishing a chapter, parking a topic for later, or archiving a topic that belonged to a test that has already passed. All topics sit in the same flat list forever until manually removed.

**Real-world example:** A student has studied 15 topics over 2 months. 5 are actively relevant to their upcoming exam. 4 were for a coaching test that happened last month. 3 are chapters they have finished and only need for revision. 3 are one-off labels they will never use again. All 15 appear in the same list. The student has no way to distinguish "active," "parked," "finished," or "dead" within the product.

**Consequence:** Recency sorting does not solve this. A topic from 3 weeks ago that the student needs to revise before the final exam sinks below topics from yesterday. Recency is not relevance. Without lifecycle states, the topic list cannot meaningfully organize itself as the student's preparation evolves over weeks and months.

**Affected docs:**

- `docs/v1-ux-spec/08-embedded-continuity.md` (topic lifecycle)
- `docs/v1-ux-spec/03-arrival-surface.md` (topic list behavior)
- `docs/product-experience-architecture/04-structural-product-model.md` (study thread definition)

---

## Theme B: Signal Set Is Too Thin

### Problem 6: Self-report verification is too coarse to be useful over time

**Description:** The four verification options — Covered it / Partially / Got stuck / Didn't get to it — are good for emotional honesty in a single moment. But they do not accumulate into anything the adaptive system can use meaningfully. After 20 sessions, Eli knows: this student said "Covered it" 12 times and "Partially" 6 times across 8 different topic labels. That is barely a signal.

**Real-world example:** A student says "Covered it" for both a 15-minute passive formula glance and a 90-minute deep problem-solving session. Eli treats them identically. It cannot distinguish between a student who has been doing shallow review for 3 weeks and a student who has been doing deep, effortful practice. Both look the same in the data.

**Consequence:** The self-report is honest and non-judgmental (correct for the brand), but it is too thin to power the adaptive system the brand promises. The EI engine needs signal to determine state (Gentle / Focus / Momentum) and phase progression (Arrival → Attunement → Familiarity). "Covered it" 12 times across 8 topics is insufficient evidence for meaningful adaptation.

**Affected docs:**

- `docs/v1-ux-spec/06-completion-surface.md` (self-report options)
- `docs/product-experience-architecture/05-state-architecture.md` (state needs signal)
- `docs/product-experience-architecture/06-phase-architecture.md` (phase progression is evidence-based)
- `docs/eli-brand/03-adaptive-expression.md` (adaptation requires knowing what the student needs)

---

### Problem 7: The frame ("20 min") creates false boundedness

**Description:** The session frame is positioned as an invitation to make beginning feel manageable. But the default is time-based ("20 min"), and the product treats time-based and task-based frames identically. The frame does not inform verification, does not inform continuity, and does not inform adaptation. It exists to make commitment feel bounded but connects to nothing downstream.

**Real-world example:** Student A accepts "20 min" and studies passively for 20 minutes. Student B types "Finish practice problems 1-10" and studies for 45 minutes until they finish. Student B gave Eli much richer signal about scope and intent, but the product treats both frames identically — neither the Completion Surface nor the continuity system uses the frame content.

**Consequence:** The frame is decorative. It performs the emotional job of making beginning feel bounded, but it wastes the richest voluntary signal the student provides. A student who describes what they intend to do is telling Eli something meaningful — and Eli ignores it.

**Affected docs:**

- `docs/v1-ux-spec/04-commitment-surface.md` (frame field behavior)
- `docs/v1-ux-spec/06-completion-surface.md` (verification does not reference frame)
- `docs/product-experience-architecture/02-core-experience-model.md` (product job: make progress believable)

---

### Problem 8: "Study happens outside Eli" creates an attribution problem

**Description:** Eli's model depends on the student studying externally and honestly reporting back. This means Eli's picture of the student's study life is extremely low-resolution: topic label, elapsed time, and a 4-option self-report. Eli does not know what the student actually did, how focused they were, whether they were distracted, what material they covered, or whether it was effective.

**Real-world example:** A student commits to "Organic Chemistry, 20 min," puts the phone down, and reads a textbook for 40 minutes. Eli knows: topic string, 40 minutes elapsed, and "Covered it." It does not know whether the student read 2 pages or 20, whether they did active recall or passive reading, or whether they understood what they read.

**Consequence:** The brand promises "Eli reads where the student is and adjusts how it shows up." The reality is: Eli reads *that* the student showed up and *what label they typed.* The gap between the brand promise and the system's actual observational capability is large. This is not a problem to solve by adding surveillance — it is a problem to solve by rethinking what signals the product can ethically and usefully collect.

**Affected docs:**

- `docs/eli-brand/01-brand-thesis.md` (Eli's unit of work is behavior)
- `docs/eli-brand/03-adaptive-expression.md` (adaptation requires reading where the student is)
- `docs/product-experience-architecture/05-state-architecture.md` (state selection needs input signals)
- `docs/v1-ux-spec/05-active-study-surface.md` (ambient surface, minimal data)

---

### Problem 9: No model for study quality or difficulty

**Description:** Two students both study "Organic Chemistry" and both say "Covered it." But one spent 20 minutes passively reading and the other spent 90 minutes grinding through hard problems. Eli treats both identically. There is no concept of how difficult the material was, how effortful the session was, whether the student was in active recall vs. passive review, or whether the session moved the needle on understanding.

**Real-world example:** A student does 30 sessions on Organic Chemistry, all "Covered it." Eli shows "30th session" in Sage Green, confirming activity. But the student still does not understand key reactions because all 30 sessions were passive reading. The product confirmed effort, not learning. The Sage Green confirmation moment carries false meaning.

**Consequence:** The brand's "grounded momentum" promise means the student should feel that "every session moves something forward." But the product has no way to distinguish a high-value session from a low-value one. Confirmation becomes activity confirmation, not progress confirmation. Over time, this makes Eli feel like a habit tracker with better copy.

**Affected docs:**

- `docs/eli-brand/02-core-identity.md` (emotional promise: grounded momentum)
- `docs/v1-ux-spec/06-completion-surface.md` (confirmation treatment)
- `docs/v1-ux-spec/08-embedded-continuity.md` (session count as progress)
- `docs/product-experience-architecture/02-core-experience-model.md` (product job: make progress believable)

---

### Problem 16: No model for what the student already knows vs. what they need to learn

**Description:** Progress in the current model means: you showed up (session count) and you said you covered it (self-report). That is activity progress, not learning progress. The Layer 2 retrieval check that would test actual understanding is deferred to Pass 2. Without it, the "grounded progress" promise is structurally hollow.

**Real-world example:** A student has done 15 sessions on Physics topics and said "Covered it" each time. Eli has no way to know whether the student actually understands kinematics, whether they can solve problems, or whether they would pass a test on the material. The product can only say "you studied 15 times," which is effort tracking, not learning companionship.

**Consequence:** If V1 establishes the loop without any learning verification, students will develop a mental model of Eli as "the app that counts my sessions." That mental model is extremely hard to change later. The brand says "truth before performance theater" — but confirming unverified effort as progress is itself a form of performance theater.

**Affected docs:**

- `docs/eli-brand/02-core-identity.md` (brand law: truth before performance theater)
- `docs/v1-ux-spec/01-v1-product-form.md` (Layer 2 verification deferred)
- `docs/product-experience-architecture/02-core-experience-model.md` (product job: make progress believable)

---

## Theme C: Session Model Is Too Rigid

### Problem 2: The one-session-one-topic constraint doesn't match study reality

**Description:** The current model requires one full loop pass (Arrival → Commitment → Active Study → Completion) per topic. Students frequently study 2-3 subjects in a sitting, or switch between activities within a study period. The ceremony-per-session ratio becomes painful when the student wants to study multiple things.

**Real-world example:** A student wants to study Physics for 1 hour, then Chemistry for 1 hour, then Math for 1 hour. That requires 3 full loop passes: 3 arrivals, 3 commitments, 3 completions. Each transition adds friction. Alternatively, the student lumps everything into one vague topic ("Evening study") — which destroys the thread's continuity value.

**Consequence:** The product forces a choice between two bad options: excessive ceremony (multiple full loops per study sitting) or meaningless labels (one vague topic covering multiple subjects). Neither supports the product promise of making study feel clear and manageable. Real study behavior is multi-topic, and the model penalizes it.

**Affected docs:**

- `docs/v1-ux-spec/01-v1-product-form.md` (one session per loop pass, no multi-topic sessions)
- `docs/product-experience-architecture/03-experience-spine.md` (loop as the primary structure)
- `docs/v1-ux-spec/04-commitment-surface.md` (single topic commitment)

---

### Problem 13: Revision and first-learning are different activities — Eli treats them the same

**Description:** When a student says "Organic Chemistry," they might mean first-pass learning, revision, practice problems, deep practice on hard problems, or a quick formula review before a test. These are fundamentally different study activities with different durations, cognitive demands, and value. The product model collapses all of them into one flat object: a session with a topic label.

**Real-world example:** A student does a first-pass reading of a new chapter (high effort, uncertain understanding) and a quick 10-minute formula review before a test (low effort, consolidation). Both are "Organic Chemistry" sessions. Both get the same self-report options. Both look identical in the data. Eli cannot tell that one was learning and the other was maintenance.

**Consequence:** The adaptive system cannot distinguish between a student who has been doing shallow review for weeks and a student who has been doing deep, effortful first-learning. The companion's ability to "read where the student is" is undermined because activity type is invisible. This also affects the Mirror system: patterns that appear meaningful ("you keep coming back to Organic Chemistry") may be trivial if most sessions are quick reviews.

**Affected docs:**

- `docs/product-experience-architecture/05-state-architecture.md` (state adaptation needs activity-type signal)
- `docs/product-experience-architecture/10-content-architecture.md` (content behavior should differ by activity type)
- `docs/v1-ux-spec/04-commitment-surface.md` (commitment does not capture activity type)

---

### Problem 14: The return model assumes voluntary, daily engagement — real patterns are bursty

**Description:** The experience spine assumes a rhythm: return → orient → commit → work → close → return again. Real exam student behavior is bursty: coaching days leave no time for Eli, self-study days may involve 3-4 rapid sessions, pre-test periods involve intense multi-hour study with rapid topic switching, and post-test periods involve days of low motivation.

**Real-world example:** A student's week: Monday-Wednesday in coaching class 6-8 hours (no Eli). Thursday self-study: 4 sessions across 3 subjects in 5 hours. Friday: pre-test cramming, 6 rapid topic switches. Saturday: test day, no study. Sunday: slump, opens Eli once, closes without committing. The product's "one calm loop per visit" model fits Thursday poorly, fits Friday very badly, and is irrelevant on Monday-Wednesday and Saturday.

**Consequence:** The loop ceremony that feels calm and grounded for a single session becomes friction when multiplied across a real study day. Students who study intensively need lower-ceremony ways to move between topics. The product's emotional design (calm, unhurried) conflicts with the student's operational reality (time-pressured, multi-subject, bursty).

**Affected docs:**

- `docs/product-experience-architecture/03-experience-spine.md` (loop as the primary model)
- `docs/v1-ux-spec/01-v1-product-form.md` (single-route, loop-centered product)
- `docs/product-experience-architecture/09-interaction-principles.md` (reduce ceremony around starting)

---

## Theme D: No Temporal/Contextual Awareness

### Problem 11: Exam prep is finite — Eli has no concept of time horizon

**Description:** An exam student is not studying indefinitely. They have board exams, entrance exams (JEE, NEET), coaching tests, unit tests, pre-boards, and mock exams — all with specific dates. What to study today is heavily influenced by what is being tested next. Eli has no concept of any exam, deadline, or test schedule.

**Real-world example:** A student is 3 days from their Chemistry unit test. They need to prioritize Chemistry over other subjects. Eli shows all topics with equal weight, sorted by recency. It cannot say "your Chemistry test is in 3 days" because it does not know the test exists. The student must hold their entire exam calendar in their head while Eli acts as if study is open-ended.

**Consequence:** Without a time horizon, Eli cannot meaningfully adapt its suggestions, frame size, or urgency posture. The brand says "Eli reads where the student is" — but *where* includes *when.* A student 3 months from the exam and a student 3 days from the exam have radically different needs. Eli treats them identically.

**Affected docs:**

- `docs/product-experience-architecture/01-product-thesis.md` (product territory)
- `docs/product-experience-architecture/05-state-architecture.md` (state should respond to temporal pressure)
- `docs/eli-brand/03-adaptive-expression.md` (adaptation should be responsive to context)

---

### Problem 17: The companion metaphor breaks under multi-subject pressure

**Description:** A real companion — a study partner, a tutor, a friend — can help a student prioritize across subjects. "You've been doing a lot of Math this week. Your Chemistry test is on Saturday. Maybe switch?" This requires knowing the subjects, knowing the test schedule, and having a cross-subject view. Eli's model is deliberately narrow: one thread at a time, one session at a time.

**Real-world example:** A student has 5 subjects, 3 tests next week, and does not know how to allocate their time. Their real anxiety is not "I can't start Thermodynamics" — it is "I have too many things to study and not enough time." Eli helps with starting, not with prioritizing. But for an exam student, prioritization is often the harder problem.

**Consequence:** The gap between "companion" and "planner" may not be as large as the docs assume. A companion that observes "you've been heavy on Math, light on Chemistry, and your Chemistry test is in 3 days" is not planning — it is observing. It is exactly what the brand says Eli does: reading where the student is. But the data model cannot support this observation because it lacks subject-level grouping and temporal awareness.

**Affected docs:**

- `docs/eli-brand/01-brand-thesis.md` (Eli does not replace coaching, but must it ignore the student's real constraints?)
- `docs/product-experience-architecture/02-core-experience-model.md` (product job #2: clarify the next step)
- `docs/product-experience-architecture/01-product-thesis.md` (product territory: adaptive support)

---

### Problem 20: No model for coaching institute integration

**Description:** In India, the dominant exam prep model is coaching institutes (Allen, Fiitjee, Aakash, Unacademy, etc.). These institutes set the study schedule, assign homework, conduct tests, track performance, and communicate with parents. A student using Eli alongside their coaching prep has two systems that do not talk to each other.

**Real-world example:** A student's coaching institute has assigned "finish HC Verma Chapter 4 problems by Friday" and scheduled a test on Mechanics for Saturday. Eli does not know about either. The student opens Eli and sees "What are you working on today?" — but the answer is already determined by their coaching schedule. The Commitment Surface asks the student to declare what they already know.

**Consequence:** For most target users, the study plan already exists externally. Eli's "what are you working on today?" question duplicates a decision the student has already made. The product does not need to become an LMS integration, but the object model should acknowledge that for most exam students, study context is externally driven. Without this, Eli sits beside the student's real study life without touching it.

**Affected docs:**

- `docs/eli-brand/01-brand-thesis.md` (boundary assumption: Eli needs a study ecosystem to wrap around)
- `docs/product-experience-architecture/04-structural-product-model.md` (anti-drift rule: thread-first, taxonomy-second)
- `docs/v1-ux-spec/04-commitment-surface.md` (topic declaration assumes student-driven choice)

---

## Theme E: Lifecycle Gaps

### Problem 3: Curriculum context being fully deferred may leave V1 feeling generic

**Description:** The docs are careful to maintain "thread-first, taxonomy-second" and to avoid becoming a syllabus manager. That is the right instinct. But the consequence in V1 is that Eli knows nothing about the student's academic world. It cannot group related topics, cannot surface subject-level patterns, and cannot provide orientation beyond recency.

**Real-world example:** A student who has been using Eli for a month opens the app. They see a flat list of topic labels sorted by recency. Eli cannot say "you've been working on Physics a lot this week but haven't touched Chemistry" because it does not know those are subjects. The "companion" feels like a blank notebook that remembers labels, not a companion that understands what the student is studying.

**Consequence:** The question is whether Eli feels like a companion that knows what the student is studying, or a blank notebook that remembers strings. V1 defers curriculum context entirely, which protects against syllabus-manager drift but also ensures the product feels structurally generic. The companion has no academic awareness at all.

**Affected docs:**

- `docs/v1-ux-spec/01-v1-product-form.md` (curriculum context not surfaced in V1)
- `docs/product-experience-architecture/04-structural-product-model.md` (curriculum context defined but deferred)
- `docs/product-experience-architecture/07-surface-architecture.md` (Arrival Surface: study thread with optional curriculum context)

---

### Problem 4: The study thread is doing two jobs at once

**Description:** The study thread (surfaced as "topic") is simultaneously the continuity object (what carries forward between sessions) and the commitment object (what the student chose to work on right now). These are not always the same thing. "Organic Chemistry" is a thread the student is working through over weeks. "Revise alcohol reactions for 30 min" is what they are committing to right now.

**Real-world example:** A student has been working on "Organic Chemistry" as an ongoing thread. Today they specifically want to do "practice problems on Alcohols." Should they create a new topic ("Organic — Alcohols practice") or reuse the existing one ("Organic Chemistry")? If they create a new one, the list grows and fragments. If they reuse the existing one, the commitment loses specificity — they committed to "Organic Chemistry" which is too broad to mean anything for this particular session.

**Consequence:** The single-layer model forces the student to choose between meaningful continuity (broad, reusable labels) and meaningful commitment (specific, session-level labels). It cannot support both simultaneously. This tension will express itself as either a messy list (too many specific labels) or meaningless labels (too few broad ones).

**Affected docs:**

- `docs/product-experience-architecture/04-structural-product-model.md` (session vs study thread)
- `docs/v1-ux-spec/04-commitment-surface.md` (topic as commitment)
- `docs/v1-ux-spec/08-embedded-continuity.md` (topic as continuity)

---

### Problem 10: The model assumes solo, self-directed study

**Description:** The product model assumes the student returns autonomously, picks a topic, studies alone, and self-reports. Real exam students in India study in coaching batches, do homework assigned by tutors, study with friends, and have parents or tutors checking on their progress. Their study decisions are often externally driven.

**Real-world example:** A student's mother asks "what did you study today?" The student has no Eli-provided answer beyond topic labels and session counts. A coaching tutor wants to know if the student completed their assigned practice set. Eli cannot confirm this because it does not know what was assigned or whether the student actually did it. A student studies with a friend and they quiz each other — this collaborative activity does not map to Eli's solo session model.

**Consequence:** Eli's value proposition depends on being useful within the student's real study ecosystem. But the model acknowledges only one actor (the student) and one mode (solo, self-directed). For students whose study life is shaped by coaching schedules, parental oversight, and peer collaboration, Eli is blind to the social and institutional context of their study behavior.

**Affected docs:**

- `docs/eli-brand/01-brand-thesis.md` (boundary assumption: Eli needs a study ecosystem to wrap around)
- `docs/product-experience-architecture/01-product-thesis.md` (product territory: adaptive support)
- `docs/product-experience-architecture/02-core-experience-model.md` (behavioral stance: companion with narrow job)

---

## Theme F: No Feedback Loop

### Problem 21: Eli adapts but never learns if the adaptation helped

**Description:** The adaptive system shifts between Gentle / Focus / Momentum based on signals. But after shifting, there is no mechanism to evaluate whether the adaptation was effective. Did the student start? Did they complete? Was the session longer or shorter than usual? Did the posture change help or hurt? The system adjusts and then forgets it adjusted.

**Real-world example:** Eli detects low-energy signals and shifts to Gentle: fewer choices, softer copy, lower commitment bar. The student starts a session — or doesn't. Either way, Eli has no way to close the loop. It cannot learn "Gentle worked for this student in this condition" or "Gentle wasn't enough, something else was needed." Next time the same signals appear, Eli makes the same adjustment with the same zero evidence about whether it works.

**Consequence:** A truly adaptive system requires a feedback loop: observe → adapt → observe effect → refine. Without it, the adaptive system is a one-way function — it reads signals and produces a posture, but never improves its own calibration. Over time, the system cannot get better at serving the student because it has no mechanism for learning from its own behavior.

**Affected docs:**

- `docs/eli-brand/03-adaptive-expression.md` (adaptation model assumes responsiveness, not learning)
- `docs/product-experience-architecture/05-state-architecture.md` (state selection has no outcome feedback)
- `docs/product-experience-architecture/06-phase-architecture.md` (phase progression has no effectiveness signal)

---

### Problem 22: No connection to test scores or external outcomes

**Description:** Students take tests and get scores. Those scores are the single most meaningful signal about whether study is working. A student who studied Organic Chemistry 20 times and scored 30% on the unit test needs fundamentally different support than a student who scored 90%. Eli is completely disconnected from outcomes.

**Real-world example:** A student has been using Eli for 6 weeks. They have 40 sessions logged across Physics, Chemistry, and Math. They just got their coaching test results: 85% in Physics, 45% in Chemistry, 70% in Math. This is the most important information about their study effectiveness. Eli does not know any of it. It continues to show all topics with equal weight, confirms all sessions in Sage Green, and cannot adjust its posture to reflect that Chemistry needs urgent attention.

**Consequence:** The brand promises "grounded momentum" and "truth before performance theater." But without any outcome signal, Eli is confirming effort while the student may be failing. Sage Green on "Chemistry — done. 15th session." feels hollow when the student just scored 45% on their Chemistry test. That is not grounded confirmation — it is effort theater dressed up as progress. The product cannot distinguish between productive study and unproductive study because it never sees results.

**Affected docs:**

- `docs/eli-brand/02-core-identity.md` (emotional promise: grounded momentum; brand law: truth before performance theater)
- `docs/product-experience-architecture/02-core-experience-model.md` (product job: make progress believable)
- `docs/v1-ux-spec/06-completion-surface.md` (confirmation moment assumes effort = progress)

---

### Problem 23: Phase progression has no evidence gate in practice

**Description:** The Phase model states that progression from Arrival → Attunement → Familiarity is "evidence-based, not tied to hard-coded session counts." But the current data model provides extremely limited evidence: topic labels (strings), session counts (numbers), self-reports (4 options), and elapsed time (minutes). The Phase system requires "interaction diversity," "signal confidence," and "demonstrated tolerance for more adaptive expression" — none of which can be meaningfully measured from this data.

**Real-world example:** A student has used Eli for 3 weeks. They have 15 sessions across 6 topics. Eli has: 15 topic strings, 15 timestamps, 15 self-reports, and 15 elapsed-time values. Is this enough evidence to move from Arrival to Attunement? The Phase model says Attunement requires "repeated behavior in enough moments to notice light patterns." But "the student has done 15 sessions" is a session count, which the model explicitly says it should not rely on. What other evidence is there? The self-reports are too coarse. The topic labels are unstructured strings. There is no interaction diversity metric and no way to measure signal confidence.

**Consequence:** In practice, Phase progression will either advance on weak evidence — making Attunement and Familiarity feel premature and breaking the "earned, not forced" principle — or it will stall indefinitely because the evidence threshold can never be met with the available data. Either outcome undermines the Phase system. The architecture defines a sophisticated maturity model, but the data model cannot power it.

**Affected docs:**

- `docs/eli-brand/05-brand-phases.md` (phase progression is evidence-based)
- `docs/product-experience-architecture/06-phase-architecture.md` (phase variables and product behavior)
- `docs/eli-brand/03-adaptive-expression.md` (phase answers "how much Eli has earned the right to do")
- `docs/eli-brand/11-open-questions-and-decisions.md` (open question #1: what evidence is sufficient for Familiarity?)

---

## Theme G: No Student Profile

### Problem 24: Eli doesn't know the student's exam, subjects, or academic context

**Description:** At no point does Eli learn what exam the student is preparing for, what subjects the exam includes, what coaching institute the student attends, or what their study schedule looks like. The product collects none of this — not at onboarding (explicitly rejected as ceremony), not gradually over time, not ever. Eli adapts to session-level behavior without any understanding of who the student is or what they are trying to accomplish.

**Real-world example:** Two students use Eli. Student A is preparing for JEE Advanced (Physics, Chemistry, Math — highly competitive). Student B is preparing for 10th board exams (broad syllabus, moderate difficulty). Their study needs, time pressure, subject count, and difficulty levels are radically different. Eli treats them identically because it does not know either of these facts. The "adaptive companion" is adapting to micro-signals while missing the macro-context entirely.

**Consequence:** A companion that does not know you are preparing for NEET, that your exam is in 5 months, and that you study Physics, Chemistry, and Biology is operating blind. It can adjust posture session-to-session but cannot make any decision that requires understanding the student's overall situation. The adaptation is local (this session, this moment) but never contextual (this student, this preparation, this timeline).

**Affected docs:**

- `docs/eli-brand/01-brand-thesis.md` (Eli adjusts how it shows up — but based on what context?)
- `docs/eli-brand/03-adaptive-expression.md` (specificity lever: "how much insight is Eli allowed to express?")
- `docs/product-experience-architecture/01-product-thesis.md` (product territory: adaptive support)
- `docs/v1-ux-spec/07-first-session.md` (first session collects one topic label and nothing else)

---

### Problem 25: No model for the student's strengths, weaknesses, or confidence

**Description:** A student is strong in Math, weak in Chemistry, and terrified of Organic reactions. This shapes everything: what they avoid, what they need encouragement on, where Gentle is most needed, where Momentum is safe. Eli has no concept of subject-level confidence or difficulty. It treats every topic label with equal weight and every session with equal emotional posture.

**Real-world example:** A student consistently avoids Chemistry topics — long gaps between Chemistry sessions, shorter sessions when they do study it, more "Got stuck" and "Partially" reports. Meanwhile, Math sessions are frequent, long, and mostly "Covered it." The pattern is visible in the raw data, but Eli cannot interpret it because it does not know that Chemistry and Math are subjects, does not know they carry different difficulty for this student, and has no model for subject-level confidence.

**Consequence:** The brand's adaptive expression model (Gentle for lower capacity, Momentum for higher capacity) is designed to respond to the student's current condition. But "current condition" is deeply shaped by the *topic.* A student may need Momentum for Math and Gentle for Chemistry on the same day. Without a model for per-subject confidence, the State system can only adapt to session-level signals, missing the most important variable: how the student feels about *this particular subject.*

**Affected docs:**

- `docs/eli-brand/04-brand-states.md` (states respond to current needs — but needs vary by subject)
- `docs/product-experience-architecture/05-state-architecture.md` (state variables are topic-agnostic)
- `docs/product-experience-architecture/10-content-architecture.md` (content behavior should differ by student confidence)

---

### Problem 26: No concept of the student's study style or preferences

**Description:** Some students study best in long blocks. Some do better with short, frequent sessions. Some are morning studiers. Some are night owls. Some prefer reading first, then problems. Some go straight to practice. Eli has no model for any of this. The "20 min" default frame is the same for every student, every topic, every time of day, every study mode.

**Real-world example:** A student consistently studies in 45-60 minute blocks. Every session, they clear the "20 min" default and either type their own frame or go frameless. Eli sees this pattern (40+ sessions where the frame was changed or cleared) but cannot learn from it. The next session, it suggests "20 min" again. A real companion would notice: "You usually study for about an hour. Want to set that as your frame?"

**Consequence:** The brand says "the best study companion adjusts to the student rather than asking the student to adjust to the product." But without a model of the student's preferences, Eli can only adjust to the current moment, never to the person. Every session starts with the same defaults regardless of what the product could have learned from weeks of prior sessions. The companion has no memory of who it's talking to.

**Affected docs:**

- `docs/eli-brand/01-brand-thesis.md` (Eli adjusts to the student, not the other way around)
- `docs/eli-brand/02-core-identity.md` (anchor belief: trust grows when the product adapts to the student)
- `docs/v1-ux-spec/04-commitment-surface.md` (frame suggestion logic: same default every time)

---

## Theme H: Cold-Start Severity

### Problem 27: Eli starts knowing nothing and exam prep is finite

**Description:** The product starts at Arrival phase: generic, non-presumptuous, immediate-context-only. The Phase model says Eli earns the right to be more specific over time through repeated evidence. But exam prep is time-bounded — typically 6-12 months for a major exam, and the student may only discover Eli partway through. The product's most valuable capability (adaptive, specific companionship) is locked behind a maturation process that may not complete before the exam arrives.

**Real-world example:** A student discovers Eli 3 months before NEET. The Phase model starts at Arrival. With the current signal set (topic labels, session counts, self-reports), how many sessions before Eli has enough evidence to move to Attunement? If it takes 4-6 weeks of regular use, Eli spends half the remaining preparation window being generic. The student needed a companion that could help them prioritize across Biology, Physics, and Chemistry from day one. Instead, they got a product that says "What are you working on today?" for weeks before it can offer anything more specific.

**Consequence:** The Phase system assumes a long-arc relationship where trust is gradually earned. Exam prep does not afford that luxury. A student 3 months from their exam needs useful adaptation now, not after a 6-week warm-up period. If the product's value proposition only activates after weeks of generic behavior, many students will abandon it before reaching the phase where it becomes genuinely useful. The maturation model conflicts with the time-bounded nature of the use case.

**Affected docs:**

- `docs/eli-brand/05-brand-phases.md` (phase progression assumes gradual trust-building)
- `docs/eli-brand/03-adaptive-expression.md` (specificity is phase-gated)
- `docs/product-experience-architecture/06-phase-architecture.md` (Arrival protects against premature familiarity — but at what cost?)

---

### Problem 28: No onboarding signal collection means the coldest possible start

**Description:** The docs explicitly reject onboarding wizards and setup rituals. That is the right UX instinct — ceremony before value is a known anti-pattern. But the consequence is that Eli collects zero information about the student before the first session. Not their exam. Not their subjects. Not their study schedule. Not their self-assessed strengths or weaknesses. The product guarantees itself the coldest possible start.

**Real-world example:** A real human study companion would ask four questions on day one: "What exam are you preparing for? What subjects? When is it? What are you finding hardest?" Those four answers would give Eli more context than 10 sessions of the current model provide. The product could know: NEET, Physics + Chemistry + Biology, May 2027, struggling with Organic Chemistry. Instead, after 10 sessions, Eli knows: 10 topic strings, 10 timestamps, and 10 self-reports. The human companion is already more useful after 30 seconds than Eli is after 3 weeks.

**Consequence:** The anti-onboarding stance protects against ceremony but guarantees maximum cold-start severity. There is a middle ground between "Step 1 of 4: Tell us about yourself" (rejected, correctly) and "collect nothing, ever" (the current model). A lightweight, non-ceremonial way to learn the student's exam, subjects, and timeline would dramatically reduce cold-start pain without violating the brand's anti-ceremony principle. The current model treats all information collection as onboarding theater, when some basic context is simply a companion learning who it's talking to.

**Affected docs:**

- `docs/v1-ux-spec/07-first-session.md` (first session explicitly rejects setup, intro, or context collection)
- `docs/eli-brand/01-brand-thesis.md` (Eli's value depends on adaptiveness — which requires knowing something)
- `docs/product-experience-architecture/06-phase-architecture.md` (Arrival phase: Eli knows "immediate, situational context only")

---

## Theme I: No Forward-Looking Model

### Problem 29: No concept of study plan or weekly intent

**Description:** The student opens Eli and decides what to study right now. But real exam students think in larger units: "This week I need to finish Thermodynamics and start Optics." "Before Saturday's test I need to revise chapters 3, 4, and 5." The product has no concept of these multi-session intentions. Every session starts from zero context about what the student is trying to accomplish this week, this month, or before the next test.

**Real-world example:** A student plans to cover 5 chapters this week. By Thursday they have done 2. They need to adjust — maybe do shorter sessions on the remaining 3, or prioritize the ones most likely to appear on the test. Eli cannot participate in this reasoning because it has no concept of a multi-session plan. The student manages their plan entirely in their head (or a notebook) while Eli sits beside them, unaware.

**Consequence:** A companion that cannot hold a plan alongside the student is a companion for individual moments, not for a preparation journey. The product helps the student start each session but cannot help them navigate the larger arc of their preparation. The entire product model is retrospective — it records what happened but has no concept of what should happen.

**Affected docs:**

- `docs/product-experience-architecture/03-experience-spine.md` (loop is session-scoped, not plan-scoped)
- `docs/product-experience-architecture/02-core-experience-model.md` (product job #2: clarify the next step — but "next step" is session-level, not plan-level)
- `docs/product-experience-architecture/01-product-thesis.md` (product territory refuses planning — but does observation of a plan equal planning?)

---

### Problem 30: No concept of falling behind or study debt

**Description:** An exam student has a fixed amount of material to cover before a fixed date. Every day that passes without covering it creates implicit debt. The student feels this keenly — "I'm behind" is one of the most common and most stressful exam-prep experiences. Eli cannot acknowledge, quantify, or help manage this feeling because it has no model for what "on track" or "behind" means.

**Real-world example:** A student is 8 weeks from boards. They have covered roughly 60% of the syllabus. They know they are behind because their coaching institute has completed 85%. This gap creates anxiety that shapes everything: whether they attempt hard topics or stick to easy wins, whether they do deep study or surface review, whether they skip a subject entirely. Eli sees none of this. It shows the same flat topic list and the same "What are you working on today?" regardless of whether the student is comfortably ahead or desperately behind.

**Consequence:** The brand's State model (Gentle / Focus / Momentum) should respond to whether the student is under pressure. "Falling behind" is one of the strongest pressure signals in exam prep. But Eli cannot detect it because the product has no model for trajectory — only for the current moment. A student who is falling behind and a student who is comfortably ahead receive the same product experience.

**Affected docs:**

- `docs/product-experience-architecture/05-state-architecture.md` (state should respond to pressure — study debt is a primary pressure source)
- `docs/eli-brand/04-brand-states.md` (Gentle protects against cognitive overload — but "behind" is a major source of overload)
- `docs/eli-brand/03-adaptive-expression.md` (adaptation should be responsive to the student's real condition)

---

### Problem 31: No gap model between current position and required position

**Description:** Even if Eli knew the exam date (Problem 11) and the syllabus (Problem 12), it still has no concept of the vector — the gap between where the student is and where they need to be. "You've covered 60% of Physics and the exam is in 4 weeks" is a position. "You need to cover roughly 10% per week to finish" is a trajectory. "At your current pace of 5% per week, you won't finish" is a gap. The product has none of these concepts.

**Real-world example:** A student has touched 15 out of 30 Physics chapters. The exam is in 6 weeks. They have been covering about 1 chapter per week. At that pace, they will cover 6 more — reaching 21 of 30, leaving 9 uncovered. A tutor would see this and say "you need to accelerate, or prioritize the highest-weight chapters." Eli cannot do this calculation because it has no concept of chapters remaining, pace required, or priority weighting.

**Consequence:** Without a gap model, Eli cannot participate in the most important conversation an exam student has: "Will I be ready?" The companion can help the student start each session, but it cannot help them answer the question that keeps them up at night. This is not planning — it is observation of a trajectory. The brand says Eli observes. A trajectory is something to observe.

**Affected docs:**

- `docs/product-experience-architecture/02-core-experience-model.md` (product job #2: clarify the next step — without trajectory, "next step" is always local)
- `docs/product-experience-architecture/01-product-thesis.md` (product territory: adaptive support — trajectory is context for adaptation)
- `docs/eli-brand/02-core-identity.md` (brand law: truth before performance theater — ignoring a gap is itself a form of theater)

---

## Theme J: No Learning Dynamics Model

### Problem 32: No retention or decay model

**Description:** Study science is clear: learning decays without review. A chapter studied 3 weeks ago and never revisited is fading. The rate of decay depends on the depth of initial learning, the number of prior reviews, and the difficulty of the material. Eli has no concept of any of this. It shows "3 weeks ago" as a recency indicator, but it cannot reason about what that means for the student's actual retention.

**Real-world example:** A student covered Thermodynamics thoroughly 4 weeks ago — deep study, practice problems, "Covered it" reported. They have not touched it since. In their mind, they "know Thermodynamics." In reality, without review, their retention has dropped significantly. If tested today, they might recall 40-50% of what they learned. Eli shows "Thermodynamics — 4 weeks ago" with no indication that the student's knowledge is actively decaying. The continuity surface makes it look like a completed item when it is actually a degrading one.

**Consequence:** The topic list implies that studied topics are "done" — the recency indicator says when you last touched it, not how much you have retained. This creates a false sense of completion. A companion that understands learning should know that old, unreviewed material is at risk. Without a decay model, Eli's continuity surface is misleading — it shows when you studied, not how much you likely still know.

**Affected docs:**

- `docs/v1-ux-spec/08-embedded-continuity.md` (continuity shows recency, not retention state)
- `docs/v1-ux-spec/03-arrival-surface.md` (topic list implies studied = done)
- `docs/eli-brand/02-core-identity.md` (brand law: truth before performance theater — showing recency without retention is misleading)

---

### Problem 33: No spaced repetition awareness

**Description:** Decades of cognitive science research show that the timing of review matters enormously. Reviewing material just before you forget it — spaced repetition — is one of the most effective study strategies known. The product has no concept of optimal review timing. It cannot suggest "you should revisit Thermodynamics soon, it's been 3 weeks" because it has no model for when review becomes necessary.

**Real-world example:** A student has covered 20 chapters across 3 subjects over 2 months. Some chapters were studied once and never revisited. Some were studied twice. A few were studied recently. The optimal study plan would include a mix of new material and strategically timed reviews of old material. But Eli can only show what was studied most recently. It has no concept of "this material is due for review" or "this material is still fresh." The student must manage their own review schedule mentally, which is exactly the overhead Eli is supposed to reduce.

**Consequence:** The brand says Eli helps students study better. Spaced repetition is one of the most powerful ways to study better. A companion that is aware of learning science could help students review at the right times — this is not planning, it is observant support grounded in evidence. But the object model has no representation of retention state, review history, or optimal review timing, making this impossible.

**Affected docs:**

- `docs/eli-brand/01-brand-thesis.md` (Eli helps students study better — spaced repetition is a proven way to study better)
- `docs/product-experience-architecture/02-core-experience-model.md` (product job #4: make progress believable — unreviewed progress is not believable)
- `docs/v1-ux-spec/01-v1-product-form.md` (Layer 2 retrieval checks deferred — but the object model doesn't support them either)

---

### Problem 34: "Covered" is treated as a permanent state, but learning is not permanent

**Description:** The Completion Surface records "Covered it" as a final state for the session. The session count accumulates. The continuity system treats the topic as having been worked on. But learning is not a permanent state — it degrades over time. A topic "Covered" 6 weeks ago without review is in a fundamentally different state than a topic "Covered" yesterday. The product model treats them as identical: both are "covered" sessions in the count.

**Real-world example:** A student has "Covered it" on Organic Chemistry 10 times over the past 2 months. The first 5 sessions were 6-8 weeks ago, covering basic reactions. The last 5 were recent, covering advanced mechanisms. The early material is fading. The recent material is fresh. But Eli shows "10th session" as if all 10 sessions contributed equally to the student's current knowledge. The session count implies cumulative progress when the reality is that some of that progress has decayed.

**Consequence:** The "grounded progress" promise requires that progress confirmation actually corresponds to real learning state. If Eli confirms "10th session" in Sage Green when the student's actual retention is much less than 10 sessions' worth of learning, the confirmation is misleading. Grounded progress should mean progress that accounts for how learning actually works — including the fact that it fades without reinforcement.

**Affected docs:**

- `docs/eli-brand/02-core-identity.md` (emotional promise: grounded momentum — momentum that ignores decay is not grounded)
- `docs/v1-ux-spec/06-completion-surface.md` (session count as confirmation)
- `docs/v1-ux-spec/08-embedded-continuity.md` (session count as continuity signal)
- `docs/product-experience-architecture/02-core-experience-model.md` (product job #4: make progress believable)

---

## What This Document Does Not Do

This document catalogs problems. It does not:

- propose solutions
- prioritize which problems to solve first
- recommend changes to the object model
- suggest which problems are V1-critical vs. deferrable

Those decisions belong in the next phase: object model redesign. The purpose of this document is to ensure that any redesign addresses the full problem space rather than patching individual symptoms.

## Next Steps

1. Validate that this problem set is complete (are there more problems we have not named?)
2. Identify which problems are structurally related and must be solved together
3. Explore candidate object models that address the clustered problem set
4. Validate candidate models against real student behavior
5. Lock a revised object model before updating the UX spec

