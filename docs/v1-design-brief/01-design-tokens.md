# V1 Design Tokens

Minimal token system for Eli V1 Pass 1. Derived from `docs/eli-brand/06-visual-system.md`, `docs/eli-brand/07-typography-system.md`, and `docs/eli-brand/10-product-ui-principles.md`.

These tokens are the only values permitted in V1 screens. If a value is not listed here, it should not appear in the design.

---

## 1. Color Tokens

### Semantic palette

| Token | Hex | Role | Usage rule |
|-------|-----|------|------------|
| `color.paper` | `#FDFCF8` | Background | All screen backgrounds. The default canvas. |
| `color.charcoal.deep` | `#2A2825` | Primary text | Headlines, topic names, greeting lines, primary labels |
| `color.charcoal.warm` | `#736F66` | Secondary text | Metadata, recency indicators, session counts, placeholders, icons |
| `color.terracotta` | `#B35C44` | Primary action | CTA buttons on Commitment only. Invitation, never command. |
| `color.green` | `#2D7A52` | Earned confirmation | "Covered it" confirmation text on Completion only. Nowhere else. |

### Interaction states

| Token | Value | Usage |
|-------|-------|-------|
| `color.terracotta.disabled` | `#B35C44` at 40% opacity | CTA when topic field is empty |
| `color.charcoal.deep.secondary` | `#2A2825` at 70% opacity | "I'm done" action on Active Study |
| `color.paper.dimmed` | `#FDFCF8` at 85% brightness | Active Study screen dimming |

### Hard rules

- Terracotta appears on **one surface only** (Commitment CTA)
- Sage Green appears on **one surface only** (Completion "Covered it" confirmation)
- No other accent colors exist in V1
- No red, no orange, no blue, no purple — ever
- Active Study "20 min checkmark" uses `color.charcoal.deep`, NOT green (green is reserved for Completion)

---

## 2. Typography Tokens

### Font families (to be selected)

| Token | Role | Selection criteria | Candidates to test |
|-------|------|-------------------|-------------------|
| `font.voice` | Voice Type — when Eli speaks | Humanist serif or soft sans. Feels: human, composed, grounded, slightly slower. Must NOT feel: loud, decorative, literary. | Literata, Source Serif 4, Lora, Merriweather |
| `font.structure` | Structure Type — controls, labels, metadata | Clean sans-serif. Feels: clear, calm, trustworthy, low-friction. Must NOT feel: overly technical, compressed, command-like. | Inter, IBM Plex Sans, Source Sans 3, DM Sans |

### Type scale

Base unit: 16px (1rem). Scale ratio: 1.25 (Major Third).

| Token | Size | Weight | Line height | Usage |
|-------|------|--------|-------------|-------|
| `type.voice.greeting` | 24px / 1.5rem | Regular (400) | 1.35 | Greeting lines on Arrival, Completion confirmation |
| `type.voice.confirmation` | 20px / 1.25rem | Regular (400) | 1.4 | Completion Stage 2 confirmation copy |
| `type.structure.topic` | 18px / 1.125rem | Medium (500) | 1.4 | Topic names on cards, Commitment topic display |
| `type.structure.body` | 16px / 1rem | Regular (400) | 1.5 | Frame field text, option labels, body text |
| `type.structure.meta` | 14px / 0.875rem | Regular (400) | 1.4 | Recency indicators, session counts, placeholders |
| `type.structure.action` | 16px / 1rem | Medium (500) | 1.0 | CTA label ("Let's go"), action labels ("I'm done") |
| `type.structure.caption` | 12px / 0.75rem | Regular (400) | 1.3 | Elapsed time on Active Study |

### Hard rules

- Voice Type is used ONLY for: greeting lines, completion confirmations, first-session question
- Structure Type is used for EVERYTHING else: topic names, controls, labels, metadata, actions, placeholders
- In Focus state (Pass 1 only), both types appear at their standard weights — no emphasis shifts
- Never use bold (700+) on any element. Maximum weight is Medium (500) for topic names and CTA labels.
- Sentence case everywhere. No ALL CAPS. No Title Case except proper nouns.

---

## 3. Spacing Tokens

Base unit: 8px. All spacing values are multiples of 8.

| Token | Value | Usage |
|-------|-------|-------|
| `space.xs` | 4px | Inline spacing, icon gaps |
| `space.sm` | 8px | Between metadata elements (recency + topic on same card) |
| `space.md` | 16px | Between card elements, between label and input |
| `space.lg` | 24px | Between sections (greeting to topic list, topic list to action) |
| `space.xl` | 32px | Major section breaks, top/bottom screen padding |
| `space.2xl` | 48px | Active Study vertical breathing room |
| `space.3xl` | 64px | Active Study maximum negative space blocks |

### Screen padding

| Token | Value | Usage |
|-------|-------|-------|
| `padding.screen.horizontal` | 24px | Left/right padding on all screens |
| `padding.screen.top` | 48px | Top padding (below status bar) |
| `padding.screen.bottom` | 32px | Bottom padding (above system gesture area) |

### Hard rules

- Negative space is a feature, not waste. Err toward more space, not less.
- Active Study has the most negative space of any surface.
- Arrival and Completion have generous space between greeting/question and content.
- Commitment is the most "form-like" surface but still has ample breathing room.

---

## 4. Border and Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `radius.card` | 12px | Topic cards, option cards, frame field |
| `radius.cta` | 12px | CTA button ("Let's go") |
| `radius.input` | 8px | Text input fields |

### Surface treatment

| Token | Value | Usage |
|-------|-------|-------|
| `shadow.card` | `0 1px 3px rgba(42, 40, 37, 0.08)` | Subtle elevation on topic cards, option cards |
| `border.input` | `1px solid rgba(115, 111, 102, 0.3)` | Frame field border, topic input border |

### Hard rules

- Shadows are barely visible. If you can clearly see a shadow, it's too strong.
- No hard borders on cards — use shadow only.
- Input fields use a subtle border to signal interactivity.
- No gradients. No blurs. No glassmorphism. Flat + subtle shadow only.

---

## 5. Touch Target Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `touch.min` | 44px | Minimum touch target for all interactive elements (WCAG 2.5.5) |
| `touch.card` | 56px min height | Topic cards, completion option cards |
| `touch.cta` | 52px height | CTA buttons |
| `touch.icon` | 44x44px | Profile icon, back arrow |

---

## 6. Motion Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `motion.duration.settle` | 200ms | Stage 1 → Stage 2 transition on Completion |
| `motion.duration.fade` | 150ms | Element appearance/disappearance |
| `motion.easing` | `ease-out` (cubic-bezier(0, 0, 0.58, 1)) | All transitions |
| `motion.auto-advance` | 2500ms | Completion Stage 2 auto-advance to Arrival |

### Hard rules

- All motion respects `prefers-reduced-motion`. When on: instant transitions, no easing.
- No bounce. No overshoot. No spring physics. Motion settles, it does not perform.
- No celebration animations. No confetti. No particle effects. No scale-up effects.
- Active Study has zero motion (static screen).

---

## 7. Accessibility Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `a11y.contrast.min` | 4.5:1 | Normal text on `color.paper` background |
| `a11y.contrast.large` | 3:1 | Large text (24px+) on `color.paper` background |
| `a11y.focus-ring` | `2px solid #2A2825` | Keyboard focus indicator |
| `a11y.reduced-motion` | System `prefers-reduced-motion` | All transitions become instant |

### Contrast verification

| Foreground | Background | Ratio | Passes? |
|------------|------------|-------|---------|
| Deep Charcoal `#2A2825` | Paper `#FDFCF8` | ~14.5:1 | Yes (AAA) |
| Warm Charcoal `#736F66` | Paper `#FDFCF8` | ~4.7:1 | Yes (AA) |
| Terracotta `#B35C44` | Paper `#FDFCF8` | ~4.1:1 | Borderline — use as large text or validate |
| Paper `#FDFCF8` | Terracotta `#B35C44` | ~4.1:1 | Borderline — CTA text must be tested |
| Green `#2D7A52` | Paper `#FDFCF8` | ~5.2:1 | Yes (AA) |

### Critical finding

Terracotta on Paper (and Paper on Terracotta for CTA buttons) is **borderline AA** at 4.1:1. For the "Let's go" CTA:
- Option A: Use Paper text on Terracotta fill at 16px Medium (500) — passes as large text equivalent if button is prominent
- Option B: Darken Terracotta slightly to `#A04E38` (~5.0:1) — passes AA comfortably
- Option C: Use Deep Charcoal text on a light Terracotta-tinted background

**Decision needed before generating screens.** Recommend Option B (slight darkening) to maintain brand warmth while ensuring accessibility.

---

## 8. Dark Mode Tokens (Deferred)

Dark mode is not in V1 Pass 1 scope. When implemented:
- `color.paper` remaps to a warm dark (`#1C1B19` or similar)
- Charcoal values invert to light equivalents
- Terracotta and Green maintain or lighten to preserve contrast
- All contrast ratios must be re-verified

---

## Token usage summary by surface

| Surface | Colors used | Typography used | Special |
|---------|-------------|-----------------|---------|
| Arrival | Paper, Deep Charcoal, Warm Charcoal | Voice (greeting), Structure (topics, meta, action) | No accent colors |
| Commitment | Paper, Deep Charcoal, Warm Charcoal, Terracotta | Voice (none), Structure (topic, frame, CTA) | Terracotta CTA only |
| Active Study | Paper, Deep Charcoal, Warm Charcoal | Structure only (topic, time, action) | Most negative space; screen dimming |
| Completion Stage 1 | Paper, Deep Charcoal | Voice (question), Structure (options) | No accent colors |
| Completion Stage 2 | Paper, Deep Charcoal, Warm Charcoal, Green (Covered it only) | Voice (confirmation), Structure (session count) | Green for "Covered it" only |
