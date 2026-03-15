# Open Questions and Decisions

This document tracks the decisions that are now locked in the Eli brand system and the questions that remain genuinely open as the framework moves from definition into use.

## Locked Structural Decisions
These decisions are now part of the working brand architecture:

- Eli has **three operating states**: `Gentle`, `Focus`, `Momentum`
- Eli has **one reflective layer**: `Mirror`
- Eli matures through **three relationship phases**: `Arrival`, `Attunement`, `Familiarity`
- Phase progression is **evidence-based**, not tied to hard-coded session thresholds

## Structural Questions
These questions affect the architecture of the system itself.

### 1. What evidence is sufficient to unlock `Familiarity`?
**Status:** Pending
**Owner:** Product + behavior logic
**Why this matters:** The phase model is architecture-level, but the confidence threshold for `Familiarity` is still undefined. Without it, teams may over- or under-earn specificity.
**What is blocked:** Finalized rules for deeper familiarity, stronger continuity, and higher-confidence `Mirror` behavior.
**Possible criteria:**
- repeated return behavior
- interaction diversity
- enough consistency to support pattern confidence
- demonstrated tolerance for more adaptive expression
**Required evidence:** Observed usage patterns plus a lightweight signal-confidence model.
**Resolution method:** Product/behavior review.
**Next step:** Define a lightweight confidence model for when Eli has truly earned deeper familiarity.
**V1 criticality:** High

### 2. How should `Mirror` appear in the product?
**Status:** Pending
**Owner:** Product design + content design
**Why this matters:** `Mirror` is structurally defined, but its actual product form remains unresolved. If left vague, teams may over- or under-apply reflection.
**What is blocked:** A stable V1/V2 product form for earned reflection.
**Possible expressions:**
- greeting-level reflection
- periodic reflective card
- weekly mirror surface
- closure reflection
- footer-level identity reflection
**Required evidence:** Concept prototypes and qualitative feedback on credibility, usefulness, and non-intrusiveness.
**Resolution method:** UX concept exploration followed by qualitative review.
**Next step:** Decide whether `Mirror` is best expressed as a temporary overlay, a recurring surface, or several lighter-touch surfaces.
**V1 criticality:** High

## Expressive Questions
These questions affect the sensory expression of the brand.

### 3. Final font pairing
**Status:** Pending
**Owner:** Visual design
**Why this matters:** Typography is one of Eli's main brand carriers. The wrong pairing will make the product feel either too generic or too expressive.
**What is blocked:** Final type system selection for product UI and branded expression.
- The chosen pair should preserve emotional contrast without visual conflict
- Voice Type should feel human and composed without becoming ornamental
- Structure Type should feel stable and calm without drifting into startup-default neutrality
**Required evidence:** Real mobile-size comparisons, hierarchy stress tests, and readability checks in product-like layouts.
**Resolution method:** Visual comparison and readability testing.
**Next step:** Run a live comparison in browser with realistic mobile sizes, line lengths, spacing, and hierarchy stress tests.
**V1 criticality:** Medium

### 4. Final terracotta action hue
**Status:** Pending
**Owner:** Visual design
**Why this matters:** The action hue is one of the most visible expressions of Eli's invitation posture.
**What is blocked:** Final CTA tokenization and production-safe visual rules.
- The color must feel human and low-pressure
- It must still achieve accessible contrast in button states
- It must not drift into either "muddy" or "urgent" territory
**Required evidence:** Contextual button-state testing plus accessibility review.
**Resolution method:** Visual testing plus accessibility review.
**Next step:** Test candidate hues in context, not in isolation.
**V1 criticality:** Medium

## Asset Questions
These questions affect the tangible brand artifacts.

### 5. Small-size logo behavior
**Status:** Pending
**Owner:** Brand design
**Why this matters:** Small-size mark behavior affects app icon, favicon, and compact product use cases.
**What is blocked:** Stable reduced-form asset system for production.
- The reduced form must remain recognizable at very small sizes
- It must not collapse into a generic dot, badge, or system indicator
- It must preserve enough character to still feel like Eli
**Required evidence:** Scale tests at favicon, app-icon, and compact UI sizes.
**Resolution method:** Asset exploration and scale testing.
**Next step:** Develop 2-3 reduced forms and test them at favicon, app-icon, and compact UI scales.
**V1 criticality:** Medium

## Validation Questions
These questions cannot be settled by taste alone and will need testing.

### 6. How much adaptation is noticeable before it feels uncanny?
**Status:** Pending
**Owner:** Product research + design
**Why this matters:** The adaptive model only works if it feels fitting rather than theatrical or invasive.
**What is blocked:** Safe confidence bounds for visible adaptation intensity.
**Required evidence:** Comparative testing of subtle and strong adaptation variants.
**Resolution method:** Qualitative research or structured internal review with multiple adaptation intensities.
**Next step:** Test subtle and strong adaptation variants to see what feels supportive versus intrusive.
**V1 criticality:** Medium

### 7. When does reflection feel earned?
**Status:** Pending
**Owner:** Content design + product research
**Why this matters:** Reflection is one of the highest-risk expressions in the system. If it lands badly, Eli can feel scripted or presumptuous.
**What is blocked:** Confident reflection guidelines for later-phase copy and product moments.
**Required evidence:** Language testing against credibility, usefulness, and overreach risk.
**Resolution method:** Language testing and qualitative feedback.
**Next step:** Validate whether reflective language lands as recognition, overreach, or brand performance.
**V1 criticality:** High

### 8. How much curriculum-specific reference feels helpful before Eli starts sounding like a planner or tutor?
**Status:** Pending
**Owner:** Product design + content design
**Why this matters:** Eli may remain grounded in the student's real study context, but too much curriculum-specific reference could make the brand feel managerial or instructional.
**What is blocked:** Confident brand guidance for how explicitly Eli may reference subject, chapter, or related academic context.
**Required evidence:** Concept and language review across low-, medium-, and high-context variants.
**Resolution method:** Product/content review supported by qualitative feedback.
**Next step:** Define the upper bound of curriculum-aware language that still feels companion-like.
**V1 criticality:** Medium

### 9. How much thread history can conversational Eli surface before it starts sounding evaluative?
**Status:** Pending
**Owner:** Product design + content design
**Why this matters:** Conversational Eli may reveal history and thread-level truth on request, but too much recap or too much measurement can recreate dashboard posture through language.
**What is blocked:** Confident guardrails for conversational history depth and truth-telling style.
**Required evidence:** Concept and language review across light, moderate, and dense history responses.
**Resolution method:** Product/content review supported by qualitative feedback.
**Next step:** Define the upper bound of thread-history visibility that still feels supportive rather than evaluative.
**V1 criticality:** Medium

### 10. When is conversational reflection earned versus premature?
**Status:** Pending
**Owner:** Content design + product research
**Why this matters:** Conversational Eli can easily become over-interpretive if reflection appears too early or too often inside a summoned support mode.
**What is blocked:** Safe reflection rules for conversational Eli beyond the main loop surfaces.
**Required evidence:** Language testing against credibility, usefulness, and overreach risk in conversational contexts.
**Resolution method:** Language testing and qualitative feedback.
**Next step:** Define what conversational reflection may do in `Arrival`, `Attunement`, and `Familiarity` without becoming presumptuous.
**V1 criticality:** Medium
