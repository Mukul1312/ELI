# Student Experience System — Index

> This folder is the definitive spec for how the student experience is architected. It documents the psychological model, screen phases, retention mechanics, micro-copy patterns, and implementation constraints that make students crave the app.

---

## How to use

1. **Start here.** Read this index, then follow the reading order below.
2. **For principles and scales:** See [`ux-design-brief.md`](../ux-design-brief.md) — that doc covers the WHAT (design principles, archetypes, UX do's/don'ts). This folder covers the HOW (experience architecture) and the WHY (psychological model).
3. **For engineering contracts:** See [`EI_Engine_Taxonomy.md`](../ei/EI_Engine_Taxonomy.md) — that doc defines gate outputs, derived signals, and routing logic. This folder translates those into UX behavior. **Do not modify the Engine Taxonomy from this folder.**
4. **For storyboard context:** The three 21-day student journeys that inform this system:
   - [`EI_Storyboard_S2_RevengePlanning_Day1-21.md`](../ei/EI_Storyboard_S2_RevengePlanning_Day1-21.md) — high pressure after bad mock
   - [`EI_Storyboard_S5_BurnoutRunway_Day1-21.md`](../ei/EI_Storyboard_S5_BurnoutRunway_Day1-21.md) — burnout, silence, re-entry
   - [`EI_Storyboard_S7_Day1-21.md`](../../EI_Storyboard_S7_Day1-21.md) — ambitious, pending checks pile up

---

## Recommended reading order

| Order | Doc | What you learn |
|---|---|---|
| 1 | [01-craving-loop.md](01-craving-loop.md) | The 5-beat psychological loop that drives daily return |
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

---

## Note on EI_UX_Scales.md

The student-facing scales document (`EI_UX_Scales.md`) has been moved from the project root into this folder as [03-ux-scales.md](03-ux-scales.md) and enhanced with state-adaptive UI rules, micro-copy patterns per scale value, and personalization hint formats. A redirect pointer remains at the original location.

---

## Relationship map

```
ux-design-brief.md          →  Principles, archetypes, design rules (the WHAT)
                                     ↓
docs/student-ux-architecture/     →  Experience architecture (the HOW + WHY)
                                     ↓
EI_Engine_Taxonomy.md        →  Gate outputs, signals, routing logic (engineering contracts)
                                     ↓
src/ei/sdui/                 →  SDUI ViewComposer implementation (the CODE)
```

---

*For launch requirements coverage, see [13-implementation-map.md](13-implementation-map.md).*
*For the design agency brief, see [`ux-design-brief.md`](../ux-design-brief.md).*
