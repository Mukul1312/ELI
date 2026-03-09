# Visual Language — Design System for Phase 1

> The visual language IS the emotional tone. For a student in burnout re-entry, the app needs to feel like a quiet room, not a scoreboard. Every color, size, and spacing decision below is derived from that principle — not from aesthetics.

---

## 1. Design Philosophy — Three Principles

### 1.1 Calm by default, not plain
The app is not minimal for aesthetic reasons. It's minimal because cognitive load is the enemy of starting. Every element that doesn't help the student decide or act is visual noise. Remove it.

- The greeting is the hero. Nothing competes with it.
- Buttons are clear and large, not styled.
- Data (footer, pending count) is available on demand, never forced.

### 1.2 Warmth signals safety
Cold, clinical UI (pure white, pure black, sharp geometry) signals performance evaluation. JEE/NEET students already live in evaluation environments. This app should feel different from their test portal.

- Warm off-white backgrounds (not pure #FFFFFF)
- Rounded corners on all interactive surfaces
- Soft shadows, never hard borders on cards
- Type that reads like a person wrote it, not a system generated it

### 1.3 Mode-responsive tone
The same screen communicates different emotional states through density, spacing, and color weight — not through icons, illustrations, or decorative elements.

- **Rescue mode:** More padding, fewer elements, warmer background tint, shorter copy
- **Neutral mode:** Standard density, standard padding, normal background
- **Boost mode:** Slightly crisper, more elements visible, slightly more contrast on CTAs

The student should feel the difference between modes without consciously noticing it.

---

## 2. Color Tokens

All colors are named by semantic role, not by hue. Engineers use tokens; designers use the values.

### 2.1 Base palette

```
Token                   Value           Usage
──────────────────────────────────────────────────────────────
--color-bg              #F9F8F6         Page background (warm near-white)
--color-bg-rescue       #FDF7F2         Page background in Rescue mode (warmer)
--color-surface         #FFFFFF         Card / chip surface
--color-surface-subtle  #F3F2EF         Subtle card bg (footer, secondary cards)
--color-border          #E4E3DE         Dividers, chip borders (warm, not grey-blue)
--color-border-strong   #C9C8C2         Focused chip border, active state
```

### 2.2 Text palette

```
Token                   Value           Usage
──────────────────────────────────────────────────────────────
--color-text-primary    #1A1A18         Headings, greeting, primary body (warm near-black)
--color-text-secondary  #68675F         Supporting copy, scale labels, secondary info
--color-text-tertiary   #A5A49C         Timestamps, "X days ago", disabled states
--color-text-accent     #3B4FD8         Accent text (rare — only for the counter drop number)
```

### 2.3 Accent palette

```
Token                   Value           Usage
──────────────────────────────────────────────────────────────
--color-accent          #3B4FD8         Primary CTA background, selected chip fill
--color-accent-hover    #2E40C4         CTA hover/press state
--color-accent-soft     #EEF1FB         Selected chip background (light)
--color-accent-border   #B4BFEF         Selected chip border
```

**Why indigo (#3B4FD8)?**
Indigo reads as focused, intelligent, and calm — not playful (orange), not corporate (blue), not success/failure coded (green/red). It's the right accent for a product that is about depth of study, not performance metrics.

### 2.4 State colors

```
Token                   Value           Usage
──────────────────────────────────────────────────────────────
--color-closed          #2D7A52         Loop-closed counter (muted green — not electric)
--color-closed-soft     #EBF6F0         Loop-closed card background
--color-skip            #8A8880         Skip acknowledged (neutral grey — no judgment)
```

**Rules:**
- Never use red for any student-facing surface. Red signals error/failure. The product has no failures, only decisions.
- Never use yellow/amber (implies caution, warning). There are no warnings for students.
- Green (`--color-closed`) is used ONLY for the loop-closed moment. Nowhere else.
- The accent (indigo) is NEVER used to indicate success or failure — it is purely for action/interaction states.

---

## 3. Typography

### 3.1 Typeface

**Primary:** Inter (if available) or the system default sans-serif stack:

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Rationale:** One typeface only. Multiple typefaces add visual complexity without adding meaning. Inter is clean, readable at small sizes, and has excellent numeric rendering (important for the counter animation).

### 3.2 Type scale

```
Name        Size        Line height     Weight      Usage
────────────────────────────────────────────────────────────────────────
display     28px / 1.75rem    1.15        500       Counter animation (3→2), milestone numbers
greeting    22px / 1.375rem   1.25        400       Phase 1 greeting text (the hero line)
body        16px / 1rem       1.55        400       Supporting copy, button labels, card text
label       14px / 0.875rem   1.45        400       Scale labels, pending item text, footer
caption     12px / 0.75rem    1.4         400       "X days ago", personalization hints
```

**Weight rules:**
- 400 (regular): everything except the two exceptions below
- 500 (medium): display-size numbers, button labels, scale chip labels
- 600 (semibold): identity statement copy ONLY — this is the single most important piece of text in the product. Nothing else gets 600.

**Rules:**
- No bold headings. The greeting is large and light (400), not bold. Bold headings feel like a test portal or a notification.
- No italic. Italics signal emphasis that should be handled by copy, not style.
- No all-caps except for the `YOUR WEEK` footer label (tasteful, not aggressive).

### 3.3 Greeting text — specific rules

The greeting is the most important text on the screen. It uses the `greeting` size (22px) at weight 400. Specific rules:

- Never center-align. Left-aligned text reads like a person speaking to you. Centered text reads like a poster.
- Maximum 2 lines. If the copy needs a third line, the copy is too long.
- No punctuation at the end of single-line greetings. "Welcome back." is correct. "Welcome back!" is not. The period is earned; the exclamation mark is not.
- Rescue mode greetings can be shorter (even one word: "Hey.") — the brevity is intentional.

---

## 4. Spacing System

**Base unit:** 4px. All spacing values are multiples of 4.

```
Token       Value       Usage
────────────────────────────────────────────────────────────────
--sp-1      4px         Micro gaps (between icon and label)
--sp-2      8px         Tight internal spacing (inside chips)
--sp-3      12px        Between label and input, small gaps
--sp-4      16px        Standard vertical rhythm between elements
--sp-5      20px        Card internal padding (horizontal), section gaps
--sp-6      24px        Section gaps, between greeting and buttons
--sp-8      32px        Large section gaps, between pending list and CTAs
--sp-10     40px        Page top padding
--sp-12     48px        Bottom padding (above footer)
```

### 4.1 Card padding

```
Standard card:       20px horizontal, 20px vertical
Footer collapsed:    16px horizontal, 12px vertical
Footer expanded:     20px horizontal, 16px vertical
Chip (scale input):  12px horizontal, 10px vertical
CTA button:         20px horizontal, 14px vertical
```

### 4.2 Mode-specific spacing adjustments

| Element | Rescue mode | Neutral mode | Boost mode |
|---|---|---|---|
| Top padding (page) | 48px | 40px | 40px |
| Greeting bottom margin | 32px | 24px | 20px |
| Between buttons | 12px | 10px | 8px |
| Button height | 52px | 48px | 44px |

Rescue mode gets more padding everywhere. The extra space creates a calmer, less crowded feel. A student in distress needs a quiet room — more whitespace = less visual pressure.

---

## 5. Shape and Elevation

### 5.1 Border radius

```
Token               Value       Usage
────────────────────────────────────────────────────────────────
--radius-sm         8px         Small chips, tags
--radius-md         12px        Standard cards, scale chips
--radius-lg         16px        Primary CTA buttons
--radius-full       999px       Pill-shaped elements (rare)
```

### 5.2 Shadows (elevation)

Cards use subtle shadows — soft, low-contrast. Never hard shadows.

```
--shadow-card:    0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
--shadow-button:  0 1px 2px rgba(0,0,0,0.08)
--shadow-none:    none (for flat surfaces: footer, chips on bg)
```

**Rule:** The page background and the card surface have almost no contrast. Cards lift slightly via shadow, not color difference. This avoids the "form" feel that makes the app feel like a questionnaire.

---

## 6. Component Shapes

### 6.1 CTA Buttons

```
┌──────────────────────────────────┐
│  Primary CTA (accent fill)       │   height: 48-52px
│  [ Clear 1 first, then go big ]  │   radius: 16px
│                                  │   bg: --color-accent
│                                  │   text: white, 16px, weight 500
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  Secondary CTA (outline)         │   height: 44-48px
│  [ Start something new ]         │   radius: 16px
│                                  │   bg: transparent
│                                  │   border: 1.5px --color-border-strong
│                                  │   text: --color-text-primary, 16px, weight 400
└──────────────────────────────────┘

Tertiary CTA (text only — Boost mode only):
  [ Choose your own ]              text: --color-text-secondary, 14px, underline-on-tap
```

**Rules:**
- Primary CTA is always the widest / most visually dominant.
- Secondary CTA is never the same size or weight as primary.
- Tertiary is text-only, always smaller than secondary — no border, no fill.
- All buttons are full-width (not fixed-width) — adapts to content and screen.

### 6.2 Pending items list

```
┌──────────────────────────────────────┐
│  ▸  Integration · 3 days ago         │   height: 44px, tappable
│  ▸  Thermodynamics · 2 days ago      │   border-bottom: 1px --color-border
│  ▸  Calculus · 1 day ago             │
└──────────────────────────────────────┘
```

- `▸` is a subtle directional indicator (not a bullet, not an arrow icon)
- Topic name: 14px weight 400 `--color-text-primary`
- "· X days ago": 14px weight 400 `--color-text-tertiary`
- Full-width tappable row — no tap affordance icon needed (the row itself is the affordance)
- No background on individual rows — they sit on the card surface

---

## 7. Motion

Motion is functional, not decorative. Every animation has a reason.

### 7.1 The counter animation (most important)

The `3 → 2` moment is the central dopamine mechanic. It must feel satisfying, not mechanical.

```
Sequence:
1. Old number (3) fades out — opacity 1→0, scale 1.0→0.9 — 150ms ease-in
2. New number (2) fades in  — opacity 0→1, scale 0.9→1.0 — 200ms ease-out
3. Brief scale pulse on new number: scale 1.0→1.08→1.0 — 120ms, ease-in-out

Total: ~470ms. Feels deliberate, not instant.

Color: --color-closed (muted green) for 800ms after the number settles,
       then transitions back to --color-text-primary over 400ms.
```

### 7.2 Phase transitions

```
Phase 1 → Phase 2 (student taps CTA):
  Content fades out: opacity 1→0, 150ms ease-in
  Content fades in: opacity 0→1, translateY 8px→0, 200ms ease-out
  Total: ~350ms

Phase 3 → Phase 1 (student taps Done / Clear one more):
  Same as above. The route does NOT change — only the SDUI payload swaps.
```

### 7.3 Chip selection (scale input)

```
Tap:
  Scale: 1.0 → 0.96 → 1.0, 80ms
  Background: transitions from --color-surface to --color-accent-soft, 120ms
  Border: transitions to --color-accent-border, 120ms

Previously selected chip:
  Background returns to --color-surface, 100ms
```

### 7.4 Footer expand/collapse

```
Expand (tap):
  Height: auto transition (use max-height approach), 200ms ease-out
  Content: opacity 0→1, 150ms, delayed 100ms after expand starts

Collapse:
  Height: 200ms ease-in
  Content: opacity 1→0, 80ms, no delay
```

### 7.5 Rules on motion

- No looping animations anywhere in Phase 1. Nothing should pulse, bounce, or draw attention to itself continuously.
- No loading spinners that appear for >200ms — prefer skeleton placeholders.
- Disable all animations if the user has `prefers-reduced-motion: reduce` set.

---

## 8. Iconography

**Rule: No icons in Phase 1 except the `▸` chevron on pending items.**

Icons are visual vocabulary that need to be learned. For a student opening the app quickly between study sessions, decoding icons adds friction. Text labels are unambiguous.

The one exception: the footer expand/collapse indicator uses a `↓` / `↑` arrow character, not an SVG icon. This keeps it typographic, not UI-component-ey.

---

## 9. Mode Summary — Visual Diff

| Element | Rescue | Neutral | Boost |
|---|---|---|---|
| Page bg | `--color-bg-rescue` (warmer) | `--color-bg` | `--color-bg` |
| Top padding | 48px | 40px | 40px |
| Greeting margin-bottom | 32px | 24px | 20px |
| Button height | 52px | 48px | 44px |
| Button count | 1 (max 2) | 2–3 | 2–3 |
| Pending list | Hidden | Shown | Shown |
| Footer | Warm label only ("Quiet week.") | Collapsed summary | Collapsed summary |
| Type weight for greeting | 400 (same) | 400 (same) | 400 (same) |
| Accent usage | Minimal — 1 button | Normal | Normal |

The key visual shift between modes is **density and warmth**, not color or illustrations. Rescue feels like a quiet room. Boost feels like a workspace. Both feel like the same app.

---

*Next: [scales-input.md](../phase1/scales-input.md) — the highest-frequency interaction in the product.*
