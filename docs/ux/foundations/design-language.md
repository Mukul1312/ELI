# Visual Language — The High-Focus Physical Desk

> The visual language IS the emotional tone. For an avoidant student in burnout re-entry, the app needs to feel like a high-quality physical notebook resting on a clean desk under a warm lamp — a psychologically safe, tactile space. Every color, font, and shadow decision below is derived from this "Tactile Companion" principle, explicitly rejecting both the "Corporate SaaS Tracker" and "Dark Mode Command Center" aesthetics.

---

## 1. Design Philosophy — Three Principles

### 1.1 Physicality and Light
The app must feel grounded and real, not like weightless digital software. We reject flat, border-heavy design that feels like a spreadsheet, and we reject high-contrast neon dark mode that feels like an exam terminal. 
- Interfaces should look like thick cards resting on a surface.
- Inputs should have subtle, physical grooves.
- Backgrounds are paper-toned, not purely digital hex codes.

### 1.2 Conversational, Not Data-Driven
Dashboards shout statistics; companions speak to you. The design must emphasize ELI's voice over raw metrics.
- The greeting is the hero, styled distinctly from functional UI text.
- Data is woven into sentences where possible, avoiding giant un-contextualized numbers.
- Avoid traffic-light colors (red/yellow/green) for evaluation, as they trigger performance anxiety.

### 1.3 Dynamic Expression
The interface adapts its "lighting" and density based on the student's state, providing a CONSTANT foundation with DYNAMIC expression.
- **Rescue mode:** The "lighting" warms up (softer peach/sand backgrounds), contrast lowers, and the space feels like a dim, quiet room. Less UI = less visual pressure.
- **Neutral mode:** Standard "notebook paper" crispness and lighting.
- **Boost mode:** Slightly higher contrast, feels like a bright, active workspace.

---

## 2. Color Tokens

All colors are named by semantic role. We use Paper Tones, Ink Colors, and Earthy Accents.

### 2.1 Base palette (Paper Tones)

```
Token                   Value           Usage
──────────────────────────────────────────────────────────────
--color-bg              #F7F5F0         Page background (Warm Oatmeal/Sand)
--color-bg-rescue       #FDF5EC         Page background in Rescue mode (Soft Peach - feels warmer)
--color-surface         #FFFFFF         Card surface (Crisp paper)
--color-surface-subtle  #F2EFE9         Subtle card bg (footer, secondary cards)
--color-border          #E8E4DB         Subtle physical dividers (rarely used for hard borders)
--color-border-strong   #D1CCC2         Focused state, active tactile edge
```

### 2.2 Text palette (Ink Colors)

```
Token                   Value           Usage
──────────────────────────────────────────────────────────────
--color-text-primary    #2A2825         Headings, greeting, primary body (Deep Charcoal/Espresso, never #000)
--color-text-secondary  #736F66         Supporting copy, scale labels, secondary info (Warm Slate)
--color-text-tertiary   #A8A398         Timestamps, disabled states
--color-text-accent     #C05B3A         Accent text (rare)
```

### 2.3 Accent palette (Earthy & Grounding)

Corporate Indigo has been replaced with grounding, earthy tones that inspire action without shouting "URGENT".

```
Token                   Value           Usage
──────────────────────────────────────────────────────────────
--color-accent          #D46A43         Primary CTA background, selected chip fill (Soft Terracotta)
--color-accent-hover    #B85430         CTA hover/press state
--color-accent-soft     #FBEFEA         Selected chip background (light, warm wash)
--color-accent-border   #E8A086         Selected chip border
```

### 2.4 State colors (Reward)

```
Token                   Value           Usage
──────────────────────────────────────────────────────────────
--color-closed          #3A6D4C         Loop-closed counter (Muted Forest Green — relief/reward)
--color-closed-soft     #EAF1ED         Loop-closed card background
--color-skip            #908D85         Skip acknowledged (Neutral stone — no judgment)
```

---

## 3. Typography

### 3.1 Dual-Role Typefaces

**Secondary Typeface (ELI's Voice):** A character-rich humanist sans-serif or soft serif (e.g., *Lora, Recoleta, or a warm geometric like Lineto Circular*). Used EXCLUSIVELY for the Greeting ("The Honest Mirror") and Identity Statements. It must read like a human wrote it.

**Primary Typeface (Functional Data):** `Inter` or system sans-serif. Used for buttons, labels, lists, and raw data (like the counter).

### 3.2 Type scale

```
Name        Size        Line height     Weight      Usage
────────────────────────────────────────────────────────────────────────
display     28px        1.15        500       Counter animation (3→2), milestone numbers (Inter)
greeting    22-24px     1.25        400       Phase 1 greeting text (Secondary Typeface)
body        16px        1.55        400       Supporting copy, button labels, card text (Inter)
label       14px        1.45        400       Scale labels, pending item text, footer (Inter)
caption     12px        1.4         400       "X days ago", hints (Inter)
```

---

## 4. Spacing System

**Base unit:** 4px. The layout uses the **Negative Space Mirror** rule: separating elements using generous whitespace rather than drawing boxes and lines.

```
Token       Value       Usage
────────────────────────────────────────────────────────────────
--sp-1      4px         Micro gaps
--sp-4      16px        Standard vertical rhythm
--sp-6      24px        Section gaps
--sp-10     40px        The 40px Rule: Top padding. The greeting must breathe.
--sp-12     48px        Bottom padding
```

Rescue mode receives *even more* padding everywhere to create a quiet, uncrowded room effect.

---

## 5. Shape and Elevation (Soft Skeuomorphism)

We reject hard 1px borders that feel like databases. Instead, we use "Soft Depth" to make the interface feel tactile.

### 5.1 Border radius

Rounded corners signal safety.
```
--radius-sm         8px         Small chips
--radius-md         12px        Standard cards, scale chips
--radius-lg         16px        Primary CTA buttons
```

### 5.2 Soft Skeuomorphic Shadows

```
--shadow-card:    0 4px 12px rgba(42, 40, 37, 0.03), 0 1px 3px rgba(42, 40, 37, 0.02)
--shadow-inner:   inset 0 2px 4px rgba(42, 40, 37, 0.04) (used for unselected chips/inputs to feel like grooves)
```

Cards lift slightly via soft, warm shadow. The page background and card surface have subtle contrast, mimicking thick cardstock resting on a desk.

---

## 6. Component Shapes

### 6.1 CTA Buttons

```
Primary CTA:   Soft Terracotta fill, white text. Large, rounded, full-width.
Secondary CTA: Transparent background, strong border. Ink-colored text.
```

### 6.2 Pending items list

- Uses generous line-height and soft dividers.
- Visual hierarchy prioritizes the text over UI boundaries.

---

## 7. Motion

Motion is the secret sauce that makes the app feel like a physical, living companion rather than a series of web pages.

### 7.1 Phase 1: Accordion Expansion (Vertical Stack)

- **Motion Type:** Additive / Morphic Reveal.
- When a user interacts (e.g., selecting Energy), the next section *slides out* from the bottom of the previous element, pushing the layout open vertically.
- **Why:** This "Commitment Ladder" leaves the previous selections (and the Honest Mirror greeting) visible at the top as breadcrumbs. The student stays grounded and cannot escape the reality of their data.

### 7.2 Phase 3: Emotional Moments and The Counter Drop

- **State Replacement Morph:** Phase 3 transitions clear the previous state completely to make room for the reward.
- **The Closure Beat:** When the loop is closed, the counter physically "drops" (e.g., the 3 slides out downwards, the 2 drops in from above).
- **Breaking the No-Illustration Rule:** For this specific reward moment, subtle emotional micro-interactions are encouraged. A soft glow, a satisfying haptic buzz, or a delicate color wash (Forest Green) makes verification feel rewarding, breaking the sterile nature of a tracker.

### 7.3 Guidelines
- **Easing:** Use organic curves (e.g., Quart Out) so elements feel like physical objects settling into place.
- Disable all animations if the user has `prefers-reduced-motion: reduce` set.

---

## 8. Iconography

**Rule: Bare minimum.**
Icons are visual vocabulary that need to be learned. A `▸` chevron for lists or `↓` / `↑` for the footer is acceptable. No decorative icons that distract from ELI's conversational voice.

---

## 9. Mode Summary — Dynamic Expression

| Element | Rescue | Neutral | Boost |
|---|---|---|---|
| Page bg | `--color-bg-rescue` (Warmer Peach) | `--color-bg` (Oatmeal/Sand) | `--color-bg` (Slightly crisper) |
| Top padding | 48px | 40px | 40px |
| Accent usage | Minimal — 1 button | Standard | Standard |
| Vibe | Dim, quiet room | Clean, focused desk | Bright, active morning |

---

*Next: [scales-input.md](../phase1/scales-input.md) — the highest-frequency interaction in the product.*
