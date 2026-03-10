# Student Experience System — Index

> This folder is the definitive spec for how the student experience is architected. It documents the psychological model, screen phases, retention mechanics, micro-copy patterns, and implementation constraints that make students crave the app.

---

## Folder Structure

```
docs/ux/
├── 00-index.md                          ← You are here
│
├── foundations/                          ← WHY: psychology, architecture, design language
│   ├── craving-loop.md                  ← The 6-beat psychological loop that drives daily return
│   ├── retention-mechanics.md           ← The 5 named mechanics that create pull
│   ├── one-screen-architecture.md       ← Three phases, why no dashboard, state-adaptive UI
│   └── design-language.md               ← Design tokens: color, type, spacing, motion
│
├── phase1/                              ← Phase 1: The Open (complete spec)
│   ├── 00-overview.md                   ← Gate logic, variant matrix, scope redesign
│   ├── progressive-disclosure.md        ← State morphing flow: Check-in, Reveal, Setup
│   ├── variants.md                      ← All 10 variants with wireframes + exact copy
│   ├── scales-input.md                  ← Chip interaction for energy/sleep/pressure
│   └── onboarding.md                    ← First-ever open flow
│
├── phase2/                              ← Phase 2: The Session (complete spec)
│   ├── 00-overview.md                   ← Flow, context bar, edge cases
│   ├── activation-entry.md              ← All P2 plays: firstAction cards, 2-min timer
│   ├── active-session.md                ← Screen while studying: nudge, end session
│   └── push-notifications.md            ← 3 notification types with copy + routing
│
├── phase3/                              ← Phase 3: The Close (complete spec)
│   ├── 00-overview.md                   ← 7 scenarios, counter mechanic, seed rules
│   ├── progressive-disclosure.md        ← State morphing flow: The Ask, The Reward
│   ├── verification-ask.md              ← Self-report flow, skip flow, duration variants
│   ├── counter-animation.md             ← Frame-by-frame animation: DOWN, UP, milestone
│   └── scenarios.md                     ← All 7 scenarios (A-G) with wireframes + copy
│
├── systems/                             ← Cross-cutting behavioral systems
│   ├── progressive-disclosure.md        ← Core philosophy: "One Screen, No Scroll"
│   ├── ux-scales.md                     ← Student-facing scales + state-adaptive UI rules
│   ├── microcopy.md                     ← Exact words per state, tone grammar, banned phrases
│   ├── archetypes.md                    ← All 7 archetypes mapped to phases + mechanics
│   ├── topic-selection.md               ← Topic picker, curriculum tree, graph edges
│   ├── topic-recommendation.md          ← Priority stack, per-topic signals, avoidance detection
│   ├── task-types.md                    ← Learn/Practice/Revise: definitions, auto-suggestion
│   ├── formation-period.md              ← Sessions 1-7: pattern claim tiers, same-day re-entry
│   ├── silence-reentry.md               ← Two-clock model, duration tiers, re-entry priority
│   ├── escalation-arc.md                ← How ELI evolves from Day 1 → 21
│   ├── relationship-arc.md              ← Session-by-session capability map
│   ├── footer-identity.md               ← "Your Week" footer + identity moment system
│   ├── chat-companion.md                ← ELI chat: scope constraints, voice rules
│   └── anti-patterns.md                 ← What this design rules out, and why
│
└── validation/                          ← Proof it works
    ├── success-criteria.md              ← Retention gates, loop health, session quality
    ├── implementation-map.md            ← SDUI components, data sources, engineering constraints
    └── storyboards/
        └── S4-flowing-but-avoidant.md   ← North star: 20 sessions, 12 days, all systems applied
```

---

## How to Use

1. **Start here.** Read this index, then follow the reading order below.
2. **For principles and scales:** See [`ux-design-brief.md`](../ux-design-brief.md) — that doc covers the WHAT (design principles, archetypes, UX do's/don'ts). This folder covers the HOW (experience architecture) and the WHY (psychological model). **Note:** `ux-design-brief.md` is a v1 legacy doc — some inputs (BacklogPressure, "More context", DifficultyTier as student pick) and success criteria are stale. See [product audit disposition](../product-audit/00-index.md#legacy-document-disposition).
3. **For engineering contracts:** See [`EI_Engine_Taxonomy.md`](../ei/EI_Engine_Taxonomy.md) — that doc defines gate outputs, derived signals, and routing logic. This folder translates those into UX behavior. **Do not modify the Engine Taxonomy from this folder.** **Note:** The taxonomy has stale routing conditions (BacklogPressure ghost value, missing `timeCommitment`/V3 signals). See [product audit engine gaps](../product-audit/03-engine-gaps.md).
4. **For the product audit:** See [`product-audit/`](../product-audit/00-index.md) — diagnoses the gap between current specs and a real, usable product.
5. **For storyboard context:** Student journeys that stress-test the system:
   - **New format (session-based, ASCII screens, all systems applied):**
     - [S4-flowing-but-avoidant.md](validation/storyboards/S4-flowing-but-avoidant.md) — productive but avoids verification; 20 sessions, 12 days
   - **Legacy format (calendar-based, prototype — pending rewrite):**
     - [`EI_Storyboard_S2_RevengePlanning_Day1-21.md`](../ei/EI_Storyboard_S2_RevengePlanning_Day1-21.md) — high pressure after bad mock
     - [`EI_Storyboard_S5_BurnoutRunway_Day1-21.md`](../ei/EI_Storyboard_S5_BurnoutRunway_Day1-21.md) — burnout, silence, re-entry
     - [`EI_Storyboard_S7_Day1-21.md`](../../EI_Storyboard_S7_Day1-21.md) — ambitious, pending checks pile up

---

## Recommended Reading Order

### Foundations (start here)

| Order | Doc | What you learn |
|---|---|---|
| 1 | [craving-loop.md](foundations/craving-loop.md) | The 6-beat psychological loop that drives daily return |
| 2 | [retention-mechanics.md](foundations/retention-mechanics.md) | The 5 named mechanics that create pull |
| 3 | [one-screen-architecture.md](foundations/one-screen-architecture.md) | Three phases, why no dashboard, state-adaptive UI |
| 4 | [design-language.md](foundations/design-language.md) | Design tokens, type scale, spacing, motion |

### Phases (the screens)

| Order | Doc | What you learn |
|---|---|---|
| 5 | [phase1/00-overview.md](phase1/00-overview.md) | The most important screen: gate logic, variant matrix, scope redesign |
| 5.5 | [phase1/progressive-disclosure.md](phase1/progressive-disclosure.md) | State morphing flow: Check-in, Reveal, Setup |
| 6 | [phase1/variants.md](phase1/variants.md) | All 10 variants with full wireframes and exact copy |
| 7 | [phase2/00-overview.md](phase2/00-overview.md) | Session flow, context bar, 2-minute start, edge cases |
| 8 | [phase2/activation-entry.md](phase2/activation-entry.md) | All P2 plays with wireframes |
| 9 | [phase3/00-overview.md](phase3/00-overview.md) | 7 scenarios, counter mechanic, seed rules, craving loop beats |
| 9.5 | [phase3/progressive-disclosure.md](phase3/progressive-disclosure.md) | State morphing flow: The Ask, The Reward |
| 10 | [phase3/scenarios.md](phase3/scenarios.md) | All 7 close screens with wireframes and exact copy |

### Systems (cross-cutting)

| Order | Doc | What you learn |
|---|---|---|
| 10.5 | [progressive-disclosure.md](systems/progressive-disclosure.md) | Core philosophy: "One Screen, No Scroll" |
| 11 | [ux-scales.md](systems/ux-scales.md) | Student-facing scales + how they drive UI complexity |
| 12 | [microcopy.md](systems/microcopy.md) | Exact words per state, tone grammar, banned phrases |
| 13 | [archetypes.md](systems/archetypes.md) | All 7 archetypes mapped to phases, mechanics, copy |
| 14 | [task-types.md](systems/task-types.md) | Learn/Practice/Revise definitions, auto-suggestion, Phase 3 matrix |
| 15 | [formation-period.md](systems/formation-period.md) | Sessions 1-7, pattern claim tiers, same-day re-entry |
| 16 | [topic-selection.md](systems/topic-selection.md) | Topic picker, curriculum tree, graph edges |
| 17 | [topic-recommendation.md](systems/topic-recommendation.md) | Priority stack, avoidance detection |
| 18 | [silence-reentry.md](systems/silence-reentry.md) | Two-clock model, duration tiers |
| 19 | [relationship-arc.md](systems/relationship-arc.md) | Session-by-session capability map |
| 20 | [footer-identity.md](systems/footer-identity.md) | "Your Week" footer + identity moment system |
| 21 | [escalation-arc.md](systems/escalation-arc.md) | How ELI evolves from Day 1 → 21 |
| 22 | [chat-companion.md](systems/chat-companion.md) | ELI chat scope constraints and voice rules |
| 23 | [anti-patterns.md](systems/anti-patterns.md) | What this design rules out, and why |

### Validation

| Order | Doc | What you learn |
|---|---|---|
| 24 | [success-criteria.md](validation/success-criteria.md) | Retention gates, loop health, session quality metrics |
| 25 | [implementation-map.md](validation/implementation-map.md) | SDUI components, data sources, engineering constraints |

---

## Relationship Map

```
ux-design-brief.md              →  Principles, archetypes, design rules (the WHAT) [legacy v1]
                                       ↓
docs/ux/                         →  Experience architecture (the HOW + WHY) [authoritative]
                                       ↓
docs/product-audit/              →  Diagnostic + implementation roadmap (the GAP + PATH)
                                       ↓
EI_Engine_Taxonomy.md            →  Gate outputs, signals, routing logic (engineering contracts)
                                       ↓
src/ei/sdui/                     →  SDUI ViewComposer implementation (the CODE)
```

---

*For launch requirements coverage, see [implementation-map.md](validation/implementation-map.md).*
*For the design agency brief, see [`ux-design-brief.md`](../ux-design-brief.md).*
