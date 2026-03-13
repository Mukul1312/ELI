# "Your Week" Footer + Identity Moments

This document covers the two quietest, most powerful surfaces in the student experience: the weekly footer and the identity moment card. Neither is a dashboard. Neither demands attention. Both exist to reflect back what the student has already done — and to name who they are becoming.

---

## Part 1: The Footer

This is the **entire** student dashboard. Not a page. Not a strip. A collapsible one-line footer visible at the bottom of Phase 1 and Phase 3. It exists so the student never has to ask "how am I doing?" — but also never has to look if they don't want to.

### Collapsed (default — always starts here)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              [ Phase 1 or Phase 3 ]              │
│                                                  │
├──────────────────────────────────────────────────┤
│ This week: 4 sessions · 2 loops closed · energy ↑│
└──────────────────────────────────────────────────┘
```

### Expanded (on tap)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              [ Phase 1 or Phase 3 ]              │
│                                                  │
├──────────────────────────────────────────────────┤
│  Your week                                       │
│  ──────────────────────────────                  │
│  Sessions        4                               │
│  Loops closed    2                               │
│  Pending         1                               │
│  Rate            78%                             │
│  Pattern         Consistent ↑                    │
│                                                  │
│  "You're not just studying —                     │
│   you're closing the loop."                      │
└──────────────────────────────────────────────────┘
```

### Footer Rules

| Rule | Detail |
|---|---|
| Always collapsed by default | Never auto-expanded; not even after milestone |
| No charts or graphs | Numbers only; coarse trend labels (`↑` / `→` / `↓`) |
| No per-topic breakdown | Aggregate only; privacy-safe |
| Identity statement is always last | The statement is the point — numbers are supporting evidence |
| Footer hidden during identity moment card | When identity card is showing, footer is redundant |
| After silence re-entry | Footer shows warm label ("Quiet week. That's okay.") instead of numbers |
| After first-ever open | Footer shows nothing or "Your first week starts now." |

### Data Sources

| Footer element | Source | DB field |
|---|---|---|
| Sessions | SessionEnd events in last 7 days | count from `ei_events` |
| Loops closed | RetrievalVerified + VerificationCompleted in 7d | count from `ei_events` |
| Pending | Current pending checks | `ei_student_aggregates.pending_checks` |
| Rate | Verification rate | `ei_student_aggregates.verification_rate_7d` (shown as %) |
| Pattern | State trend | `ei_student_aggregates.state_trend_7d` → translated label |
| Identity statement | Derived from signal combination | See Part 2 below |

### Pattern Label Translation

| `state_trend_7d` value | Collapsed label | Expanded label |
|---|---|---|
| `improving` | `energy ↑` | `Consistent ↑` |
| `flat` | `steady` | `Steady →` |
| `worsening` | `quieter stretch` | `Tougher stretch ↓` |

### When Numbers Are Hidden

If `silenceDays >= 3` (student just returned from silence), the footer shows a warm label instead of numbers:

> "Quiet week. That's okay."

This is because showing "Sessions: 0, Loops closed: 0" to a student who just came back is the opposite of helpful. The system acknowledges the gap without quantifying it.

---

## Part 2: Identity Moments

Once per week (or when a behavioral pattern-shift is first detected), Phase 1 opens with a special variant card that **replaces** the normal greeting. This is not a reward. It is a mirror.

### Trigger Conditions

All must be met:

1. `verification_rate_7d` >= 0.70 (student is closing loops)
2. `pending_checks` <= 2 (not in active debt)
3. Student has had >= 4 sessions in the last 7 days (enough data)
4. No identity card shown in the last 7 days (rate-limited)

### Statement Selection Logic

| Signal pattern | Identity statement | Detection |
|---|---|---|
| **Silence-resolved** (S5 pattern) | "You came back. That matters." | `silenceDays` was >= 3 in the previous 14 days AND student now has >= 4 sessions in last 7 days |
| **Pressure-resolved** (S2 pattern) | "Pressure days don't break you anymore — you still start." | Student had >= 2 sessions where pressure >= 4 AND still completed verification in those sessions |
| **Integrity-consistent** (S7 pattern) | "You're not just studying — you're closing the loop." | `verification_rate_7d` >= 0.75 AND `pending_checks` decreased over the last 7 days |
| **Technique-improved** (S6 pattern) | "You're studying differently now. It shows." | TaskType shifted from predominantly `learn` to `practice`/`revise` over 14 days |
| **Generic improvement** (fallback) | "Consistency is harder than intensity. You're proving that." | Meets trigger conditions but no specific pattern detected |
| **Zero pending milestone** | "Everything you've studied, you've also proved." | `pending_checks` = 0 AND >= 3 sessions in last 7 days |

### Selection Priority

Silence-resolved > Pressure-resolved > Integrity-consistent > Technique-improved > Zero-pending > Generic

If multiple patterns are detected in the same week, only the highest-priority one is shown.

### Identity Moment Card Design

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  This week:                                      │
│                                                  │
│  You studied 5 topics.                           │
│  You proved recall on 4.                         │
│                                                  │
│  "You're not just studying —                     │
│   you're closing the loop."                      │
│                                                  │
│            [ Let's keep going ]                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Card Design Rules

- Statement is the only bold/emphasized element — never the stats
- Stats are 2 lines only, plain text, factual
- One CTA only ("Let's keep going" or "Ready when you are")
- After tapping CTA, normal Phase 1 flow resumes (greeting + actions)
- Footer is hidden while identity card is showing (redundant)

### Frequency Rules

| Rule | Detail |
|---|---|
| Maximum once per 7 days per student | Hard limit, no exceptions |
| Quick dismiss still counts | If the student dismisses it in < 2 sec, still counts as shown (don't re-show) |
| One pattern per week | If the student earns multiple patterns in one week, show only the highest priority one |
| Never show on silence re-entry | That session needs the warm welcome, not an identity card |

---

## Why This Matters

The footer and the identity moment card are doing the same job from opposite directions. The footer is passive — it sits there, available, never demanding. The identity card is active — it interrupts the normal flow once a week to say something the student won't say to themselves.

Neither surface gamifies. Neither rewards. Both reflect. The footer reflects what happened. The identity card reflects who the student is becoming. Together they close the loop between behavior and belief.

---

Next: [escalation-arc.md](./escalation-arc.md)
