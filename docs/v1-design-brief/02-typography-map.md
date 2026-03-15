# V1 Typography Map

Element-by-element typography assignment for all V1 Pass 1 surfaces. Resolves the Voice Type vs Structure Type ambiguity identified in the design audit.

## Decision rule

- **Voice Type** = Eli's presence. Used when Eli is speaking, greeting, acknowledging, or reflecting.
- **Structure Type** = Everything else. Controls, labels, the student's own words, metadata, actions.

If in doubt: Structure Type. Voice Type is the exception, not the default.

---

## Arrival Surface (returning, populated)

| Element | Type Role | Token | Color | Notes |
|---------|-----------|-------|-------|-------|
| Greeting line ("Hey. What are you working on today?") | Voice | `type.voice.greeting` (24px/400) | Deep Charcoal | Eli's presence. The emotional anchor of the surface. |
| Topic card — topic name | Structure | `type.structure.topic` (18px/500) | Deep Charcoal | Student's own words, not Eli speaking. |
| Topic card — recency indicator ("Yesterday") | Structure | `type.structure.meta` (14px/400) | Warm Charcoal | Metadata. Secondary to topic name. |
| "Something new" action | Structure | `type.structure.body` (16px/400) | Warm Charcoal | Tertiary action. Text-only, no fill. |
| Profile icon | — | Icon only, no label | Warm Charcoal | 44x44px touch target. No text. |

### Focal action hierarchy

1. **Primary:** Tap a topic card (advances loop to Commitment)
2. **Secondary:** "Something new" (branches to empty Commitment)
3. **Tertiary:** Profile icon (opens minimal overlay)

---

## Arrival Surface (first session — merged with Commitment)

| Element | Type Role | Token | Color | Notes |
|---------|-----------|-------|-------|-------|
| Greeting line ("What are you studying today?") | Voice | `type.voice.greeting` (24px/400) | Deep Charcoal | Slightly different copy from standard Arrival — acknowledges first visit without ceremony. |
| Topic input placeholder ("Type a topic...") | Structure | `type.structure.body` (16px/400) | Warm Charcoal | Placeholder hint. Disappears on focus. |
| Topic input text (student typing) | Structure | `type.structure.topic` (18px/500) | Deep Charcoal | Student's words. Same treatment as topic card names. |
| Frame field pre-fill ("20 min") | Structure | `type.structure.body` (16px/400) | Deep Charcoal | Appears after topic entered and field loses focus. |
| Frame field placeholder ("No frame set") | Structure | `type.structure.meta` (14px/400) | Warm Charcoal | When frame is cleared. |
| "Let's go" CTA | Structure | `type.structure.action` (16px/500) | Paper on Terracotta | Warmth from word choice, not from typography role. |
| Profile icon | — | Icon only | Warm Charcoal | Same as standard Arrival. |

### Focal action hierarchy

1. **Primary:** Enter topic name (auto-focused, keyboard appears)
2. **Secondary:** Frame field (optional, pre-filled)
3. **Tertiary:** "Let's go" CTA (disabled until topic entered)

---

## Commitment Surface

| Element | Type Role | Token | Color | Notes |
|---------|-----------|-------|-------|-------|
| Back arrow | — | Icon only | Warm Charcoal | 44x44px touch target. Top-left. |
| Topic display (existing topic, confirmed) | Structure | `type.structure.topic` (18px/500) | Deep Charcoal | Student's own words displayed as confirmed label. NOT Voice Type — Eli is not speaking here. |
| Topic input (new topic, editing) | Structure | `type.structure.topic` (18px/500) | Deep Charcoal | Same as topic display. Auto-focused when empty. |
| Topic input placeholder ("What are you studying?") | Structure | `type.structure.body` (16px/400) | Warm Charcoal | Hint text. |
| Frame field text ("20 min") | Structure | `type.structure.body` (16px/400) | Deep Charcoal | Editable. |
| Frame field placeholder ("No frame set") | Structure | `type.structure.meta` (14px/400) | Warm Charcoal | When cleared. |
| Frame clear button (x) | — | Icon only | Warm Charcoal | Small, subtle. |
| "Let's go" CTA | Structure | `type.structure.action` (16px/500) | Paper on Terracotta | Single CTA. Bottom-anchored. |
| "Let's go" CTA (disabled) | Structure | `type.structure.action` (16px/500) | Paper on Terracotta at 40% opacity | When topic field is empty. |

### Focal action hierarchy

1. **Primary:** Topic name (required — CTA disabled without it)
2. **Secondary:** Frame field (optional, pre-filled, clearable)
3. **Commit:** "Let's go" CTA (confirms and advances to Active Study)

---

## Active Study Surface

| Element | Type Role | Token | Color | Notes |
|---------|-----------|-------|-------|-------|
| Topic name | Structure | `type.structure.topic` (18px/500) | Deep Charcoal | Subdued. Centered upper portion. Context anchor, not Eli speaking. |
| Elapsed time ("12 min") | Structure | `type.structure.caption` (12px/400) | Warm Charcoal | Updates every minute. Secondary to topic. |
| Frame reached ("20 min" + checkmark) | Structure | `type.structure.caption` (12px/400) | Deep Charcoal (text) + Deep Charcoal (checkmark) | NO green. Checkmark is factual signal, not earned confirmation. |
| "I'm done" action | Structure | `type.structure.action` (16px/500) | Deep Charcoal at 70% opacity | Outlined or text-only. Findable but not competing for attention. |

### Focal action hierarchy

1. **Primary:** Study externally (the app is a bookmark, not the activity)
2. **Secondary:** "I'm done" (ends loop, advances to Completion)

---

## Completion Surface — Stage 1 (Self-report)

| Element | Type Role | Token | Color | Notes |
|---------|-----------|-------|-------|-------|
| Question ("How did it go with [topic]?") | Voice | `type.voice.confirmation` (20px/400) | Deep Charcoal | Eli asking. This is Eli's presence. |
| Option label — "Covered it" | Structure | `type.structure.body` (16px/400) | Deep Charcoal | Control label, not Eli speaking. |
| Option label — "Partially" | Structure | `type.structure.body` (16px/400) | Deep Charcoal | Same treatment as all options. |
| Option label — "Got stuck" | Structure | `type.structure.body` (16px/400) | Deep Charcoal | Same. |
| Option label — "Didn't get to it" | Structure | `type.structure.body` (16px/400) | Deep Charcoal | Same. |

### Focal action hierarchy

All four options are visually equal. No primary/secondary distinction. Equal treatment prevents biasing the student toward "Covered it."

---

## Completion Surface — Stage 2 (Confirmation)

| Element | Type Role | Token | Color | Notes |
|---------|-----------|-------|-------|-------|
| "Covered it" confirmation ("[Topic] — done.") | Voice | `type.voice.confirmation` (20px/400) | Green `#2D7A52` | The ONE place green appears. Earned confirmation. |
| "Partially" confirmation ("Noted. You moved it forward.") | Voice | `type.voice.confirmation` (20px/400) | Deep Charcoal | Acknowledged, not confirmed as complete. |
| "Got stuck" confirmation ("That happens. It's still here for next time.") | Voice | `type.voice.confirmation` (20px/400) | Deep Charcoal | Normalizing. No problem-solving follow-up. |
| "Didn't get to it" confirmation ("No problem. It'll be here.") | Voice | `type.voice.confirmation` (20px/400) | Deep Charcoal | Zero guilt. |
| Session count ("2nd session.") | Structure | `type.structure.meta` (14px/400) | Warm Charcoal | Continuity metadata. Only for "Covered it" and "Partially." Starting from session 2. |

### Focal action hierarchy

No interactive elements. Confirmation is read-only. Auto-advances in 2.5 seconds or tap to dismiss.

---

## Cross-surface summary

| Voice Type elements (Eli's presence) | Surface |
|---------------------------------------|---------|
| Greeting line | Arrival |
| First-session question | First Session |
| Self-report question | Completion Stage 1 |
| All four confirmation messages | Completion Stage 2 |

**Everything else is Structure Type.** This means ~80% of the UI is Structure Type, ~20% is Voice Type. Voice Type is sparse and intentional — when it appears, the student feels Eli's presence. When it's absent (Active Study), the student feels supported without being watched.
