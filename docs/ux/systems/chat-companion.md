# ELI Chat — The Conversation Layer

> **Implementation status: Maybe Never.** This feature is deferred per the [usable-to-lovable roadmap](../../product-audit/05-usable-to-lovable-roadmap.md). The Phase 1/3 structured flow may be sufficient — chat is a large surface area to design and maintain for a single founder. The design below is preserved as the spec IF observed student behavior demonstrates that template greetings + pattern claim tiers are insufficient for the Recognition beat at scale. Validate need before building.

> The craving loop's Recognition beat has a ceiling when powered only by pre-composed greetings. A student who can have a real conversation with ELI — about their own sessions, patterns, and plans — develops a relationship that no greeting card can create. This document specifies that conversation surface: what it is, what ELI can and cannot say, how it looks, and how it connects to the rest of the product.

---

## 1. What This Surface Is

A student-initiated full-screen bottom sheet that slides up from the footer. The student talks to ELI in free text. ELI responds with data-grounded, behaviorally-aware answers drawn from the student's actual record.

**Three things ELI does in chat:**
1. **Reflects progress** — surfaces what the student's data actually says ("4 sessions this week, 2 loops closed, Thermodynamics untouched for 9 days")
2. **Helps plan** — recommends what to study and in what order based on recency, pending checks, energy pattern, and time
3. **Processes difficulty** — responds to overwhelm, mock results, and exam anxiety with behavioral framing and the smallest possible next step

**One thing ELI never does in chat:**
- Answers content questions (explanations, concept walkthroughs, practice question generation). When a student asks "explain integration by parts to me", ELI redirects — not dismissively, but specifically: *"That's your textbook and teacher's job. Tell me what happened when you tried studying it — how many sessions, did anything click, did you try the verification?"*

---

## 2. Entry Point — Footer → Bottom Sheet

The footer (currently "Your Week" stats) becomes the entry point for chat. The collapsed footer line remains unchanged. Tapping anywhere on the footer opens the chat bottom sheet.

### Footer collapsed (unchanged from current design)

```
─────────────────────────────────────────────────────
 This week: 4 sessions · 2 loops closed · energy ↑   ↑
─────────────────────────────────────────────────────
```

The `↑` arrow indicates the sheet can be opened. No "Talk to ELI" label needed — the footer is already a familiar tap surface.

### Bottom sheet opens (slides up from footer, ~90% screen height)

```
┌──────────────────────────────────────────────────────┐
│  ELI                                            ✕    │  ← header strip, close button
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  4 sessions this week. 2 loops closed.         │  │  ← ELI opens (never blank)
│  │  Thermodynamics hasn't been touched in 9       │  │
│  │  days. What's on your mind?                    │  │
│  └────────────────────────────────────────────────┘  │
│  ELI                                                 │
│                                                      │
│                                                      │
│                                                      │
│                                ┌──────────────────┐  │
│                                │ What should I    │  │  ← student message
│                                │ study tomorrow?  │  │
│                                └──────────────────┘  │
│                                             You      │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Given 9 days on Thermodynamics and your       │  │  ← ELI response
│  │  energy pattern (usually Good on evenings) —   │  │
│  │  Thermo first to clear the pending check,      │  │
│  │  then one new topic if you're still going.     │  │
│  └────────────────────────────────────────────────┘  │
│  ELI                                                 │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Ask ELI something...                      [Send ↑]  │  ← input bar, fixed bottom
└──────────────────────────────────────────────────────┘
```

### Layout rules

- **ELI messages:** left-aligned, `--color-surface` bubble, `--shadow-card`, `--radius-lg`
- **Student messages:** right-aligned, `--color-accent-soft` bubble, `--radius-lg`
- **Attribution:** "ELI" label below each ELI message, "You" below each student message — 12px, `--color-text-tertiary`
- **No timestamps** — recency is implied by position, not displayed
- **Input bar:** fixed to bottom of sheet, 1px `--color-border` top border, placeholder text "Ask ELI something...", send button uses `--color-accent`
- **Close button (✕):** top right of header strip, closes sheet and returns student to Phase 1 or Phase 3 below

---

## 3. ELI's Opening Message — Never a Blank Prompt

ELI always opens the conversation. The student never sees an empty chat box with a cursor blinking. The opening message is state-dependent and data-grounded.

| Student state | ELI opening |
|---|---|
| Normal (recent session, stable) | "4 sessions this week. 2 loops closed. Thermodynamics: 9 days untouched. What's on your mind?" |
| After silence (3+ days) | "You came back. 5 days quiet, but you're here. What's going on?" |
| After mock result trigger | "Results came in. Tell me how you're actually feeling." |
| After a strong week | "Strong week — 3 loops closed, pending down to 1. What's next for you?" |
| Zero sessions this week | "Quiet week so far. No judgment — just checking in. What's in the way?" |
| Before first session of day | "Ready when you are. Anything you want to think through before starting?" |
| After very long session (>45 min) | "Long one today. [Topic] — how did it go?" |

**Opening message rules:**
- Maximum 3 sentences
- Always includes at least one specific data point (session count, topic name, pending count, silence duration)
- Ends with an open question or "What's on your mind?" — invites without prescribing
- Never starts with "Hi!" or any greeting word — ELI doesn't greet, it observes

---

## 4. What ELI Talks About

### In scope — ELI has genuine opinions here

| Student asks | ELI does |
|---|---|
| "How am I doing this week?" | Pulls real data: sessions, loops closed, verification rate, trend. Frames it honestly. |
| "What should I study today/tomorrow?" | Recommends based on: topic recency, pending check age, energy pattern, declared time. Gives a specific answer, not a generic suggestion. |
| "Why do you keep suggesting Organic Chemistry?" | Explains the signal: "9 days since your last session, 1 pending check that's been sitting since Tuesday." |
| "I feel behind" | Reality-checks with data: "You have 3 pending checks, but your verification rate is 71% — that's ahead of where you were last week." Or, if the feeling matches the data: "3 pending checks and 2 sessions this week — that's lower than your recent pace. What got in the way?" |
| "I got 45% in my mock. What do I do?" | Behavioral framing, not content advice: "One session at a time. What subject felt worst in the mock — not to study it all today, just to start the conversation with ELI tomorrow." |
| "I don't feel like studying today" | Finds the smallest possible entry point from data: "You've had Good energy on evenings before. Even 10 minutes on the Thermodynamics pending check keeps the streak going without forcing it." |
| "How many pending checks do I have?" | Direct data: "3 right now. Oldest one is Organic Chemistry from Tuesday." |
| "When do I usually study best?" | Pattern from session timestamps: "Your completed sessions cluster around 7–10pm. Morning sessions tend to be shorter." |
| "Am I on track for my exam?" | If exam date is known: proximity-based assessment. If not: "I don't have your exam date — but based on pending checks and verification rate, here's where things stand..." |

### Out of scope — ELI redirects, never ignores

| Student asks | ELI says |
|---|---|
| "Explain integration by parts" | "That's your textbook and teacher's job — I can't do it justice. Tell me what happened when you tried studying it. Did anything click? Did you try a verification?" |
| "Give me practice questions on thermodynamics" | "I don't generate questions. Your DPP or coaching material is the right source. What I can tell you: Thermodynamics has a pending check from 9 days ago — that's the one to prioritise." |
| "Help me solve this problem" | "Problem-solving is outside what I do. But tell me — is this a topic you have a pending check on? That might be the right place to start." |
| "Are my friends doing better than me?" | "I only know your data — not anyone else's. And I wouldn't compare even if I could. What I can tell you is what your own trend looks like." |
| "Make me a timetable" | "I don't do timetables — they create obligation without flexibility. What I do: when you open the app, I'll tell you what's worth doing today based on what's actually pending. That's a better system than a schedule." |

---

## 5. ELI's Voice in Chat

Same voice as everywhere in the product — but slightly more conversational. ELI can ask follow-up questions in chat, which it cannot do in structured SDUI.

| Rule | Detail |
|---|---|
| Active voice, second person, present tense | "You've closed 2 loops this week" — not "2 loops have been closed" |
| Data before opinion | Lead with what the data says, then frame it. Never lead with judgment. |
| Max 3 sentences per message | Chat messages are short. If more is needed, break into a second message. |
| No exclamation marks | Same rule as everywhere. Period is earned; exclamation mark is not. |
| Can ask one follow-up | Unlike SDUI, chat ELI can ask a clarifying question. One per exchange — not interrogation. |
| No "I understand how you feel" | Don't validate feelings generically. Validate specifically: "3 pending checks and a quiet week — that's a real weight." |
| Redirect content questions without dismissing | Always acknowledge the question before redirecting. "That's a real question — and it's one your [textbook/teacher/notes] can answer better than I can. What I can tell you is..." |

---

## 6. Availability

| Phase | Chat available? | Reason |
|---|---|---|
| Phase 1 (The Open) | Yes | Student is deciding whether to study; chat helps process resistance and plan |
| Phase 2 (Active Session) | **No** | Footer is hidden during Phase 2. Student should be studying. |
| Phase 3 (The Close) | Yes | Student just finished; processing the session with ELI deepens Closure beat |

Chat is always **student-initiated**. ELI never pushes the student toward chat. No notification, no prompt, no "tap here to talk to ELI" card appears in the main SDUI flow.

---

## 7. Chat History Model

Chat is **session-scoped** — not a permanent archive.

| Rule | Detail |
|---|---|
| What's visible | Current conversation + the last completed conversation (so student can pick up a thread) |
| What's not stored | Conversations older than the previous session — not shown, not retrievable by student |
| Why not full history | Full history creates a review surface that becomes a procrastination ritual (anti-pattern: separate dashboard page) |
| ELI's memory | ELI has full access to the student's behavioral data at all times — the absence of chat history does not reduce its ability to be contextually aware. It knows the student through their actions, not through conversation logs. |

---

## 8. Data ELI Can Reference in Chat

ELI's responses are grounded in the same data the rest of the system uses. In chat, ELI can surface this data conversationally rather than as a structured card.

| Data | What ELI can say |
|---|---|
| `pending_checks` | "You have 3 pending checks right now." |
| `last_scheduled_due_at` per topic | "The Organic Chemistry check has been sitting since Tuesday." |
| `sessionsLast7d` | "4 sessions this week." |
| `verificationRate7d` | "71% verification rate — above your own average." |
| `state_trend_7d` | "Your energy has been trending up this week." |
| `silenceDays` | "5 days since your last session." |
| Topic recency | "Thermodynamics: 9 days since last study." |
| Session timestamps | "Your completed sessions tend to cluster around 7–10pm." |
| `taskType` history | "You've been doing mostly Learn sessions. Only 1 Practice session this week." |
| Energy history | "When you pick Good (4), you tend to complete and verify in the same session." |

ELI does not surface raw numbers gratuitously. Every data point is framed in context: what it means for the student, not what the number is.

---

## 9. Screen Transition — Returning to Phase 1

When the student taps ✕ or swipes down to close the sheet:

1. Bottom sheet slides down: `translateY 0 → 100%`, 250ms ease-in
2. Phase 1 (or Phase 3) below is revealed — no re-render, the page state is unchanged
3. If the student was in Phase 1 and discussed starting a session, the Phase 1 CTAs are still there — they start by tapping a CTA, not from within chat

**Chat does not trigger session start.** There is no "Start studying now" button inside the chat. The student closes chat and uses the Phase 1 CTA surface to begin. This is intentional: the session start is a deliberate action on the main screen, not a continuation of a chat conversation.

---

## 10. Connection to Craving Loop

| Beat | How chat strengthens it |
|---|---|
| **Anticipation (Beat 1)** | "I wonder what ELI noticed about my week" becomes its own pull — separates from pending checks as the habit deepens |
| **Recognition (Beat 2)** | A student who has had real conversations with ELI feels known beyond what any greeting card can achieve. This is the long-term solution to the template ceiling problem. |
| **Micro-win (Beat 3)** | Chat helps a resistant student find the smallest possible entry point. "I don't feel like studying" becomes "okay, 10 minutes on the Thermo pending check — you've done that before." |
| **Closure (Beat 4)** | Student can process Phase 3 with ELI — not just see the counter drop, but reflect on what happened in the session |
| **Seed (Beat 5)** | ELI can plant a more nuanced, personalised forward hook through conversation: specific topic name, specific signal, specific next move |

Full loop context: [Craving Loop — The Conversation Layer](../foundations/craving-loop.md#the-conversation-layer)

---

*Previous: [topic-selection.md](topic-selection.md)*
