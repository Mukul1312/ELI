# Counter Animation — The 3 → 2 Moment

> This is the single most important animation in the product. The counter drop IS the Closure beat. It must feel satisfying — like crossing something off a list — without being flashy. Every millisecond in this spec was chosen deliberately.

---

## 1. Why This Animation Matters

The entire product's retention mechanic — the Zeigarnik effect, the loop closure dopamine — is delivered through this one number changing. If the animation is:

- **Too fast**: feels mechanical, like a bug, no satisfaction
- **Too slow**: feels like loading, not reward
- **Too flashy (bounce, particle effects, confetti)**: breaks trust — feels like a game, not a serious study tool
- **Wrong color**: red/green scoring feel (bad) vs. neutral muted green confirmation (correct)

The target feel: **a quiet, solid confirmation.** Like hearing a lock click shut.

---

## 2. Standard Counter Drop (N → N-1)

Used in Scenarios A (verification completed), whenever `pendingChecks` goes from N to N-1 where N-1 ≥ 1.

### The number elements

```
Before animation:       During:              After:

  Pending checks            ↑                  Pending checks
  ────────────              │                  ────────────
      3               old fades out                2
                      new fades in
```

The counter displays two elements:
- **Old number** (before): will fade out + scale down
- **New number** (after): will fade in + scale up to rest

### Animation sequence (frame by frame)

```
t=0ms     → Screen renders. Phase 3 card fades in (see 03-phase3-scenarios.md transition).
t=200ms   → Short pause. Student sees the old number (3) for a beat. Anticipation.
t=200ms   → Old number begins exit:
              opacity: 1 → 0
              scale:   1.0 → 0.85
              duration: 160ms
              easing:  ease-in
t=340ms   → Old number is invisible.
t=340ms   → New number begins entrance:
              opacity: 0 → 1
              scale:   0.85 → 1.0
              duration: 200ms
              easing:  ease-out
t=540ms   → New number is at full opacity, resting at scale 1.0.
t=540ms   → Pulse: new number scales slightly up then back:
              scale: 1.0 → 1.06 → 1.0
              duration: 140ms
              easing:  ease-in-out
t=680ms   → New number fully settled.
t=680ms   → Color transition begins: number color shifts from --color-accent to --color-closed
              duration: 200ms
              (This gives it a brief "active" accent-colored moment, then settles to muted green)
t=880ms   → Color holds at --color-closed for 600ms.
t=1480ms  → Color returns to --color-text-primary (normal text color)
              duration: 400ms

Total: ~1900ms from first number exit to settled state.
```

### CSS implementation reference

```css
/* Old number exit */
@keyframes counterExit {
  from { opacity: 1; transform: scale(1.0); }
  to   { opacity: 0; transform: scale(0.85); }
}

/* New number entrance */
@keyframes counterEnter {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1.0); }
}

/* Pulse after settle */
@keyframes counterPulse {
  0%   { transform: scale(1.0); }
  50%  { transform: scale(1.06); }
  100% { transform: scale(1.0); }
}

.counter-old {
  animation: counterExit 160ms ease-in 200ms forwards;
}
.counter-new {
  animation:
    counterEnter 200ms ease-out 340ms forwards,
    counterPulse 140ms ease-in-out 540ms;
  /* color transitions handled via CSS transition on color property */
  transition: color 200ms ease;
}
```

### Typography during animation

The counter number uses `display` size from the type scale (28px, weight 500). This is the only place this size appears in Phase 3. The label "Pending checks" sits above it in 14px `--color-text-secondary`.

```
Pending checks      ← 14px, --color-text-secondary, weight 400
     3              ← 28px, --color-text-primary, weight 500 (animates)
```

After the animation settles:

```
Pending checks      ← unchanged
     2              ← settled, color: --color-text-primary
```

---

## 3. Milestone: Counter Hits 0 (N → 0)

Used in Scenario F (pending hits zero for the first time after clearing).

This is a different, more significant moment. The animation is the same sequence, but what happens after is distinct.

### Animation sequence

Same as standard drop EXCEPT:

```
t=680ms   → New number (0) is settled.
t=680ms   → Instead of transitioning to --color-closed, the 0 transitions to --color-accent
              duration: 200ms
t=880ms   → 0 holds in --color-accent for 400ms.
t=1280ms  → "0" fades out (opacity 1→0, 300ms).
t=1580ms  → "All clear." label fades in where the number was.
              font-size: 22px (greeting size), color: --color-closed, weight 500
              opacity 0→1, translateY 4px→0, 250ms ease-out
```

The number literally dissolves into the "All clear." label. The count is gone — because it reached zero. This visual transformation reinforces the milestone.

### The completed zero state

```
Pending checks          → "All clear." at greeting size
     0                      (number dissolved)
```

This only happens in Scenario F. In all other scenarios the number stays and holds `--color-closed`.

---

## 4. First Verification Ever (G variant)

Used in Scenario G — the student has never closed a loop before.

### Difference from standard

The counter drop is the same (`1 → 0`, since first verification = first pending check cleared). But the **label** above it changes:

```
Before:   "Pending checks"
After:    "First loop closed"   ← teaching moment label
```

The label swap happens simultaneously with the number exit:
- Old label ("Pending checks") fades out: 120ms
- New label ("First loop closed") fades in: 200ms, delayed 120ms

The student sees: "First loop closed" + counter drops from 1 to 0. The teaching moment is embedded in the animation itself, not just the copy.

---

## 5. Counter UP — New Loop Opened (Learn Sessions)

When a Learn session (new topic, first session) ends, the counter goes UP: `N → N+1`. A new pending check was created. This is not a reward — it is a promise: a loop was born, and a future Closure beat awaits.

### Animation sequence

Same mechanism as the standard drop, but with reversed visual direction and neutral treatment:

```
t=0ms     → Screen renders. Phase 3 card fades in.
t=200ms   → Short pause. Student sees the old number (2) for a beat.
t=200ms   → Old number begins exit:
              opacity: 1 → 0
              scale:   1.0 → 0.85
              duration: 160ms
              easing:  ease-in
t=340ms   → Old number is invisible.
t=340ms   → New number begins entrance:
              opacity: 0 → 1
              scale:   0.85 → 1.0
              duration: 200ms
              easing:  ease-out
              translateY: -4px → 0 (slides DOWN into place — opposite of the drop's upward feel)
t=540ms   → New number is at full opacity, resting at scale 1.0.
t=540ms   → NO pulse. The pulse is a closure reward; UP is not a reward.
t=540ms   → Color: stays at --color-text-secondary (neutral, not celebratory)
              No color transition — no accent, no --color-closed.

Total: ~540ms from first number exit to settled state (shorter than the DOWN animation).
```

### Key differences from counter DOWN

| Aspect | Counter DOWN (closure) | Counter UP (new loop) |
|---|---|---|
| Direction feel | Number drops in | Number slides down into place |
| Pulse | Yes (1.0 → 1.06 → 1.0) | No |
| Color accent | `--color-accent` → `--color-closed` → `--color-text-primary` | `--color-text-secondary` throughout |
| Total duration | ~1900ms | ~540ms |
| Feeling | Satisfying closure | Neutral acknowledgment |

### Component spec

The `loop-closed-counter` component gains a new variant:

```
variant: 'standard' | 'milestone' | 'first-ever' | 'new-loop'
```

| Variant | countBefore | countAfter | Special behavior |
|---|---|---|---|
| new-loop | N | N+1 | No pulse, no color accent, neutral copy |

---

## 6. What Is NOT Animated

These are deliberate non-animations. Adding them would break the "quiet confirmation" feel.

| Element | Why not animated |
|---|---|
| The "Loop closed." headline text | It appears with the card fade-in — no separate animation |
| The topic name | Static — it's a data point, not a reward |
| The Seed copy | Static — it's a whisper, not a reveal |
| The CTAs ("Done" / "Clear one more") | Appear with the card — no separate animation |
| The footer | Already visible from Phase 1 — no change in Phase 3 |
| Checkmark ✓ | Appears with card fade-in, no separate animation |
| Skip/reminder scenarios | No counter, no animation at all |

### No confetti, no particles, no fireworks

This was considered and explicitly rejected. The milestone at `→ 0` and the first verification use slightly warmer copy and the special label transition. That is enough. Celebration animations:
- Feel like a mobile game (breaks the "serious study tool" positioning)
- Create a high point that normal sessions can't match (makes non-milestone days feel flat)
- Cause S5 (Burnout) types to feel the absence of celebration acutely — "not special enough to try"

---

## 7. The "Clear One More" Re-Entry

When the student taps "Clear one more" (only shown if energy ≥ Good(4) AND pendingChecks ≥ 1 after clearing):

```
1. Current Phase 3 card fades out: opacity 1→0, 150ms
2. Verification ask screen fades in for the NEXT topic: 200ms fade + translateY 8px→0
3. Student verifies next topic
4. Phase 3 card fades in again for the new close
5. New counter drop animates (e.g., 2 → 1)
```

The counter drops again. The Closure beat fires a second time. This is the mini-loop that S7 (Ambitious Collector) types naturally want on high-energy days.

### Counter on second close

Second counter drop uses the exact same animation sequence. If the student clears a second check and goes from 2 → 1, they see the drop again. Each drop is equally satisfying.

---

## 8. Accessibility

```
@media (prefers-reduced-motion: reduce) {
  .counter-old,
  .counter-new {
    animation: none;
    transition: none;
  }
  /* Just swap numbers instantly */
  .counter-old { display: none; }
  .counter-new { opacity: 1; transform: none; }
}
```

With reduced motion: old number disappears instantly, new number appears instantly. No transitions. The color progression (→ `--color-closed`) still applies but without duration (instant swap).

---

## 9. Counter Component Spec

```
Component: loop-closed-counter
Props:
  countBefore:    number    — the number before verification (e.g., 3)
  countAfter:     number    — the number after (e.g., 2)
  variant:        'standard' | 'milestone' | 'first-ever' | 'new-loop'
  autoPlay:       boolean   — starts animation on mount (default: true, after 200ms delay)
```

### Variant behavior map

| Variant | countBefore | countAfter | Special behavior |
|---|---|---|---|
| standard | N | N-1 | Standard drop, color → `--color-closed` |
| milestone | N | 0 | Number dissolves into "All clear." label |
| first-ever | 1 | 0 | Label changes to "First loop closed" simultaneously |
| new-loop | N | N+1 | No pulse, no color accent, neutral feel (see §5) |

---

*Next: [03-phase3-scenarios.md](03-phase3-scenarios.md) — all 7 Phase 3 close screens.*
