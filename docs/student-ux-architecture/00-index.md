# Student Experience System — Index

> This folder is the definitive spec for how the student experience is architected. It documents the psychological model, screen phases, retention mechanics, micro-copy patterns, and implementation constraints that make students crave the app.

---

## How to use

1. **Start here.** Read this index, then follow the reading order below.
2. **For principles and scales:** See [`ux-design-brief.md`](../ux-design-brief.md) — that doc covers the WHAT (design principles, archetypes, UX do's/don'ts). This folder covers the HOW (experience architecture) and the WHY (psychological model). **Note:** `ux-design-brief.md` is a v1 legacy doc — some inputs (BacklogPressure, "More context", DifficultyTier as student pick) and success criteria are stale. See [product audit disposition](../product-audit/00-index.md#legacy-document-disposition).
3. **For engineering contracts:** See [`EI_Engine_Taxonomy.md`](../ei/EI_Engine_Taxonomy.md) — that doc defines gate outputs, derived signals, and routing logic. This folder translates those into UX behavior. **Do not modify the Engine Taxonomy from this folder.** **Note:** The taxonomy has stale routing conditions (BacklogPressure ghost value, missing `timeCommitment`/V3 signals). See [product audit engine gaps](../product-audit/03-engine-gaps.md).
4. **For the product audit:** See [`product-audit/`](../product-audit/00-index.md) — diagnoses the gap between current specs and a real, usable product. Includes stale feature inventory, realism failures, engine signal gaps, lovable product gaps, and a single-founder implementation roadmap.
4. **For storyboard context:** Student journeys that stress-test the system:
   - **New format (session-based, ASCII screens, all systems applied):**
     - [`storyboards/S4-flowing-but-avoidant.md`](storyboards/S4-flowing-but-avoidant.md) — productive but avoids verification; 20 sessions, 12 days
   - **Legacy format (calendar-based, prototype — pending rewrite):**
     - [`EI_Storyboard_S2_RevengePlanning_Day1-21.md`](../ei/EI_Storyboard_S2_RevengePlanning_Day1-21.md) — high pressure after bad mock
     - [`EI_Storyboard_S5_BurnoutRunway_Day1-21.md`](../ei/EI_Storyboard_S5_BurnoutRunway_Day1-21.md) — burnout, silence, re-entry
     - [`EI_Storyboard_S7_Day1-21.md`](../../EI_Storyboard_S7_Day1-21.md) — ambitious, pending checks pile up

---

## Recommended reading order

| Order | Doc | What you learn |
|---|---|---|
| 1 | [01-craving-loop.md](01-craving-loop.md) | The 6-beat psychological loop that drives daily return (includes Conversation layer + formation period) |
| 2 | [02-retention-mechanics.md](02-retention-mechanics.md) | The 5 named mechanics that create pull |
| 3 | [03-ux-scales.md](03-ux-scales.md) | Student-facing scales + how they drive UI complexity |
| 4 | [04-one-screen-architecture.md](04-one-screen-architecture.md) | Three phases, why no dashboard, state-adaptive UI |
| 5 | [05-phase1-the-open.md](05-phase1-the-open.md) | Deep spec for the most important screen |
| 6 | [06-phase2-the-session.md](06-phase2-the-session.md) | Session flow and in-session experience |
| 7 | [07-phase3-the-close.md](07-phase3-the-close.md) | Closing moments, loop closure, the "seed" |
| 8 | [08-footer-and-identity.md](08-footer-and-identity.md) | "Your Week" footer + identity moment system |
| 9 | [09-escalation-arc.md](09-escalation-arc.md) | How ELI evolves from Day 1 → 21 |
| 10 | [10-microcopy-bible.md](10-microcopy-bible.md) | Exact words per state, tone grammar, banned phrases |
| 11 | [11-archetype-experience-map.md](11-archetype-experience-map.md) | All 7 archetypes mapped to phases, mechanics, copy |
| 12 | [12-anti-patterns.md](12-anti-patterns.md) | What this design rules out, and why |
| 13 | [13-implementation-map.md](13-implementation-map.md) | SDUI components, data sources, engineering constraints |
| 14 | [14-topic-selection-system.md](14-topic-selection-system.md) | Topic picker (type-ahead, browse, recent chips), curriculum tree, institute-scoped browse, graph edges |
| 15 | [15-chat-companion.md](15-chat-companion.md) | ELI chat — student-initiated conversation layer: footer entry, scope constraints, voice rules, screen spec |
| 16 | [16-formation-period.md](16-formation-period.md) | Days 1–7 design: session-vs-day units, same-day re-entry, Session 1 setup mode, pattern claim thresholds, topic tracking |
| 17 | [17-task-types-and-phase3.md](17-task-types-and-phase3.md) | Task types (Learn/Practice/Revise): definitions, auto-suggestion, Phase 3 decision matrix, blurry-line resilience |
| 18 | [18-topic-recommendation.md](18-topic-recommendation.md) | Topic recommendation: priority stack, per-topic signals, energy adjustment, avoidance detection |
| 19 | [19-silence-and-reentry.md](19-silence-and-reentry.md) | Silence detection: two-clock model, duration tiers, formation-aware interpretation, re-entry priority |
| 20 | [20-success-criteria.md](20-success-criteria.md) | Success metrics: retention gates, loop health, session quality, re-entry conversion — launchable vs. signal-dependent |
| 21 | [21-relationship-arc.md](21-relationship-arc.md) | ELI relationship arc: session-by-session capability map, checkin evolution, Day 15 guardrails superseded, audit resolution status |

---

## Note on EI_UX_Scales.md

The student-facing scales document (`EI_UX_Scales.md`) has been moved from the project root into this folder as [03-ux-scales.md](03-ux-scales.md) and enhanced with state-adaptive UI rules, micro-copy patterns per scale value, and personalization hint formats. A redirect pointer remains at the original location.

---

## Relationship map

```
ux-design-brief.md          →  Principles, archetypes, design rules (the WHAT) [legacy v1 — stale inputs]
                                     ↓
docs/student-ux-architecture/     →  Experience architecture (the HOW + WHY) [authoritative]
                                     ↓
docs/product-audit/          →  Diagnostic + implementation roadmap (the GAP + PATH)
                                     ↓
EI_Engine_Taxonomy.md        →  Gate outputs, signals, routing logic (engineering contracts) [needs update]
                                     ↓
src/ei/sdui/                 →  SDUI ViewComposer implementation (the CODE)
```

---

*For launch requirements coverage, see [13-implementation-map.md](13-implementation-map.md).*
*For the design agency brief, see [`ux-design-brief.md`](../ux-design-brief.md).*
