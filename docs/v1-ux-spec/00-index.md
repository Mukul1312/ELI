# V1 UX Spec — Index

## What This Is

This is the actionable UX specification for Eli V1. It turns the strategic decisions in `docs/eli-brand/` and `docs/product-experience-architecture/` into concrete surface definitions, interaction models, and content behavior that can be built and tested.

Use the shared system map in `docs/00-documentation-boundary-and-terminology.md` when you need to see where this spec sits in the larger brand-to-product model.

## Scope: Pass 1

Pass 1 specifies the **core study loop** in the **default operating conditions**:

- **State:** Focus (the default)
- **Phase:** Arrival (the relationship starting point)
- **Loop:** Return → Orient → Commit → Work → Close
- **Product objects:** Session (immediate action), Study thread (continuity), Curriculum context (deferred in V1)

The student-facing label for a study thread is **topic**. The student declares topics in their own words; Eli tracks them internally as study threads.

## Current V1 Slice Of The System

This spec is a constrained slice of the larger Eli model:

- `State`: `Focus`
- `Phase`: `Arrival`
- `Product form`: the primary loop surfaces, embedded continuity, sparse reflection when earned
- `Reflection`: deferred unless later passes explicitly earn and specify it

This document set does not redefine the broader model. It instantiates one buildable slice of it.

## What This Folder Owns

At a senior level, this folder owns:

- **Presentation:** How resolved architecture states are shown to the student
- **Interaction detail:** Tap targets, focus order, editing behavior, confirmation flows
- **Content behavior:** What copy appears where, how states affect messaging
- **Surface composition:** Layout, ordering, empty states, loading states
- **Validation framing:** Which choices are principle-level vs V1 hypotheses to test

This folder does **not** own:

- Transition semantics, entry resolution, or route-level meaning → `docs/product-experience-architecture/`
- Identity, brand laws, or adaptive expression → `docs/eli-brand/`

## What Is Deferred to Pass 2

- State variants (Gentle / Momentum adaptations of each surface)
- Phase variants (Attunement / Familiarity changes to Eli's specificity and continuity depth)
- Mirror moments (reflective layer appearance and triggers)
- Retrieval checks (Layer 2 verification — periodic, phase-gated)
- Silence re-entry behavior
- Push notification design
- Settings / preferences / boundaries surface
- Multi-topic sessions
- Topic editing / renaming
- Detailed microcopy catalog
- Component-level design tokens
- Motion / animation specification

## Reading Order

| # | Document | Job |
|---|----------|-----|
| 01 | [V1 Product Form](01-v1-product-form.md) | Binding product decisions, object model, principle vs to-validate choices |
| 02 | [Information Architecture](02-information-architecture.md) | Navigation structure, route assumptions, IA contract |
| 03 | [Arrival Surface](03-arrival-surface.md) | Return + orientation screen |
| 04 | [Commitment Surface](04-commitment-surface.md) | Topic selection + session framing + begin |
| 05 | [Active Study Surface](05-active-study-surface.md) | During-study screen + background behavior |
| 06 | [Completion Surface](06-completion-surface.md) | Self-report + closure |
| 07 | [First Session](07-first-session.md) | First-ever experience (onboarding through the loop) |
| 08 | [Embedded Continuity](08-embedded-continuity.md) | How continuity lives within surfaces |
| 09 | [Object Model Problems](09-object-model-problems.md) | 34 fundamental problems with the current product object model that block V1 |
| 10 | [Object Model Dependency Analysis](10-object-model-dependency-analysis.md) | 5 structural clusters, dependency chain, and build order for the object model redesign |
| 11 | [Candidate Object Model](11-candidate-object-model.md) | Proposed redesigned object model with 7 objects addressing all 5 clusters |

## Source Relationship

This spec draws from but does not duplicate:

- **Brand system:** `docs/eli-brand/` — identity, states, visual system, typography, voice
- **Experience architecture:** `docs/product-experience-architecture/` — spine, surfaces, navigation, interaction principles

Those documents define *who Eli is* and *how the product is structured*. This spec defines *what the student sees and does*.

## Ownership Boundary

Use this split consistently:

- `docs/product-experience-architecture/` owns transition semantics, entry resolution, continuity placement, and route-level meaning
- `docs/v1-ux-spec/` owns presentation, interaction detail, content behavior, and concrete surface composition

If a UX doc starts inventing the meaning of a handoff, a re-entry rule, or a route decision, that logic should move back upstream into product architecture.
