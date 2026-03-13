# The Craving Loop — Why Students Come Back

> This is the central concept of the student experience system. Every other document in this folder serves this loop. If a design decision weakens any beat, it should be revised.

---

## The Problem We're Solving

Students don't lack motivation. They lack **a reason to open this specific app tomorrow.** Motivation is abundant on Day 1. By Day 5, the student is deciding between opening the app, watching YouTube, or doing nothing. The craving loop is what tips that decision.

The loop is not gamification. It is not points, badges, or streaks. It is the quiet psychological pull of a system that remembers you, rewards closure, and always leaves one small thing for next time.

---

## The 6-Beat Loop

Each beat creates a specific psychological state. Together they form a self-reinforcing cycle that strengthens with each repetition.

> **Important: the loop is not circular from Day 1.** It has a formation period (Sessions 1–7) where it runs as a partial chain, not a full cycle. Anticipation is the last beat to form — not the first. See [Loop Formation Period](#loop-formation-period) below.
>
> **"Day N" = approximately Session N for a daily student.** Formation is driven by session count (data accumulation), not calendar days. A student who sessions twice a day forms the loop in 3–4 calendar days. See [16-formation-period.md](../systems/formation-period.md) for the full session-based model.

```
Formation period (Sessions 1–7) — loop not yet circular:

  Recognition → Micro-Win → Closure → (thin Seed)

Full loop (Session 8+):

  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │   ANTICIPATION  →  RECOGNITION  →  MICRO-WIN             │
  │        ↑               ↕                 ↓               │
  │       SEED      ←   CLOSURE    ←─────────┘               │
  │                       ↕                                  │
  │      [CONVERSATION — student-initiated, any phase]       │
  │                                                          │
  └──────────────────────────────────────────────────────────┘
```

The Conversation layer (Beat 6) is not a fixed position in the loop — it is available at any point and deepens every other beat. See [The Conversation Layer](#the-conversation-layer) below.

---

### Beat 1: Anticipation (Before Open)

**What the student feels:** An unresolved pull. Not curiosity about ELI's personality — open-loop anxiety. "I have 2 revisits. Thermodynamics is sitting there." "I left that session unverified and it's bothering me." "I know what's waiting."

The pull is the data, not ELI. "I wonder what ELI will say today" is a secondary driver that forms after weeks of use. The primary driver — the one that works from Day 5 onward — is the uncomfortable awareness of an open loop. ELI's personality deepens the experience; the open revisit is what gets the app opened.

**What creates it:**
- Phase 3's forward-looking signal from the previous session: "2 revisits left this week"
- The 24h reminder set yesterday: "Algebra — tomorrow at this time"
- The open question from yesterday's close: "See you tomorrow?"

**Design rules:**
- Phase 3 MUST always leave exactly one forward-looking hook (see [07-phase3-the-close.md](../phase3/00-overview.md))
- The hook must be specific (a topic name, a count) — never vague ("keep studying")
- The hook must be achievable in a single session — never overwhelming
- After Skip (with reason), no forward hook is planted — don't add pressure after a skip

**Formation period caveat:** This beat does not function in Sessions 1–7. A student with no open revisits and no prior seed has nothing to be curious about. During the formation period, Anticipation is replaced by novelty ("let me try this app") and obligation ("I said I would study"). Neither is durable. The real Anticipation beat only ignites once revisits exist and at least one Seed has landed — typically Session 5–8. S7 (Ambitious) is the exception: their curiosity about the pending count can start as early as Day 3 if they've opened the app 3+ times.

**What happens if this beat is missing:** The student has no reason to open the app. They might open it out of obligation on Day 1–3, but by Day 5 obligation fades. Without anticipation, retention drops to zero.

---

### Beat 2: Recognition (The Open Moment)

**What the student feels:** "It knows me." The greeting is different today than it was yesterday. It noticed something specific about my state. It didn't give me a generic welcome screen.

**What creates it:**
- Phase 1's contextual greeting: different copy for different states (see [05-phase1-the-open.md](../phase1/00-overview.md))
- The pending items list: ordered by when they studied, showing days ago
- Personalization hints (Day 14+): "When you pick Sharp (5), you do best with 1 check first"

**Where it appears in storyboards:**
- S7 Scene 3 (Day 4): *"You're working hard. But you have 3 revisits."* — correct pattern: data observation, no flattery
- S5 Scene 3 (Day 4): *"Welcome back. Today is not a comeback story. It's a 5-minute win."* — correct pattern: named the silence, set a low bar
- S2 Scene 1 (Day 1): *"Your drive is real. But today's pressure is high."* — **wrong pattern**: pure affirmation with no data. "Your drive is real" is what a motivational poster says. A student grinding 8-hour days will read through it immediately.

**Design rules:**
- **Lead with data, never with affirmation alone.** "You have 3 pending checks and Electrostatics is oldest" is Recognition. "Your drive is real" is not — it's what every other app says. Affirmation earns its place only after data has made it specific and earned.
- The greeting must NEVER be the same two days in a row — even if the state is the same, vary the copy
- The greeting must reference something specific to this student's current or recent state
- Even "Hey. No speeches." is specific — it's specific to silence re-entry
- Recognition strengthens over time: Day 1 greetings are general; Day 14 greetings reference patterns
- **Template greetings have a ceiling.** A pre-composed copy library runs out of variation by Day 21 for an active student. For Recognition to hold long-term, greetings must be AI-generated from the student's actual data — not selected from a fixed set. The Conversation layer (Beat 6) deepens Recognition further: a student who has talked to ELI feels known in a way no greeting alone can replicate. See [15-chat-companion.md](../systems/chat-companion.md).

**What happens if this beat is missing:** The app feels like a tool, not a relationship. The student uses it transactionally and drops it when something shinier appears. There's no emotional bond.

---

### Beat 3: Micro-Win (The Action)

**What the student feels:** Two different things depending on state.

In normal operation: "I closed one thing. The number went down." The micro-win is a completed verification action — the counter moved, the loop closed. The commitment was bounded; the outcome is visible and real.

In rescue mode (burnout re-entry, crisis): "I did something. I crossed the threshold." For a student who hasn't opened the app in 5 days, starting at all is the win — not what they do once they're in. The micro-win here is breaking the inertia, not proving retention.

These are different psychological mechanics. Conflating them produces CTAs that feel condescending to students in normal operation and overwhelming to students in rescue mode.

**What creates it:**

*Normal operation:*
- Verification-first CTAs: "Close 1 pending check first (8 min)" — the commitment is a verification attempt, not a time cap
- The deal card pattern: "Clear 1 check first, then your topic" — closure before new material
- ELI's data-grounded recommendation: "Thermodynamics — 9 days. Start there."

*Rescue mode (burnout re-entry, S5 pattern, V1/V5 routing):*
- Session-start CTAs: "5-minute win. Just open the book." — activation energy is the bottleneck
- Single-button Phase 1: one action, no choices, no decision fatigue
- "Then decide" copy: "Start 2 minutes, then decide" — removes commitment anxiety at the moment of resistance

**Where it appears in storyboards:**
- S5 Scene 3 (Day 4): *"5-minute win (recommended)"* — one button, no options
- S2 Scene 2 (Day 1): *"Start 2 minutes (then decide)"* — the parenthetical removes commitment anxiety
- S7 Scene 5 (Day 5): *"Before you close: 1 question. That's it."* — the tiniest possible proof

**Design rules:**
- **Normal operation:** The primary CTA is the smallest viable verification action. Time is not the constraint — the verification outcome is. "Close 1 pending check first (8 min)" is correct; "do 2 minutes of study" is not.
- **Rescue mode only:** Time-bounded CTAs (≤10 min) and session-start framing are appropriate. For a student who studies 8+ hours daily, "Start 2 minutes then decide" in a routine session reads as condescending — it implies they need to be eased into their own habit.
- "Then decide" is rescue-mode copy. It belongs in S5 re-entry, S2 crisis, HIGH_PRESSURE V3 variants — not in routine sessions.
- The secondary CTA ("I can do more") is always secondary, never visually competing
- The micro-win must produce a visible outcome: loop closed, pending count changed, or session recorded. "I opened the app for 2 minutes" is not a micro-win unless the student is in rescue mode and crossing the threshold was genuinely the hard part.

**What happens if this beat is missing:** The student stares at the screen and doesn't start. This is exactly what happens to S2 (revenge planner) when the scope is too big. The freeze-guilt loop replaces the craving loop.

---

### Beat 4: Closure (The Reward)

**What the student feels:** Something was open and now it's closed. The number went down. `Revisits: 3 → 2`. One less thing on my mind. I proved I remember it.

**What creates it:**
- Phase 3's loop-closed card with the counter animation: `3 → 2`
- The confirmation copy: "It stuck. Done." / "One less thing on your mind."
- The visual transition from open to closed state

**How loops open and close:** Learn sessions always open a loop (revisit auto-created). Practice and Revise sessions can close a loop when the student verifies retention ("Yes, it stuck" / "I retained it"). The task type declared at Phase 1 determines what Phase 3 shows. Full decision matrix: [17-task-types-and-phase3.md](../systems/task-types.md).

**Where it appears in storyboards:**
- S7 Scene 5 (Day 5): Revisit count stops growing and starts shrinking — this is the turning point of S7's entire 21-day arc
- All three storyboards, Scene 12 (Day 21): `Revisits: 1–2 (bounded)` — the consistent outcome of the craving loop working

**Design rules:**
- The counter change (`3 → 2`) must be visually prominent — not buried in copy
- When revisits reach 0, this is a milestone: special copy, distinct card
- Never show the counter going UP in Phase 3 (if a new revisit is created by a Learn session, show the count increase — but this is Phase 3 for Learn, not for verification. See [17-task-types-and-phase3.md](../systems/task-types.md) for the Learn close.)
- The closure moment must feel complete — no "but also..." after the loop-closed message

**What happens if this beat is missing:** The student studies but never feels progress. They accumulate effort without closure. This is the "silent decay" problem the entire product exists to solve.

---

### Beat 5: Seed (The Hook for Next Time)

**What the student feels:** "There's one more thing for next time. Not urgent. But I know it's there." The app didn't end with a wall — it ended with a door.

**What creates it:**
- Phase 3's forward-looking signal: "2 revisits left this week — you're ahead."
- The 24h reminder confirmation: "See you tomorrow."
- The "clear one more" button (optional, for high-energy students): creates immediate re-entry into Beat 3

**Where it appears in storyboards:**
- S7 Scene 7 (Day 8–10): ELI shows the two-step card: "Clear 1 revisit (5 min)" then "New topic"
- S5 Scene 7 (Day 8–10): *"One revisit first, then anything else."*
- All SessionEnd scenes: the session always ends with a forward reference

**Design rules:**
- The Seed must be specific: a topic name, a count, a time — never vague
- Skip type determines whether a Seed is planted:
  - **Fatigue skip:** NO seed. The student needs rest, not a hook. Adding anything creates pressure at the worst moment.
  - **Confusion skip:** NO seed. The student is struggling. Plant nothing — the confusion is the unresolved hook, and ELI will address it next session.
  - **Time skip (ran out of time, energy adequate):** A minimal seed IS acceptable. "Tomorrow then." One sentence. No topic name, no count — just a door left open.
- After verification completed: the Seed is the remaining count ("X revisits left this week")
- After reminder set: the Seed is the time ("tomorrow at this time")
- The Seed must feel like an invitation, not an obligation: "when you're ready" not "you still have"
- **Early-period Seed is weak (Sessions 1–5).** Before revisits accumulate, the Seed has no count to reference. "See you tomorrow" is not a strong seed. Accept this — the Seed beat only becomes powerful once the Closure beat has fired at least twice.

**What happens if this beat is missing:** The session ends cleanly but the student has no reason to return. Tomorrow they'll think "should I study?" instead of "I have that Algebra revisit waiting."

---

## How the Loop Compounds Over Time

The loop starts weak and strengthens with each cycle:

| Period | Loop strength | Which beats are working |
|---|---|---|
| Sessions 1–3 | **Formation** | Recognition (greeting novelty) + Micro-win only. Anticipation: absent. Closure: generic (first verification). Seed: weak ("See you tomorrow"). The loop is a chain, not a cycle. |
| Sessions 4–7 | **Building** | First real Closure fires (`3→2`). Recognition sharpens ("it noticed my revisits"). Seed becomes specific. Anticipation begins forming. Conversation available but rarely used. |
| Sessions 8–14 | **Full loop** | All 5 structural beats running. The routine forms. Clear-then-build becomes habitual. Students begin using chat — Recognition deepens through conversation. |
| Sessions 14+ | **Personalized** | Recognition deepens ("When you pick Sharp..."). Conversation becomes more frequent — students ask ELI planning and pattern questions. Loop becomes unique to this student. |
| Sessions 21+ | **Identity-level** | Identity moment card fires (see [08-footer-and-identity.md](../systems/footer-identity.md)). Conversation layer deepens the relationship beyond what structured SDUI can create. The student doesn't just use the app — they're becoming someone different. |

---

## Loop Formation Period

The loop cannot be circular before it has the components to cycle. This is expected behavior for Sessions 1–7, not a design flaw. For detailed session-by-session mechanics, see [16-formation-period.md](../systems/formation-period.md).

| Sessions | What's missing | What fills the gap | Critical risk |
|---|---|---|---|
| 1–3 | Revisits, Anticipation, strong Seed | Novelty + Micro-win + generic Recognition | Student drops if the first CTA is too big |
| 3–5 | Anticipation still weak | First Closure fires (`3→2`). Seed becomes topic-specific | If the first verification ask feels clinical, student skips — no Closure, no future Seed |
| 5–7 | Anticipation forming | Revisit count creates mild curiosity. Full Seed fires | If revisits pile faster than Closures, S7 pattern activates — collection without proof |
| 8+ | Nothing — loop is full | All beats running | Breakdown shifts from formation failure to trust failure (shame language, generic greetings) |

**Implication:** The critical retention window is Sessions 3–7, not Session 1. Session 1 is novelty. Session 21 is identity. Sessions 3–7 is where the loop either forms or collapses. The first real `3→2` Closure moment must be treated as the most important screen in the product during this period.

---

## The Conversation Layer

**Beat 6. Student-initiated. Available in Phase 1 and Phase 3 only.**

The Conversation layer is not a fixed position in the loop. It is a surface available at any point that deepens every other beat. A student who has talked to ELI — not just read its greetings — feels known in a way no structured SDUI screen can create alone.

**What it is:** A full-screen bottom sheet chat where the student talks to ELI about their sessions, patterns, progress, and plans. ELI responds with data-grounded answers drawn from the student's actual record.

**What it is not:** A tutoring surface. ELI does not explain concepts, answer topic questions, or generate practice material. When a student asks a content question, ELI redirects: *"That's your textbook's job. Tell me what happened when you tried studying it — did you get through it? Did you verify?"*

**How it deepens each beat:**

| Beat | How Conversation deepens it |
|---|---|
| **Anticipation** | "I wonder what ELI noticed about my week" becomes its own pull — separate from pending checks |
| **Recognition** | A student who has had a real conversation feels known beyond what any greeting template can achieve |
| **Micro-win** | Student can talk through resistance ("I don't feel like studying") and ELI surfaces the smallest entry point from their actual data |
| **Closure** | Student can process a session after Phase 3 — not just see the counter drop, but reflect on what happened |
| **Seed** | ELI can plant a more personalised, nuanced forward hook through conversation than any pre-composed line |

**Rules:**
- Always student-initiated. ELI never pushes the student into chat.
- ELI always opens with a data-grounded observation — never a blank prompt.
- Hidden during Phase 2 (active session). The student is studying; the footer is not shown.
- Chat does not replace the structured Phase 1 CTA flow. Talking to ELI is not a session substitute.
- Full design spec: [15-chat-companion.md](../systems/chat-companion.md)

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
| **S7** (Ambitious) | **Anticipation** | Curiosity about their revisit count pulls them in | "Did my revisits go down?" — the count is a mild obsession |

---

## Per-Beat State Execution

The 6 beats are universal. Their execution differs by the student's **current state**, which the EI engine determines from real signals — not from a fixed archetype label. A S1 topper can be in burnout on a bad week. A S5 burnout student can have a rare high-energy day. The engine routes on what's actually happening, not on who the student typically is.

**Three states drive execution:**

| State | What the engine sees | Who tends to be here |
|---|---|---|
| **Rescue** | `SilenceDays ≥ 2`, or `energy = Low` with recent session gap, or V1/V5 routing | S5 (burnout), S2 under exam pressure, S3 (stalled) |
| **Normal** | Energy Okay–Good, recent sessions, pending checks in range | Most students, most days |
| **High-energy** | Energy Sharp (5), `VerificationRate7d` positive trend, active recent sessions | S1 (topper), S7 in a productive week |

| Beat | Rescue | Normal | High-energy |
|---|---|---|---|
| **Anticipation** | Minimal pull — student is returning from avoidance, not curious. The driver is "I need to get back to it," not "I wonder what ELI has." | Open-loop anxiety — "I have 2 revisits and Thermodynamics hasn't been touched in 9 days." Data, not ELI's personality, is the pull. | Competitive curiosity — "Did my revisit count go down? Am I ahead or behind this week?" |
| **Recognition** | Maximum warmth, minimum data load. "Welcome back. No speeches." The bar must feel lower than the student feared. | Direct data observation. "3 sessions this week, 2 pending. Electrostatics is oldest." Honest, specific — no flattery, no affirmation without data. | Honest mirror with challenge. "You've added 3 topics this week and closed 1 check. The ratio is off." Recognition here is accountability, not comfort. |
| **Micro-Win** | Session-start CTA. "5 minutes. Open the book. That's it." Any engagement breaks the inertia. Duration is the unit. | Verification-first CTA. "Close 1 revisit first (8 min), then your topic." Outcome is the unit — the loop closing, not time elapsed. | Prioritized verification. "3 revisits waiting. Electrostatics is oldest. Start there." No softening needed. |
| **Closure** | The counter drop carries more weight here — it's proof something happened after the silence. Treat it as the emotional peak of the session. | Standard counter animation. `3 → 2`. Clean, complete, no drama. | High-energy students may close 2 checks in one session. Fire the closure beat twice — show each drop separately, don't combine them. |
| **Seed** | Minimal or none. "Tomorrow then." One sentence. No topic name, no count — don't add pressure after re-entry. | Specific count + topic. "2 revisits left this week. Electrostatics next time." | Ambitious forward hook. "1 revisit left this week — you could close it today. Want to?" Leave the door open for another loop. |
| **Conversation** | More likely to be used — the student wants to process the silence before or after the session. ELI opens with what it noticed, not a blank prompt. | Available but less frequently triggered. Student uses chat for planning: "Should I do Thermodynamics or Electrostatics first?" | Planning and accountability. ELI can challenge: "You've been adding topics faster than you're closing them. What's the plan?" |

---

## What Can Break the Loop

| Break point | What happens | How to prevent |
|---|---|---|
| Generic greetings | Recognition beat fails; app feels like a tool | Greetings must be AI-generated from student data at scale; never repeat |
| Overwhelming scope | Micro-win beat fails; student freezes | Normal: primary CTA is a verification action (bounded by outcome, not time). Rescue: primary CTA is ≤10 min session-start. Never show open-ended scope in either state. |
| No counter change visible | Closure beat fails; effort feels invisible | Phase 3 MUST show the count change when a revisit is closed |
| No forward hook | Seed beat fails; no reason to return tomorrow | Phase 3 MUST include exactly one forward signal (except Fatigue/Confusion skip) |
| Shame language | Trust breaks; entire loop collapses | See [10-microcopy-bible.md](../systems/microcopy.md) banned phrases |
| Streak counter | Anticipation becomes anxiety after a gap; S5 uninstalls | Never show streaks; see [12-anti-patterns.md](../systems/anti-patterns.md) |
| Chat becomes a session substitute | Student opens chat to process anxiety, feels satisfied, closes app without studying | Chat entry point (footer) stays below the Phase 1 CTAs; chat has no "start session" button |
| ELI answers content questions in chat | Student uses chat as a tutor; Phase 2 becomes redundant | ELI's chat persona redirects content questions explicitly; scope is behavioral only |

---

*Next: [02-retention-mechanics.md](retention-mechanics.md) — the 5 specific mechanics that power each beat.*
*Formation period: [16-formation-period.md](../systems/formation-period.md) — session-by-session mechanics for Days 1–7.*
*Task types and Phase 3: [17-task-types-and-phase3.md](../systems/task-types.md) — how loops open and close.*
*Chat surface: [15-chat-companion.md](../systems/chat-companion.md) — full design spec for the Conversation layer.*
