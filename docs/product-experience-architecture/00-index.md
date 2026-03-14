# Eli Product Experience Architecture

This folder translates the Eli brand system into product form.

`docs/eli-brand/` defines who Eli is, how Eli adapts, and what Eli must never become. This folder defines what kind of product naturally follows from that brand system.

The goal of this folder is to make the Eli product architecture explicit without drifting into final screen-by-screen specs.

## What This Folder Governs

This folder defines:

- what kind of product Eli is
- the primary behavioral loop of the product
- the structural model of the experience
- how `Shelter`, `Focus`, `Momentum`, `Arrival`, `Attunement`, `Familiarity`, and `Mirror` affect product behavior
- the canonical product surfaces
- navigation, interaction, content, and visual architecture
- the recommended V1 product form

This folder does **not** define:

- final UI layouts
- screen-by-screen copy
- component-level implementation
- runtime logic or signal thresholds
- engineering architecture

Those belong in later UX specs, design-system docs, and implementation docs.

## Source Relationship

Read this folder as a translation layer:

- `docs/eli-brand/` = identity, adaptive expression, interface laws
- `docs/product-experience-architecture/` = product form, experience model, surfaces, and product behavior

This folder should never contradict the Eli brand system. It should make that system usable for product design work.

## How to Read This Folder

The architecture is layered:

1. **Product thesis:** what kind of product Eli is
2. **Core experience model:** what job the product performs emotionally and behaviorally
3. **Experience spine:** the main loop of return, study, close, and earned reflection
4. **Structural model:** how the product is organized around that loop
5. **Adaptation model:** how state and phase change the experience without changing the product's identity
6. **Surface model:** the canonical product surfaces
7. **Behavior rules:** navigation, interaction, content, and visual architecture
8. **V1 recommendation:** the first recommended product shape and the anti-patterns it must avoid

## Documentation Index

### 1. Foundation
- [01-product-thesis.md](01-product-thesis.md) - What kind of product Eli is, what job it does, and what product territory it owns.
- [02-core-experience-model.md](02-core-experience-model.md) - The product's behavioral purpose and the emotional jobs it performs.

### 2. Spine and Structure
- [03-experience-spine.md](03-experience-spine.md) - The primary loop: return, orient, commit, work, close, and reflect when earned.
- [04-structural-product-model.md](04-structural-product-model.md) - The structural organization of the product around a primary loop, supporting layers, and reflective surfaces.

### 3. Adaptation
- [05-state-architecture.md](05-state-architecture.md) - How `Shelter`, `Focus`, and `Momentum` change product behavior.
- [06-phase-architecture.md](06-phase-architecture.md) - How `Arrival`, `Attunement`, and `Familiarity` change relational confidence and product specificity.

### 4. Product Surfaces
- [07-surface-architecture.md](07-surface-architecture.md) - The canonical surfaces of the product and the job each surface performs.

### 5. Product Behavior
- [08-navigation-philosophy.md](08-navigation-philosophy.md) - How the product should be navigated without becoming dashboard-like.
- [09-interaction-principles.md](09-interaction-principles.md) - How actions, focus, and motion should behave.
- [10-content-architecture.md](10-content-architecture.md) - The main content roles and message types of the product.
- [11-visual-architecture.md](11-visual-architecture.md) - How the visual system becomes product-level visual architecture.

### 6. V1 Recommendation
- [12-v1-product-architecture.md](12-v1-product-architecture.md) - The recommended first-version product form.
- [13-product-anti-patterns.md](13-product-anti-patterns.md) - What Eli must never become as a product.

### 7. Review
- [14-design-director-review.md](14-design-director-review.md) - Assessment of the current folder, including strongest areas, weakest areas, and what is still too abstract.

## Working Rule

If `docs/eli-brand/` explains Eli's identity, this folder should explain Eli's product behavior.
