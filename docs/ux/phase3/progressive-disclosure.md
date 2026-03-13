# Phase 3: Progressive Disclosure Flow

Phase 3 is the core reward mechanism of the app. It transitions the user from "study mode" (Phase 2) back into reflection and closure. Progressive disclosure here ensures the user is asked the critical question *before* they receive the reward.

## Motion Type: State Replacement Morph
Unlike Phase 1, which uses a "Vertical Stack (Accordion)" to build a plan and leave a breadcrumb trail, Phase 3 uses **State Replacement Morphing**. 

Because Phase 3 is about changing mental states (from reflection to reward), we *want* the previous state to disappear to clear the screen for the closure dopamine hit. The old state vanishes so the new state can take center stage.

## State 3A: The Reflection (The Ask)
* **Goal:** Force the student to honestly evaluate if the topic stuck.
* **Visible Elements:**
  - Session Summary (Topic name, time spent).
  - The Question: `"Does it feel solid?"`
  - Two equal-weight buttons: `[Yes, it's solid]` and `[Not yet]`.
* **Visual Shift:** The background color or UI tint should subtly shift to a calm, muted tone to signal that the active timer phase is over and it is time for honest reflection.
* **Trigger:** Tapping either answer triggers the morph to State 3B.

## State 3B: The Closure (The Reward)
* **Goal:** Deliver the dopamine hit of reducing cognitive debt.
* **Visible Elements:**
  - The Counter Animation (e.g., `Revisits: 3 → 2`).
  - Reassurance copy (e.g., `"One less thing on your mind."` or `"Kept in the loop."` if they tapped Not Yet).
  - `[ Done ]` or `[ Clear one more ]` CTA.
* **Animation Rules (State Replacement):** This state transition is the most important animation in the app. Elements from State 3A (the question and buttons) must gracefully fade or slide out, and the State 3B elements (the dropping counter and Done button) slide in to take their exact place. It represents reduction and replacement, not accumulation.