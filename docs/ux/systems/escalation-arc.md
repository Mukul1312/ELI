# The Escalation Arc — Session 1 to Session 21+

> **Note:** For the definitive session-by-session capability map with pattern claim tier integration, see [relationship-arc.md](relationship-arc.md). This document provides the high-level arc and per-archetype escalation differences. Doc 21 provides the granular unlock schedule.

ELI is not static. It evolves. The student at Session 1 sees a different ELI than the student at Session 14. This document maps that evolution — how the craving loop strengthens, which mechanics activate when, and what happens when a student regresses.

**Unit convention:** Escalation is **session-driven, not calendar-driven** (see [formation-period.md](formation-period.md)). "Session 7" means "7th completed session" — for a daily student this is ~Day 7; for a student who studies 3x/week, it takes ~2.5 weeks. The system never assumes daily use.

---

## 1. The Escalation Arc (Master Table)

| Period | ELI behaviour | Student experience | Key mechanic activated | Craving loop strength |
|---|---|---|---|---|
| Sessions 1–2 | Observe. Default prompts. Tier 1 claims only (count-based facts). No personalization. No constraints. No recommendation. | "It's an app. Seems simple." | Micro-win (tiny proof) | Weak — only Micro-win beat works |
| Sessions 3–4 | Time picker appears. Simple continuation recommendation. Memory-based greeting ("Back to Thermodynamics?"). | "It remembers what I was working on." | Recognition (memory) | Building — Recognition kicks in |
| Sessions 5–7 | Full recommendation algorithm active. Tier 2 pattern claims (hedging: "seems like," "lately"). Checkin observation line appears. | "It's keeping me honest, but gently." | Loop closure (recommendation-guided) | Building — Closure starts landing |
| Sessions 8–10 | Routine forms. Silence rules switch to established mode. Tier 3 confident patterns. Identity moments eligible. Weekend pattern computed. | "This is becoming a habit. Clear then build." | Loop closure (habitual) | Strong — full loop running |
| Sessions 11–14 | Tier 4 correlations available. Avoidance detection active. Pre-silence context signals tracked. Time crunch handling: low energy/short days, ELI keeps ask tiny. | "It trusts me even when I have a bad day." | "It knows me" + No punishment | Strong — trust deepens |
| Sessions 14–20 | First personalization hint. "When you pick Sharp (5), you do best with 1 pending check first, then hard work." Reflects the student's own pattern. | "It KNOWS me. This is personal." | "It knows me" (full) | Personalized — loop becomes unique |
| Sessions 20+ | Identity moment card. First identity statement (when eligibility earned). All tiers active. Full recommendation intelligence. | "I'm different now." | Identity formation | Identity-level |

> **Day 15 guardrails — SUPERSEDED.** The original arc included weekly guardrails at Day 15 ("ELI sets 2 plain rules for the week"). This has been replaced by distributed relationship deepening: pattern claim tiers + topic recommendation + identity moments provide more effective and gradual relationship development without requiring a synthesis card or guardrail mechanism. See [relationship-arc.md §Day 15 Guardrails](relationship-arc.md) for the full rationale.

---

## 2. Per-Archetype Escalation Differences

### S7 (Ambitious Collector)

- **Key inflection:** Session 4–5 (deal card). This is when pending checks stop growing.
- **Arc highlight:** The two-step card (Session 8–10) becomes their natural workflow.
- **Identity statement:** "You're not just studying — you're closing the loop."

### S5 (Burnout Risk)

- **Key inflection:** Session 4 re-entry. The warm welcome after silence rebuilds trust.
- **Arc highlight:** The slow rebuilding — sessions are sparse, so session count progresses slower than calendar days.
- **Identity statement:** "You came back."
- **Special:** S5's arc is slower — Session 14 personalization might not arrive for 3–4 calendar weeks if sessions are sparse.

### S2 (Revenge Planner)

- **Key inflection:** Session 1 (scope-down). The 2-minute start bypasses the freeze.
- **Arc highlight:** "Pressure != capacity" insight forming by Session 5–7.
- **Identity statement:** "Pressure days don't break you anymore — you still start."
- **Special:** S2 may have a relapse at Session 3–4 when they try to overscope again. ELI catches this with the deal card.

### S1 (Topper)

- **Key inflection:** Session 8–10 (autonomy earned quickly).
- **Arc highlight:** Boost mode unlocked earlier than other archetypes.
- **Note:** S1 spends most of the arc in Neutral/Boost. ELI's job is not to rescue but to challenge.

### S3 (Stalled Starter)

- **Key inflection:** Session 4–5 (first "2-minute start" that actually works).
- **Arc similar to S2** but without the pressure component — the freeze is procrastination, not anxiety.

### S4 (Flowing-but-Avoidant)

- **Key inflection:** Session 4–5 (first honest mirror about verification rate).
- **Arc highlight:** The "session doesn't count without proof" message at SessionEnd becomes the key friction.
- **Full storyboard:** [`storyboards/S4-flowing-but-avoidant.md`](../validation/storyboards/S4-flowing-but-avoidant.md) — 20 sessions, 12 days, all systems applied.

### S6 (Grinder)

- **Key inflection:** Session 14 (personalization hint about technique, not volume).
- **Arc highlight:** Shift from "study more" to "study differently" is gradual.

---

## 3. Regression Handling

Students don't progress linearly. They regress. The system must handle regression without starting over.

**Principle: Never fully restart the arc. The system remembers even when the student regresses.**

| Regression type | What happened | ELI response | Arc position |
|---|---|---|---|
| Silence after Session 14 | Student goes quiet for 3+ days after being stable | Re-entry per silence tier rules ([silence-reentry.md](silence-reentry.md)). NOT Session 1 reset. Keep personalization data + tier. | Established re-entry with full context |
| Pending spike after Session 10 | Pending checks jump from 2 to 5 after a stable period | Re-introduce deal card, but with personalized tone if available. | Current session, constraint overlay |
| Energy crash after Session 15 | Student hits Low (2) / Exhausted (1) after weeks of Good/Sharp | Rescue mode activated. Don't drop personalization. Smallest scope pre-selected. | Current session, Rescue mode overlay |
| Skip streak after Session 12 | Student skips verification 3+ times in a row | Tighten P3 verification default (smaller ask, not more pressure). Don't lecture. Avoidance detection may activate ([topic-recommendation.md](topic-recommendation.md)). | Current session, tighter defaults |

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

## 5. Cross-References

| Related doc | What it adds |
|---|---|
| [formation-period.md](formation-period.md) | Session-vs-day unit convention, Session 1 setup mode, same-day re-entry rules |
| [task-types.md](task-types.md) | Task type auto-suggestion logic, Phase 3 decision matrix per task type |
| [topic-recommendation.md](topic-recommendation.md) | Priority stack for "what to study," energy adjustment, avoidance detection |
| [silence-reentry.md](silence-reentry.md) | Three silence duration tiers, formation-aware interpretation, re-entry greeting rules |
| [relationship-arc.md](relationship-arc.md) | Definitive session-by-session capability map with pattern claim tier integration |
| [storyboards/S4-flowing-but-avoidant.md](../validation/storyboards/S4-flowing-but-avoidant.md) | Full 20-session storyboard demonstrating escalation arc with all systems active |
| [product-audit/05-usable-to-lovable-roadmap.md](../../product-audit/05-usable-to-lovable-roadmap.md) | Tiered implementation roadmap — which escalation features ship when |

---

**Link to next doc:** [microcopy.md](./microcopy.md)
