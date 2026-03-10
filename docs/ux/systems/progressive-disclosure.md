# System: Progressive Disclosure

## The Core Philosophy: "One Screen, No Scroll"

To prevent the application from feeling like a traditional "productivity dashboard," the UI must strictly adhere to progressive disclosure. This means we never present all available information and actions at once. 

Instead of a static page filled with cards and buttons, the interface acts as a **morphing canvas** that guides the student through one single decision at a time.

## Why This System Exists

1. **Reduces Cognitive Load:** Students arriving at the app are often tired. Asking them to parse a full dashboard of statistics, pending tasks, and setup options creates friction.
2. **Enforces the "Companion" Feel:** A dashboard says, "Here is your data." A companion says, "Here is the one thing we need to figure out right now."
3. **Creates Focus:** By hiding irrelevant options (e.g., hiding the topic list once a topic is chosen), the user is locked into their current commitment.

## Core Mechanics: Vertical Stack (Accordion Expansion)

In a Morphic UI, the motion is additive. The interface literally grows and shrinks vertically as the user commits to a path, ensuring they never feel overwhelmed by options they aren't ready to use yet. When a user makes a selection, the next section doesn't just "appear"—it slides out from the bottom of the previous element, pushing the layout open.

### The Commitment Ladder
The Vertical Stack is a physical manifestation of the Commitment Ladder. By making the app "grow" one small step at a time, we lead an avoidant student toward a session without them feeling the "weight" of the upcoming task until they are already halfway through the setup.

### Why this Motion is Most Suitable

1. **Breadcrumb Grounding:** As elements expand downward, the previous selections (e.g., Energy → Topic) stay visible at the top. This acts as a visual "breadcrumb" that keeps the student grounded in their intent.
2. **The "Mirror" Integrity:** Because the motion only happens below the header, the "Honest Mirror" facts (e.g., "5 revisits open") stay in the student's peripheral vision at all times. They cannot "scroll away" from their reality.
3. **Reduced Friction:** For an avoidant student, every page load is an opportunity to quit. Morphic motion feels like a single, continuous thought rather than a series of chores.

## Comparison with "Other" Motion Types

To understand why the Vertical Stack (Accordion Expansion) is the winner, look at what it replaces:

- **Horizontal Swiping (Carousel):** This would hide the "Honest Mirror" as the student moves to the next step. For avoidant archetypes, hiding the data allows pseudo-productivity to return; the data must stay visible.
- **Full-Screen Transitions (Stack Navigation):** These trigger "Decision Paralysis" because they feel like a commitment to a new environment. Morphing keeps the student in the "Safety Zone" of the home screen until the very moment they tap [Start].
- **Modal Pop-ups:** Modals feel like interruptions or "testing." Avoidant students are in the "danger zone" for resentment at anything that feels like a test.

