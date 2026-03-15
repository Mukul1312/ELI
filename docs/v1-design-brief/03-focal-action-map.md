# V1 Focal Action Map

Per-surface declaration of action hierarchy. Resolves Brand Law 1 ("One Calm Focal Point") and Interaction Principle 1 ("One Calm Focal Action") for every V1 Pass 1 surface.

## Decision rule

Every surface has one clear primary action. Secondary and tertiary actions exist but are visually subordinate. If two elements compete for attention, the design is wrong.

---

## Surface action hierarchy

### Arrival (returning, populated)

| Priority | Action | Element | Visual treatment |
|----------|--------|---------|-----------------|
| **Primary** | Pick a topic to study | Topic card (tap) | Deep Charcoal topic name, card surface with subtle shadow, full width |
| Secondary | Start something new | "Something new" text action | Warm Charcoal, text-only, no fill, no border, smaller |
| Tertiary | Access profile | Profile icon (top-right) | Warm Charcoal icon, 44x44px, no label |

**Emotional center:** Greeting line (Voice Type). Sets the tone.
**Functional center:** Topic list. The next action.
These two do not compete — greeting is read-only, topic list is interactive.

---

### Arrival (first session — merged with Commitment)

| Priority | Action | Element | Visual treatment |
|----------|--------|---------|-----------------|
| **Primary** | Name a topic | Topic input field (auto-focused, keyboard up) | Deep Charcoal text, prominent placement, auto-focused |
| Secondary | Set a frame | Frame field (appears after topic entered) | Warm Charcoal pre-fill, subtle border, below topic |
| Commit | Begin studying | "Let's go" CTA (Terracotta) | Bottom-anchored, disabled until topic entered |
| Tertiary | Access profile | Profile icon (top-right) | Same as standard Arrival |

**Emotional center:** Greeting ("What are you studying today?")
**Functional center:** Topic input. Everything else serves it.

---

### Commitment

| Priority | Action | Element | Visual treatment |
|----------|--------|---------|-----------------|
| **Primary** | Name or confirm topic | Topic input/display | Deep Charcoal, largest text element, upper portion |
| Secondary | Set or adjust frame | Frame field | Smaller than topic, subtle border, clearable |
| Commit | Begin studying | "Let's go" CTA (Terracotta) | Bottom-anchored, only accent color on surface |
| Navigation | Go back | Back arrow (top-left) | Warm Charcoal icon, minimal |

**The CTA is the commit action, not the primary action.** The student's primary task is deciding what to study (topic) and optionally bounding it (frame). The CTA confirms that decision. It should feel like acceptance, not the main event.

---

### Active Study

| Priority | Action | Element | Visual treatment |
|----------|--------|---------|-----------------|
| **Primary** | Study externally | Not on screen — the app is a bookmark | Maximum negative space signals "your attention belongs elsewhere" |
| Secondary | End session | "I'm done" action | Bottom, outlined or text-only, Deep Charcoal at 70% opacity, findable but quiet |

**This is the only surface where the primary action is NOT on screen.** The entire design says: "Go study. We're here when you're done." Every visual decision supports this — minimal elements, maximum space, muted treatment.

---

### Completion — Stage 1 (Self-report)

| Priority | Action | Element | Visual treatment |
|----------|--------|---------|-----------------|
| **Equal** | Select any outcome | Four option cards | All identical: same size, same weight, same color, same shadow |

**No primary action.** All four options are intentionally equal. Visual hierarchy would bias the student toward "Covered it" as the "correct" answer. Equal treatment protects honest self-reporting.

The question ("How did it go with [topic]?") is the emotional anchor (Voice Type). The options are the functional center.

---

### Completion — Stage 2 (Confirmation)

| Priority | Action | Element | Visual treatment |
|----------|--------|---------|-----------------|
| **None** | Read confirmation | Confirmation text | Voice Type, centered, generous space |
| Passive | Dismiss or wait | Tap anywhere or auto-advance (2.5s) | No visible dismiss button — tap anywhere works |

**No interactive elements.** This is a moment of acknowledgment, not action. The student reads, then moves on. Auto-advance handles the transition.

---

## Visual hierarchy rules

1. **Primary actions** use: full width, Deep Charcoal, larger text, card surfaces with shadow, or prominent input fields
2. **Secondary actions** use: Warm Charcoal, smaller text, text-only (no fill), subtle borders
3. **Commit actions** (CTAs) use: Terracotta fill (Commitment only), bottom-anchored, disabled when precondition not met
4. **Tertiary actions** use: Warm Charcoal icons, minimal size, corner placement
5. **Navigation** (back arrow) uses: Warm Charcoal icon, top-left, standard platform affordance

## Anti-pattern checks

- If two elements on the same surface feel equally prominent: one is too loud or too quiet
- If the CTA feels like the primary action (rather than the topic input): reduce CTA visual weight or increase topic input prominence
- If the profile icon draws attention before the topic list: reduce icon size or opacity
- If all four Completion options don't feel exactly equal: one has accidentally been given emphasis
