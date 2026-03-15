# V1 Design Brief — Index

This folder contains everything needed to generate production-quality UI screens for Eli V1 Pass 1 using UXPilot (or any AI design tool), and to hand those screens to engineering with exact values.

## Reading order

1. **[01-design-tokens.md](01-design-tokens.md)** — Color, typography, spacing, radius, shadow, motion, and touch target values. These are the implementation-layer tokens derived from the brand system. Every screen must use only these values.

2. **[02-typography-map.md](02-typography-map.md)** — Element-by-element typography assignment across all four surfaces. Resolves which elements use Voice Type vs Structure Type, with exact size/weight guidance.

3. **[03-focal-action-map.md](03-focal-action-map.md)** — Per-surface declaration of primary, secondary, and tertiary actions. Resolves the "One Calm Focal Action" requirement from the brand system.

4. **[04-uxpilot-prompts.md](04-uxpilot-prompts.md)** — Copy-paste-ready prompts for UXPilot, one per surface. Each prompt bakes in the tokens, typography assignments, layout structure, and emotional intent from the UX spec.

## What this folder is

- Implementation-layer design values derived from `docs/eli-brand/` and `docs/product-experience-architecture/`
- UXPilot generation prompts derived from `docs/v1-ux-spec/`
- The bridge between spec and screen

## What this folder is not

- A replacement for the brand system, product architecture, or UX spec
- A full design system or component library (premature for V1)
- Final — tokens may be refined after UXPilot generation and user testing

## Scope

Pass 1 only: Focus state, Arrival phase, default conditions.

Surfaces covered:
- Arrival (returning, populated)
- Arrival (first session — merged with Commitment)
- Commitment
- Active Study (ambient, frame reached)
- Completion (Stage 1: self-report, Stage 2: confirmation x4 outcomes)

Not covered (Pass 2):
- Gentle / Momentum state variants
- Attunement / Familiarity phase variants
- Mirror / reflection moments
- Settings, history, notifications, onboarding

## Upstream sources

| Layer | Folder | Role |
|-------|--------|------|
| Brand system | `docs/eli-brand/` | Who Eli is; visual, voice, typography principles |
| Product architecture | `docs/product-experience-architecture/` | Product form, surfaces, loop, interaction rules |
| UX specification | `docs/v1-ux-spec/` | Screen layouts, interaction models, content behavior |
| Boundary governance | `docs/00-documentation-boundary-and-terminology.md` | Ownership and terminology rules |

## Legacy note

`docs/ux-design-brief.md` is from an earlier product model (energy scales, deal cards, institute radar). It predates the repositioned brand system and V1 UX spec. Do not use it for V1 design generation.
