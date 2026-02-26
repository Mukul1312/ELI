# Anti-Patterns — What This Design Rules Out

Every pattern below has been considered and rejected. This is not a list of "bad ideas" -- many of these are standard in productivity apps. They are ruled out because they damage the specific trust relationships this product depends on.

---

## 1. Separate Dashboard Page

**What it is:** Student navigates to `/dashboard` to see stats, charts, and progress summaries on a dedicated page.

**What it looks like if you build it:** A route at `/dashboard` with weekly charts, topic breakdowns, time-spent graphs, and a "motivation" section. Student bookmarks it. Opens it instead of studying.

**Archetype hurt most:** S5 (Burnout Risk) -- uses the dashboard to procrastinate ("I'll just check my stats first") and then feels worse when the numbers confirm a bad week.

**Correct alternative:** "Your Week" collapsible footer on the existing single screen. See [08-footer-and-identity.md](./08-footer-and-identity.md). No separate page. No separate route.

---

## 2. Persistent Stats Strip

**What it is:** An always-visible bar showing pending count, verification rate, and streak at the top or bottom of every screen.

**What it looks like if you build it:** A fixed header: `Pending: 4 | Rate: 62% | Streak: 3 days`. Visible during Phase 1, Phase 2, and Phase 3. Never dismissible.

**Archetype hurt most:** S2 (Revenge Planner) -- becomes a metric-watcher. The numbers without context increase anxiety. "62%? I need to get to 90%." Overscoping returns.

**Correct alternative:** Collapsed footer, expanded on tap only. Numbers are always available but never forced. See [08-footer-and-identity.md](./08-footer-and-identity.md) Part 1.

---

## 3. Charts and Graphs

**What it is:** Weekly trend lines, bar charts, or any visual data representation of student performance.

**What it looks like if you build it:** A line graph showing verification rate over 4 weeks. A bar chart of sessions per day. A heat map of active days.

**Archetype hurt most:** S5 (Burnout Risk) -- sees a downward trend line after a silence period and interprets it as irreversible failure. Uninstalls.

**Correct alternative:** Coarse labels only (`↑` / `→` / `↓`), single-word patterns ("Consistent", "Quieter stretch"). See [08-footer-and-identity.md](./08-footer-and-identity.md) for pattern label translation.

---

## 4. Streak Counters

**What it is:** A visible counter showing consecutive days of activity, with a "broken" state when the student misses a day.

**What it looks like if you build it:** "7-day streak!" with a flame icon. Student misses one day. Opens the app. Sees "0 days" and a grey icon.

**Archetype hurt most:** S5 (Burnout Risk) -- returns after 3 days of silence and sees "0 days." The streak they built is gone. The app just told them their progress was erased. Uninstall.

**Correct alternative:** Never show streaks. The identity moment replaces streaks -- it reflects real behavioral change, not consecutive-day counting. See [08-footer-and-identity.md](./08-footer-and-identity.md) Part 2.

---

## 5. "You Missed X Days"

**What it is:** Any reference to silence duration in the student-facing UI.

**What it looks like if you build it:** "You haven't opened the app in 3 days." Or: "It's been a while! Let's get back on track." Or even: "We missed you!"

**Archetype hurt most:** S5 (Burnout Risk) -- reads "You haven't opened the app in 3 days" and hears "You failed for 3 days." Shame response activates. Re-entry becomes harder, not easier.

**Correct alternative:** "Welcome back." Period. No reference to duration. No "we missed you." No time-since-last-session. See [10-microcopy-bible.md](./10-microcopy-bible.md) for silence re-entry copy rules.

---

## 6. Push Notifications Referencing Failures

**What it is:** Notifications that mention overdue items, missed verifications, or declining metrics.

**What it looks like if you build it:** "You haven't verified Thermodynamics since Tuesday." Or: "Your pending checks are piling up -- come back and clear them!"

**Archetype hurt most:** S5 (Burnout Risk) and S2 (Revenge Planner) -- both read failure-referencing notifications as judgment. S5 mutes notifications entirely. S2 spirals into guilt-driven overscoping.

**Correct alternative:** No failure-referencing notifications. Only 24h reminders for self-set commitments: "Thermodynamics -- you asked for a reminder." The student set it; the system honors it. Nothing else.

---

## 7. Auto-Expanded Footer After Silence

**What it is:** When the student returns after a silence period, the footer auto-expands to show their stats for the week.

**What it looks like if you build it:** Student opens the app after 4 days. Footer slides up: "Sessions: 0, Loops closed: 0, Rate: --." The numbers confirm what they already feared.

**Archetype hurt most:** S5 (Burnout Risk) -- the auto-expansion forces confrontation with zero-state numbers at the worst possible moment (re-entry). The warm greeting above is undermined by the cold numbers below.

**Correct alternative:** Footer shows a warm label ("Quiet week. That's okay.") instead of numbers after silence. Always collapsed by default -- especially after silence. See [08-footer-and-identity.md](./08-footer-and-identity.md) "When Numbers Are Hidden."

---

## 8. Numbers Before Identity Statement

**What it is:** In the weekly identity card or expanded footer, statistics appear above the identity statement.

**What it looks like if you build it:** The expanded footer reads: "Rate: 78% | Sessions: 4 | Loops: 2" and then below: "You're closing the loop." The student sees 78% and judges themselves before reading the statement.

**Archetype hurt most:** All archetypes, but especially S2 (Revenge Planner) -- any number below their self-imposed target becomes the focus. The identity statement is never read.

**Correct alternative:** Identity statement first, always. Numbers are supporting evidence, not the headline. See [08-footer-and-identity.md](./08-footer-and-identity.md) Part 2, Card Design Rules.

---

## 9. Gamification (Badges, Points, Leaderboards)

**What it is:** Any extrinsic reward system -- XP, badges, achievements, points, ranks, or leaderboards.

**What it looks like if you build it:** "You earned the Loop Closer badge!" "Level up: Study Warrior!" "Top 10% this week!"

**Archetype hurt most:** S1 (Topper) -- badges feel childish and beneath them. S5 (Burnout Risk) -- any system that tracks "achievements" creates a failure state when achievements stop. S7 (Ambitious Collector) -- will game the badge system instead of actually closing loops.

**Correct alternative:** Identity statements that reflect real behavioral change. Not rewards, mirrors. "You're studying differently now. It shows." -- this is earned, not awarded. See [08-footer-and-identity.md](./08-footer-and-identity.md) Part 2.

---

## 10. Free-Text Skip Reasons

**What it is:** When a student skips a verification, a text field asks "Why did you skip?"

**What it looks like if you build it:** A modal after tapping Skip: "Help us understand -- why are you skipping?" with a free-text input.

**Archetype hurt most:** S5 (Burnout Risk) -- the question "why?" implies skipping needs justification. Also creates a privacy risk: raw text could leak to the institute admin view, exposing personal struggles.

**Correct alternative:** 3 fixed reasons (Time / Fatigue / Confusion), single tap. No free text. No "why." The tap is data; the student is not interrogated. See [07-phase3-the-close.md](./07-phase3-the-close.md) for skip flow.

---

## Summary Table

| Anti-pattern | Core violation | Hurt archetype | Alternative |
|---|---|---|---|
| Dashboard page | Creates procrastination surface | S5 | Collapsible footer |
| Persistent stats | Forces number confrontation | S2 | Collapsed footer, tap to expand |
| Charts/graphs | Visual failure confirmation | S5 | Coarse labels (`↑`/`→`/`↓`) |
| Streak counters | Binary success/failure state | S5 | Identity moments |
| "You missed X days" | Quantifies silence as failure | S5 | "Welcome back." |
| Failure notifications | External shame trigger | S5, S2 | Self-set reminders only |
| Auto-expanded footer | Forces zero-state confrontation | S5 | Warm label on silence re-entry |
| Numbers before identity | Buries meaning under metrics | All (esp. S2) | Statement first, always |
| Gamification | Extrinsic crowds out intrinsic | S1, S5, S7 | Identity statements |
| Free-text skip | Privacy risk + interrogation feel | S5 | 3 fixed reasons, single tap |

---

Next: [13-implementation-map.md](./13-implementation-map.md)
