# EI — UX Design Brief for Design Agency

**Version:** 1.0 · **Date:** February 2026
**Prepared by:** Mukul (Founder)
**For:** For Product Experience/UX Team

---

> **How to use this document**
> This is the single source of truth for your UX engagement. Read it top to bottom once, then use sections 6–8 as your working reference during design. You do not need to read any other files unless we share them explicitly. The glossary at the end maps student-facing language to internal terms if you ever encounter engine vocabulary.

---

## 1. Product Narrative — Why We Exist

### The Invisible Problem: "Silent Decay"

Hundreds of thousands of students in India prepare for JEE and NEET — the most competitive engineering and medical entrance exams in the world. They study 8–12 hours a day, attend coaching institutes, take mock tests, and still feel like something is going wrong that they can't name.

The problem is not effort. The problem is **invisible decay** — a gradual breakdown in study quality (passive reading, subject avoidance, skipped verification, poor sleep) that nobody notices for 2–3 weeks. By the time a student's mock test score drops, the behavioral damage is already 3 weeks old.

Here is what students say when they're in this state:

> *"I'm studying seriously, but my scores aren't improving."*
> *"I don't know exactly what I'm doing wrong."*
> *"I revise, but I still forget."*
> *"I feel anxious and guilty even after studying."*
> *"Something is off, but I can't identify it."*

The key insight: **these students believe the problem is within themselves — not the system.** They feel confused, not lazy. And they have no tool that helps them see what's actually happening.

### The Institute's Blind Spot

Coaching institutes — the B2B buyers of this product — are no better off. They measure student progress through test scores (a lagging indicator). By the time they identify a student at risk, the behavioral damage is already weeks old. A student can disappear slowly through avoidance and burnout without a single flag being raised until their rank drops.

What institutes desperately need: **leading indicators** that show who is at risk 2–3 weeks before test scores fall, without invading student privacy.

### The Pivot: Execution Intelligence (EI)

We are building **Execution Intelligence (EI)** — a B2B platform that:

- Gives **students** an async private coaching layer ("ELI") that negotiates their study plan in real-time, detects behavioral decay early, and guides them through difficult sessions without ever feeling like surveillance.
- Gives **institutes** a privacy-safe "Radar" dashboard showing which students are at execution risk (aggregated signals only — no raw student content).

**For institutes:** We call this "Rank Insurance." We show them who is burning out *before* scores fall, using behavioral leading indicators instead of test results.

**For students:** ELI is a "Private Wealth Manager" for their time — an async AI that fixes their study debt without exposing their insecurities to teachers or coaching staff.

---

## 2. Who We Are Designing For

### 2.1 The Student (Primary Surface: Mobile App)


|                       | Details                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| **Age**               | 16–22 years                                                               |
| **Context**           | JEE/NEET aspirant; studies 8–12 hrs/day; enrolled in a coaching institute |
| **Tech relationship** | Daily smartphone user; skeptical of "productivity apps"                   |
| **Core fear**         | "This app will spy on me and report my weakness to my institute"          |
| **Core desire**       | "Help me fix my problems without making me feel worse about myself"       |
| **Emotional range**   | Guilt, anxiety, overconfidence, avoidance, genuine ambition               |


The student **must trust ELI before they will use it honestly**. If the app ever feels like a surveillance tool, they will stop using it or game it. Every design decision must protect this trust relationship.

### 2.2 Initial Student Archetypes (The 7 Students You Are Designing For)

These initial archetypes are drawn from real behavioral patterns. Design must work for all of them — not just the "ideal" student.


| Archetype                         | Behavior pattern                                                        | What they need                                               |
| --------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| **S1 — The Topper**               | High integrity, verifies consistently, starts quickly                   | Don't patronize; give harder challenges                      |
| **S2 — The Revenge Planner**      | High energy + high pressure after bad mock → overscopes → freezes       | Negotiate scope down, reduce start friction                  |
| **S3 — The Stalled Starter**      | Good intentions, high procrastination, decent once engaged              | Tiny first actions; no judgment for slow starts              |
| **S4 — The Flowing-but-Avoidant** | Starts fast, looks productive, never verifies                           | Gentle but firm: "session doesn't count without proof"       |
| **S5 — The Burnout Risk**         | Low energy, high pressure, going silent (days without study)            | Re-entry must be tiny, calm, zero-guilt — no streak counters |
| **S6 — The Grinder**              | High effort, always verifies, but wrong technique — low recall          | Technique pivot, not volume increase                         |
| **S7 — The Ambitious Collector**  | Loves starting new topics, defers verification → pending checks pile up | "Clear 1 check first, then go big" as a design pattern       |


### 2.3 The Institute Admin (Secondary Surface: Web Dashboard)


|                        | Details                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| **Role**               | Academic Head, Batch Mentor, or Counsellor at a coaching institute                              |
| **Device**             | Laptop/desktop (dashboard)                                                                      |
| **Goal**               | Identify at-risk students early; assign intervention before rank drops                          |
| **Hard constraint**    | **Must never see raw student content** — no chat, no "why they skipped," no private reasons     |
| **Trust relationship** | Institute trusts us to give them actionable signals; students trust us to protect their privacy |


---

## 3. The Solution: The Swiss Bank Model

EI has a "two-faced" architecture built around a hard privacy firewall.


|                    | **Student App (Face 1)**                                             | **Institute Radar (Face 2)**                                |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Who sees it**    | Student only                                                         | Institute Academic Head / Mentor                            |
| **Role**           | "The Private Wealth Manager"                                         | "Rank Insurance"                                            |
| **What goes in**   | Energy taps, topic choices, session end choices (verify/skip), sleep | Nothing — data flows only one way                           |
| **What comes out** | Real-time negotiation at 3 gates (scope, start, proof)               | Privacy-safe risk alerts with evidence summaries            |
| **The promise**    | *"We hide your secrets. We fix your study debt."*                    | *"We tell you who is at risk — without raw diary content."* |


**The privacy firewall is non-negotiable.** The institute never sees:

- Why a student skipped a session
- What the student journaled or said
- Raw event logs or private reasons
- Individual session details

The institute only sees: aggregated metrics (rates, counts, trends) + alert type + recommended action.

### The Escalation Ladder (How ELI Intervenes)

ELI intervenes only at **natural decision points** — never adding extra check-ins to the student's day. When signals worsen, it escalates:

**Level 1 — The Nudge** *(low friction)*

> Trigger: 2+ pending checks, or first schedule missed.
> Action: 1-tap choice at session end. *"Close 1 pending check now (1 question) or schedule for tomorrow?"*

**Level 2 — The Consult** *(short coaching message)*

> Trigger: 3+ pending checks, or repeated avoidance.
> Action: Brief elder-brother message + constraint. *"You're active, but proof is lagging. Today, let's close the oldest check first — tiny verify, then continue."*

**Level 3 — The Intervention** *(human escalation)*

> Trigger: 3+ days of silence, or burnout trajectory.
> Action: Institute mentor is alerted (via Radar) for a welfare check. No private content is shared. The mentor initiates a 1:1.

---

## 4. Core UX Philosophy — The "Elder Brother" Principle

Every product and UX decision must be evaluated against these 6 principles. If a design idea violates any of them, it should be revised.

### Principle 1: Minimal Friction at Gates

The three interaction moments (AppOpen, IntentSet, SessionEnd) must each take **5–20 seconds**. ELI never adds extra pop-ups, notifications, or "how was your day?" check-ins between natural gates. Friction is the enemy of compliance.

### Principle 2: No Shame Language — Ever

Every message ELI sends must be calm, brief, and evidence-based. **Never judgmental.** The difference:


| ❌ Don't                                  | ✅ Do                                                           |
| ---------------------------------------- | -------------------------------------------------------------- |
| "You skipped 3 days. Get back on track." | "Welcome back. Let's keep it tiny today."                      |
| "You have 4 unfinished topics."          | "You have 4 pending checks. Let's close 1 first."              |
| "You're not meeting your targets."       | "Today's energy is low — smaller scope keeps the loop moving." |
| "You need to verify more."               | "Quick check so this session counts."                          |


### Principle 3: Elder Brother, Not Task Manager

ELI **negotiates at the margin** — it adjusts scope, difficulty, and timing within the student's own plan. It never:

- Builds a day-by-day schedule
- Assigns specific study hours
- Tells the student what to study (only adjusts how much and how hard)
- Takes over the student's calendar

Think of ELI like a wise older sibling who says: *"Your plan is yours. I just make sure it's realistic for today."*

### Principle 4: Trust Equals Privacy

The student must feel safe sharing honest inputs (low energy, high pressure, skipping with reason). This safety comes from:

- Knowing their inputs stay between them and ELI
- Knowing the institute gets only numbers, never quotes
- Seeing that ELI uses their inputs to help them, not to report them

Privacy must be **visible in the design** — not just promised in a terms page.

### Principle 5: Tiny Proof Beats Vague Effort

The verification ask at session end is almost always **1 question in 2 minutes**. It is not a test. It is not an exam. It is a signal that the session "counted." This small act prevents the biggest behavioral risk: studying without retaining anything.

The UX must make this ask feel effortless, not threatening.

### Principle 6: Autonomy Returns When Integrity Improves

The more consistently a student does tiny proofs and starts on time, the **fewer prompts** they see. ELI backs off — fewer messages, more freedom to choose hard topics, less gate friction. Consistency is rewarded with autonomy, not more surveillance.

Design must communicate this loop to the student: "The more you trust us, the less we interrupt you."

---

## 5. The Three Key Interaction Moments

ELI interacts with the student at exactly three points, mirroring their natural study flow. Everything else in the app is navigation or history — not coaching.

```
AppOpen → IntentSet → [Study Happens] → SessionEnd
   ↑                                           |
   |___________ (next session) _______________|
```

---

### 5.1 AppOpen — "How's your energy today?"

**When it fires:** Every time the student opens the app to start a study session.

**Purpose:** ELI reads the student's current state to route the session correctly (scale back or push harder).

#### What is always asked:

**Energy** — segmented chip, 5 options:


| Label         | Number | What it feels like    |
| ------------- | ------ | --------------------- |
| **Sharp**     | 5      | Locked in, high drive |
| **Good**      | 4      | Ready to work         |
| **Okay**      | 3      | Average capacity      |
| **Low**       | 2      | Heavy / head tired    |
| **Exhausted** | 1      | Can barely focus      |


Prompt text: *"How's your energy right now?"*

#### What is sometimes asked (conditional):

- **Sleep** — once per day, first session only (or when ELI needs more context): `Sleep-debt (<6h)` / `Low sleep (6–7h)` / `Okay sleep (7–8h)` / `Fully slept (≥8h)`
- **BacklogPressure** — how behind the student feels: `On track` / `Mostly on track` / `Some pending` / `Behind` / `Drowning`

#### What is optionally tapped by the student:

- **"More context" button** → reveals **Pressure**: `Calm` / `Slightly tense` / `Uneasy` / `Very stressed` / `Panicky`

**Critical UX note:** High Pressure can coexist with High Energy. A student who scored badly on a mock can have "Good (4)" energy but "Panicky (5)" pressure. ELI reads both and routes to smaller scope — not to "work harder." This is the "revenge planning" trap — high energy after a bad result triggers overscoping, which leads to freezing.

#### UI Design Rules:

- **Control type:** Segmented chips (never sliders, never dropdowns)
- **Labels always visible;** numbers are secondary (shown small) or hidden entirely
- **No color coding for "bad" states** — Exhausted (1) is a valid input, not a red flag to the student
- Target: student completes AppOpen in under 10 seconds on most days

---

### 5.2 IntentSet — "What are you studying today?"

**When it fires:** After AppOpen, when the student chooses what to study.

**Purpose:** The student declares their plan. ELI may reframe it — either scaling back scope (if energy/pressure signals indicate overreach) or nudging toward harder difficulty (if the student is in a strong state but being too easy on themselves).

#### What the student picks:

- **Topic** (from their syllabus — could be a dropdown or search)
- **TaskType:** `Learn` (first time understanding) / `Practice` (solve questions) / `Revise` (refresh + consolidate)
- **DifficultyTier:** `Easy (1)` / `Medium (2)` / `Hard (3)` / `Advanced (4)`

Prompt for DifficultyTier: *"How hard should this feel today?"*
Microcopy guardrail: *"Hard = better questions, not more hours."*

#### What ELI may output:

- **Neutral:** Keep the plan, minor scope adjustment (±10–20%)
- **Rescue:** Reduce scope; keep difficulty the same or drop one tier. *"Today's energy is low — shorter scope, same quality."*
- **Boost:** Keep scope; raise difficulty one tier. *"You're fully charged. Let's raise the bar."*

#### The "Pending Checks" gate (key design moment):

If the student has **3 or more pending checks** (topics they studied but haven't verified yet), ELI shows a **two-button deal card** before allowing a new topic:

> *"You have 3 pending checks. Deal: clear the oldest one first (5–8 min), then go big."*
> `[ Clear oldest check now ]` `[ Clear one check tomorrow (24h reminder) ]`

**UX notes:**

- This is framed as a "deal," not a block — the student always has a choice
- Keep this card calm and brief (no lecture)
- Never show this as a red warning state
- The two options both involve clearing debt — there is no "skip debt entirely" escape hatch at this gate

---

### 5.3 SessionEnd — "Quick check so this session counts"

**When it fires:** When the student indicates they're done studying for this topic/session.

**Purpose:** This is the most important gate. ELI must get some form of proof-of-learning (or a committed schedule for it). This is what prevents "passive learning" — studying for hours and retaining nothing.

#### The ask:

> *"Quick check so this session counts."*

Three and only three choices:


| Button                      | What it means                      | ELI outcome                                                                               |
| --------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `Do 1 question now (2 min)` | Student verifies right now         | 1 question set; tiny; non-threatening                                                     |
| `Remind me tomorrow (24h)`  | Student commits to verify tomorrow | Time-bound reminder; becomes a pending check                                              |
| `Skip (Reason)`             | Student skips entirely             | Must pick a reason; rate-limited (too many skips triggers tighter verification next time) |


#### Skip Reason picker (never free-text in v1):

`Time` / `Fatigue` / `Confusion`

**Note on scheduling:** "Remind me tomorrow" is valid, but only counts if honored. If the student keeps choosing it but never follows through, ELI starts preferring "Do 1 question now" at the next session end.

#### Pending checks counter:

The student should see a **Pending checks: X** indicator that updates live. When it goes down, that is a win. When it hits 0, that is a celebratory moment.

**UX notes — this is the most trust-sensitive gate:**

- Frame as "integrity, not exam" — 1 question is not a test
- "Quick check so this session counts" is better than "Prove what you learned"
- The skip option must exist (students have hard days) but must require a reason
- Never show a streak counter for skipped sessions
- If the student always skips, ELI adjusts quietly — smaller scope next time, tighter default — without shaming

---

## 6. Student UX Scales — Complete Reference

All student-facing inputs use one of these scales. Design should be consistent across every screen.

### Energy (Required at AppOpen)


| Label         | Number | Felt sense            | What student can do             |
| ------------- | ------ | --------------------- | ------------------------------- |
| **Sharp**     | 5      | Locked in, high drive | Hard problems, long focus block |
| **Good**      | 4      | Ready to work         | Normal study + one stretch      |
| **Okay**      | 3      | Average capacity      | Regular practice / revision     |
| **Low**       | 2      | Heavy / head tired    | Small tasks, short blocks       |
| **Exhausted** | 1      | Can't focus           | Minimum viable win, recovery    |


What ELI does: Lower energy → suggests smaller scope and tiny proof. Higher energy → allows harder work, still keeps proof-of-learning intact.

### Pressure (Optional / Conditional)


| Label              | Number | Felt sense      | What it looks like                 |
| ------------------ | ------ | --------------- | ---------------------------------- |
| **Panicky**        | 5      | Racing thoughts | Hard to start, urgent/guilty       |
| **Very stressed**  | 4      | Restless        | Can't settle, keeps checking phone |
| **Uneasy**         | 3      | Distracted      | Mind keeps jumping                 |
| **Slightly tense** | 2      | Mild pressure   | Noticeable but manageable          |
| **Calm**           | 1      | Clear           | No urgency feeling                 |


What ELI does: High pressure → reduce planning load (smaller scope, calmer prompts). **Important:** High pressure + high energy = "revenge planning" risk → ELI specifically negotiates scope *down*, even when energy is high.

### BacklogPressure (Conditional — once/day or on risk days)


| Label               | Number | Felt sense         | What it looks like          |
| ------------------- | ------ | ------------------ | --------------------------- |
| **Drowning**        | 5      | Too much pending   | "I'll never finish this"    |
| **Behind**          | 4      | Big pending pile   | Avoids hard topics          |
| **Some pending**    | 3      | Manageable backlog | Needs prioritization        |
| **Mostly on track** | 2      | Small pending      | Can follow plan             |
| **On track**        | 1      | No backlog worry   | Can push quality/difficulty |


What ELI does: Higher backlog → bias toward clearing pending checks before starting new topics.

### Sleep (Conditional — once/day, first session)


| Label           | Sleep bucket |
| --------------- | ------------ |
| **Sleep-debt**  | < 6h         |
| **Low sleep**   | 6–7h         |
| **Okay sleep**  | 7–8h         |
| **Fully slept** | ≥ 8h         |


What ELI does: Lower sleep → shorter blocks and minimal proof; avoid "go harder" prompts.

### TaskType (At IntentSet)


| Label        | Contract value | What it means                                                |
| ------------ | -------------- | ------------------------------------------------------------ |
| **Learn**    | `learn`        | First-time understanding (lecture, video, concept)           |
| **Practice** | `practice`     | Solve questions (DPP, PYQs, problem sets)                    |
| **Revise**   | `revise`       | Refresh + consolidate (spaced revision, formula run-through) |


### DifficultyTier (At IntentSet)


| Label        | Tier | Anchor         | Example                            |
| ------------ | ---- | -------------- | ---------------------------------- |
| **Advanced** | 4    | Highest signal | Mixed/advanced traps, "rank-level" |
| **Hard**     | 3    | Stretch        | Tough PYQs / tricky sets           |
| **Medium**   | 2    | Standard       | Regular practice set               |
| **Easy**     | 1    | Warm-up        | Basics, confidence builder         |


Microcopy rule: *"Hard = better questions, not more hours."*

### Global Design Rules for All Scales

- **Control type:** Segmented chips (5 options max) — not sliders, not number inputs, not dropdowns
- **Labels always visible** — numbers shown small or hidden entirely
- **No "bad" color states** — Exhausted, Panicky, Drowning are valid inputs; do not color them red from the student's perspective
- **Single tap to select** — no confirmation dialog, no "Are you sure?"
- **Microcopy:** Show *"Pick the closest. Don't overthink."* once, then hide it after the first few uses

---

## 7. Student Journeys — 3 Annotated Storyboards

These are real 21-day journeys showing how ELI behaves with different student types. Use these as the foundation for user flow diagrams, screen designs, and prototype scenarios.

---

### Journey S2 — The Revenge Planner (After a Bad Mock)

**Who:** Smart and hardworking. After a bad mock test result, they try to "fix everything in one day." High energy, high guilt.

**The trap:** High pressure + high energy = overscoping → they plan 3 hard topics → they stare at the screen for 20 minutes and don't start → guilt rises → the cycle repeats.

**The fix:** ELI reduces scope (not motivation), makes the first action tiny (2-minute start), and keeps session-end proof minimal (1 question). The goal is to break the freeze-guilt loop.


| Day               | What happens                                                                   | ELI response                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Day 1**         | Energy: Good (4), Pressure: Panicky (5) → student sets "2 hours + hard topics" | *"Your drive is real. But today's pressure is high. Let's make a plan you can actually start."* → 30-minute scope, medium difficulty |
| **Day 1 (cont.)** | Student stares and doesn't start                                               | ELI shows: *"We're not committing to hours. Just 2 minutes."* → `[Start 2 minutes]` `[Make plan smaller]`                            |
| **Day 1 end**     | SessionEnd                                                                     | Buttons: `Do 1 question now (2 min)` / `Remind me tomorrow (24h)` / `Skip (Reason)`                                                  |
| **Days 3–4**      | Pressure eases slightly; student tries to go big again                         | *"When pressure rises, big plans make you freeze. Let's win small today."*                                                           |
| **Day 15**        | Stable routine forming                                                         | ELI sets 2 plain rules (guardrails, not a plan): "On pressure days, pick smaller scope." "End every session with one tiny check."    |
| **Day 21**        | Pending checks: 1–2 (bounded)                                                  | *"Pressure days don't break you anymore — you still start."*                                                                         |


**Key design takeaways:**

- Always ask Pressure separately from Energy — they can both be high at the same time
- The fix for "revenge planning" is scope negotiation, not motivational messages
- Frame ELI's constraint as: *"Let's make a plan you can actually start"* — not as "your plan is unrealistic"

---

### Journey S5 — The Burnout Risk (Going Silent)

**Who:** Low energy, high pressure, feeling very behind. Has stopped opening the app for 2–3 days.

**The trap:** Silence spirals into more guilt. Too many notifications or prompts after silence cause the student to uninstall or ignore the app entirely. Re-entry must feel safe, not punishing.

**The fix:** ELI waits. When the student returns, it greets them without referencing the silence, offers the tiniest possible win, and rebuilds momentum slowly over 3 weeks.


| Day                | What happens                                                                                  | ELI response                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Day 1**          | Energy: Low (2), Sleep-debt (<6h), Pressure: Very stressed (4), BacklogPressure: Drowning (5) | *"No speeches. Let's keep it tiny. Just one small step today."*                                            |
| **Days 2–3**       | Student goes silent                                                                           | ELI does not spam notifications. Waits.                                                                    |
| **Day 4 (return)** | Student opens app again                                                                       | *"Welcome back. Today is not a comeback story. It's a 5-minute win."* → `[5-minute win]` `[I can do more]` |
| **Day 4 (cont.)**  | IntentSet: Revise / Easy (1)                                                                  | ELI frames it as an option: "Open one page / solve just Q1 / write 3 key points."                          |
| **Day 4 end**      | SessionEnd                                                                                    | `Do 1 question now (2 min)` / `Remind me tomorrow (24h)` / `Skip (Reason)`                                 |
| **Days 8–10**      | Returning to app regularly, Energy: Okay (3)                                                  | *"One pending check first, then anything else."*                                                           |
| **Day 15**         | Stable recovery                                                                               | Two guardrails: "Sleep first. Keep sessions short." "Do one tiny check at the end."                        |
| **Day 21**         | Pending checks: bounded                                                                       | *"You came back."* (simple, no drama)                                                                      |


**Key design takeaways:**

- **Never show a "You missed X days" counter or streak counter** — this actively causes dropout
- "Welcome back" beats any reference to the silence
- Re-entry sessions must offer the tiniest possible scope — never push hard topics
- A 5-minute win is a real win; celebrate it

---

### Journey S7 — The Ambitious Collector ("Pending Checks" Pile Up)

**Who:** High energy, ambitious, loves starting new topics. Consistently defers verification ("I'll check later") — pending checks accumulate and recall suffers.

**The trap:** Student looks productive (studying a lot, starting fast) but never closes loops. Over time, they can't recall anything they studied. ELI must correct this without making them feel lazy.

**The fix:** The "deal card" pattern — "Clear 1 pending check first, then go big." Used repeatedly until it becomes a habit.


| Day                | What happens                                       | ELI response                                                                                                                                                      |
| ------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Day 1**          | Energy: Sharp (5), sets Integration / Learn / Hard | SessionEnd: `Remind me later` → Pending checks: 1                                                                                                                 |
| **Days 2–3**       | Keeps starting new topics, keeps deferring         | Pending checks: 3                                                                                                                                                 |
| **Day 4 (mirror)** | Tries to start another new topic                   | ELI: *"You're working hard. But you have 3 pending checks. That's why recall starts feeling shaky."* → `[Clear 1 pending check first]` `[Start new topic anyway]` |
| **Day 5 (deal)**   | Tries again                                        | *"Deal: clear 1 pending check first, then go big."* → `[Clear oldest check now]` `[Clear one check tomorrow (24h reminder)]`                                      |
| **Day 5 end**      | After clearing 1 check                             | SessionEnd: `Do 1 question now (2 min)` — student taps it. Pending checks start going down.                                                                       |
| **Days 8–10**      | New routine: clear 1, then build                   | ELI shows a two-step card: Step 1: "Clear 1 pending check (5 min)." Step 2: "New topic / hard practice."                                                          |
| **Day 15**         | Two weekly rules                                   | "Keep pending checks ≤ 2." "New topic comes after you clear 1 check today."                                                                                       |
| **Day 21**         | Pending checks: 1–2 (bounded)                      | *"You're not just studying — you're closing the loop."*                                                                                                           |


**Key design takeaways:**

- **"Pending checks"** is the primary student-facing debt metric — design it as a friendly, shrinkable number (not a red badge of failure)
- The "deal card" pattern (constraint framed as a two-button choice) is a core repeating UI pattern in ELI — use it across many screens
- The two-step card (clear 1 → then new topic) is a powerful UX moment for this archetype
- Students who clear pending checks should see visual celebration — this is the metric that matters most

---

## 8. Institute Dashboard — The Radar

The institute dashboard has one purpose: help a mentor or academic head **quickly identify which students need intervention**, and give them one clear next action — using only aggregated, privacy-safe data.

### The Triage Screen

**Layout:** One row per student. One primary alert per student (no duplicate entries). Sorted by urgency.


| Column                 | Content                             |
| ---------------------- | ----------------------------------- |
| **Student**            | Name + batch (no private notes)     |
| **Severity**           | `red` (act now) or `yellow` (watch) |
| **Primary Alert**      | One of 5 alert types (see below)    |
| **Evidence**           | 2–4 aggregated numbers only         |
| **Last Updated**       | Timestamp                           |
| **Recommended Action** | 1-liner                             |
| **Owner (optional)**   | Assigned mentor                     |


### Alert Types (Priority Order)


| Priority    | Alert Type           | Meaning                                                     | Evidence shown                    | Example action                                        |
| ----------- | -------------------- | ----------------------------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| 1 (highest) | **Silence**          | Student has not been active for 2–3+ days                   | SilenceDays                       | Welfare check via 1:1 mentor call                     |
| 2           | **IntegrityDebt**    | Too many unfinished learning loops                          | OpenLoops count, ScheduleMisses7d | "Close 1 loop before new topic" guidance for 1 week   |
| 3           | **VerificationDrop** | Student studying without proof                              | VerificationRate7d                | Assign short daily verification drill                 |
| 4           | **BurnoutRunway**    | Energy/sleep/anxiety worsening over 7 days                  | StateTrend indicator              | Reduce volume expectations; recommend mentor check-in |
| 5 (lowest)  | **SubjectAvoidance** | Student hasn't touched a weak/priority subject for 5–7 days | AvoidanceLatency                  | Schedule targeted doubt-solving session               |


**Severity rules:**

- **Red:** Act now (SilenceDays ≥ 3, OpenLoops ≥ 3, VerificationRate < 60%, 3+ consecutive burnout signals)
- **Yellow:** Watch (trends moving in the wrong direction but not yet critical)

**Deduplication:** One primary alert per student. If multiple conditions are true, show only the highest-priority one. Secondary conditions can appear as supporting evidence fields.

### Institute Actions (v1)

What mentors can do from the Radar screen:

1. **Assign mentor owner** — tag a team member to this student
2. **Mark acknowledged** — remove noise without dismissing the alert
3. **Trigger playbook message** — send a pre-approved, non-shaming template message to the student
4. **Schedule intervention slot** — book a supervised verification or catch-up session
5. **Escalate to 1:1 check** — for Silence or Burnout only; content of the 1:1 is gathered privately in-person, not via the dashboard

### Hard Privacy Constraints for Radar Design

The following **must never appear** in the institute dashboard — these are non-negotiable:

- Raw event logs or session activity feeds
- "Why they skipped" reasons or text
- Student-written notes, journaling, or private inputs
- Per-minute activity tracking
- Quotes or paraphrased content from student sessions
- Chat transcripts with ELI

Evidence fields show only: numbers, rates, day counts, and coarse trend labels (improving / flat / worsening). Never raw text.

---

## 9. UX Do's and Don'ts — Quick Reference Card

### Do

- Use the student's first name in ELI messages (personalization in microcopy)
- Show "Pending checks" as a friendly, shrinkable number — celebrate when it goes down
- Keep every in-app interaction under 20 seconds (gate moments are 5–20s)
- Frame every constraint as a choice (deal card pattern: two buttons, both valid)
- Use elder brother tone — calm, brief, evidence-based, never preachy
- Reduce ELI prompts when the student is consistent for 7+ days (autonomy reward)
- Make "1 question in 2 minutes" feel effortless and non-threatening
- Show the student when their behavior improves ("You're not just studying — you're closing the loop")
- Make the "Welcome back" moment warm and pressure-free after any silence
- Show labels on all scales, keep numbers secondary

### Don't

- Show a streak counter for missed sessions or days of silence
- Use shame language: "You skipped X days," "You're falling behind," "You missed your target"
- Make ELI feel like a productivity tracker or time-logging app
- Add any check-in, notification, or prompt outside of the 3 natural gates
- Reveal any student data, text, or reasons to the institute view
- Let "Skip" be the default easy exit — require a reason (but keep reason selection fast)
- Assign specific study hours or time slots — ELI is not a calendar
- Use red / warning colors on low-energy states in the student app (they're valid inputs, not failures)
- Show the student their "score" or "rank" relative to other students in the batch
- Increase session length or volume when the student is in high-energy state — raise difficulty instead
- Send push notifications that reference specific failures ("You haven't verified Thermodynamics since Tuesday")

---

## 10. Design Success Criteria

These are the behavioral outcomes a good UX design should produce. Use them to evaluate prototype decisions and as acceptance criteria.


| Metric                      | Target                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| AppOpen completion time     | < 10 seconds on most sessions                                                                        |
| IntentSet completion        | Student accepts ELI's scope reframe without abandoning the session                                   |
| SessionEnd completion       | Student picks one of the 3 options (rarely closes app without choosing)                              |
| Pending checks over 21 days | Stays ≤ 2 for most users                                                                             |
| Student perception          | Does not feel "watched" or "judged" by the app                                                       |
| Institute usability         | Mentor can identify top 3 at-risk students in < 2 minutes, without training                          |
| Trust signal                | Student willingly shares honest inputs (low energy, skipping with reason) because they trust privacy |


---

## 11. Scope for Design Engagement

### In Scope (v1)

- Student mobile app (iOS/Android): full flow from AppOpen through SessionEnd
- Institute web dashboard: Radar triage screen + alert detail view
- All 6 scales as UI components (Energy, Pressure, BacklogPressure, Sleep, TaskType, DifficultyTier)
- The 3 key gate screens + transitions between them
- The "deal card" component (pending checks gate)
- The two-step card (clear 1 → then build) for S7 pattern
- Empty states, re-entry states (welcome back after silence), first-use onboarding
- ELI's message tone and microcopy style guide

### Out of Scope (v1)

- Calendar/scheduling UI (ELI does not own the calendar)
- Daily task assignment or study plan builder
- Student-facing analytics dashboard or score graphs
- Parent-facing views
- Institute workflow automation (acknowledge, assign, playbook execution) — functional only in v1
- Billing / subscription / coupon flows

---

## 12. Glossary

Use the student-facing terms in all student-facing copy. The internal terms are included here so the design team can understand the spec documents if needed.


| Student-facing term          | Internal term                        | Notes                                                               |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| **Pending checks**           | OpenLoops / WIP                      | Topics studied but not yet verified                                 |
| **Quick check**              | VerifyNow / Protocol 3               | The 1-question verification at SessionEnd                           |
| **Remind me tomorrow (24h)** | ScheduleVerify                       | A committed future verification — becomes a pending check if missed |
| **ELI**                      | The AI / EI engine                   | The persona name for the AI coaching layer                          |
| **Energy**                   | State proxy                          | Used to route Rescue/Neutral/Boost at Protocol 1                    |
| **Pressure**                 | Anxiety                              | Internal spec calls it Anxiety; student-facing term is Pressure     |
| **How behind do you feel**   | BacklogPressure                      | Perceived workload debt                                             |
| **Clear 1 pending check**    | Close-loops-first constraint         | ELI enforces this when OpenLoops ≥ 3                                |
| **Elder brother**            | Design principle / tone model        | The relationship model: calm, brief, evidence-based, non-judgmental |
| **Protocol 1**               | AppOpen gate                         | State → Intent negotiation                                          |
| **Protocol 2**               | IntentSet gate                       | Intent → Effort activation                                          |
| **Protocol 3**               | SessionEnd gate                      | Effort → Retrieval (verification)                                   |
| **Rescue mode**              | Low-energy / avoidant routing        | ELI scales back scope, reduces friction                             |
| **Boost mode**               | High-energy / high-integrity routing | ELI raises difficulty (not volume)                                  |
| **Deal card**                | Two-button constraint card           | "Clear 1 pending check first, then go big" — framed as a choice     |
| **Two-step card**            | Ordered intent card                  | Step 1: clear a check; Step 2: new work                             |
| **Radar**                    | Institute dashboard                  | Privacy-safe triage screen for institute admins                     |
| **StateTrend**               | 7-day trend of energy/sleep/anxiety  | Shows burnout runway for Radar                                      |
| **VerificationRate7d**       | % sessions with proof in last 7 days | Primary integrity metric                                            |


---

*End of UX Design Brief v1.0*

*For questions, contact Mukul (Founder). For scope changes or additional scenarios, reference the source specification documents (available on request).*