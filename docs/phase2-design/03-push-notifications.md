# Push Notifications — The App's Voice When Closed

> A push notification is the only moment the app speaks without being asked. That privilege must be used sparingly. Every notification must earn its place by creating the Anticipation beat — not adding anxiety. If the student reads the notification and feels pressure instead of curiosity, it has failed.

---

## Design Philosophy

Push notifications in this product follow the same copy rules as the app itself:

- **No shame language.** Never quantify what the student hasn't done.
- **Specific, not vague.** A topic name, a count, a time — never "you should study."
- **Person, not system.** Written like ELI speaking, not like a system alert.
- **Invitation, not obligation.** The student can ignore every notification without consequence. The tone must reflect that.

---

## Notification Types in Scope (v1)

| Type | Trigger | Craving loop beat served |
|---|---|---|
| **1. Verification Reminder** | Student deferred ("Remind me tomorrow") | Anticipation (Beat 1) |
| **2. Silence Re-Entry Nudge** | `silenceDays >= 2` | Anticipation (Beat 1) |
| **3. Student Schedule Miss** | Scheduled retrieval window passed, no open | Anticipation (Beat 1) |

All three serve the same beat. The difference is context and urgency level.

---

## Type 1 — 24h Verification Reminder

### What it is

The student ended a session, saw the verification ask, and tapped "Remind me tomorrow." The system promised to remind them. This notification honours that promise.

This is the highest-trust notification in the product. The student asked for it. It should feel like exactly what was promised — no more, no less.

### Trigger

`VerificationDecisionIssued(ScheduleVerify, dueInHours: 24)` was fired for this student + topic.

### When it sends

24 hours after the reminder was set, ±15 minute delivery window. If the student has already opened the app and completed the verification in that window, the notification is cancelled.

### Deep-link

Tapping the notification opens the app **directly to the verification ask screen** for that specific topic. The student does not land on Phase 1 and hunt for the topic — they land exactly where they said they would be.

If the student swipes away without tapping, on next app open Phase 1 surfaces that topic at the top of the pending items list with a `scheduled` badge.

### Copy

**Standard session context:**

| Element | Copy |
|---|---|
| Title | "[Topic name] is waiting." |
| Body | "1 question. 2 minutes. You said today." |

**Rescue mode session (session was in Rescue mode when reminder was set):**

| Element | Copy |
|---|---|
| Title | "[Topic name]." |
| Body | "Quick check when you're ready." |

**Long session (> 45 min when reminder was set):**

| Element | Copy |
|---|---|
| Title | "[Topic name] — you put in the work." |
| Body | "One question to make it stick." |

**Multiple deferred topics (2+ topics have 24h reminders due today):**

| Element | Copy |
|---|---|
| Title | "[Topic name] + [N] more waiting." |
| Body | "Clear 1 today." |

Deep-link for the multi-topic case: lands on Phase 1 with pending items list surfaced, sorted by scheduled due date.

### Copy rationale

- "You said today" — references the student's own decision (not ELI's demand). This is the student honoring their own word, not obeying the app.
- "1 question. 2 minutes." — the entire activation energy cost is stated upfront in the notification itself. Before they even open the app, they know the ask is tiny.
- No exclamation marks. No urgency emoji. No "Don't forget!"

---

## Type 2 — Silence Re-Entry Nudge

### What it is

The student has not opened the app for 2+ days. This is the silence that the craving loop exists to prevent. The notification plants the Anticipation beat from the outside — before the student even opens the app.

This is the most sensitive notification. The student may be burned out, overwhelmed, or just busy. The tone must be warmer and more patient with each passing day.

### Trigger

`silenceDays >= 2` at the daily evaluation window.

### When it sends

**4:00 PM – 6:00 PM local time.** This is the highest-probability study window for JEE/NEET students — between coaching sessions and dinner. Avoid morning (overwhelm at the start of a full day) and evening/night (adds pressure when rest is needed).

One notification per 24-hour window maximum. If sent today, not sent again until tomorrow's evaluation.

### Deep-link

Tapping opens the app to **Phase 1 with the Silence Re-Entry variant (V1) pre-loaded.** The greeting "Hey. No speeches." fires immediately. The student does not see a generic home screen — they land in the state designed specifically for their re-entry moment.

### Copy by silence depth

| `silenceDays` | Title | Body | Rationale |
|---|---|---|---|
| 2 | "Still there?" | "One small thing. 5 minutes." | Low-key check-in. Student may just have been busy. |
| 3 | "Hey." | "No speeches. Just one small thing." | Mirrors the Phase 1 V1 greeting — consistent voice, low bar |
| 4 | "Hey." | "When you're ready. No pressure." | Backs off further. Student has been silent a while; more pressure would push them away. |
| 5+ | *(no notification)* | — | At 5+ days, a notification adds anxiety without helping. Human escalation triggers at the system level instead (Level 3 of the Async Banker protocol). |

**Key rules:**
- Never say "you haven't studied in X days." Counting the gap quantifies the failure.
- Never say "your pending checks are waiting" — adding guilt to silence is the fastest way to uninstall.
- The tone degrades to near-silence as the gap grows. By day 4, the notification is barely there — a whisper, not a knock.

### What happens if the student ignores day-2 and day-3 notifications

The system does not escalate the notification tone. Day-4 copy is *gentler* than day-3, not more urgent. The product does not punish ignoring notifications with louder follow-ups.

---

## Type 3 — Student Schedule Miss

### What it is

The student (or the P3 gate) scheduled a retrieval for a specific time, and that time has passed without the student opening the app. Unlike the 24h reminder (which the student explicitly requested), this is a system-generated schedule — the student may not have been aware of the specific time.

This notification is therefore softer than Type 1. It is a heads-up, not a reminder of a personal promise.

### Trigger

A `RetrievalSchedule` event was fired for this student + topic (from P3 gate output), the scheduled window has passed by 2+ hours, and no `AppOpen` has occurred since the scheduled time.

The 2-hour buffer is intentional — the student may be mid-session in a coaching class. Fire too soon and it feels like surveillance.

### When it sends

Between 10:00 AM and 8:00 PM only. Never outside those hours. If the 2-hour window would land outside those hours, delay until the next applicable window.

### Deep-link

Tapping opens the app to **Phase 1 with the overdue topic surfaced at the top of the pending items list.** The topic is not pre-selected — the student still controls whether to clear it now or defer.

### Copy

**Single topic overdue:**

| Element | Copy |
|---|---|
| Title | "[Topic name] — you scheduled this." |
| Body | "Still works today. 1 question." |

**Single topic, 2nd consecutive miss:**

| Element | Copy |
|---|---|
| Title | "[Topic name]." |
| Body | "It's been [N] days since you studied it." |

**Multiple topics overdue (2+):**

| Element | Copy |
|---|---|
| Title | "[Topic name] and others." |
| Body | "Clear 1 today when you're ready." |

**Copy rules:**
- "Still works today" — normalizes the delay. The schedule missed doesn't mean it's too late.
- "You scheduled this" — attributes the plan to the student's own intent, not ELI's judgment.
- For the 2nd consecutive miss, using the day count ("It's been 3 days") is allowed — it's factual, not shaming, and creates mild urgency without guilt.

---

## Shared Rules Across All Types

### Quiet hours

| Window | Behaviour |
|---|---|
| 10:00 PM – 7:00 AM | **No notifications sent.** If a trigger fires in this window, it queues and sends at 7:00 AM. |
| 7:00 AM – 10:00 AM | Only Type 1 (Verification Reminder) allowed — if 24h window lands here. No silence nudges or schedule miss in the early morning. |

### Daily volume cap

**Maximum 2 notifications per student per day.** If a student has a Type 1 reminder AND a Type 3 schedule miss due on the same day, only the Type 1 fires. Type 1 takes priority.

If a silence nudge (Type 2) fires, no other notification fires that day.

| Priority order | Type |
|---|---|
| 1 (highest) | Type 1 — Verification Reminder (student explicitly requested) |
| 2 | Type 2 — Silence Re-Entry Nudge (engagement risk) |
| 3 | Type 3 — Student Schedule Miss (system-generated schedule) |

### Active session hold

If a student is in Phase 2 (active session detected via recent `ActivationPlanIssued` with no `SessionEnd`), **hold all notifications** until `SessionEnd` fires. Never interrupt a student who is currently studying.

### No in-notification actions (v1)

Notifications are tap-to-open only. No inline reply, no "Done" button, no action chips inside the notification. The action happens in the app, not in the notification tray. This is simpler to implement and keeps the full interaction context (Phase 3, verification ask) intact.

### Notification deduplication

Never send the same notification type for the same topic within a 24-hour window. If the student ignores a Type 1 reminder for "Integration" at 3pm, do not resend it at 8pm. One send per topic per day.

---

## Component Spec

```
Component: push-notification
Props:
  type:       'verification_reminder' | 'silence_reentry' | 'schedule_miss'
  topic:      string | null          — topic name if applicable
  mode:       'rescue' | 'neutral'   — session mode context for Type 1
  sessionLen: 'short' | 'standard' | 'long'  — for Type 1 copy variant
  silenceDays: number                — for Type 2 copy selection
  missCount:  number                 — for Type 3 (1st miss vs 2nd miss copy)
  deepLink:   string                 — route to open on tap
```

### Deep-link routing summary

| Type | Condition | Landing screen |
|---|---|---|
| Type 1 — single topic | Standard | Verification ask for that topic (skip Phase 1) |
| Type 1 — multi-topic | 2+ topics due | Phase 1, pending list surfaced, sorted by due date |
| Type 2 — silence | Any | Phase 1 with V1 (Silence Re-Entry) variant forced |
| Type 3 — schedule miss | Single | Phase 1, overdue topic at top of pending list |
| Type 3 — schedule miss | Multiple | Phase 1, pending list surfaced |

---

## Copy Quick Reference

| Type | Title | Body |
|---|---|---|
| Reminder — standard | "[Topic] is waiting." | "1 question. 2 minutes. You said today." |
| Reminder — rescue mode | "[Topic]." | "Quick check when you're ready." |
| Reminder — long session | "[Topic] — you put in the work." | "One question to make it stick." |
| Reminder — multi-topic | "[Topic] + [N] more waiting." | "Clear 1 today." |
| Silence — day 2 | "Still there?" | "One small thing. 5 minutes." |
| Silence — day 3 | "Hey." | "No speeches. Just one small thing." |
| Silence — day 4 | "Hey." | "When you're ready. No pressure." |
| Schedule miss — 1st | "[Topic] — you scheduled this." | "Still works today. 1 question." |
| Schedule miss — 2nd | "[Topic]." | "It's been [N] days since you studied it." |
| Schedule miss — multi | "[Topic] and others." | "Clear 1 today when you're ready." |

---

*Sprint 3 design complete. Phase 2 (activation entry + active session) and push notifications are now fully specced.*
