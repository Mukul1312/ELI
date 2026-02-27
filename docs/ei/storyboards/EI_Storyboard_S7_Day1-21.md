# **EI Product Storyboard — S7 (Ambitious, but “Pending checks” pile up) — Day 1 to Day 21**

This is a **product-readable** storyboard for a single student journey (S7), written in student language.

- **Scale meanings + notation**: see `EI_UX_Scales.md` (use **Label (Number)** everywhere)
- **Gates used**: `AppOpen` → `IntentSet` → `SessionEnd`

**Pending checks** (student term): things you studied but haven’t tested yet.

---

## **Student snapshot**

- High energy, ambitious, likes starting new topics
- The trap: keeps saying “I’ll check later” → pending checks grow → recall suffers later

---

## **Storyboard (12 scenes spanning Day 1 → Day 21)**

### **Scene 1 — Day 1: “I’m ready, let’s start big”**
- **Where**: at desk after coaching
- **`AppOpen` (taps)**:
  - `Energy: Sharp (5)`
  - (Once/day add-on) `Sleep: Fully slept (>=8h)`
- **`IntentSet` (chooses)**:
  - `Topic: Integration`
  - `TaskType: Learn (learn)`
  - `DifficultyTier: Hard (3)`
- **`SessionEnd` (ELI asks)**: “Quick check so this session counts.”
- **Buttons**:
  - `Do 1 question now (2 min)`
  - `Remind me later`
  - `Skip (Reason)`
- **Student taps**: `Remind me later` (defers)
- **What changes**: `Pending checks: 1`

### **Scene 2 — Day 2–3: “Busy day, still moving fast”**
- **Where**: evening self-study, excited to “cover more”
- **`AppOpen` (taps)**:
  - `Energy: Good (4)` (Day 2), `Energy: Sharp (5)` (Day 3)
  - (No extra questions asked today)
- **`IntentSet`** (repeats new-topic behavior):
  - `TaskType: Learn (learn)`
  - `DifficultyTier: Hard (3)`
- **`SessionEnd`**: student keeps choosing `Remind me later`
- **Visible state**: `Pending checks: 3`
- **Student feeling**: “I studied a lot” (but hasn’t proved recall)

### **Scene 3 — Day 4: First honest mirror**
- **Where**: opens app to start another new topic
- **`AppOpen`**:
  - `Energy: Sharp (5)`
  - (Conditional add-on) ELI asks: `BacklogPressure: Some pending (3)` (student picks)
- **ELI message (elder-brother tone)**:
  - “You’re working hard. But you have **3 pending checks**. That’s why recall starts feeling shaky.”
- **Buttons**:
  - `Clear 1 pending check first (5–8 min)`
  - `Start new topic anyway`
- **Student taps**: `Start new topic anyway` (habit is strong)

### **Scene 4 — Day 5: Gentle constraint (protect ambition)**
- **Where**: evening study
- **`AppOpen`**: `Energy: Sharp (5)`
- **`IntentSet`**:
  - Student selects a fresh topic again
- **ELI message**:
  - “Deal: **clear 1 pending check first**, then go big.”
- **Buttons**:
  - `Clear oldest check now`
  - `Clear one check tomorrow (24h reminder)`
- **Student taps**: `Clear oldest check now`

### **Scene 5 — Day 5 (same day): The “tiny check” moment**
- **`SessionEnd`**:
  - ELI: “Before you close: **1 question**. That’s it.”
- **Buttons**:
  - `Do 1 question now (2 min)` (default)
  - `Remind me tomorrow (24h)`
  - `Skip (Reason)`
- **Student taps**: `Do 1 question now (2 min)`
- **Visible state**: `Pending checks` stops growing and starts shrinking.

### **Scene 6 — Day 6–7: Reminders become shorter (24h)**
- **Where**: time-crunched weekdays
- **`AppOpen`**:
  - `Energy: Good (4)` (Day 6), `Energy: Okay (3)` (Day 7)
- **ELI behavior**:
  - If student tries `Remind me later`, ELI frames it as: “Tomorrow (24h), while memory is warm.”
- **Buttons at `SessionEnd`**:
  - `Do 1 question now (2 min)`
  - `Remind me tomorrow (24h)`
  - `Skip (Reason)`
- **Visible state**: `Pending checks: 2–3` (bounded, not exploding)

### **Scene 7 — Day 8–10: New routine forms (clear 1, then build)**
- **Where**: weekend + early week
- **`AppOpen`**: `Energy: Sharp (5)`
- **ELI shows a simple two-step card**:
  - Step 1: “Clear 1 pending check (5 min)”
  - Step 2: “New topic / hard practice (timeboxed)”
- **`IntentSet`**:
  - `TaskType: Practice (practice)`
  - `DifficultyTier: Hard (3)`
- **Student feeling**: “I’m still ambitious, but now my work converts.”

### **Scene 8 — Day 11–12: Time crunch without breaking trust**
- **Where**: short study window before sleep
- **`AppOpen`**:
  - `Energy: Okay (3)`
  - (Optional) student taps “More context”: `Pressure: Uneasy (3)`
- **`SessionEnd`**: ELI keeps the ask tiny.
- **Buttons**:
  - `Do 1 question now (2 min)`
  - `Remind me tomorrow (24h)`
  - `Skip (Time | Fatigue | Confusion)`
- **If student skips**:
  - they must choose one reason (no free-form)
  - ELI keeps tone calm and suggests a smaller scope at the next start—ELI does not assign tasks or manage the calendar.

### **Scene 9 — Day 14: Light personalization (same scale, clearer meaning)**
- **Where**: opens app after a good streak
- **`AppOpen`**: `Energy: Sharp (5)`
- **UI micro-hint (example)**:
  - “When you pick **Sharp (5)**, you do best with **1 pending check first**, then hard work.”
- **Note**: personalization is only in hints; the scale meanings stay the same.

### **Scene 10 — Day 15: Weekly check-in becomes 2 simple rules**
- **Where**: evening start
- **ELI sets two plain rules for the week** (no engine terms):
  - “Keep **pending checks ≤ 2**.”
  - “New topic comes **after** you clear 1 pending check today.”
- **Note**: These are two guardrails, not a full weekly plan—ELI does not become a task manager or calendar.
- **Student response**: “Fair. That’s not pressure, that’s structure.”

### **Scene 11 — Day 16–18: Autonomy returns (fewer prompts)**
- **Where**: normal weekdays
- **`AppOpen`**: `Energy: Good (4)` most days
- **ELI behavior**:
  - Stops “blocking” and mostly nudges only at `SessionEnd`
  - Lets the student pick `DifficultyTier: Hard (3)` / `Advanced (4)` more often when checks stay bounded

### **Scene 12 — Day 21: Outcome snapshot**
- **Where**: end of week reflection
- **What the app shows (student-facing)**:
  - `Pending checks: 1–2` (bounded)
  - “You’re not just studying—you’re closing the loop.”
- **Student feeling**:
  - Less guilt (“I did a lot but forgot”) → more clarity (“I can recall, I’m improving”)

---

## Notes (for product/design)

- Use the term **Pending checks** consistently; keep internal metric names out of student-facing copy.
- Always write state taps using `EI_UX_Scales.md` notation: **Label (Number)**.
- Keep end-of-session proof small (often 1 question) to protect compliance and trust.

