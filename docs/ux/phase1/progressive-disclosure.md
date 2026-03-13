# Phase 1: Progressive Disclosure Flow

Phase 1 is where the student arrives and decides what to study. To avoid the "Dashboard" trap, Phase 1 is split into three distinct, morphing states.

## State 1A: The Check-in (The Anchor)
* **Goal:** Acknowledge the user and gauge their energy.
* **Visible Elements:**
  - The Greeting (typographically prominent, conversational).
  - The Energy Selector (Drained → Sharp).
* **Hidden Elements:** Everything else. No pending lists, no topics, no start buttons.
* **Trigger:** Tapping an energy level triggers the morph to State 1B.

## State 1B: The Reveal (The Unlock)
* **Goal:** Answer "What should I study?" without making them think.
* **Visible Elements:**
  - **The Hero Card:** The recommended (oldest pending) topic. This must look like the obvious, default choice.
  - **The Backlog:** Subtle list of "Other Revisits" below the Hero Card.
  - **Secondary Action:** `[ Search / Select Topic ]` styled as a subtle ghost button or text link.
* **State Change:** Vertical Push. The new elements slide out from the bottom of the Energy Selector. State 1A elements (Greeting/Energy) remain locked at the top as visual breadcrumbs, preserving the "Honest Mirror".
* **Trigger:** Tapping a topic (either the Hero Card or searching a new one) triggers the morph to State 1C.

## State 1C: The Setup (The Focus)
* **Goal:** Finalize how they will study the chosen topic.
* **Visible Elements:**
  - The Selected Topic (locked in).
  - Task Types (`[Learn] [Practice] [Revise]`).
  - Scope Picker (`[~15] [~30] [~45]`).
  - **Massive `[ Start ]` Button.**
* **State Change:** Inline Growth. The layout adapts to fit the new controls below the selected topic, keeping the "one screen, no scroll" rule intact. The pending list and search options disappear. The user is now isolated with their choice and the setup toggles, while the initial Greeting and selected Energy remain visible at the top.
