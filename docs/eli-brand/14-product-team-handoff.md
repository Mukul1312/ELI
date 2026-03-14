# Product Team Handoff Summary

This document explains how product, design, and copy teams should use the Eli brand system in real work.

The goal of `docs/eli-brand/` is not to replace product or UX specifications. Its role is to keep Eli coherent while features, flows, interfaces, and language continue to evolve.

## 1. What This Folder Is For

Use `docs/eli-brand/` as the source of truth for:

- what Eli is
- what Eli must never become
- how Eli adapts without becoming a different brand
- how that adaptation should shape UI behavior, visual tone, typography, copy, and brand presence

Do **not** use this folder as the source of truth for:

- workflow logic
- feature behavior
- experiment rules
- runtime adaptation logic
- implementation details
- screen-by-screen product specs

Those belong in product, UX, and engineering documentation.

## 2. Who Should Read What First

### Product design
Read in this order:

1. `00-index.md`
2. `01-brand-thesis.md`
3. `02-core-identity.md`
4. `03-adaptive-expression.md`
5. `10-product-ui-principles.md`
6. `04-brand-states.md`
7. `05-brand-phases.md`

This gives the product designer the brand argument, the stable laws, the adaptive system, and the interface rules before moving into detailed application.

### Visual design or brand design
Read in this order:

1. `00-index.md`
2. `02-core-identity.md`
3. `03-adaptive-expression.md`
4. `06-visual-system.md`
5. `07-typography-system.md`
6. `09-logo-and-asset-system.md`

This sequence protects against solving visual questions before understanding what the system is trying to regulate.

### Copy or content design
Read in this order:

1. `00-index.md`
2. `01-brand-thesis.md`
3. `02-core-identity.md`
4. `03-adaptive-expression.md`
5. `04-brand-states.md`
6. `05-brand-phases.md`
7. `08-voice-and-copy.md`

This ensures the voice is shaped by identity, state, and earned familiarity rather than by isolated phrase-writing.

### Product or brand leads
Read the whole folder once, then keep these docs closest:

- `03-adaptive-expression.md`
- `10-product-ui-principles.md`
- `11-open-questions-and-decisions.md`
- `12-v1-readiness-review.md`
- `13-stable-reference-freeze-checklist.md`

These are the best files for protecting system integrity over time.

## 3. How To Use The Docs During Real Work

### When designing a new product surface

Use the folder to answer:

- what behavioral job Eli is doing here
- which operating state the interface should feel closest to
- how much structure or warmth is appropriate
- whether the interface is calm, grounded, and non-performative
- whether the brand is being embedded or merely applied

Then move into product and UX specs for the actual flow, components, and behavior.

### When writing copy

Use the folder to answer:

- what Eli is allowed to sound like
- how direct the voice should be
- how much specificity has been earned
- whether the language is observing, guiding, or reflecting

Then write product copy in the relevant feature or screen spec, not inside the brand docs.

### When making visual decisions

Use the folder to answer:

- what semantic role color is playing
- whether the typography behavior matches the behavioral posture
- whether the brand presence is restrained enough
- whether the interface is using confirmation, action, and emphasis honestly

Then define exact tokens, component styles, and implementation rules in the relevant design system or UI specification.

## 4. Brand Docs vs Product UX Specs

Use this split consistently:

### Brand docs should define

- identity
- anti-patterns (anti-shame, anti-noise, anti-complexity)
- adaptive logic at the principle level
- state and phase meaning
- voice and tone rules
- visual and typographic behavior
- interface laws
- brand asset behavior

### Product or UX specs should define

- onboarding flows
- session behavior
- CTA logic
- component rules
- content placement
- event or signal thresholds
- experimentation plans
- validation methods tied to a specific feature

If a document starts describing what the product literally does step by step, it probably belongs outside `docs/eli-brand/`.

## 5. How To Work With States, Phases, And Mirror

When applying the system, ask these three questions in order:

1. What does the student likely need right now?
   This points toward `Gentle`, `Focus`, or `Momentum`.

2. How much has Eli earned the right to assume or express?
   This points toward `Arrival`, `Attunement`, or `Familiarity`.

3. Is this a moment for guidance, or has Eli earned the right to reflect?
   This determines whether `Mirror` should appear at all.

This sequence prevents teams from jumping straight to expression details without first grounding the moment.

## 6. How To Handle Open Questions

Use `11-open-questions-and-decisions.md` as the controlled place for unresolved issues.

When a new question appears:

- check whether it is already covered there
- decide whether it is structural, expressive, asset-related, or validation-related
- keep the question framed around a real decision, not vague discomfort
- note how the decision should be resolved: product review, concept exploration, visual testing, qualitative feedback, or another concrete method

Do not reopen stable docs just because an edge case appears.

## 7. Working Rules For Future Contributors

- Do not casually redefine the architecture after freeze.
- Do not reintroduce persona-based branding as the primary model.
- Do not turn brand docs into feature specs.
- Do not solve uncertainty by adding more slogans.
- Do not add decorative brand behavior that competes with calm product use.
- Do not narrow the audience back to a specific student archetype without explicit strategic justification.
- Prefer clarification over expansion when updating stable docs.

The system should stay disciplined enough that new work makes it clearer, not larger.

## 8. Practical Default

If a team is unsure where to start:

1. read `00-index.md`
2. read `03-adaptive-expression.md`
3. read the translation doc closest to the task: `06`, `07`, `08`, `09`, or `10`
4. check `11-open-questions-and-decisions.md` before inventing a new rule

That default path will solve most day-to-day usage without reopening strategic questions.
