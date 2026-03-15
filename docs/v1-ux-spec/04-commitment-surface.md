# Commitment Surface

## Emotional Job

Narrow ambiguity. Make beginning feel manageable. Bound the task enough to feel real without turning it into a setup ritual.

This is where Eli converts orientation into willingness to act.

## When It Appears

This spec applies whenever the architecture layer advances the student from `Arrival` into `Commitment`.

When the student arrives from "Something new" (empty topic) or from first session, the topic field is empty and auto-focused. When the student arrives from selecting an existing topic, the topic is pre-filled and confirmed.

## Presentation States

| State | Condition | CTA | Notes |
|-------|-----------|-----|-------|
| **New topic, empty** | Topic field empty | Disabled | Student must enter a topic to proceed |
| **New topic, entered** | Topic field has text | Enabled | Student can edit, clear, or proceed |
| **Existing topic** | Topic selected from Arrival | Enabled | Topic shown as confirmed; tappable to edit |
| **Frameless** | Frame cleared | Enabled | Valid choice; CTA remains active |
| **Loading** | Handoff in progress | Disabled | If applicable; minimal in V1 |

## Screen Layout

```
┌─────────────────────────────────┐
│  ←                              │  ← Back to Arrival
│                                 │
│                                 │
│                                 │
│  Organic Chemistry              │  ← Topic (confirmed or input field)
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │  20 min              ✕    │  │  ← Frame field (editable, clearable)
│  └───────────────────────────┘  │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │        Let's go           │  │  ← CTA (Terracotta)
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

## Element Breakdown

### 1. Topic Display / Input

**Existing topic selected (from Arrival):**
- Topic name shown as confirmed text (Deep Charcoal, Voice Type)
- Tappable to change — tapping opens the topic field for editing
- The student is not re-asked to confirm what they already chose

**New topic (from "Something new" or first session):**
- Empty text input field, auto-focused
- Placeholder: "What are you studying?" (Warm Charcoal, Structure Type)
- Free-text input. The student types whatever they want.
- No character limit enforcement (reasonable technical limit only, e.g., 200 chars)
- No autocomplete or suggestions from a catalog
- On submit (keyboard done / tap out): text becomes the confirmed topic name

**CTA enable logic:** CTA is disabled when topic field is empty. Enabled as soon as the student has entered at least one non-whitespace character.

### 2. Frame Field

This is the session frame — Eli's suggestion for how long or what to cover.

- **Pre-filled:** Eli suggests a frame (e.g., "20 min"). **Validation note:** The "20 min" default is a V1 implementation choice to validate; it is not a principle-level requirement.
- **Editable:** Student taps the field to change it. They can type any frame — time-based ("45 min", "1 hour") or task-based ("Finish practice problems", "Review chapter 5").
- **Clearable:** ✕ button on the right edge. Tapping ✕ clears the frame entirely. The student goes frameless.
- **Cleared state:** When the frame is empty, the field shows a subtle placeholder: "No frame set" (Warm Charcoal). The CTA remains active — frameless is a valid choice.
- **Visual:** Input field with soft border. Not a card. Feels lighter than the topic. Warm Paper background with subtle edge treatment.

### 3. CTA — "Let's go"

- **Color:** Muted Terracotta (`#B35C44`) fill with Paper text
- **Positioning:** Bottom of the screen. Anchored. Always visible without scrolling.
- **Copy:** "Let's go" — an invitation, not a command. Not "Start session" (too formal). Not "Begin" (too clinical).
- **One CTA only.** Nothing competes with it. No secondary actions at the bottom.
- **Enable/disable:** Disabled (dimmed, not tappable) when topic is empty. Enabled when topic has content.
- **Visual weight:** This is the one Terracotta element on the screen. It draws the eye naturally because everything else is Paper + Charcoal.

### 4. Back Arrow

- **Positioning:** Top-left
- **Destination:** Arrival Surface
- **Visual:** Warm Charcoal. Minimal. Standard back affordance.

## Edge Cases

### Duplicate or Near-Duplicate Topic Names

If the student enters a topic name that matches or closely matches an existing topic:

- **V1 behavior:** Allow it. Eli does not block or warn. The product may treat it as a new thread or merge logic internally; that is an implementation decision.
- **UX principle:** The Commitment Surface does not become a duplicate-prevention gate. The student's intent is primary. If the product needs to handle duplicates, do it quietly in the background.

### Long Topic Input

- Topic names may be long. Truncate with ellipsis in display contexts where space is limited (e.g., Arrival cards). Full text visible when editing.
- **Validation note:** Exact character limit for storage/display is a V1 implementation choice.

### Whitespace-Only Topic

- If the student enters only spaces or clears to whitespace, treat as empty. CTA disabled.

## Interaction Model

| Action | Result |
|--------|--------|
| Tap CTA ("Let's go") | Hands the student into the `Active Study` moment defined by the architecture layer. |
| Tap frame field | Field becomes editable. Keyboard appears. |
| Tap ✕ on frame | Frame is cleared. Student goes frameless. |
| Tap topic name (existing) | Topic becomes editable text field. |
| Type new topic + confirm | Text becomes confirmed topic name. |
| Tap back arrow | Returns per the canonical transition model. |

## Frame Suggestion Logic (Focus State)

In Pass 1 (Focus state), Eli's frame suggestion follows simple rules:

- **First session with a topic:** "20 min" (a moderate, low-commitment starting point)
- **Returning to a topic:** Same "20 min" default (in Pass 2, this could adapt based on session history)

The suggestion is always a time-based default. The student can change it to task-based if they prefer.

## What This Surface Must Never Become

- A setup ritual with multiple configuration steps
- A planning screen with difficulty selectors, goal setting, or session type pickers
- A surface with multiple equally weighted actions
- A place where Eli talks at length before the student can begin
- A surface that requires decisions beyond topic + frame

## Accessibility

- **Focus order:** Back arrow → topic field → frame field → CTA. Logical top-to-bottom.
- **Keyboard:** When topic field is focused, keyboard appears. "Done" or "Go" on keyboard should submit if topic is valid (same as CTA tap).
- **Screen reader:** Topic field must have accessible label (e.g., "What are you studying?"). Frame field must have label (e.g., "Session frame"). CTA must announce enabled/disabled state.
- **Tap targets:** Minimum 44×44 pt for CTA, frame field, back arrow, and topic (when tappable).
- **Dynamic type:** Layout should accommodate larger text. CTA and fields should remain usable.

## Visual Notes

- **Background:** Warm Paper (`#FDFCF8`)
- **Topic text:** Deep Charcoal, Voice Type (Eli's presence — this is the topic the student named)
- **Frame field:** Structure Type. Soft border. Warm Paper fill.
- **CTA:** Muted Terracotta fill. Paper text. Rounded corners. The only color accent on the screen.
- **Spacing:** The screen is intentionally sparse. Topic at top third, frame below it, CTA at bottom. Large negative space in between. The emptiness signals "this is simple, just begin."

## Design Principle

The Commitment Surface should feel lighter than the study task itself. If it feels like work to get through this screen, the ceremony is too heavy.
