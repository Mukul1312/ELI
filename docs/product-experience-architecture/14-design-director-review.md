# Design-Director Review

This document reviews the current `docs/product-experience-architecture/` folder as a product-architecture system following Eli's repositioning.

It is not another architecture spec. It is a judgment document that identifies where the folder is strongest, weakest, and still too abstract to fully support downstream UX specification work.

The documentation boundary model and canonical terminology are now governed centrally in `docs/00-documentation-boundary-and-terminology.md`.

## Executive Verdict

The folder is strategically strong and now better aligned with the broader thesis.

The repositioning from emotional rescue to behavioral companion removes the implicit assumption that the product's primary job is to comfort. That assumption was never explicit in the architecture, but it was latent in some of the earlier framing. With Eli repositioned as a study companion for all exam students, the architecture reads more clearly as what it always was: a behavioral system grounded in presence, clarity, and evidence.

The folder has become materially stronger as an architecture handoff. The strategic center is firm, the boundary model is clearer, and the main remaining work now sits downstream in UX-spec cleanup and open product decisions rather than in core architecture confusion.

## What Is Strong

### 1. The adaptive model translates well into product behavior
The best execution in the folder remains the adaptation layer:

- `05-state-architecture.md`
- `06-phase-architecture.md`

The state trio (Gentle, Focus, Momentum) and the phase model (Arrival, Attunement, Familiarity) correctly translate behavioral signals into product behavior without drifting into persona logic or theatrical personalization. The repositioning strengthens this layer because the states no longer carry a rescue connotation. Gentle is not Shelter. It is a product posture for students who need lower friction and more presence, not emotional first aid.

### 2. The experience spine is sound
The spine in `03-experience-spine.md` holds up well under the repositioned thesis. The loop of return, orient, commit, work, close, and reflect when earned is structurally neutral. It does not depend on any particular emotional framing. It works equally well for a student in crisis and a student in a strong rhythm, which is exactly what the repositioning demands.

### 3. Strategic center is clear
The foundation docs remain strong:

- `01-product-thesis.md`
- `02-core-experience-model.md`
- `03-experience-spine.md`

These documents define what kind of product Eli is and what behavioral loop the product should protect. They follow from Eli's brand logic rather than from generic app strategy.

### 4. The anti-pattern guardrails are sharp
`13-product-anti-patterns.md` is one of the strongest docs in the folder.

It is memorable, specific, and useful. It gives future contributors a clear test for drift and protects Eli from turning into a dashboard, gamified system, or over-personalized AI companion performance. The five brand laws (Presence, Clarity, Restraint, Truth, Support) reinforce these guardrails naturally.

## What Is Weakest

### 1. `12-v1-product-architecture.md` is still too cautious
This has improved substantially.

`12-v1-product-architecture.md` now behaves much more like a binding decision memo. It makes firmer calls on what V1 includes, what is secondary, what is out of scope, and which transition paths are actually allowed.

The remaining question is not whether the file is decisive enough. The remaining question is whether downstream UX specs now consume it cleanly without reintroducing their own local transition semantics.

### 2. `07-surface-architecture.md` has improved but could go further
The surface architecture is now the canonical owner of transition mechanics as well as surface roles.

That is a major improvement. The folder now defines entry logic, default handoffs, inserts, interruption rules, and re-entry posture at the architecture layer instead of forcing UX specs to invent them locally.

The remaining gap is not missing transition grammar. The remaining gap is whether the UX docs have fully stopped carrying duplicate versions of that grammar.

### 3. `08-navigation-philosophy.md` is stronger on rejection than recommendation
This has also improved.

The navigation doc now reflects route implications of the canonical transition model rather than operating only as a set of rejection principles. It is more prescriptive about what counts as in-flow, what counts as leaving the route, and how return behavior should work.

The remaining task is downstream alignment: ensuring the UX IA and surface specs inherit this route posture cleanly.

### 4. `10-content-architecture.md` is now operationally stronger
The four-role content model (orientation, invitation, confirmation, reflection) is now connected to both state and phase through explicit "Content Behavior By State" and "Content Behavior By Phase" sections. These sections show how each content role shifts across Gentle, Focus, Momentum and Arrival, Attunement, Familiarity.

The remaining gap is the "Reflection: Appropriate Vs Premature" section, which could be more tightly connected to the system map in `03-adaptive-expression.md` to avoid any ambiguity about when reflection is structurally eligible.

## Most Important Remaining Gap

The structural ambiguity around **continuity** is now resolved at the architecture level. `04-structural-product-model.md` defines continuity structurally, `07-surface-architecture.md` defines its insertion role in the loop, and `08-navigation-philosophy.md` protects it from becoming a route.

What remains unresolved is the **product form** of embedded continuity: what exact payload it carries, how much context it preserves, and how it should appear in the V1 UX without becoming managerial. Those are now explicit product decisions rather than hidden architectural ambiguity.

## Where The Folder Is Still Too Abstract

The folder has improved in several areas but remains too abstract in:

### 1. Surface transitions
This is largely resolved in the architecture layer. The remaining risk is duplicate or conflicting transition logic in downstream UX specs.

### 2. Navigation architecture
This is improved, but should still be checked against the UX IA docs for exact downstream alignment.

### 3. Continuity mechanics
The structural decision is now canonical. The remaining open work is the detailed product form of embedded continuity.

## Strength Ranking

Strongest docs in the folder:

1. `05-state-architecture.md`
2. `06-phase-architecture.md`
3. `03-experience-spine.md`
4. `13-product-anti-patterns.md`
5. `01-product-thesis.md`
6. `10-content-architecture.md` (improved — now includes state and phase sensitivity)
7. `07-surface-architecture.md` (improved — now includes architectural properties per surface)

Docs that still need the most attention:

1. `docs/v1-ux-spec/02-information-architecture.md` and the core surface specs, to ensure they consume rather than redefine transition logic
2. `15-open-questions-and-decisions.md`, to keep unresolved product questions explicit and owned

## Overall Assessment

The repositioning strengthens the product architecture by removing the assumption that the product's primary job is emotional rescue.

The architecture was never fully committed to that assumption, but the earlier framing allowed it to linger. With Eli now positioned as a behavioral study companion for all exam students, the architecture reads as what it should be: a calm, loop-centered, evidence-bound system that adapts to where a student is without performing that adaptation theatrically.

The emotional promise of "grounded momentum" fits the architecture naturally. The spine already produces momentum. The adaptation model already produces groundedness. The repositioning names what the architecture was already doing.

The prior boundary ambiguity between brand docs, product architecture docs, and downstream UX specs is now structurally resolved through the shared governance model. The folder's job is clearer: it sits between `docs/eli-brand/` and `docs/v1-ux-spec/`, translating identity into product form without collapsing into screen specification.

The folder's main weakness is not strategic confusion. Its main weakness is that a few important docs are still one layer too abstract to serve as a confident handoff into UX specification.
The folder's main weakness is no longer core architectural ambiguity. It is now the quality of the handoff into UX specification and the management of the remaining downstream open decisions.

## Recommendation

Treat the folder as:

- architecturally strong
- strategically sound
- better aligned with the repositioned thesis
- not yet fully operational for downstream UX work

Several of the gaps identified in the initial review have been addressed:

- continuity is now defined structurally in `04-structural-product-model.md`
- surfaces now include architectural properties plus transition mechanics
- content behavior now includes explicit state and phase sensitivity sections
- the V1 recommendation now uses binding language rather than hedged phrasing
- navigation now reflects route implications of the transition model
- unresolved product questions now have a dedicated log in `15-open-questions-and-decisions.md`

The next pass should focus on:

- removing architecture-owned transition logic from downstream UX specs
- resolving the exact product form of embedded continuity
- keeping remaining product decisions explicit, owned, and evidence-backed

At that point, the folder will be ready to support concrete UX specification work.
