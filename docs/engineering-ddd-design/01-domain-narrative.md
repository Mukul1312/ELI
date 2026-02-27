# Domain Narrative

> **How to fill:** Extract a one-page narrative from [Unified_Master_Doc.md](../ei/master/Unified_Master_Doc.md) and [EI_Spec.md](../ei/spec/EI_Spec.md). Answer: What problem do we solve? Who are the actors? What is the EI loop? When do we say the system is "working"?

---

## Problem statement

Students face difficulty in finding their shortcoming in study pattern while preparing for competitive exams. To overcome shortcoming, students seek guidance from coaching institutions in the form of structured guidance through multiple test series, study circles, and counselling sessions—but the institutional approach is limited in providing fully personalized guidance to each student because of the default structure of targeting a mass of students in batches. This gap is compounded by **"Silent Decay"**: a gradual breakdown in daily habits (sleep, retrieval, subject avoidance) that goes unnoticed for weeks. Institutes today rely on **lagging indicators** (test scores); by the time a student's score drops, the behavioral damage is already ~2-3 weeks old. EI provides **leading indicators** so decay is detected before scores drop.

---

## Primary actors


| Actor             | Role                                                                                     | Key needs                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student           | End user: person preparing for exams who is being coached                                | Private and Personalized Coach for preparation, day-to-day guidance(like realistic intent, help starting by suggesting topics, verify so student don't trap into passive learning, helping to cover backlogs etc), give feedback on weekly and monthly progress, Help to analyze test and many more.                                                                                              |
| Admin / Institute | Buyer and operator: the coaching institution that runs cohorts and cares about outcomes. | Mainly marketing to attract admissions; visibility into batch progress and individual student reports to counsel students better. (Institute needs are still in discovery.) Spec value: **leading risk signals** (e.g. burnout runway) **weeks before** scores drop ("Rank Insurance"). Radar is **privacy-safe**: aggregated metrics and alert types only, no raw journaling or student content. |
| Ops / System      | Internal: whoever runs and debugs the system (you or a future ops person).               | Ability to trace EI each suggestion, Don't much yet to say here.                                                                                                                                                                                                                                                                                                                                  |


---

## The EI loop (one-line)

$$State \xrightarrow{P1} Intent \xrightarrow{P2} Effort \xrightarrow{P3} Retrieval \to Feedback \to [Strategic\ Adjustment] \to State$$

- State: Student mindset, caliber, past record, etc.
- Intent: Stage at which student spent energy and time to plan strategize new chapter and its topic for learning.
- Effort: Stage at which student spent energy and time to learn it through coaching, self study.
- Retrieval: Stage at which student spent energy and time to practise and revise it.
- Feedback: Stage at which student spent energy and time to validate how much he has assimilated as knowledge and what left.
- Strategic Adjustment: Stage at which student spent energy and time to plan/strategize next topic he needs to cover to fill gaps of unassimilated knowledge.

**What EI does at each gate:**

- **State → P1 → Intent:** EI negotiates intent (scope/difficulty) to match state (Rescue vs Boost vs Neutral).
- **Intent → P2 → Effort:** EI suggests a startable first action to reduce friction or protect focus.
- **Effort → P3 → Retrieval:** EI enforces proof of learning now or a scheduled verification (reduces LoopLatency/OpenLoops).
- **Feedback → Strategic Adjustment → State:** EI (or scheduled synthesis) sets next-cycle dials and constraints (scope, verification minimums, close-loops-first).

---

## What "working" means (validation criteria)

- Student gets what topics knowledge they are lacking.
- Student gets personalized roadmap to improve their study pattern.
- Prevent students to get into panic and over confidence zone.
- Institute can market this product as their USP.
- Institute can easily identify classify student to improve their batch strategy and curriculum.
- Institute can track student progress and have right expectations of student.
- Detect execution decay **before** test scores fall; identify **which part** of the execution loop is breaking.
- Require **minimal daily effort** from the student; EI **complements** (not replaces) coaching and test platforms.
- Protocol reliability: P1 improves realism (reduces Ambition Δ extremes); P2 reduces start failure; P3 improves learning integrity (VerificationRate, LoopLatency/OpenLoops).

---

## Leading indicators (what institutes act on)

Institutes act on these privacy-safe signals (no raw events):

- **VerificationRate7d** — proof-of-learning commitment (verified-or-scheduled sessions / ended sessions, rolling 7d).
- **OpenLoops / WIP** — unfinished learning debt (topics with effort but retrieval overdue).
- **LoopLatency(topic)** — effort → retrieval delay per topic.
- **ScheduleMisses7d** — paper compliance risk (scheduled verifications missed, rolling 7d).
- **SilenceDays** — disengagement risk (days since last meaningful event).
- **StateTrend** — burnout runway (sleep/energy/anxiety drift).

