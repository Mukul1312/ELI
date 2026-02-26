# Archetype Experience Map — All 7 Students

This document maps every student archetype to the experience system. It is NOT a journey retelling — the storyboards do that. This is a cross-reference: for each archetype, which craving loop beat hooks them, which phase variant they see, which mechanic matters most, and what causes dropout.

---

## 1. Master Map

| Archetype | Entry beat | Primary mechanic | Phase 1 mode (default) | Phase 1 buttons | Phase 3 key scenario | Escalation inflection | Danger zone | Identity statement |
|---|---|---|---|---|---|---|---|---|
| S1 (Topper) | Closure | Loop Closure | Boost | 2-3 | Verification completed (satisfying) | Day 8-10 (autonomy early) | Patronizing copy; "Great job!" | "Clean slate. That's earned." |
| S2 (Revenge Planner) | Micro-win | Micro-Win Entry | Rescue (pressure override) | 2 | Reminder set / first verification | Day 1 (scope-down -> they start) | Overscoping -> freeze -> guilt | "Pressure days don't break you anymore -- you still start." |
| S3 (Stalled Starter) | Micro-win | Micro-Win Entry | Rescue (low start) | 1-2 | First verification (milestone) | Day 4-5 (2-min start works) | Overwhelm; too many options | "You started. That's the hardest part." |
| S4 (Flowing-but-Avoidant) | Recognition | "It Knows Me" (mirror) | Neutral -> Rescue at P3 | 2-3 | Deal card at SessionEnd (verification push) | Day 4-5 (honest mirror about avoidance) | Resentment at verification ask | "Your sessions count now." |
| S5 (Burnout Risk) | Recognition | No Punishment | Rescue | 1 | Skip (Fatigue) -- acknowledged gently | Day 4 (re-entry warmth) | Too many prompts; shame language | "You came back. That matters." |
| S6 (Grinder) | Recognition | "It Knows Me" (technique) | Neutral | 2-3 | Verification with technique hint | Day 14 (personalization about how, not how much) | Volume obsession; "study harder" copy | "You're studying differently now. It shows." |
| S7 (Ambitious Collector) | Anticipation | Loop Closure | Neutral + deal card | 2 + pending list | Verification completed (3->2 counter) | Day 4-5 (deal card; pending stops growing) | Never closing loops; false productivity | "You're not just studying -- you're closing the loop." |

---

## 2. Detailed Per-Archetype Writeup

The three storyboarded archetypes (S2, S5, S7) have full 21-day journeys documented separately. See [00-index.md](./00-index.md) for links. Below are the four archetypes that do NOT have dedicated storyboards, along with S2, S5, and S7 summaries for quick reference.

### S1 (Topper)

High integrity student. Enters the craving loop at Closure -- proving recall is satisfying, not obligatory. Default mode is Boost when eligible. ELI's job: don't patronize; raise difficulty, give harder problems. Danger: "Great job!" feels fake; any gamification feels below them. The identity moment for S1 is "Clean slate. That's earned." -- acknowledging their consistency without being cheesy.

Phase 1 unlocks Boost mode earlier than any other archetype (Day 8-10 vs. Day 16-18 for others). Phase 3 verification is never a struggle -- S1 closes loops naturally. The risk is boredom, not dropout: if ELI's copy reads like a tutor for struggling students, S1 disengages quietly.

**Dropout signal:** Copy tone shifts toward encouragement ("Great job!") or visible gamification (badges, streaks). S1 reads these as the system treating them like a child. They stop opening the app without ever complaining -- the silence is quiet, not dramatic. Monitor: if a Boost-eligible student with `verification_rate_7d >= 0.85` drops to zero sessions, the copy tone is the first suspect.

**Copy rule:** Never use exclamation marks for S1. "Clean slate." not "Clean slate!" The period is earned.

### S2 (Revenge Planner)

Full storyboard: [`EI_Storyboard_S2_RevengePlanning_Day1-21.md`](../../EI_Storyboard_S2_RevengePlanning_Day1-21.md). Summary: arrives with high pressure after a bad mock. Wants to "destroy the next exam." Enters at Micro-win. ELI's job: scope down immediately. The 2-minute start bypasses the freeze. Danger: overscoping -> freeze -> guilt -> silence. The deal card at Day 3-4 catches the relapse.

**Dropout signal:** S2 declares a massive study plan ("I'll do 6 topics today"), then goes silent for 2+ days. The freeze is guilt-driven -- they set an impossible bar, missed it, and now the app is associated with failure. Catch this with scope-down at the declaration point, not after the silence.

**Copy rule:** Never validate overscoping. "Let's start with one." not "Great plan! Let's start with the first one."

### S3 (Stalled Starter)

Good intentions, high procrastination. Similar to S2 but without pressure -- the freeze is inertia, not anxiety. Enters at Micro-win. ELI's job: make starting impossibly easy. "One small thing" with ONE button. Danger: too many options on Phase 1 causes decision paralysis. Keep it to 1 button in Rescue, max 2 in Neutral. Identity: "You started. That's the hardest part."

S3 and S2 share the same Phase 1 mechanic (Micro-Win Entry) but for different reasons: S2 freezes from pressure, S3 freezes from inertia. The difference shows at Phase 3: S2 needs reminder-based closure (external structure), while S3 celebrates the first verification as a milestone (internal shift).

**Dropout signal:** S3 opens the app, sees 3 buttons, and closes without tapping any. The decision paralysis is the dropout. If `AppOpen` events without subsequent `IntentSet` events occur 2+ times, the screen has too many options for this student. Reduce to 1 button.

**Copy rule:** One verb, one action. "Review Thermodynamics (2 min)" not "You could review Thermodynamics, or try something new, or clear a pending check."

### S4 (Flowing-but-Avoidant)

Looks productive -- starts fast, studies well, but never verifies. The issue surfaces at P3 (SessionEnd). Enters at Recognition -- the honest mirror ("you're active, but proof is lagging"). ELI's job: the deal card at P3, gentle but firm. Danger: if the verification ask feels like a test, S4 resents it and games the system. Keep it to "1 question, 2 minutes" -- not an exam. Identity: "Your sessions count now."

S4 is the only archetype where the primary intervention is at Phase 3, not Phase 1. Their Phase 1 is fine -- they open the app, they study. The problem is at SessionEnd: they want to close the app without proving anything. The deal card ("Clear 1 check before you go?") at P3 is the key mechanic.

**Dropout signal:** S4 starts gaming the system -- tapping "Remind me later" on every deal card, or selecting the easiest possible verification question to satisfy the prompt without real recall. If `VerificationDecision = Reminded` appears 3+ times consecutively, the deal card is being deflected, not considered. Don't increase pressure -- instead, shrink the ask further: "1 question. Yes or no. 30 seconds."

**Copy rule:** Frame verification as closure, not testing. "Prove it to yourself" not "Let's test what you learned."

### S5 (Burnout Risk)

Full storyboard: [`EI_Storyboard_S5_BurnoutRunway_Day1-21.md`](../../EI_Storyboard_S5_BurnoutRunway_Day1-21.md). Summary: studies until they crash, then disappears. Returns feeling guilty. Enters at Recognition (re-entry warmth). ELI's job: never reference the absence, never show zeros, never use shame. "Welcome back." -- period. The system's patience IS the mechanic.

**Dropout signal:** S5's dropout is the silence itself. The app cannot prevent it -- burnout happens outside the product. What the app CAN control is whether re-entry feels safe. Every other anti-pattern in [12-anti-patterns.md](./12-anti-patterns.md) is primarily about protecting S5's re-entry. If even one shame-adjacent surface exists (zero-state numbers, streak broken, "you missed 3 days"), S5 does not come back.

**Copy rule:** Shortest possible sentences. "Welcome back." "Ready when you are." "Small start today." No compound sentences. No "but." No "let's get back on track."

### S6 (Grinder)

Studies 8+ hours, always verifies, but wrong technique -- passive reading instead of active recall. Enters at Recognition (technique pivot). ELI's job: the personalization hint at Day 14 should be about HOW they study, not how much. "When you pick Practice, your recall rate doubles vs Learn." Danger: telling a hard worker to "study differently" can feel dismissive. Frame as discovery, not correction. Identity: "You're studying differently now. It shows."

S6 is the only archetype where the system must actively steer technique. For all others, the mechanics focus on engagement, closure, or re-entry. For S6, the craving loop only hits full strength when the personalization hint lands at Day 14 and the student sees a real difference in their recall.

**Dropout signal:** S6 rarely drops out -- they are disciplined. The failure mode is stagnation: they keep using the app but never improve because they never change technique. If `TaskType` distribution stays >70% `learn` after Day 14 and no `practice`/`revise` sessions appear, the personalization hint either hasn't landed or was dismissed. Re-surface the technique comparison in a different phrasing.

**Copy rule:** Frame technique shift as discovery, never correction. "Something interesting: when you pick Practice, your scores jump" not "You should try active recall instead of passive reading."

### S7 (Ambitious Collector)

Full storyboard: [`EI_Storyboard_S7_Day1-21.md`](../../EI_Storyboard_S7_Day1-21.md). Summary: starts many topics, verifies few. Pending checks pile up. Enters at Anticipation -- the promise of loop closure. ELI's job: the deal card at Day 4-5 stops the pile from growing. The two-step card (Day 8-10) becomes their natural workflow: clear 1, then build. Identity: "You're not just studying -- you're closing the loop."

**Dropout signal:** S7 doesn't drop out -- they stay engaged but never close loops. The danger is false productivity: 10 topics started, 0 verified. If `pending_checks` increases for 5+ consecutive days with no `VerificationCompleted` events, the system is enabling collection without closure. The deal card must become non-optional at this point: "Clear 1 before starting a new topic."

**Copy rule:** Celebrate closure, not breadth. "3 pending -> 2. Nice." not "You studied 5 topics this week!" The counter going down is the reward.

---

## 3. Dropout Risk Signals — Quick Reference

| Archetype | Signal to monitor | Threshold | Interpretation |
|---|---|---|---|
| S1 | Zero sessions after Boost eligibility | 3+ days silence with `verification_rate_7d >= 0.85` | Copy tone is patronizing; S1 disengaged silently |
| S2 | IntentSet with 3+ topics followed by silence | 2+ days silence after multi-topic intent | Overscoping -> freeze -> guilt loop activated |
| S3 | AppOpen without IntentSet | 2+ occurrences in 3 days | Decision paralysis; too many buttons on Phase 1 |
| S4 | Consecutive `Reminded` decisions | 3+ in a row | Deal card is being deflected; shrink the ask |
| S5 | Silence duration | Any silence >= 3 days | Expected behavior; protect re-entry at all costs |
| S6 | TaskType stuck on `learn` | >70% `learn` after Day 14 | Personalization hint not landing; rephrase |
| S7 | `pending_checks` rising without `VerificationCompleted` | 5+ consecutive days | False productivity; deal card must tighten |

---

## 4. Archetype x Phase Interaction Matrix

Quick reference for which Phase 1 / Phase 2 / Phase 3 variants each archetype encounters:

| Archetype | Phase 1 variant used | Phase 2 pattern | Phase 3 variant used |
|---|---|---|---|
| S1 (Topper) | CHALLENGE or CLEAN START | Normal flow, Boost difficulty | Verification completed (satisfying) |
| S2 (Revenge Planner) | HIGH PRESSURE | 2-min start, Rescue mode | Reminder set or first verification |
| S3 (Stalled Starter) | LOW ENERGY or SILENCE RE-ENTRY | 2-min start | First verification (milestone) |
| S4 (Flowing-but-Avoidant) | PENDING + STANDARD | Normal flow | Deal card at SessionEnd |
| S5 (Burnout Risk) | SILENCE RE-ENTRY or LOW ENERGY | Short session, easy difficulty | Skip (Fatigue) acknowledged |
| S6 (Grinder) | PENDING + STANDARD | Normal flow | Verification with technique hint |
| S7 (Ambitious Collector) | DEAL CARD | Normal flow | Verification completed (3->2) |

Cross-references:
- Phase 1 variants: [05-phase1-the-open.md](./05-phase1-the-open.md)
- Phase 2 flow: [06-phase2-the-session.md](./06-phase2-the-session.md)
- Phase 3 variants: [07-phase3-the-close.md](./07-phase3-the-close.md)
- Escalation arc per archetype: [09-escalation-arc.md](./09-escalation-arc.md) Section 2
- Identity statements: [08-footer-and-identity.md](./08-footer-and-identity.md) Part 2
- Craving loop beats: [01-craving-loop.md](./01-craving-loop.md)
- Retention mechanics: [02-retention-mechanics.md](./02-retention-mechanics.md)

---

Next: [12-anti-patterns.md](./12-anti-patterns.md)
