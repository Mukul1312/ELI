# Topic Recommendation — How ELI Decides What to Surface

> When a student opens ELI, the most valuable thing it can do is answer: "What should I study today?" This doc defines the ordering algorithm, the per-topic signals it uses, the energy-adjusted rules, and how ELI handles avoidance.

---

## What this doc covers

Multiple docs reference ELI recommending specific topics ("Thermodynamics — 9 days"). None define how that recommendation is produced. This doc fills the gap:

- The per-topic signals ELI needs
- The priority stack (ordering rules)
- Energy-adjusted ordering
- Avoidance detection and escalation
- How the recommendation appears on screen
- What happens when the student disagrees
- Edge cases

Related docs:
- [01-craving-loop.md](01-craving-loop.md) — Anticipation beat depends on recommendation quality
- [17-task-types-and-phase3.md](17-task-types-and-phase3.md) — Task types determine how loops open/close
- [16-formation-period.md](16-formation-period.md) — Formation period (no recommendation possible on Session 1)
- [15-chat-companion.md](15-chat-companion.md) — Chat surfaces topic insights conversationally
- [05-phase1-the-open.md](05-phase1-the-open.md) — Phase 1 is where the recommendation appears

---

## Why topic recommendation matters

The Anticipation beat ("I wonder what ELI has for me today") depends on students trusting that ELI's recommendation is the right one. If the recommendation feels arbitrary, students ignore it. If they ignore it consistently, ELI becomes a session logger — not a companion.

"What should I study today?" is the question every JEE/NEET student struggles with every morning. If ELI answers this better than the student can answer it themselves, ELI becomes indispensable. If it cannot, it is just a tracker with nice microcopy.

---

## Per-topic signals

ELI needs four per-topic derived signals. These do not exist in the current engine taxonomy and must be added.

| Signal | Definition | Source |
|---|---|---|
| `topicRecencyDays(topic)` | Calendar days since last session on this topic | Computed from session event history |
| `topicPendingCheckAge(topic)` | Calendar days since the oldest open revisit was created for this topic | Computed from revisit creation timestamp |
| `topicSessionCount7d(topic)` | Number of sessions on this topic in the last 7 days | Computed from session event history |
| `topicAvoidanceScore(topic)` | Number of times this topic was surfaced as recommendation but the student picked a different topic, in the last 7 days | Requires tracking recommendation-vs-selection |

### What ELI already has (no new signals needed)

- `pendingChecks` — count of topics with open revisits
- `OpenLoops` — topics with effort but overdue revisit
- Current energy — from the checkin
- Session history — which topics the student has been picking

### What ELI does NOT have (and does not need for V1)

- Exam dates (`examProximityDays`) — requires a data input that doesn't exist yet. Topic recommendation works without it. When exam dates are added later, they become an additional signal, not a replacement.
- Topic difficulty ratings — ELI doesn't assess difficulty; the student's task type (Learn/Practice/Revise) is the closest proxy.
- Syllabus coverage percentage — ELI tracks what the student engages with, not what they should engage with. Curriculum is the student's domain.

---

## The priority stack

The ordering is a simple priority stack. Higher-priority rules override lower ones.

### Priority 1: Overdue revisit (5+ days old)

Any topic with a revisit older than 5 days surfaces at the top. Among multiple overdue revisits, the oldest surfaces first.

**Why 5 days:** Retention research shows significant decay after 3–5 days without review. A revisit sitting for 5+ days is at high risk of being forgotten entirely. This is the "close loops first" principle from doc 01 — but with a threshold that avoids pulling students away from continuation when the revisit is still fresh.

**Reasoning shown:** "Thermodynamics — revisit waiting for 9 days."

### Priority 2: Continuation (if no overdue revisit)

If no revisit is 5+ days old, the most recently sessioned topic surfaces first. This respects the student's current focus — they started Integration yesterday, they probably want to continue today.

**Why continuation wins below 5 days:** Context-switching has a real cost. A student who started a chapter yesterday and was mid-way should finish it before being pulled elsewhere. As long as no revisit is rotting (5+ days), continuation is the better recommendation.

**Reasoning shown:** "Integration — you were working on this yesterday."

### Priority 3: Youngest revisit (if no continuation candidate)

If no topic was sessioned in the last 2 days (no continuation candidate) and no revisit is 5+ days old, surface the youngest open revisit. This nudges the student toward closing a loop while the material is still relatively fresh.

**Reasoning shown:** "Organic Chemistry — revisit from 2 days ago."

### Priority 4: No open revisits — no recommendation

If the student has cleared all revisits and has no continuation topic, ELI does not recommend a topic. The student picks freely.

**What ELI says:** "All clear. What's next?"

**Why no new-topic recommendation:** ELI manages the meta of studying, not the curriculum. Recommending a new topic would require knowing the syllabus, the student's coverage, and what their coaching is currently teaching. ELI doesn't have this data. The student knows what to study next; ELI's job is to help them retain it.

---

## Energy-adjusted ordering

Energy modifies the ordering within each priority tier, but it does not override the tier itself. An overdue revisit still surfaces first regardless of energy — but which overdue revisit surfaces first depends on energy.

### How energy adjusts the recommendation

| Energy | Adjustment |
|---|---|
| **Low (1–2)** | Among competing topics in the same tier, surface the most familiar one — highest `topicSessionCount7d`, most recently studied. Lower context-switch cost, easier entry. |
| **Okay–Good (3–4)** | No adjustment. Standard priority stack ordering. |
| **Sharp (5)** | Among competing topics in the same tier, surface the most overdue or most challenging one. The student has capacity for the hardest task. |

### Example

Student has two overdue revisits:
- Thermodynamics: 9 days old, sessioned 3 times this week (familiar)
- Organic Chemistry: 7 days old, sessioned 0 times this week (unfamiliar)

**Energy = Low (2):** ELI recommends Thermodynamics first — more familiar, lower entry cost.
**Energy = Sharp (5):** ELI recommends Organic Chemistry first — less familiar, more overdue relative to engagement.
**Energy = Good (4):** ELI recommends Thermodynamics — older revisit wins by default.

---

## Avoidance detection

Avoidance is when a student consistently ignores ELI's recommendation for a specific topic. This is a meaningful signal — the student is avoiding that topic for a reason (anxiety, difficulty, boredom).

### Detection rule

`topicAvoidanceScore(topic) >= 3` — the topic was recommended 3+ times in the last 7 days and the student picked a different topic each time.

### What happens when avoidance is detected

**Phase 1 behaviour changes:**

ELI stops pushing the avoided topic to the top of the recommendation in Phase 1. Continued pressure in Phase 1 creates friction that discourages app opens — the opposite of what ELI wants.

Instead, the avoided topic moves to the Conversation layer. Next time the student opens chat, ELI surfaces it:

> "Organic Chemistry has been waiting 14 days. What's going on with it?"

This moves the confrontation from Phase 1 (where it creates friction and blocks the session start) to Chat (where it can be discussed). The student can explain: "I'm waiting for coaching to cover reaction mechanisms first" or "I just hate it." Either answer gives ELI information.

**What ELI does NOT do:**
- Does not guilt the student: "You've been avoiding this"
- Does not force the topic: "You must do Organic Chemistry today"
- Does not hide the topic from the revisit list — it stays visible, the student can always choose it voluntarily

### Avoidance score reset

The avoidance score resets to 0 when:
- The student voluntarily sessions the avoided topic (they chose it themselves)
- 7 days pass without the topic being recommended (the score naturally decays)
- The revisit for that topic is closed (the loop is resolved)

---

## How the recommendation appears on screen

### Phase 1 — pending items list

The pending items list already exists as an SDUI component (`pending-items-list`). The recommendation ordering determines the order of items in this list. The top item is the recommendation.

```
Revisits (3)
→ Thermodynamics — 9 days                    [recommended]
  Organic Chemistry — 3 days
  Electrostatics — 1 day
```

The recommended topic gets a subtle visual indicator — not a badge or special colour, just top position with a one-line reasoning label.

### Phase 1 — ELI's greeting can reference it

The greeting can incorporate the recommendation naturally:

- "3 revisits. Thermodynamics has been waiting 9 days — start there?"
- "All clear from yesterday. What's next?"
- "Integration — you were mid-chapter. Pick up where you left off?"

This is not a separate component — it is part of the greeting copy. The recommendation data feeds into greeting generation.

### Phase 1 — student can ignore it

The student taps any topic they want. If they pick the recommended topic, great. If they pick a different one, ELI runs that session without comment. No "are you sure?" No friction.

The skipped recommendation contributes to `topicAvoidanceScore` for that topic silently.

---

## The recommendation output (engine contract)

The priority stack produces an ordered output:

```
RecommendedTopics: ordered list of 1-3 topics
  Per topic:
  - topicId
  - reason ∈ { overdue_revisit, continuation, youngest_revisit }
  - urgency ∈ { high, medium, low }
  - reasoningCopy: string  (e.g., "9 days since you last checked")
```

### Urgency mapping

| Reason | Urgency |
|---|---|
| Overdue revisit (5+ days) | **high** |
| Overdue revisit (3–4 days) + low energy | **medium** |
| Continuation (sessioned yesterday) | **medium** |
| Youngest revisit (< 3 days) | **low** |

Urgency affects greeting tone, not ordering. A high-urgency recommendation gets more prominent copy; a low-urgency one is mentioned briefly or not at all in the greeting.

---

## Formation period behaviour

### Sessions 1–2: No recommendation possible

No topics have revisits yet (or at most 1). The pending items list either doesn't render or shows a single item. ELI does not recommend — the student picks freely.

### Sessions 3–5: Simple recommendation

By session 3, the student has 1–3 topics in tracking. If any have open revisits, the oldest surfaces. Reasoning is simple: "Electrostatics — studied 2 days ago."

### Sessions 5+: Full algorithm active

All four priority tiers, energy adjustment, and avoidance detection are active. Enough data exists for the recommendation to feel intelligent.

---

## What happens when the student always disagrees

If a student consistently ignores all recommendations (not just one topic — all of them), this is a different signal from topic-specific avoidance. It means the student has their own study plan and doesn't need ELI's topic guidance.

**ELI's response:** Reduce recommendation prominence. The greeting shifts from "Thermodynamics — start there?" to just showing the revisit list without a specific recommendation. The student is using ELI as a tracker, not a planner. That's valid.

**Detection rule:** If the student picks a non-recommended topic in 5+ consecutive sessions, ELI stops foregrounding recommendations. The revisit list still shows in recency order, but ELI's greeting stops suggesting a specific topic.

**Recovery:** If the student later picks a recommended topic (voluntarily or because they've cleared their own priorities), recommendation prominence returns.

---

## Edge cases

### Student has 10+ topics with revisits

The pending items list shows max 5 (per existing component spec). The recommendation algorithm orders all topics; the list shows the top 5. The remaining topics are accessible via the full topic browser.

### Two topics have identical priority scores

Tie-breaking: older revisit wins. If revisit ages are identical, alphabetical order. The tie-breaking rule doesn't matter much — both topics are equally valid, and the student can pick either.

### Student opens app 3 times in one day

Each open re-computes the recommendation based on current state. If the first session closed a revisit, the second open's recommendation reflects the updated state. The recommendation is always fresh.

### Same-day re-entry: recommendation changes

If the student closed Thermodynamics in the morning session, the afternoon recommendation should NOT still show Thermodynamics. The priority stack re-evaluates on every AppOpen.

### Student has only new topics (no revisits at all)

This is the Session 1–2 case. No recommendation. "What are you studying today?" The student picks freely. After their first session creates a revisit, the recommendation system has something to work with.

---

## Summary

| Principle | Detail |
|---|---|
| **4 per-topic signals** | `topicRecencyDays`, `topicPendingCheckAge`, `topicSessionCount7d`, `topicAvoidanceScore` |
| **Priority stack** | Overdue revisit (5+ days) → Continuation → Youngest revisit → No recommendation |
| **Energy adjusts within tier** | Low energy → familiar topic first. Sharp → hardest/most overdue first. |
| **Avoidance detection** | 3+ skips in 7 days → stop pushing in Phase 1, surface in Chat |
| **Always explainable** | Every recommendation has a one-line reasoning ("9 days since you last checked") |
| **Student can always override** | No friction on disagreement. Silent tracking of skips. |
| **No new-topic recommendations** | ELI manages the meta, not the curriculum |
| **No exam date required** | Works without `examProximityDays`. Exam dates are a future enhancement signal. |

---

*Craving loop: [01-craving-loop.md](01-craving-loop.md)*
*Task types: [17-task-types-and-phase3.md](17-task-types-and-phase3.md)*
*Phase 1 screen: [05-phase1-the-open.md](05-phase1-the-open.md)*
*Chat companion: [15-chat-companion.md](15-chat-companion.md)*
*Engine gap (data contract): `docs/product-audit/03-engine-gaps.md` §6*
