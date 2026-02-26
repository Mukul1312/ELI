# The Craving Loop — Why Students Come Back

> This is the central concept of the student experience system. Every other document in this folder serves this loop. If a design decision weakens any beat, it should be revised.

---

## The Problem We're Solving

Students don't lack motivation. They lack **a reason to open this specific app tomorrow.** Motivation is abundant on Day 1. By Day 5, the student is deciding between opening the app, watching YouTube, or doing nothing. The craving loop is what tips that decision.

The loop is not gamification. It is not points, badges, or streaks. It is the quiet psychological pull of a system that remembers you, rewards closure, and always leaves one small thing for next time.

---

## The 5-Beat Loop

Each beat creates a specific psychological state. Together they form a self-reinforcing cycle that strengthens with each repetition.

```
    ┌──────────────────────────────────────────────────────┐
    │                                                      │
    │   ANTICIPATION  →  RECOGNITION  →  MICRO-WIN         │
    │        ↑                                ↓            │
    │       SEED      ←     CLOSURE    ←──────┘            │
    │                                                      │
    └──────────────────────────────────────────────────────┘
```

---

### Beat 1: Anticipation (Before Open)

**What the student feels:** A mild pull. Not anxiety — curiosity. "I wonder if my pending checks went down." "I wonder what ELI will say today." "I have that reminder from yesterday."

**What creates it:**
- Phase 3's forward-looking signal from the previous session: "2 checks left this week"
- The 24h reminder set yesterday: "Algebra — tomorrow at this time"
- The open question from yesterday's close: "See you tomorrow?"

**Design rules:**
- Phase 3 MUST always leave exactly one forward-looking hook (see [07-phase3-the-close.md](07-phase3-the-close.md))
- The hook must be specific (a topic name, a count) — never vague ("keep studying")
- The hook must be achievable in a single session — never overwhelming
- After Skip (with reason), no forward hook is planted — don't add pressure after a skip

**What happens if this beat is missing:** The student has no reason to open the app. They might open it out of obligation on Day 1–3, but by Day 5 obligation fades. Without anticipation, retention drops to zero.

---

### Beat 2: Recognition (The Open Moment)

**What the student feels:** "It knows me." The greeting is different today than it was yesterday. It noticed something specific about my state. It didn't give me a generic welcome screen.

**What creates it:**
- Phase 1's contextual greeting: different copy for different states (see [05-phase1-the-open.md](05-phase1-the-open.md))
- The pending items list: ordered by when they studied, showing days ago
- Personalization hints (Day 14+): "When you pick Sharp (5), you do best with 1 check first"

**Where it appears in storyboards:**
- S7 Scene 3 (Day 4): *"You're working hard. But you have 3 pending checks."* — ELI noticed the pattern
- S5 Scene 3 (Day 4): *"Welcome back. Today is not a comeback story. It's a 5-minute win."* — ELI noticed the silence
- S2 Scene 1 (Day 1): *"Your drive is real. But today's pressure is high."* — ELI noticed the pressure

**Design rules:**
- The greeting must NEVER be the same two days in a row — even if the state is the same, vary the copy
- The greeting must reference something specific to this student's current or recent state
- Even "Hey. No speeches." is specific — it's specific to silence re-entry
- Recognition strengthens over time: Day 1 greetings are general; Day 14 greetings reference patterns

**What happens if this beat is missing:** The app feels like a tool, not a relationship. The student uses it transactionally and drops it when something shinier appears. There's no emotional bond.

---

### Beat 3: Micro-Win (The Action)

**What the student feels:** "I did something. It was tiny. But I did it." The activation energy was lower than expected. They committed to 2 minutes and ended up doing 15.

**What creates it:**
- Impossibly small CTAs: "5-minute win", "Start 2 minutes, then decide", "Do 1 question now (2 min)"
- The deal card pattern: "Clear 1 pending check first (5 min), then go big"
- Rescue mode's single-button Phase 1: only one action, no decision fatigue

**Where it appears in storyboards:**
- S5 Scene 3 (Day 4): *"5-minute win (recommended)"* — one button, no options
- S2 Scene 2 (Day 1): *"Start 2 minutes (then decide)"* — the parenthetical removes commitment anxiety
- S7 Scene 5 (Day 5): *"Before you close: 1 question. That's it."* — the tiniest possible proof

**Design rules:**
- The primary CTA must always be the smallest viable action
- Never show estimated time > 10 minutes on any primary CTA in Rescue mode
- "Then decide" is powerful copy — it removes commitment anxiety; use it on pressure days
- The secondary CTA ("I can do more") is always secondary, never visually competing
- The micro-win must produce a visible outcome (loop closed, pending count changed, or session recorded)

**What happens if this beat is missing:** The student stares at the screen and doesn't start. This is exactly what happens to S2 (revenge planner) when the scope is too big. The freeze-guilt loop replaces the craving loop.

---

### Beat 4: Closure (The Reward)

**What the student feels:** Something was open and now it's closed. The number went down. `Pending checks: 3 → 2`. One less thing on my mind. I proved I remember it.

**What creates it:**
- Phase 3's loop-closed card with the counter animation: `3 → 2`
- The confirmation copy: "Loop closed." / "One less thing on your mind."
- The visual transition from open to closed state

**Where it appears in storyboards:**
- S7 Scene 5 (Day 5): Pending checks stops growing and starts shrinking — this is the turning point of S7's entire 21-day arc
- All three storyboards, Scene 12 (Day 21): `Pending checks: 1–2 (bounded)` — the consistent outcome of the craving loop working

**Design rules:**
- The counter change (`3 → 2`) must be visually prominent — not buried in copy
- When pending checks reach 0, this is a milestone: special copy, distinct card
- Never show the counter going UP in Phase 3 (if a new pending check is created by deferral, show it in Phase 1 next time, not now)
- The closure moment must feel complete — no "but also..." after the loop-closed message

**What happens if this beat is missing:** The student studies but never feels progress. They accumulate effort without closure. This is the "silent decay" problem the entire product exists to solve.

---

### Beat 5: Seed (The Hook for Next Time)

**What the student feels:** "There's one more thing for next time. Not urgent. But I know it's there." The app didn't end with a wall — it ended with a door.

**What creates it:**
- Phase 3's forward-looking signal: "2 checks left this week — you're ahead."
- The 24h reminder confirmation: "See you tomorrow."
- The "clear one more" button (optional, for high-energy students): creates immediate re-entry into Beat 3

**Where it appears in storyboards:**
- S7 Scene 7 (Day 8–10): ELI shows the two-step card: "Clear 1 pending check (5 min)" then "New topic"
- S5 Scene 7 (Day 8–10): *"One pending check first, then anything else."*
- All SessionEnd scenes: the session always ends with a forward reference

**Design rules:**
- The Seed must be specific: a topic name, a count, a time — never vague
- After Skip (with reason): NO seed is planted — don't add pressure after a skip
- After verification completed: the Seed is the remaining count ("X checks left this week")
- After reminder set: the Seed is the time ("tomorrow at this time")
- The Seed must feel like an invitation, not an obligation: "when you're ready" not "you still have"

**What happens if this beat is missing:** The session ends cleanly but the student has no reason to return. Tomorrow they'll think "should I study?" instead of "I have that Algebra check waiting."

---

## How the Loop Compounds Over Time

The loop starts weak and strengthens with each cycle:

| Period | Loop strength | Which beats are working |
|---|---|---|
| Day 1–3 | **Weak** | Only Micro-win works (the start is tiny enough to try). Anticipation, Recognition, Closure are generic. |
| Day 4–7 | **Building** | Recognition kicks in ("it noticed my pending checks"). Closure starts working (first `3→2` moment). Seeds start landing. |
| Day 8–14 | **Strong** | Full 5-beat loop running. The routine forms. Clear-then-build becomes habitual. |
| Day 14+ | **Personalized** | Recognition deepens ("When you pick Sharp..."). The loop becomes unique to this student. |
| Day 21 | **Identity-level** | A 6th beat (Identity) is added to the loop — see [08-footer-and-identity.md](08-footer-and-identity.md). The student doesn't just use the app — they're becoming someone different. |

---

## Per-Archetype Loop Entry Points

Different students enter the craving loop at different beats. The entry point determines what hooks them first.

| Archetype | Entry beat | Why | What hooks them |
|---|---|---|---|
| **S1** (Topper) | **Closure** | Proving recall is inherently satisfying for high-integrity students | The verification itself — they want to know they retained it |
| **S2** (Revenge Planner) | **Micro-win** | The tiny start bypasses the freeze-guilt loop that high pressure creates | "Start 2 minutes, then decide" — they actually began |
| **S3** (Stalled Starter) | **Micro-win** | Same as S2 but the freeze is procrastination, not pressure | "One small thing" — crossing the activation threshold |
| **S4** (Flowing-but-Avoidant) | **Recognition** | The mirror — "you're active, but proof is lagging" — is the first time someone noticed | The honest feedback that they're avoiding verification |
| **S5** (Burnout) | **Recognition** | "Welcome back. No speeches." — the app didn't punish them | Trust rebuilt; the bar is lower than they feared |
| **S6** (Grinder) | **Recognition** | "You're studying hard, but..." — technique pivot, not volume | The system noticed the *how*, not just the *how much* |
| **S7** (Ambitious) | **Anticipation** | Curiosity about their pending count pulls them in | "Did my pending checks go down?" — the count is a mild obsession |

---

## What Can Break the Loop

| Break point | What happens | How to prevent |
|---|---|---|
| Generic greetings | Recognition beat fails; app feels like a tool | Phase 1 must ALWAYS be state-specific |
| Overwhelming scope | Micro-win beat fails; student freezes | Primary CTA must always be ≤10 min |
| No counter change visible | Closure beat fails; effort feels invisible | Phase 3 MUST show the count change when a check is cleared |
| No forward hook | Seed beat fails; no reason to return tomorrow | Phase 3 MUST include exactly one forward signal (except after Skip) |
| Shame language | Trust breaks; entire loop collapses | See [10-microcopy-bible.md](10-microcopy-bible.md) banned phrases |
| Streak counter | Anticipation becomes anxiety after a gap; S5 uninstalls | Never show streaks; see [12-anti-patterns.md](12-anti-patterns.md) |

---

*Next: [02-retention-mechanics.md](02-retention-mechanics.md) — the 5 specific mechanics that power each beat.*
