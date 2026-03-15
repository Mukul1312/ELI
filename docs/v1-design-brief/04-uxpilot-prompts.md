# V1 UXPilot Prompts

Copy-paste-ready prompts for generating each V1 Pass 1 surface in UXPilot. Each prompt bakes in tokens, typography, layout, and emotional intent from the UX spec.

## Before you start

### Global style instruction (paste this first as a style reference)

```
Design style for all screens: Warm, restrained, calm study companion app.
Background: warm off-white paper (#FDFCF8).
Primary text: deep warm charcoal (#2A2825).
Secondary text: warm gray (#736F66).
Accent color used VERY sparingly: muted terracotta (#B35C44) for one CTA button only.
Green (#2D7A52) used only for one confirmation moment.
Typography: Two fonts — a humanist serif for greetings/acknowledgments (Literata or Source Serif 4), a clean sans-serif for everything else (Inter or DM Sans).
Spacing: Very generous negative space. Empty space is intentional, not missing content.
Corners: 12px radius on cards. Shadows barely visible (0 1px 3px rgba(42,40,37,0.08)).
No illustrations, no icons beyond minimal UI icons, no decorative elements, no gradients, no glassmorphism.
The app should feel like opening a quiet, well-made notebook — not a productivity app.
Mobile only (390px width, standard iOS/Android proportions).
```

---

## Prompt 1: Arrival Surface (Returning, Populated)

```
Mobile app screen. Warm paper background (#FDFCF8).

Top-right corner: small circular profile icon in warm gray (#736F66), no label, 44px.

Below, with generous top padding (48px from top):
One line of greeting text in humanist serif, regular weight, 24px, deep charcoal (#2A2825):
"Hey. What are you working on today?"

Below the greeting (24px gap):
Vertical list of 3 topic cards, full width, 12px rounded corners, barely-visible shadow. Each card contains:
- Topic name in sans-serif medium weight 18px deep charcoal (#2A2825): "Organic Chemistry", "Thermodynamics", "Coordinate Geometry"
- Below each topic name: recency text in sans-serif regular 14px warm gray (#736F66): "Yesterday", "3 days ago", "Last week"
- Cards have 16px internal padding, 12px gap between cards

Below the last card (24px gap):
Text-only action "Something new" in sans-serif regular 16px warm gray (#736F66). No border, no fill, no icon. Just text.

Large empty space below. No other elements. No bottom navigation bar. No tab bar. No floating buttons.

The screen should feel calm, unhurried, and quiet. Like a bookmark showing where you left off.
```

---

## Prompt 2: Arrival Surface (First Session — Merged)

```
Mobile app screen. Warm paper background (#FDFCF8).

Top-right corner: small circular profile icon in warm gray (#736F66), 44px.

Center-upper area with generous top padding (64px):
One line in humanist serif, regular weight, 24px, deep charcoal (#2A2825):
"What are you studying today?"

Below (32px gap):
Text input field, full width, 12px rounded corners, subtle 1px border in rgba(115,111,102,0.3).
Placeholder text in sans-serif regular 16px warm gray: "Type a topic..."
The field should look active/focused (as if the keyboard is about to appear).

Below the input (24px gap):
A frame field (not yet visible on first load — shows after topic is entered).
For the mockup, show it with pre-filled text "20 min" in sans-serif regular 16px deep charcoal,
with a small (x) clear button in warm gray on the right side.

Bottom of screen (32px from bottom):
Full-width button, 12px rounded corners, muted terracotta (#B35C44) fill, 52px height.
Button text: "Let's go" in sans-serif medium 16px, paper white (#FDFCF8) text, centered.

Large empty space between the frame field and the button. The screen should feel simple —
like there's almost nothing here, which is the point. Starting should feel easier than not starting.
```

---

## Prompt 3: Commitment Surface (Existing Topic)

```
Mobile app screen. Warm paper background (#FDFCF8).

Top-left: back arrow icon in warm gray (#736F66), 44px touch target.

Below (48px from top):
Confirmed topic name in sans-serif medium 18px deep charcoal (#2A2825):
"Organic Chemistry"
(Tappable to edit, but displayed as confirmed text, not as an input field)

Below (24px gap):
Frame field with pre-filled "20 min" in sans-serif regular 16px deep charcoal (#2A2825).
Subtle 1px border, 12px rounded corners. Small (x) clear button on right in warm gray.

Large empty space in the middle of the screen.

Bottom of screen (32px from bottom):
Full-width CTA button, muted terracotta (#B35C44) fill, 52px height, 12px rounded corners.
"Let's go" in sans-serif medium 16px, paper white (#FDFCF8).

Only two interactive areas (topic + frame) and one button. Nothing else on the screen.
No instructions, no tips, no secondary actions. Maximum simplicity.
```

---

## Prompt 4: Active Study Surface (Ambient)

```
Mobile app screen. Warm paper background (#FDFCF8). The QUIETEST screen in the entire app.

Upper-center area (about 35% from top):
Topic name in sans-serif medium 18px deep charcoal (#2A2825), centered:
"Organic Chemistry"

Below (16px gap):
Elapsed time in sans-serif regular 12px warm gray (#736F66), centered:
"12 min"

Everything else is empty space. Massive amounts of it — above, below, and around the text.

Bottom of screen (32px from bottom):
Text-only action "I'm done" in sans-serif medium 16px, deep charcoal (#2A2825) at 70% opacity.
Centered. No border, no fill, no icon. Just quiet text.

Nothing else on the screen. No header, no navigation, no tips, no encouragement,
no timer graphics, no progress bars, no animations.

This screen is a bookmark, not an app. The student is studying elsewhere.
This just marks their place. It should feel like a blank page with a small note on it.
```

---

## Prompt 5: Active Study Surface (Frame Reached)

```
Same as the Ambient active study screen, but the time display has changed:

Upper-center area:
Topic name: "Organic Chemistry" (same as before)

Below:
Time text now reads "20 min" with a small checkmark symbol after it.
IMPORTANT: The checkmark and text are in deep charcoal (#2A2825), NOT green.
Same size (12px), same position, same weight. Just a factual note that time was reached.

"I'm done" at bottom, same as before.

The change is so subtle you almost miss it. That's correct.
No celebration, no color change, no animation. Just a quiet acknowledgment.
```

---

## Prompt 6: Completion Surface — Stage 1 (Self-Report)

```
Mobile app screen. Warm paper background (#FDFCF8).

Upper area with generous top padding (64px):
Question in humanist serif, regular weight, 20px, deep charcoal (#2A2825):
"How did it go with Organic Chemistry?"

Below (32px gap):
Four option cards, vertically stacked, full width. ALL FOUR must look EXACTLY identical:
- 12px rounded corners
- Barely-visible shadow
- 16px internal padding
- 56px minimum height
- Sans-serif regular 16px deep charcoal (#2A2825) text
- 12px gap between cards

Option 1: "Covered it"
Option 2: "Partially"
Option 3: "Got stuck"
Option 4: "Didn't get to it"

CRITICAL: All four options must be visually identical — same size, same weight, same color,
same shadow, same everything. No option should look like the "right" answer.
No icons, no color coding, no checkmarks.

Empty space below the options. Nothing else on screen.
The screen asks one simple question and offers four honest answers. That's it.
```

---

## Prompt 7: Completion Surface — Stage 2 ("Covered it" Confirmation)

```
Mobile app screen. Warm paper background (#FDFCF8).

Center of screen, vertically centered with generous space above and below:

Confirmation text in humanist serif, regular weight, 20px, sage green (#2D7A52):
"Organic Chemistry — done."

Below (8px gap):
Session count in sans-serif regular 14px warm gray (#736F66):
"2nd session."

Nothing else on the screen. Maximum empty space around the confirmation text.
No buttons, no actions, no navigation. The screen auto-dismisses after 2.5 seconds.

This is the ONE moment green appears in the entire app.
It should feel like a quiet, grounded acknowledgment — not a celebration.
```

---

## Prompt 8: Completion Surface — Stage 2 ("Partially" Confirmation)

```
Same layout as the "Covered it" confirmation, but:

Confirmation text in humanist serif, regular weight, 20px, deep charcoal (#2A2825) — NOT green:
"Noted. You moved it forward."

Below (8px gap):
Session count in sans-serif regular 14px warm gray (#736F66):
"2nd session."

No green. Partial progress is acknowledged, not confirmed as complete.
Same generous empty space. Same auto-dismiss timing.
```

---

## Prompt 9: Completion Surface — Stage 2 ("Got stuck" Confirmation)

```
Same layout, but:

Confirmation text in humanist serif, regular weight, 20px, deep charcoal (#2A2825):
"That happens. It's still here for next time."

No session count shown for this outcome.
No green. Just calm acknowledgment. No follow-up questions, no "what went wrong?"
```

---

## Prompt 10: Completion Surface — Stage 2 ("Didn't get to it" Confirmation)

```
Same layout, but:

Confirmation text in humanist serif, regular weight, 20px, deep charcoal (#2A2825):
"No problem. It'll be here."

No session count shown for this outcome.
No green. Zero guilt. The topic stays in the list for whenever the student is ready.
```

---

## Generation tips

1. **Generate each prompt separately.** Don't try to generate all screens at once — UXPilot produces better results with focused, single-screen prompts.

2. **After generating, check these first:**
   - Is the background warm paper (#FDFCF8), not pure white?
   - Are there any decorative elements the AI added? Remove them.
   - Is the negative space generous enough? If it feels "normal," add more space.
   - Does the CTA feel like an invitation or a command? If commanding, soften.
   - Are all four Completion options truly identical? If one stands out, fix it.

3. **Common AI design tool mistakes to correct:**
   - Adding subtle gradients or background textures (remove — flat paper only)
   - Making the CTA too prominent or adding hover/glow effects (reduce)
   - Adding placeholder illustrations or emoji (remove entirely)
   - Using pure white (#FFFFFF) instead of warm paper (#FDFCF8) (fix — this is critical)
   - Making cards too "buttony" with strong borders (soften — barely-visible shadow only)
   - Adding a bottom navigation bar or tab bar (remove — the loop IS the navigation)

4. **Export settings:** Export to Figma for refinement, then to code. Keep both the Figma source and the generated code as references for engineering.
