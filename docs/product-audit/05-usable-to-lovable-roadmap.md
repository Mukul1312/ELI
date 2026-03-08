# From Usable to Lovable — Single-Founder Roadmap

> This document bridges the gap between the product audit (diagnostic) and what to actually build. It captures the core insight from real student feedback, defines what makes this app different from a manual tracker, lays out an incremental path from "usable" to "lovable," and provides the scaling framework for when the product grows beyond 10 students.

---

## The Core Insight

A real student used the v1 and said: **"It's just a session tracker. I can do this manually."**

He's right. A basic flow of `Pick topic → Study → Log time → Done` is a notebook with a timer. The student's question — "why would I bother using this?" — is the most important product question to answer before anything else.

---

## What a Notebook Cannot Do

Three things separate this product from manual tracking. These are the minimum viable intelligence that must exist before any personalization, pattern tiers, or identity moments matter.

### 1. The app remembers what you owe yourself

A notebook records what you did. It does not **surface what you haven't gone back to**. The greeting "9 sessions. 5 revisits open. None closed yet." is impossible in a notebook. The student would have to manually cross-reference every topic, calculate ages, and rank them by staleness. Nobody does that.

**The feature:** When the student opens the app, the FIRST thing they see is not "start a new session." It's the pending list: "You have 3 topics waiting. Laws of Thermodynamics — 4 days ago." The oldest unverified topic is highlighted as the default recommendation.

### 2. The app asks the question you won't ask yourself

A student will never open their notebook and ask themselves "Does Thermodynamics feel solid?" They'll just keep studying new things. The entire S4 storyboard is about this — a student who studied 5 topics and never once checked if any of them stuck.

**The feature:** After a Practice or Revise session on a topic with a pending revisit, the app asks: "Does it feel solid? [Yes] [Not yet]." That one question — asked at the right moment (just finished studying, maximum receptivity) — is the entire product.

### 3. The counter goes DOWN, not just up

Every tracker, every to-do app, every study planner only goes UP. More topics, more sessions, more hours. This app is the only one where the number **decreases** when you verify. "Pending: 5 → 4" is not tracking — it's **closure**. That feeling is what a notebook can never give.

**The feature:** The revisit counter is visible at all times. When a student verifies a topic ("Yes, it's solid"), the counter drops visibly: `Revisits: 3 → 2`. The counter dropping IS the reward.

---

## The Minimum Lovable Product

These four features, layered onto the basic session flow, transform "tracker" into "companion." No AI, no personalization, no pattern tiers required.

### Feature 1: Pending list on open (the surface)

When the app opens, the student sees their pending revisits sorted by staleness (oldest first). The oldest topic is pre-selected as the recommendation. The student can override it, but the default is "go back to what's oldest."

```
┌──────────────────────────────────┐
│                                  │
│  Energy: ① ② ③ [④] ⑤           │
│                                  │
│  ▸ Laws of Thermodynamics        │
│    4 days ago                    │
│                                  │
│  Pending (3):                    │
│  · Laws of Thermodynamics (4d)   │
│  · IUPAC Nomenclature (2d)      │
│  · Carnot Engine (1d)            │
│                                  │
│  [ Search new topic ]            │
│                                  │
│  ── Pending: 3 ──                │
└──────────────────────────────────┘
```

**Why it matters:** The student opens the app and immediately sees what's waiting. They didn't have to think about what to study — the app already knows. "Search new topic" is available but secondary. The visual hierarchy says: "deal with what's open first."

**Implementation:** Sort pending revisits by `daysSinceLastTouch DESC`. Pre-select the first item. Show the age in human-readable form ("4 days ago", "yesterday").

### Feature 2: The verification question (the ask)

After a Practice or Revise session on a topic that has a pending revisit, Phase 3 shows: "Does it feel solid?" with two options.

```
┌──────────────────────────────────┐
│                                  │
│  Laws of Thermodynamics — 15m    │
│  Revision complete.              │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Does it feel solid?        │  │
│  │                            │  │
│  │ [Yes, it's solid]          │  │
│  │ [Not yet]                  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Why it matters:** This is the question the student will never ask themselves. The app asks it at the right moment — right after studying, when the student has the most honest sense of whether the material stuck. "Not yet" is not failure — it keeps the revisit open. "Yes" closes the loop.

**Implementation:** Show this card only when: `taskType ∈ {Practice, Revise}` AND `topic.hasPendingRevisit === true`. For Learn sessions on new topics, auto-create the revisit without asking.

### Feature 3: The counter animation (the reward)

When the student taps "Yes, it's solid," the revisit counter drops visibly.

```
┌──────────────────────────────────┐
│                                  │
│  ✓ Loop closed.                  │
│  Revisits: 3 → 2                │
│                                  │
│  One less thing on your mind.    │
│                                  │
│  [Done]                          │
└──────────────────────────────────┘
```

**Why it matters:** The counter dropping is the core reward mechanism. It's Todoist checkbox psychology applied to studying. Open loop creates tension. Closing it creates relief. The student sees progress as *reduction*, not accumulation.

**Implementation:** Animate the counter transition. Show the before → after. Keep the copy minimal ("One less thing on your mind." — not celebratory, not patronizing).

### Feature 4: Topic recommendation nudge (the guide)

The oldest pending topic is highlighted and pre-selected. The student can override it, but ELI's default answer to "what should I study?" is always "whatever has been waiting longest."

**Why it matters:** "What should I study today?" is the question every JEE/NEET student struggles with. The simplest useful answer is: "the topic you haven't verified in the longest time." This requires zero AI — just a sort by date.

**Implementation:** `pendingRevisits.sort(daysSinceLastTouch, DESC)[0]` as the pre-selected topic. Show the age as the subtitle ("4 days ago"). If no pending revisits exist, show the topic search directly.

---

## The Incremental Path

Once the minimum lovable product is validated with real students, features are added based on observed problems — not speculative design.

### Tier 1: After 10 students (add when you observe the problem)

| Feature | Add when you see... | What it solves | Reference doc |
|---|---|---|---|
| Scope picker (~15/~30/~45) | Students consistently over- or under-scoping sessions | Session length mismatch | [16-formation-period.md](../student-ux-architecture/16-formation-period.md) |
| "Don't want to answer now" (3rd P3 option) | Students hard-closing the app at Phase 3 instead of answering | Verification pressure causing exits | [17-task-types-and-phase3.md](../student-ux-architecture/17-task-types-and-phase3.md) |
| Same-day re-entry greeting ("Back again") | Students doing 2+ sessions/day and seeing stale greeting | Greeting feels disconnected from reality | [19-silence-and-reentry.md](../student-ux-architecture/19-silence-and-reentry.md) |
| "Clear one more" CTA after closure | Students closing one loop and leaving, when they have energy for more | Missed momentum opportunity | [07-phase3-the-close.md](../student-ux-architecture/07-phase3-the-close.md) |
| First Encounter Override (Practice on new topic) | Students picking Practice for topics they learned at coaching | App forces Learn on topics the student already knows | [17-task-types-and-phase3.md](../student-ux-architecture/17-task-types-and-phase3.md) |

### Tier 2: After 30 students (add when patterns emerge across students)

| Feature | Add when you see... | What it solves | Reference doc |
|---|---|---|---|
| Dropout signal (3 defers → shrunk deal card) | Multiple students hitting 3+ consecutive defers | Verification avoidance with no system response | [11-archetype-experience-map.md](../student-ux-architecture/11-archetype-experience-map.md) |
| Greeting with session count ("9 sessions so far") | Students who don't realise how much they've done | No sense of progress beyond the counter | [21-relationship-arc.md](../student-ux-architecture/21-relationship-arc.md) |
| Pending count in footer (always visible) | Students not aware of their pending debt | Counter only visible at Phase 3, not during browse | [08-footer-and-identity.md](../student-ux-architecture/08-footer-and-identity.md) |
| Seed (forward hook at Phase 3) | Students closing a loop and not knowing what's next | No anticipation for next session | [07-phase3-the-close.md](../student-ux-architecture/07-phase3-the-close.md) |
| Honest mirror greeting ("5 revisits. None closed.") | Students with high session count but zero closures (S4 pattern) | Avoidance invisible to the student | [05-phase1-the-open.md](../student-ux-architecture/05-phase1-the-open.md) |

### Tier 3: After 50+ students (add when the system needs intelligence)

| Feature | Add when you see... | What it solves | Reference doc |
|---|---|---|---|
| Pattern claim tiers (T1–T4) | Greeting observations feel either too confident or too vague | Trust calibration — ELI claims what it can't prove | [16-formation-period.md](../student-ux-architecture/16-formation-period.md) |
| Checkin observations ("You prefer evenings") | Students who've done 7+ sessions and the greeting is still generic | Recognition beat stagnating | [21-relationship-arc.md](../student-ux-architecture/21-relationship-arc.md) |
| Identity moments ("Your sessions count now") | Students who've achieved high verification rates but don't feel recognised | No emotional payoff for behaviour change | [08-footer-and-identity.md](../student-ux-architecture/08-footer-and-identity.md) |
| Silence/re-entry rules | Students returning after 3+ day gaps and getting a generic greeting | Re-entry doesn't acknowledge the gap | [19-silence-and-reentry.md](../student-ux-architecture/19-silence-and-reentry.md) |
| Energy-based recommendation adjustment | Students getting hard-topic recommendations when energy is Low | Recommendation ignores student state | [18-topic-recommendation.md](../student-ux-architecture/18-topic-recommendation.md) |

### Maybe Never (validate need before designing)

| Feature | Why it might not be needed |
|---|---|
| Archetype-specific copy routing | If the signal-driven rules produce the right experience for each student naturally, explicit archetype detection adds complexity without value |
| Chat companion (ELI conversational) | The Phase 1/3 flow might be sufficient. Chat is a large surface area to design and maintain for a single founder |
| AI-generated greetings | Template greetings with data slots ("3 loops closed this week") might never feel stale if the data changes every session |
| Emotional event detection (burnout vs scheduled break) | Simple silence-duration tiers might be sufficient without cause detection |

---

## Scaling Framework

When the product grows beyond the minimum lovable version, the following framework governs how personalization scales without requiring per-student design.

### The system is a state machine, not a script

The S4 storyboard traces ONE path through a decision tree with ~14 independent decision points. The same decision tree, fed different inputs, produces different journeys. At 100 students, most will cluster into 3-4 common paths. The long tail is handled by the rules, not by hand-crafting.

### What scales naturally (zero additional design per student)

| System | Why it scales | Inputs |
|---|---|---|
| Pending list ordering | Pure sort by staleness | `topic.daysSinceLastTouch` |
| Phase 3 card selection | Determined by task type + topic state | `taskType`, `topic.hasPendingRevisit`, `isFirstEncounter` |
| Counter animation | Same mechanic for every student | `pendingCount.before`, `pendingCount.after` |
| Topic recommendation | Oldest pending first | `pendingRevisits.sort(staleness)` |

### What needs authored variants (scales with copy library size)

| System | Templates in v1 | Templates needed at 100 students | Growth rate |
|---|---|---|---|
| Same-day re-entry greetings | 3 | 6-8 | Slow (add 1-2 per quarter) |
| Next-day return greetings | 4 | 8-10 | Slow |
| After-silence greetings | 1 | 4-6 | Medium (add when new gap types observed) |
| Closure momentum greetings | 3 | 5-6 | Slow |
| Tier observations | 0 (Tier 3 feature) | 15-20 | Medium (add per signal type) |
| Identity statements | 0 (Tier 3 feature) | 5-7 | One-time (authored once) |
| **Total copy fragments** | **~11** | **~50-60** | — |

### Decision priority matrix (for when signals conflict)

When two systems produce conflicting guidance, these rules resolve it:

```
IF dropout_signal_active AND identity_eligible:
  → Show identity moment (positive signal overrides warning)
  → Reset dropout signal (closure streak proves recovery)

IF pending_count > 5 AND student_picks_new_topic:
  → Allow it (never block topic choice)
  → Next session greeting references it:
    "7 revisits open. You added a new one yesterday."

IF energy = 1 (Drained) AND pending_topics_exist:
  → Still show pending list (don't hide information)
  → But pre-select shortest scope (~15 min)
  → Greeting does NOT comment on low energy during formation period

IF same_day_reentry AND gap < 2h:
  → Skip observation greeting (they were just here)
  → Brief greeting only ("Back again. What's next?")
  → Re-ask energy only if gap > 2h

IF silence >= 3_days AND formation_period:
  → No special re-entry treatment
  → Standard greeting (not enough history to interpret the gap)

IF silence >= 3_days AND established:
  → Warm re-entry greeting
  → Do NOT reference silence length ("You've been gone 5 days")
  → DO reference what's waiting ("3 revisits open")

IF "Not yet" on Phase 3 AND energy >= 4:
  → Next session: recommend same topic (they have energy to retry)

IF "Not yet" on Phase 3 AND energy <= 2:
  → Next session: recommend a different topic (don't push when tired)
  → The "Not yet" topic stays in pending list at its current position
```

---

## Storyboard as North Star

The S4 storyboard ([S4-flowing-but-avoidant.md](../student-ux-architecture/storyboards/S4-flowing-but-avoidant.md)) is not the v1 spec. It is the **north star** — the product at its best, after all systems are active, for one specific student type. It shows what the product looks like when everything works.

The path to that north star:

```
v1 (now):     4 screens. Loop works. Counter drops. No personalization.
              Student opens → sees pending → studies → verifies → counter drops.

Tier 1:       Scope picker. Same-day re-entry. "Clear one more" CTA.
              The loop has less friction. Sessions feel right-sized.

Tier 2:       Greeting references data. Seed creates anticipation.
              Dropout signal catches avoidance. The loop has pull.

Tier 3:       Pattern tiers. Identity moments. Silence handling.
              The loop has depth. ELI feels like it knows you.

North star:   Full S4 storyboard. Every system active.
              The product at its best.
```

Each tier is earned by real student behaviour, not speculative design. Ship the loop. Watch what breaks. Fix what breaks. The storyboard tells you what "fixed" looks like.

---

## What This Document Does NOT Cover

The following are diagnosed in the product audit but are not part of this roadmap:

| Topic | Where it lives |
|---|---|
| Stale features in legacy docs | [01-stale-features.md](01-stale-features.md) |
| Realism failures in storyboards | [02-realism-failures.md](02-realism-failures.md) |
| Engine signal gaps | [03-engine-gaps.md](03-engine-gaps.md) |
| Lovable product gap diagnosis | [04-lovable-product-gaps.md](04-lovable-product-gaps.md) |
| Formation period deep design | [16-formation-period.md](../student-ux-architecture/16-formation-period.md) |
| Topic recommendation algorithm | [18-topic-recommendation.md](../student-ux-architecture/18-topic-recommendation.md) |
| Full archetype map | [11-archetype-experience-map.md](../student-ux-architecture/11-archetype-experience-map.md) |

---

*This roadmap is the single-founder implementation guide. The storyboard is the north star. The product audit is the diagnostic. This document connects them: what to build, in what order, and why.*
