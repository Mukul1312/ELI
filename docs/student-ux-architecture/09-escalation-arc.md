# The Escalation Arc — Day 1 to Day 21

ELI is not static. It evolves. The student on Day 1 sees a different ELI than the student on Day 14. This document maps that evolution — how the craving loop strengthens, which mechanics activate when, and what happens when a student regresses.

---

## 1. The 21-Day Arc (Master Table)

| Period | ELI behaviour | Student experience | Key mechanic activated | Craving loop strength |
|---|---|---|---|---|
| Day 1–3 | Observe. Default prompts. Tiny proof asks at SessionEnd. No personalization. No constraints. | "It's an app. Seems simple." | Micro-win (tiny proof) | Weak — only Micro-win beat works |
| Day 4–5 | First honest mirror. If pendingChecks >= 3: gentle constraint via "deal card." If silence: warm re-entry. | "Wait — it noticed something." | Recognition (mirror) | Building — Recognition kicks in |
| Day 6–7 | Reminders tighten to 24h. Scope stays bounded. Deal card becomes consistent if pending is high. | "It's keeping me honest, but gently." | Loop closure (reminders enforce) | Building — Closure starts landing |
| Day 8–10 | Routine forms. Two-step card appears: "Clear 1 pending check (5 min), then new topic." Students begin to self-select "clear first." | "This is becoming a habit. Clear then build." | Loop closure (habitual) | Strong — full 5-beat loop running |
| Day 11–12 | Time crunch handling. On low energy/short days, ELI keeps the ask tiny. Skip is acknowledged without judgment. Trust protected on bad days. | "It trusts me even when I have a bad day." | No punishment | Strong — trust deepens |
| Day 14 | First personalization hint. "When you pick Sharp (5), you do best with 1 pending check first, then hard work." Reflects the student's own pattern. | "It KNOWS me. This is personal." | "It knows me" | Personalized — loop becomes unique |
| Day 15 | Weekly guardrails. ELI sets 2 plain rules for the week (not a schedule, not a plan — just 2 guardrails). "Keep pending <= 2." "New topic after clearing 1." | "Structure, not pressure. I can work with this." | Identity forming (structure acceptance) | Personalized |
| Day 16–18 | Autonomy returns. Fewer prompts. ELI stops blocking and only nudges at SessionEnd. Higher difficulty tiers allowed more freely. | "It backed off because I earned it." | Autonomy reward (Principle 6 from design brief) | Strong + autonomous |
| Day 21 | Identity moment card. First identity statement. | "I'm different now." | Identity formation | Identity-level |

---

## 2. Per-Archetype Escalation Differences

### S7 (Ambitious Collector)

- **Key inflection:** Day 4–5 (deal card). This is when pending checks stop growing.
- **Arc highlight:** The two-step card (Day 8–10) becomes their natural workflow.
- **Day 21 statement:** "You're not just studying — you're closing the loop."

### S5 (Burnout Risk)

- **Key inflection:** Day 4 re-entry. The warm welcome after silence rebuilds trust.
- **Arc highlight:** The slow rebuilding — Easy (1) -> Okay (3) -> Medium (2) difficulty over 2 weeks.
- **Day 21 statement:** "You came back."
- **Special:** S5's arc is slower — Day 14 personalization might not arrive until Day 18–20 if sessions are sparse.

### S2 (Revenge Planner)

- **Key inflection:** Day 1 (scope-down). The 2-minute start bypasses the freeze.
- **Arc highlight:** "Pressure != capacity" insight forming by Day 5–7.
- **Day 21 statement:** "Pressure days don't break you anymore — you still start."
- **Special:** S2 may have a "relapse" at Day 3–4 when they try to overscope again. ELI catches this with the deal card.

### S1 (Topper)

- **Key inflection:** Day 8–10 (autonomy earned quickly).
- **Arc highlight:** Boost mode unlocked earlier than other archetypes.
- **Note:** S1 spends most of the arc in Neutral/Boost. ELI's job is not to rescue but to challenge.

### S3 (Stalled Starter)

- **Key inflection:** Day 4–5 (first "2-minute start" that actually works).
- **Arc similar to S2** but without the pressure component — the freeze is procrastination, not anxiety.

### S4 (Flowing-but-Avoidant)

- **Key inflection:** Day 4–5 (first honest mirror about verification rate).
- **Arc highlight:** The "session doesn't count without proof" message at SessionEnd becomes the key friction.

### S6 (Grinder)

- **Key inflection:** Day 14 (personalization hint about technique, not volume).
- **Arc highlight:** Shift from "study more" to "study differently" is gradual.

---

## 3. Regression Handling

Students don't progress linearly. They regress. The system must handle regression without starting over.

**Principle: Never fully restart the arc. The system remembers even when the student regresses.**

| Regression type | What happened | ELI response | Arc position |
|---|---|---|---|
| Silence after Day 14 | Student goes quiet for 3+ days after being stable | Reset to Day 4 re-entry mode (warm, tiny bar). NOT Day 1. Keep personalization data. | Day 4 re-entry, but with Day 14 context |
| Pending spike after Day 10 | Pending checks jump from 2 to 5 after a stable period | Re-introduce deal card, but with Day 14 personalized tone if available. | Day 5 constraint, Day 14 tone |
| Energy crash after Day 15 | Student hits Low (2) / Exhausted (1) after weeks of Good/Sharp | Rescue mode activated. Guardrails simplified. Don't drop personalization. | Current day, Rescue mode overlay |
| Skip streak after Day 12 | Student skips verification 3+ times in a row | Tighten P3 verification default (smaller ask, not more pressure). Don't lecture. | Current day, tighter defaults |

### Key Rules

- Re-entry after regression always uses the **warmest** tone available at the current arc position.
- Personalization data is **never** reset — if Day 14 patterns were detected, they stay.
- Guardrails are relaxed back to current position, not added to previous ones.
- The identity moment is still available at Day 21+ even after regression, if the student re-earns eligibility.

---

## 4. Connection to Engine

The escalation arc is driven by `EI_Engine_Taxonomy.md` Section 6 tunables — risk thresholds tighten/loosen over time based on:

- **`VerificationRate7d`** — drives verification strictness
- **`OpenLoops`** — drives close-loops-first constraints
- **`SilenceDays`** — drives Rescue mode activation
- **`SkipCount7d`** — drives P3 default tightening
- **`StateTrend7d`** — drives mode selection

This document translates those engine-level signal changes into student-facing UX behaviour changes. The engine owns the thresholds; this document owns the experience.

---

**Link to next doc:** [10-microcopy-bible.md](./10-microcopy-bible.md)
