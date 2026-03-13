# Product Audit — From Prototype to Product

> This folder is a diagnostic of the gap between the current EI product specs and a real, usable product that students would crave. These documents do not propose fixes. They diagnose root causes and surface the questions that must be answered before any fix can be designed correctly.

---

## Why this audit exists

The EI product documentation was written to prove that the behavioral mechanics work. The engine taxonomy correctly describes routing. The storyboards correctly show what outcomes ELI is trying to achieve. The craving loop correctly identifies the psychological beats.

But proving mechanics is not the same as designing an experience. These documents describe the system's perspective — gates, signals, outputs, routing labels. They do not describe what a student at 11pm who is exhausted, has three pending checks, and doesn't know why they keep opening the app and closing it without starting will actually see, feel, and do.

This audit maps the gap between those two levels, issue by issue, so that it can be designed across — not papered over.

---

## Documents audited

| Document | What it is |
|---|---|
| `docs/ux-design-brief.md` | Full UX brief — student archetypes, gate moments, scales, storyboards, success criteria |
| `docs/ei/EI_Engine_Taxonomy.md` | Internal engine contract — inputs, derived signals, routing labels, gate output shapes |
| `docs/ei/storyboards/EI_Storyboard_S2_RevengePlanning_Day1-21.md` | 12-scene journey: Revenge Planner (post-mock, high pressure) |
| `docs/ei/storyboards/EI_Storyboard_S5_BurnoutRunway_Day1-21.md` | 12-scene journey: Burnout Risk (going silent, low energy) |
| `docs/ei/storyboards/EI_Storyboard_S7_Day1-21.md` | 12-scene journey: Ambitious Collector (pending checks piling) |

---

## Five categories of findings

| Category | What it covers |
|---|---|
| **Stale features** | Design decisions changed in later docs but never removed from earlier ones. Implementing from these documents today would ship retired interactions. |
| **Realism failures** | Moments where ELI is scripted to say things or do things the system cannot support. These break the companion illusion when students notice. |
| **Engine gaps** | Signals, events, and data contracts required by product features that the engine taxonomy does not define. Implementation blockers. |
| **Lovable product gaps** | Whole experience categories no current document addresses. Without these, the craving loop cannot form past Day 7. |
| **Usable → Lovable roadmap** | Prescriptive single-founder implementation guide. Bridges the diagnostic (docs 01–04) with what to actually build, in what order, based on real student feedback. |

---

## Reading order

| Order | Doc | What you learn |
|---|---|---|
| 1 | [01-stale-features.md](01-stale-features.md) | Five removed features still present verbatim — exact file, exact text, routing impact, open questions |
| 2 | [02-realism-failures.md](02-realism-failures.md) | Five moments where ELI claims knowledge it can't have or describes features with no mechanism |
| 3 | [03-engine-gaps.md](03-engine-gaps.md) | Six missing signals, events, and contracts that block specific features from being implemented |
| 4 | [04-lovable-product-gaps.md](04-lovable-product-gaps.md) | Six experience categories entirely absent from any doc — what a lovable product requires |
| 5 | [05-usable-to-lovable-roadmap.md](05-usable-to-lovable-roadmap.md) | Single-founder roadmap: what to build first, incremental tiers, scaling framework, decision priority matrix |

---

## Quick-reference: all issues by severity

### Critical (blocks implementation)

| Issue | Doc |
|---|---|
| V3 trigger signals (`examProximityDays`, `avoidancePattern`, `recentMockFailure`) not defined in taxonomy | [03 §1](03-engine-gaps.md) |
| `timeCommitment` missing from AppOpen — scope calculation has no time input | [03 §2](03-engine-gaps.md) |
| Chat data layer has zero contract — no events, no context type, no history model | [03 §3](03-engine-gaps.md) |
| `taskType` in IntentSet — should be in AppOpen per doc 05 | [01 §4](01-stale-features.md) |

### High (degrades product quality or causes routing errors)

| Issue | Doc |
|---|---|
| BacklogPressure routing condition references a ghost value after input removal | [03 §5](03-engine-gaps.md) |
| `StrategicAdjustmentDecision` has no delivery mechanism — Day 15 guardrails unimplementable | [03 §4](03-engine-gaps.md) |
| Topic recommendation ordering undefined — ELI cannot guide what to study | [03 §6](03-engine-gaps.md) |
| Day 1–7 formation period undesigned — highest-risk retention window | [04 §1](04-lovable-product-gaps.md) |
| ELI greeting generation at scale unspecced — Recognition beat expires Day 10 | [04 §3](04-lovable-product-gaps.md) |
| Emotional event detection is one-size-fits-all — re-entry quality depends on cause | [04 §4](04-lovable-product-gaps.md) |
| ELI relationship arc over 21 days undefined — deepening has no design | [04 §6](04-lovable-product-gaps.md) |

### Medium (stale references, must be cleaned up before implementation)

| Issue | Doc |
|---|---|
| BacklogPressure as student-tapped input — still in all 3 storyboards, UX brief, taxonomy | [01 §1](01-stale-features.md) |
| "More context" toggle → Pressure scale — still in all 3 storyboards, UX brief, taxonomy | [01 §2](01-stale-features.md) |
| DifficultyTier as student pick — still in all 3 storyboards, UX brief, taxonomy | [01 §3](01-stale-features.md) |
| `timeCommitment` missing from AppOpen — also a stale mismatch | [01 §5](01-stale-features.md) |
| Day 15 guardrails mechanism nonexistent — presented as solved when fully undesigned | [02 §3](02-realism-failures.md) |
| Energy × time-of-day pattern claims require undefined derived signals | [02 §4](02-realism-failures.md) |
| Success criteria measure form speed, not product love | [04 §5](04-lovable-product-gaps.md) |
| Topic recommendation intelligence undefined — Anticipation beat has no intelligence backing it | [04 §2](04-lovable-product-gaps.md) |

### Companion illusion (breaks trust when students notice)

| Issue | Doc |
|---|---|
| S5 Scene 4: "Open one page / solve just Q1 / write 3 key points" — ELI giving content instructions it cannot give | [02 §1](02-realism-failures.md) |
| S7 Scene 3: "That's why recall starts feeling shaky" — cognitive claim without cognitive data | [02 §2](02-realism-failures.md) |
| Template ceiling on Recognition beat — storyboards don't acknowledge the Day 10 expiration | [02 §5](02-realism-failures.md) |

---

## Legacy document disposition

Two source documents audited here are **v1 legacy docs** — written for the original prototype. They are not authoritative references for the current product design. They need to be either updated in-place or dissolved and their valid content redistributed into the docs that now own those decisions.

| Document | Status | Disposition direction |
|---|---|---|
| `docs/ux-design-brief.md` | Legacy v1.0 (Feb 2026) — written for design agency, before major design decisions were revised | Needs full review: remove stale inputs (BacklogPressure, "More context", DifficultyTier as student pick), update success criteria, add chat surface to scope, or dissolve and point to `docs/ux/` as the authoritative spec |
| `docs/ei/EI_Engine_Taxonomy.md` | Legacy internal contract — inputs and routing conditions not updated after student-input removals | Needs update: remove student-tapped inputs that no longer exist, add missing fields (`timeCommitment`, V3 triggers, chat events), correct routing conditions that reference ghost values |

**"Dissolve" means:** content that is valid and still authoritative gets moved to the doc that now owns that decision. Content that is stale gets deleted. The legacy doc itself either becomes a redirect pointer or is removed.

**"Update in-place" means:** the doc remains the reference, but every stale section is corrected. Risky if the doc is used as-is by external collaborators (design agency) who won't know which version they have.

---

## Storyboard disposition

All three storyboards in `docs/ei/storyboards/` were written for the prototype phase. They are **not realistic journeys** — they describe a product that assumed features that don't exist (Day 15 guardrails mechanism, BacklogPressure student taps, DifficultyTier picks, content-level ELI instructions) and present 21-day arcs without acknowledging the template ceiling or the formation period.

| Storyboard | What needs to change |
|---|---|
| `EI_Storyboard_S2_RevengePlanning_Day1-21.md` | Remove "More context" pressure tap and DifficultyTier student pick from all scenes; fix Day 15 guardrails (either design the mechanism or reframe the moment as something ELI can actually do); add Days 1–3 formation period scenes |
| `EI_Storyboard_S5_BurnoutRunway_Day1-21.md` | Remove BacklogPressure student tap and "More context" toggle; fix Scene 4 content instruction ("Open one page / solve just Q1"); remove DifficultyTier student pick; fix Day 15 guardrails |
| `EI_Storyboard_S7_Day1-21.md` | Remove BacklogPressure conditional add-on; remove "More context" tap in Scene 8; remove DifficultyTier student pick throughout; fix Scene 3 cognitive claim ("recall starts feeling shaky"); fix Day 15 guardrails |

The storyboards need a **realistic rewrite** — not a patch. A patch removes the stale references but leaves the narrative. A rewrite redesigns the scenes around what ELI can actually do, what data it actually has, and what the experience actually looks like at each day of the 21-day arc.

The rewrite requires the lovable product gaps (doc 04) to be resolved first — specifically the Day 1–7 formation period design, the topic recommendation algorithm, and the greeting generation approach. A realistic storyboard for Day 1 cannot be written until Day 1 is designed.

---

## What this audit does NOT cover

The following are already in-progress via existing plans and are not re-diagnosed here:

- Checkin signal strategy changes (`ux-scales.md`, `scales-input.md`, `variants.md`, `phase1/00-overview.md`) — documented in the deferred plan
- Phase 2 active session design — already specced in `docs/ux/phase2/`
- Push notification design — already specced in `docs/ux/phase2/push-notifications.md`
- Topic selection system — already specced in `docs/ux/systems/topic-selection.md`
- ELI chat companion UX — already designed in `docs/ux/systems/chat-companion.md` (the gap is the data contract, not the UX design)

---

*These documents diagnose. They do not fix. Every open question raised here must be answered before the corresponding fix doc can be written.*
