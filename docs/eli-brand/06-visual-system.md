# Visual System

The visual system is designed to create a "tactile desk" or "quiet room" feel. It relies heavily on negative space, semantic color restraint, and soft depth to support focus and reduce unnecessary visual noise.

This document defines sensory and visual behavior. It should explain how Eli looks and moves, not repeat the full philosophy already defined in the thesis, identity, and adaptive-expression docs.

## Color Palette & Semantic Roles

Colors in Eli are strictly semantic. We do not use color merely for decoration or to "make it pop." We use a disciplined 4-color core:

### 1. Warm Paper (`#FDFCF8`)

- **Purpose:** Backgrounds, canvases, negative space.
- **Meaning:** "Room to breathe."
- **Usage:** It immediately removes the clinical SaaS feel, providing a clean, focus-friendly backdrop. It can shift warmer or quieter in `Gentle` conditions.

### 2. Deep Charcoal (`#2A2825`) & Warm Charcoal (`#736F66`)

- **Purpose:** Typography, subtle structures, and the logo stroke.
- **Meaning:** "Honesty and structure."
- **Usage:** Deep Charcoal is used for primary text (softer and more human than pure `#000000`). Warm Charcoal is used for secondary text, metadata, and timestamps to reduce cognitive load.

### 3. Muted Terracotta (`#B35C44`)

- **Purpose:** Primary Call-To-Action (CTA) buttons, active selected states.
- **Meaning:** "An invitation to begin."
- **Usage:** Replaces high-arousal colors like Indigo or Red. Terracotta feels earthy, human, and low-pressure. It invites the hand to act without screaming for attention.

### 4. Sage Green (`#2D7A52`)

- **Purpose:** Meaningful completion, calm confirmation, and the "i" dot in the logo.
- **Meaning:** "Safe confirmation and real progress."
- **Usage:** Must be used sparingly so it retains its meaning. It is the reward color. Do not use it as a general accent.

## Surfaces and Depth

- **Tactility over Flatness:** Use subtle drop shadows or soft inset borders to make components feel like physical paper cards resting on a desk. Avoid harsh 1px borders that feel like database grids.
- **Soft Corners:** Use rounded corners to signal approachability.

## Spatial Rhythm (Negative Space)

- **The Breath:** Provide large areas of Warm Paper around components. A calm companion doesn't crowd you.
- **Restraint:** If a screen feels empty, that is a feature, not a bug. Do not fill the space with illustrations or dashboard metrics.

## Visual Behavior By State

The visual system should shift across operating states. These shifts are directional, not cosmetic themes.

### Gentle
- **Warm Paper** may shift slightly warmer to create a softer ground.
- **Contrast** between Deep Charcoal and Warm Paper should soften. Secondary text should recede further.
- **Terracotta** CTA should feel lighter in visual weight — same hue, but less assertive presence through surrounding space.
- **Sage Green** retains the same restraint. Confirmation does not change meaning by state.
- **Negative space** increases. Fewer elements, more room. The visual field should feel quieter.
- **Surfaces** may use softer shadows and gentler separation between cards.

### Focus
- Default visual expression. The palette, contrast, and spatial rhythm operate at their standard values.
- No special adaptation needed — this is the baseline the system is designed around.

### Momentum
- **Contrast** may increase slightly. Deep Charcoal hierarchy becomes crisper.
- **Terracotta** CTA may carry slightly firmer visual presence through tighter surrounding space, but never through color intensity escalation.
- **Spatial rhythm** may tighten marginally to support a more structured, forward-moving feel.
- **Surfaces** may use slightly firmer card separation to support clearer structure.

### What state shifts must never do
- Change the palette itself. The four semantic colors remain the same across all states.
- Make the product feel like a different visual product. State shifts are tuning, not theming.
- Sacrifice legibility or accessibility for atmospheric effect.

## Restrained Motion

- **Settle, Don't Snap:** Motion should feel physical and settling rather than instant, sharp, or energetic. Transitions should land softly.
- **Reduce Load, Don't Dramatize:** Motion should make state changes easier to understand, not more theatrical.
- **Grounded, Not Celebratory:** Progress should feel calm, satisfying, and real. Avoid motion language that turns success into spectacle.

## Accessibility

Eli's adaptive visual system must remain accessible across all operating states. Accessibility is an architectural constraint, not a downstream implementation detail.

### Contrast requirements
- All text must meet WCAG 2.1 AA minimum contrast ratios: 4.5:1 for normal text, 3:1 for large text.
- **Muted Terracotta** (`#B35C44`) used for CTA buttons must maintain accessible contrast against **Warm Paper** (`#FDFCF8`) in all states, including `Gentle` where contrast softens.
- **Warm Charcoal** (`#736F66`) used for secondary text must meet contrast minimums against Warm Paper. If state adaptation shifts the background warmer, secondary text contrast must be verified.
- State-driven contrast reduction in `Gentle` must not drop any text or interactive element below accessible thresholds.

### Color independence
- Color must never be the sole differentiator for meaning. Supplement with shape, text labels, position, or iconography.
- Sage Green confirmation and Terracotta action must remain distinguishable through means other than color alone.

### Motion sensitivity
- All motion should respect `prefers-reduced-motion`. When reduced motion is preferred, transitions should resolve instantly without removing the information the motion was designed to convey.

### Adaptive state constraint
- No state adaptation (Gentle, Focus, or Momentum) may produce a visual configuration that fails accessibility requirements. If a state shift would violate contrast, legibility, or interaction clarity, the shift must be constrained to remain within accessible bounds.
