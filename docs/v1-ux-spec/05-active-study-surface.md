# Active Study Surface

## Emotional Job

Protect focus. Stay quiet. Let external study remain the center of gravity. This surface is a bookmark, not a dashboard.

## When It Appears

This spec applies whenever the architecture layer resolves the student into `Active Study`, whether by first entry (from Commitment) or resume (re-entry with active work).

Entry resolution is owned by the architecture layer. See `docs/product-experience-architecture/07-surface-architecture.md` and `docs/product-experience-architecture/08-navigation-philosophy.md`.

## Core Principle

The student is studying externally — reading a textbook, working through problems, reviewing notes. Eli's job during this time is to be present without competing for attention. This is the quietest surface in the product.

## Presentation States

The Active Study Surface is defined by a set of presentation states, not just two narrative modes.

| State | Condition | What the student sees |
|-------|-----------|------------------------|
| **Ambient (app open)** | App is foregrounded, session in progress | Topic name, elapsed time, "I'm done" action |
| **Frame reached (app open)** | Elapsed time met or exceeded frame | Topic name, "20 min ✓" (or equivalent), "I'm done" |
| **Backgrounded** | App in background, session in progress | Persistent notification: "[Topic] — tap when you're done" |
| **Frame reached (backgrounded)** | Elapsed time met frame while app backgrounded | Notification updates: "Your 20 minutes are up. Tap when ready." |
| **Resumed** | Student returns to app mid-session | Same as Ambient — session continues in place |
| **Notification denied** | User denied notification permission | No persistent notification. Student returns via direct app open. Resume behavior unchanged. |

## Screen Layout (Ambient State)

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│        Organic Chemistry        │  ← Topic name (Structure Type, subdued)
│                                 │
│           12 min                │  ← Elapsed time (Warm Charcoal, quiet)
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │        I'm done           │  │  ← End session action
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

## Element Breakdown

### 1. Topic Name

- Structure Type, subdued weight
- Deep Charcoal but not assertive — present, not demanding
- Centered vertically in upper portion of screen

### 2. Time Display

- **Frame was set:** Shows elapsed time counting up. Eli does NOT show a countdown. It shows elapsed time. When elapsed time passes the frame ("20 min"), a subtle state change occurs — see "Frame completion signal" below.
- **No frame set:** Shows elapsed time counting up with no target. Just a quiet clock.
- Warm Charcoal. Small. Secondary to the topic name.
- Not animated. Updates quietly every minute (not every second — seconds create urgency).

### 3. "I'm done" Action

- Positioned at the bottom
- **Not Terracotta.** The CTA energy belongs to the Commitment Surface. Here, the action should feel calm and available, not inviting.
- Visual treatment: Outlined or text-only. Deep Charcoal or Warm Charcoal. Subtle but findable.

### 4. Nothing Else

- No tips. No encouragement. No "keep going!" messages.
- No secondary actions. No menu. No navigation.
- Maximum negative space. Warmest Paper.

## System-State Behavior

### App Stays Open (Ambient)

The student keeps the app open while studying. The surface shows topic, elapsed time, and "I'm done". Screen may dim more aggressively than other surfaces (see Accessibility).

### App Backgrounded or Closed

When the student leaves the app (switches apps, locks phone, closes the app):

1. **Persistent notification** (if permission granted):
   - Content: "[Topic name] — tap when you're done"
   - Style: Standard system notification. Calm, factual. Not branded heavily.
   - Stays until the student taps it or returns to the app.

2. **Frame completion notification** (if frame was set):
   - When elapsed time passes the frame duration, the notification updates:
   - Content: "Your 20 minutes are up. Tap when ready."
   - Awareness, not an alarm. No sound. No vibration (unless OS default for the notification channel includes it).

3. **Returning to the app:**
   - **Tap notification:** Architecture layer resolves the close handoff. Student lands on Completion Surface.
   - **Direct app open:** Architecture layer resolves resume. Student returns to Active Study Surface in place.

### Notification Permission Denied

- No persistent notification appears.
- Student returns by opening the app directly.
- Resume behavior is unchanged: architecture resolves to Active Study if session is still in progress.
- **UX implication:** The product should not repeatedly prompt for notification permission. Ask once; if denied, continue without. The student can still use the app.

### Interrupted (App Killed, Device Restart)

- Exact behavior is an implementation decision. Architecture should define whether the session is considered "active" and resumable.
- **UX principle:** If the student returns and the session is still considered active, show Active Study. If not, resolve to Arrival. Do not show an error or "session lost" message unless unavoidable.

## Frame Completion Signal

When the student set a frame (e.g., "20 min") and the elapsed time reaches it:

- **App open:** The time display gently shifts — e.g., "12 min" → "20 min ✓" with the checkmark in Sage Green. No animation, no celebration. Just a quiet signal.
- **App closed:** The notification updates as described above.
- **What does NOT happen:** No alarm. No modal. No forced transition. No "time's up!" message. The student continues studying if they want to.

## Interaction Model

| Action | Result |
|--------|--------|
| Tap "I'm done" | Hands the student into the architecture-owned close transition → Completion Surface. |
| Tap notification ("tap when done") | Triggers the architecture-owned close handoff → Completion Surface. |
| Open app directly (mid-session) | Architecture resolves to Active Study. Student resumes in place. |
| System back | Back/exit semantics are owned by the transition model. |

## What This Surface Must Never Become

- A timer app with countdown pressure
- A surface with study tips, quotes, or encouragement
- A dashboard showing session stats in real-time
- A noisy management surface with options and settings
- A surface that interrupts the student at any point

## Accessibility

- **Focus order:** Topic → time → "I'm done". Minimal focusable elements.
- **Screen reader:** Topic name and elapsed time must be announced. "I'm done" must have clear accessible label.
- **Timer updates:** If the time updates every minute, ensure screen reader does not announce every update intrusively. Consider live region with "polite" or similar.
- **Screen dimming:** This surface may dim more aggressively than others, since the student is not looking at it. Ensure the student can still see "I'm done" when they glance. Respect system brightness and low-power settings.
- **Reduced motion:** No decorative motion. Time updates are static value changes, not animations.
- **Tap targets:** Minimum 44×44 pt for "I'm done".

## Visual Notes

- **Background:** Warmest possible Paper. Maximum calm.
- **Topic text:** Deep Charcoal, Structure Type. Centered. Present but not assertive.
- **Time text:** Warm Charcoal. Small. Quiet.
- **"I'm done":** Outlined or text-only. Not Terracotta. Not visually dominant.
- **Negative space:** This surface is mostly empty space. That emptiness is the design. Do not fill it.
- **Screen dimming:** Consider allowing the screen to dim more aggressively than other surfaces, since the student isn't looking at it while studying.

## Design Principle

This surface should feel like leaving a bookmark in a book — it marks your place, it doesn't demand your attention. If the student glances at their phone and sees this screen, they should feel calm, not pressured.
