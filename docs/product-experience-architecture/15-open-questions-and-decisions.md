# Product Open Questions And Decisions

This document tracks the remaining open product-architecture decisions that sit downstream of the core model but upstream of detailed UX implementation.

It should not reopen the settled architecture. Its purpose is to make unresolved product decisions explicit, owned, and evidence-backed.

## 1. Embedded Continuity Product Form

**Status:** Pending  
**Owner:** Product design  
**Why this matters:** The architecture now defines continuity structurally, but the exact product form remains open. Teams still need a stable answer for what continuity shows, how much it shows, and how it appears around return and close.  
**What is blocked:** Final UX specification for continuity modules, carryover depth, and placement behavior.  
**Required evidence:** UX concept exploration plus usability review of low-, medium-, and high-density continuity variants.  
**Resolution method:** UX concept exploration followed by qualitative review.  
**Next step:** Decide the minimum useful continuity payload for V1 at Arrival and Completion.  
**V1 criticality:** High

## 2. Lightweight History Route Shape

**Status:** Pending  
**Owner:** Product design  
**Why this matters:** V1 allows a lightweight history route for recall, but its exact product form is not yet locked.  
**What is blocked:** Final IA and UX treatment for history, including how it differs from embedded continuity and how it returns to the loop.  
**Required evidence:** IA options review and lightweight prototype validation.  
**Resolution method:** Product review plus prototype walkthrough.  
**Next step:** Define whether history is an overlay, sheet, or minimal route and what information it is allowed to expose.  
**V1 criticality:** Medium

## 3. Active-Study Lifecycle And Notification Detail

**Status:** Pending  
**Owner:** Product + engineering  
**Why this matters:** The architecture now defines re-entry and close transitions, but the exact product behavior around notifications, resume states, and backgrounding still needs operational detail.  
**What is blocked:** Final UX specification and implementation detail for active-study resume and session-close handoff.  
**Required evidence:** Lifecycle walkthroughs across app-open, app-backgrounded, notification-tap, and direct-reopen scenarios.  
**Resolution method:** Product/engineering review supported by UX flow validation.  
**Next step:** Lock the exact notification and reopen behaviors that V1 will support, then reference them from the UX specs.  
**V1 criticality:** High

## 4. Minimum V1 Curriculum Context Payload

**Status:** Pending  
**Owner:** Product design  
**Why this matters:** The model now distinguishes `curriculum context` from `study thread`, but V1 still needs a clear answer on how much academic context is useful before the product starts feeling taxonomic or managerial.  
**What is blocked:** Final product and UX specification for when Eli may surface subject/chapter/unit-style context.  
**Required evidence:** Product review plus lightweight concept comparison of no-context, low-context, and context-labeled variants.  
**Resolution method:** Product review supported by concept testing.  
**Next step:** Decide the minimum useful curriculum context Eli may show in V1, if any.  
**V1 criticality:** Medium

## 5. Is `Study Thread` Internal Or User-Facing Language?

**Status:** Pending  
**Owner:** Product + content design  
**Why this matters:** `Study thread` is a strong internal model, but it is not yet clear whether the product should ever use that phrase directly with students.  
**What is blocked:** Naming consistency in product specs, continuity copy, and future reflective language.  
**Required evidence:** Language review and light qualitative feedback on whether the phrase feels natural, abstract, or overly technical.  
**Resolution method:** Content design review with lightweight language validation.  
**Next step:** Decide whether `study thread` is internal architecture language only or a phrase Eli may surface to the student.  
**V1 criticality:** Medium

## 6. How Much Inferred Structure Should Eli Expose?

**Status:** Pending  
**Owner:** Product design + product research  
**Why this matters:** Eli may infer curriculum context in the background, but the product needs a boundary for how much of that structure should ever become visible.  
**What is blocked:** Safe rules for contextual labeling, grouping, and future thread enrichment.  
**Required evidence:** Concept testing of invisible, lightly visible, and more explicit inferred-context variants.  
**Resolution method:** Product review plus qualitative validation.  
**Next step:** Define the exposure boundary between helpful contextual orientation and planner-like over-structuring.  
**V1 criticality:** Medium

## 7. Is Conversational Eli Globally Summonable Or Moment-Bound?

**Status:** Pending  
**Owner:** Product design  
**Why this matters:** A conversational mode may help with orientation and thread continuity, but its access pattern will strongly affect whether it feels like a companion or a parallel product center.  
**What is blocked:** Final product stance on where conversational Eli may be invoked in V1.  
**Required evidence:** Access-pattern review across always-available, selected-moment, and tightly gated variants.  
**Resolution method:** Product review supported by concept testing.  
**Next step:** Decide whether conversational Eli is available globally, only on selected surfaces, or only in specific states of need.  
**V1 criticality:** Medium

## 8. How Much Thread History Is Accessible Through Conversation?

**Status:** Pending  
**Owner:** Product design + content design  
**Why this matters:** Conversational Eli may answer history questions, but history depth will strongly shape whether the mode feels supportive recall or hidden dashboard behavior.  
**What is blocked:** Safe bounds for conversational history access in V1.  
**Required evidence:** Concept testing across shallow, moderate, and deep history recall variants.  
**Resolution method:** Product/content review supported by qualitative feedback.  
**Next step:** Define the acceptable conversational history window and what kinds of thread truth are allowed on request.  
**V1 criticality:** Medium

## 9. What Thread-Level Truth May Conversation Expose?

**Status:** Pending  
**Owner:** Product design + product research  
**Why this matters:** Eli may reveal session counts, last-touched information, and light patterns, but those truths can become evaluative if exposed too broadly or too bluntly.  
**What is blocked:** Safe response boundaries for conversational truth-telling.  
**Required evidence:** Language and concept testing around factual recall, light pattern recognition, and stronger interpretive summaries.  
**Resolution method:** Product review plus qualitative validation.  
**Next step:** Define which thread-level facts and patterns conversational Eli may expose in V1 and which should remain out of scope.  
**V1 criticality:** Medium

## 10. How Should Conversational Eli Relate To Continuity And Lightweight History?

**Status:** Pending  
**Owner:** Product design  
**Why this matters:** Conversational Eli, continuity surfaces, and lightweight history could overlap unless their roles are kept distinct.  
**What is blocked:** Clean role separation between conversational support, embedded continuity, and any later history access.  
**Required evidence:** IA and concept review across distinct and overlapping role models.  
**Resolution method:** Product review.  
**Next step:** Define what belongs in continuity, what belongs in history, and what belongs in conversation.  
**V1 criticality:** Medium

## 11. Which Conversational Questions Are Supported In V1?

**Status:** Pending  
**Owner:** Product design + content design  
**Why this matters:** Without a bounded question set, conversational Eli may drift toward general assistant, tutor, or dashboard behavior.  
**What is blocked:** A stable V1 scope for conversational support.  
**Required evidence:** Prioritized inventory of desired questions plus brand and product review.  
**Resolution method:** Product/content scoping review.  
**Next step:** Define the supported V1 question classes, such as re-entry help, bounded thread history, next-step clarification, and light thread reflection.  
**V1 criticality:** High

## Working Rule

Each question in this doc should include:

- one clear owner
- one clear reason it matters
- one clear decision method
- one clear statement of what is blocked
- a V1 criticality level

If a question stops affecting product decisions, resolve it or remove it. If it starts challenging the settled architecture itself, move it back to the appropriate architecture source doc for deeper review.
