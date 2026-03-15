# Eli Brand System V1

This folder contains the fresh, first-principles brand system for Eli. It supersedes older scattered brand assumptions from the legacy UX documentation.

This system defines Eli as a stable companion identity with an **adaptive expression** model. Eli is a behavioral study companion for all exam students. The brand is meant for product, UI, copy, and future visual design work, ensuring Eli scales safely across known and unknown student types without losing its core feeling.

For the canonical documentation stack, folder boundary model, and shared term definitions, use `docs/00-documentation-boundary-and-terminology.md`.

## How to Read This Folder

The brand system is layered:

- **Thesis:** what Eli is, why it exists, and what territory it owns
- **Identity:** the permanent laws and anti-patterns that do not change
- **Adaptation:** how Eli changes expression through states, phases, and the `Mirror` layer
- **Translation:** how the brand becomes visual, typographic, linguistic, and interface behavior
- **Review:** how ready the current system is and what still needs tightening

Use the shared system map in `docs/00-documentation-boundary-and-terminology.md` when you need to see how the brand model connects to product architecture and the V1 UX spec.

## What This Folder Owns

This folder owns:

- Eli's brand thesis and territory
- core identity, brand laws, and anti-patterns
- adaptive expression principles
- the meaning of `Gentle`, `Focus`, `Momentum`, `Arrival`, `Attunement`, `Familiarity`, and `Mirror`
- voice, typography, visual behavior, interface laws, and brand asset behavior

This folder does **not** own:

- canonical product structure
- final navigation or route behavior
- screen-by-screen UX specifications
- runtime logic, thresholds, experiments, or implementation details

Those belong downstream in `docs/product-experience-architecture/`, `docs/v1-ux-spec/`, and implementation documentation, following `docs/00-documentation-boundary-and-terminology.md`.

## Ownership At A Glance

| Doc | Owns | Does not own |
|---|---|---|
| `01-brand-thesis.md` | Eli's strategic argument, territory, and category boundary | Permanent laws, anti-pattern inventory, or adaptation mechanics |
| `02-core-identity.md` | What never changes: role, promise, personality, laws, anti-patterns | The case for why Eli exists or how adaptation works |
| `03-adaptive-expression.md` | The adaptive system: identity vs expression, states, phases, `Mirror`, and abstract levers | Detailed state definitions, phase definitions, or translation rules |
| `04-brand-states.md` | Present-moment expression by state | Relationship maturity or downstream implementation detail |
| `05-brand-phases.md` | Earned relationship maturity and expressive permission | State posture or downstream translation behavior |
| `06-10` | Translation into visuals, typography, voice, UI laws, and asset behavior | Core architecture changes |

## Documentation Index

### 1. Thesis and Identity
- [01-brand-thesis.md](01-brand-thesis.md) - The strategic argument: what Eli is, why it exists, what territory it owns, and the product forms it refuses in positioning terms.
- [02-core-identity.md](02-core-identity.md) - The permanent law layer: brand role, emotional promise, personality, brand laws, and anti-patterns.

### 2. Adaptive System
- [03-adaptive-expression.md](03-adaptive-expression.md) - The adaptive model: how identity stays stable while expression changes through states, phases, `Mirror`, and abstract levers.
- [04-brand-states.md](04-brand-states.md) - The operating-state layer: what `Gentle`, `Focus`, `Momentum`, and the `Mirror` layer mean in present-moment expression.
- [05-brand-phases.md](05-brand-phases.md) - The phase layer: how `Arrival`, `Attunement`, and `Familiarity` regulate what Eli has earned the right to assume and express.

### 3. Design System Translation
- [06-visual-system.md](06-visual-system.md) - Semantic color logic (Paper, Charcoal, Terracotta, Sage), spatial rhythm, and restrained motion.
- [07-typography-system.md](07-typography-system.md) - The typography framework: type roles, emphasis behavior, and selection criteria.
- [08-voice-and-copy.md](08-voice-and-copy.md) - Voice grammar, tone shifts by expression state, and rules for earned reflection.

### 4. Assets and Product Behavior
- [09-logo-and-asset-system.md](09-logo-and-asset-system.md) - The mark system, brand presence rules, and reduced-form requirements.
- [10-product-ui-principles.md](10-product-ui-principles.md) - Product-interface laws that keep the brand calm, restrained, and non-performative.

### 5. Log
- [11-open-questions-and-decisions.md](11-open-questions-and-decisions.md) - Locked decisions plus the structural, expressive, asset, and validation questions that remain open.

### 6. Review
- [12-v1-readiness-review.md](12-v1-readiness-review.md) - Design-director assessment of the repositioned system, including readiness, remaining gaps, and the final cleanup path.

### 7. Operational Use
- [13-stable-reference-freeze-checklist.md](13-stable-reference-freeze-checklist.md) - Practical go/no-go checklist for treating the folder as the stable V1 brand reference.
- [14-product-team-handoff.md](14-product-team-handoff.md) - Working guide for product, design, and copy teams on how to apply the brand docs in real work.
