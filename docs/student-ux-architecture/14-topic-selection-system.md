# Topic Selection System — Structured Curriculum

> Today `topic` is a raw string everywhere — events, signals, view-composer. Students type "thermo", "Thermodynamics", "thermodynamics ch 5" and EI treats them as three different loops. This doc specifies a structured curriculum system that replaces free text with a searchable, browsable curriculum tree — while always allowing free-text fallback.

---

## Why This Matters

Three compounding problems grow worse with every student onboarded:

1. **Typing friction.** "Thermodynamics" is 14 characters of academic jargon on a phone keyboard. Students abbreviate, misspell, or avoid typing altogether.
2. **Normalization chaos.** The same concept gets 5 string representations. Loop health, pending checks, `AvoidanceLatency(subject)`, and `TMS(topic)` all break on fuzzy matches.
3. **Analytics blindness.** Without stable topic identifiers, institute-level insights (Subject Avoidance alerts, cohort coverage reports) are unreliable.

The EI spec already assumes stable `topicId` in signals (`ei_topic_state.topicId`). Today that ID is whatever the student typed, lowercased.

---

## Design Principles

1. **Never block the student.** Free-text fallback always works. If the catalog doesn't have what the student needs, they type it and move on. Zero friction added.
2. **One input moment.** Topic selection happens once per session — in Phase 1 (The Open). Phase 2 and Phase 3 display the selected topic but never ask for it again.
3. **Browse is scoped, search is universal.** When browsing the tree, a student sees what's relevant to them (their institute's curriculum). When searching, they can find anything in the full catalog.
4. **Catalog is shared, selection is private.** The curriculum tree is a shared reference (potentially institute-provided). Which topics a student selects, how often, and their loop health — that stays behind the Swiss Bank privacy boundary.

---

## Current State (What Exists Today)

```
Phase 1 (The Open):
┌─────────────────────────────────────┐
│  What are you studying?             │
│  [________________________]         │  ← text-input component
│  e.g. Thermodynamics, Organic...    │     inputId: 'topic'
│                                     │     type: z.string()
└─────────────────────────────────────┘
```

- **SDUI component:** `text-input` with `inputId: 'topic'` ([view-composer.ts:994-1002](../src/ei/sdui/view-composer.ts))
- **Event schema:** `topic: z.string()` in `IntentSet`, `SessionEnd`, `RetrievalVerified`, `RetrievalScheduled`, `RetrievalSkipped`, `VerificationCompleted`, `FirstActionStarted`, `Replan`
- **Signals schema:** `topicId: z.string()` in `TopicState` — same raw string, no UUID
- **Pending items:** Displayed as `Topic name . X days ago` — shows whatever was typed

**Bypass path:** Tapping a pending item in the list fires `IntentSet` directly for that topic, skipping the text input entirely. This path is already friction-free and needs no change.

---

## Part 1 — Curriculum Tree

> **Goal:** Replace free-text topic input with a structured, searchable, browsable curriculum tree. Stable TopicIds in all events. Institute-scoped browsing.

### The Topic Picker

The current `text-input` is replaced by a `topic-picker` component that combines three input methods:

1. **Recent topics** — 1-tap chips for the student's last 3-5 topics
2. **Type-ahead search** — autocomplete as the student types, matching against the full catalog
3. **Browse** — drill-down through the curriculum tree via a bottom sheet

```
┌─────────────────────────────────────┐
│  What are you studying?             │
│  [________________________] [Browse]│  ← type-ahead OR browse
│                                     │
│  Recent:                            │
│  [ Thermodynamics ]  [ Integration ]│  ← 1-tap recent topics
│  [ Organic Chemistry ]              │
└─────────────────────────────────────┘
```

All three methods resolve to a stable `topicId` (UUID) from the catalog. If the student types something not in the catalog, free-text fallback kicks in — their input is accepted as-is and queued for normalization.

---

### Tree Structure

```
Board (CBSE / ICSE / State / JEE / NEET)
  └── Subject (Physics / Chemistry / Mathematics / Biology)
       └── Unit (Mechanics / Thermodynamics / Organic / ...)
            └── Chapter (Laws of Motion / Chemical Bonding / ...)
                 └── Topic (Newton's Third Law / Hybridization / ...)
```

| Level | Example | Typical count |
|---|---|---|
| Board | CBSE Class 11-12 | 3-5 boards |
| Subject | Physics | 4-6 per board |
| Unit | Mechanics | 5-8 per subject |
| Chapter | Laws of Motion | 3-6 per unit |
| Topic | Newton's Third Law | 3-10 per chapter |

**Leaf selection only.** Students must select a topic (leaf node), not a unit or chapter. This ensures `topicId` is granular enough for loop tracking and verification.

---

### Catalog Seeding

The master catalog is curated from official syllabi:

| Board | Subjects | Estimated topics |
|---|---|---|
| CBSE (Class 11-12) | Physics, Chemistry, Mathematics, Biology | ~120 topics |
| ICSE (Class 11-12) | Physics, Chemistry, Mathematics | ~80 topics |
| General / Competitive | JEE topics, NEET topics | ~100 topics |

**Total seed:** ~300 entries. Curated manually from NCERT chapter lists and common competitive exam syllabi. Not generated — reviewed by a domain expert.

Each catalog entry:

```typescript
{
  id: string,          // stable UUID
  name: string,        // display name: "Thermodynamics"
  aliases: string[],   // alternative spellings: ["thermo", "heat transfer"]
  boardId: string,     // foreign key to board
  subjectId: string,   // foreign key to subject
  unitId: string,      // foreign key to unit
  chapterId: string,   // foreign key to chapter
}
```

---

### Institute Scoping — Browse vs Search

This is the key design decision for B2B. There are two distinct interaction modes with two different scopes.

#### How it works

There is a **master catalog** — the full curriculum tree covering all boards (CBSE, ICSE, JEE, NEET, etc.). When an institute onboards, they provide **their specific syllabus** — a curated subset of the master catalog, possibly with custom ordering matching their teaching sequence.

A student in that institute's cohort gets a **scoped browse experience** but an **unrestricted search experience**.

#### Concrete example

Allen Institute (Kota) onboards with AI Study Brother. They teach JEE Prep for their 2026 batch.

**Allen provides their curriculum:**
```
Allen JEE Batch 2026
  └── Physics: 12 chapters (in their teaching order)
  └── Chemistry: 10 chapters
  └── Mathematics: 14 chapters
  └── (no Biology — JEE doesn't need it)
```

**Riya** is a student in Allen's JEE Batch 2026 cohort.

**When Riya taps "Browse"** — she sees Allen's tree, not the full master catalog:

```
┌─────────────────────────────────────┐
│  Pick your topic                    │
│                                     │
│  Physics                        >   │  ← only Allen's 3 subjects
│  Chemistry                      >   │     Biology is absent (not in JEE)
│  Mathematics                    >   │
└─────────────────────────────────────┘

         ↓ taps "Physics"

┌─────────────────────────────────────┐
│  < Physics                          │
│                                     │
│  Mechanics                      >   │  ← Allen's teaching order
│  Thermodynamics                 >   │     only their 12 chapters
│  Waves & Optics                 >   │
│  Electrostatics                 >   │
│  Modern Physics                 >   │
└─────────────────────────────────────┘

         ↓ taps "Thermodynamics"

┌─────────────────────────────────────┐
│  < Thermodynamics                   │
│                                     │
│  ● Zeroth Law                       │
│  ● First Law & Internal Energy      │
│  ● Specific Heat & Calorimetry      │
│  ● Second Law & Entropy             │
│  ● Carnot Engine                    │
└─────────────────────────────────────┘
```

The browse experience is curated to what's relevant to *her* syllabus. She doesn't wade through 500+ topics across all boards. She sees exactly what she needs.

**When Riya types in the search box** — she searches the full master catalog:

```
│  [bio___________________]          │
│                                     │
│  ┌─────────────────────────────────┐│
│  │  Biostatistics (JEE Math)       ││  ← from Allen's curriculum
│  │  Biomolecules (NEET Biology)    ││  ← from master catalog
│  │  Binomial Theorem (JEE Math)    ││  ← from Allen's curriculum
│  └─────────────────────────────────┘│
```

She can search everything — because maybe she's also preparing for NEET as backup, or curious about something outside her institute's syllabus. We never restrict what a student can study.

#### Why this distinction matters

| | Browse | Search |
|---|---|---|
| **Purpose** | "Show me what I should study" | "Let me find what I want to study" |
| **Scope** | Institute's curriculum (curated, ordered) | Full master catalog (universal) |
| **Feeling** | Guided, structured, less overwhelming | Open, exploratory, student has agency |
| **Data source** | Institute curriculum mapping | Master catalog + aliases |

#### Self-serve students (no institute)

Students without an institute affiliation see the full master catalog when browsing, filtered by whichever board they selected during onboarding (e.g., "I'm CBSE Class 12"). Same tree, just scoped by their own board instead of an institute's curriculum.

| Student type | Browse scope | Search scope |
|---|---|---|
| Institute-affiliated | Institute's curriculum tree | Full master catalog |
| Self-serve | Board-filtered master catalog | Full master catalog |
| Onboarding (first-ever) | Board selection first, then board-filtered tree | Full master catalog |

#### Institute Curriculum Import

For B2B onboarding, institutes provide their curriculum as a structured file (CSV or JSON). The import flow:

1. Institute admin uploads curriculum file via admin panel
2. System maps it to the tree structure (Board > Subject > Unit > Chapter > Topic)
3. Each topic is matched to existing master catalog entries (by name/alias) or created as new entries with stable UUIDs
4. The institute's curriculum becomes a named "curriculum mapping" linked to their cohort(s)
5. Students enrolled in that cohort automatically see the institute's tree when browsing

**Privacy note:** The curriculum tree itself is not private data — it's a public syllabus. What's private is which topics the student selects, their loop health, and their verification patterns. The Swiss Bank boundary is not affected by shared curriculum data.

---

### Recent Topics

Below the search input, show the student's last 3-5 distinct topics as tappable chips. This kills the majority of typing friction — most students cycle through a handful of topics.

#### UX Rules

| Rule | Detail |
|---|---|
| **Source** | Last 5 distinct topics from the student's `ei_topic_state`, ordered by `updatedAt` DESC |
| **Deduplication** | By `topicId` (catalog ID). If student used free text, case-insensitive string dedup |
| **Tap behavior** | Sets the topic input value. Does NOT auto-submit — student still confirms with the Phase 1 CTA |
| **Display format** | Pill chips, wrapping to second row if needed |
| **Hidden when** | First-ever open (no history), or pending items list has >= 3 items (those already serve as topic shortcuts) |
| **Position** | Below the search input, above the energy scale |
| **Label** | "Recent:" in `--color-text-tertiary`, 12px, weight 400 |

#### Chip Styling

```
Background:   --color-surface
Border:       1px solid --color-border
Radius:       20px (fully rounded pill)
Padding:      6px 14px
Font:         14px, weight 400, --color-text-primary
Tap state:    background → --color-accent-soft, border → --color-accent (150ms ease)
Gap:          8px between chips
```

---

### Type-Ahead Search

As the student types in the input, matching topics appear as suggestions.

#### Suggestion Rules

| Rule | Detail |
|---|---|
| **Trigger** | Suggestions appear after 2+ characters typed |
| **Max shown** | 5 suggestions maximum |
| **Ranking** | (1) Student's own recent topics matching input, (2) Exact prefix match from catalog, (3) Alias match, (4) Fuzzy match (Levenshtein distance <= 2) |
| **Display format** | Topic name + subject in secondary text. E.g., "Thermodynamics" with "Physics" below |
| **Institute priority** | If student is institute-affiliated, institute curriculum matches rank above general catalog matches |
| **Tap behavior** | Replaces input value with the selected topic (sets `topicId`). Suggestions list closes |
| **Dismiss** | Tapping outside or pressing the Phase 1 CTA closes suggestions |
| **Free-text fallback** | If student ignores suggestions and submits custom text, it works. The text is accepted and queued for normalization |
| **Empty state** | If no matches found, show nothing — do NOT show "No results" (that feels like rejection) |

#### Suggestion Item Styling

```
Background:   --color-surface
Border:       1px solid --color-border (bottom only, except last item)
Padding:      12px 14px
Font:         15px, weight 400, --color-text-primary
Subtitle:     13px, weight 400, --color-text-tertiary (subject name)
Highlight:    matched characters in --color-accent, weight 500
Tap state:    background → --color-bg (100ms)
Container:    --radius-lg (16px) on suggestion list, --shadow-card
```

---

### Browse Sheet

Tapping the "Browse" button opens a bottom sheet for tree navigation.

#### UX Rules

| Rule | Detail |
|---|---|
| **Trigger** | "Browse" icon/button next to the text input |
| **Presentation** | Bottom sheet (half-screen), not a new page. Respects one-screen architecture |
| **Navigation** | Drill-down with back arrow. Header shows current level name |
| **Selection** | Tapping a leaf topic (marked with bullet) closes the sheet, fills the input, sets `topicId` |
| **Search within browse** | A search bar at the top of the sheet filters the current level and below |
| **Animation** | Sheet slides up 200ms ease-out. Level transitions slide left/right 150ms |
| **Dismiss** | Swipe down or tap outside closes the sheet. No selection made |

#### Browse Styling

```
Sheet:
  Background:     --color-bg
  Border-radius:  --radius-lg (16px) top corners only
  Max height:     70vh
  Shadow:         0 -4px 24px rgba(0,0,0,0.08)
  Handle:         32px x 4px rounded bar, --color-border, centered, 8px from top

List items:
  Padding:        14px 16px
  Font:           15px, weight 400, --color-text-primary
  Chevron:        > icon, --color-text-tertiary (for non-leaf: subject, unit, chapter)
  Bullet:         filled circle, 6px, --color-accent (for leaf: topic)
  Tap state:      background → --color-surface (100ms)
  Divider:        1px --color-border between items

Back button:
  < icon + level name, --color-accent, 14px weight 500
  Padding:        12px 16px

Search bar (within sheet):
  Same styling as main input but smaller: 13px font, 36px height
  Placeholder: "Search [current level]..."
```

---

### Variant Interaction

Which topic picker features are shown depends on the Phase 1 variant:

| Phase 1 Variant | Recent Chips | Type-Ahead | Browse Button | Reason |
|---|---|---|---|---|
| SILENCE RE-ENTRY (V1) | Yes | Yes | Yes | Reduce friction for fragile re-entry |
| LOW ENERGY (V2) | Yes | Yes | Yes | Less typing = less effort |
| HIGH PRESSURE (V3) | No | No | No | V3 has a fixed scope ("Start 2 minutes"); no topic input |
| CLEAN START (V4) | Yes | Yes | Yes | Standard flow |
| PENDING + STANDARD (V5) | Conditional | Yes | Yes | Chips hidden if pending list has >= 3 items |
| DEAL CARD (V6) | No | No | No | Deal card drives topic selection |
| CHALLENGE (V7) | Yes | Yes | Yes | Student picks what to challenge |
| CLEAR-THEN-CHALLENGE (V8) | Conditional | Yes | Yes | Chips hidden if pending list has >= 3 items |
| IDENTITY MOMENT (V9) | No | No | No | Identity screen has no topic input |
| ONBOARDING (V10) | No | Yes | Yes | No history for chips, but can browse/search catalog |

---

### Normalization Queue

When a student submits a free-text topic that doesn't match any catalog entry:

1. Accept the text and store it as `topic` in the event (no blocking, no correction)
2. Log it to a normalization queue: `{ rawText, studentId, occurredAt }`
3. Periodically, a human or automated process reviews the queue:
   - If it matches an existing catalog entry → create an alias mapping
   - If it's a genuinely new topic → add to catalog with a new UUID
4. No retroactive event rewriting. Future events for the same student will benefit from the new alias

**Important:** This queue is an ops tool, not a student-facing feature. Students never see "did you mean...?" corrections. Their input always works.

---

### Schema Migration

`topic: z.string()` in events evolves to include a stable identifier:

```
Before:
  topic: "thermodynamics"            ← raw string

After:
  topicId: "uuid-abc-123"            ← stable catalog UUID (when selected from catalog)
  topicName: "Thermodynamics"        ← display name (denormalized for reads)
  topicRaw?: "thermo"                ← original free-text input (only when fallback was used)
```

**Migration strategy:**

1. New events include `topicId` (UUID) and `topicName` (display string) when selected from catalog
2. Free-text fallback events include `topicId` as a generated UUID + `topicRaw` with the original text
3. Old events retain `topic` (raw string) — no backfill, no rewriting
4. `ei_topic_state` gains a `catalogTopicId` column alongside existing `topicId`
5. Queries that join on topic use `catalogTopicId` when available, fall back to string match

---

### SDUI Component

New component type `topic-picker` replaces `text-input` for the topic field:

```typescript
{
  type: 'topic-picker',
  props: {
    inputId: 'topic',
    label: 'What are you studying?',
    placeholder: 'Search or browse...',
    required: true,
    recentTopics: [                           // chips (empty for first-ever user)
      { topicId: 'uuid-1', name: 'Thermodynamics' },
      { topicId: 'uuid-2', name: 'Integration' },
    ],
    browseEnabled: true,                      // show browse button
    browseEndpoint: '/api/curriculum/browse',  // tree navigation endpoint
    searchEndpoint: '/api/curriculum/search',  // type-ahead search endpoint
  }
}
```

**Browse and search are server-driven.** The component calls endpoints to fetch tree levels and search results. This keeps the catalog data off the initial SDUI payload (catalog could be large) and enables institute-scoped filtering server-side.

---

### What This Unlocks

- **Stable TopicIds:** Loop health, TMS, pending checks all track by UUID — no more normalization chaos
- **Institute Radar:** Subject-level avoidance alerts work reliably (topics grouped by subject)
- **Loop health per subject:** Aggregate `TMS` across topics within a subject
- **Curriculum coverage:** "Student has attempted 12/18 Physics topics" — useful for institute dashboards
- **Cross-student analytics:** "40% of this cohort avoids Thermodynamics" — only possible with stable IDs
- **Pending items list:** Shows normalized, consistent topic names

---

## Part 2 — Graph Edges (Future, Post-PMF)

> **Goal:** Cross-topic relationships that power smart routing in Strategic Adjustment and Protocol 1.

### What Changes

Topics gain typed relationships to other topics. The tree structure remains the primary navigation; graph edges add a knowledge layer on top.

### Relationship Types

| Type | Meaning | Example | Used by |
|---|---|---|---|
| `prerequisite` | Must understand A before B makes sense | Vectors -> Projectile Motion | P1 Ignition: suggest prerequisite if student struggles |
| `related` | Conceptually connected, order doesn't matter | Electric Field -> Magnetic Field | P1 Ignition: suggest related topic after loop closure |
| `builds-on` | A is foundation, B extends it | Differentiation -> Integration | Strategic Adjustment: sequence recommendations |
| `applies-in` | A is a tool used within B | Trigonometry -> Wave Motion | Phase 3 seed: "Next, see how this applies in Wave Motion" |

### UX Impact (Minimal)

Graph edges are **invisible to the student** in direct interaction. They power backend decisions:

- **Phase 1 seed text:** "You closed the loop on Vectors. Next natural step: Projectile Motion." (Uses the `builds-on` edge)
- **P1 Ignition routing:** If a student sets intent for "Projectile Motion" but has never studied "Vectors", P1 might suggest: "Quick foundation check on Vectors first?" (Uses `prerequisite` edge)
- **Strategic Adjustment:** When computing `SubjectAvoidance`, graph edges reveal that avoiding "Vectors" cascades into weakness in "Projectile Motion", "Circular Motion", and "Relative Motion"
- **Institute Radar:** Prerequisite gaps become a signal: "Student skipped foundation topics in Mechanics"

### No Browse UI Change

The browse tree stays the same. Students do not see or interact with graph edges directly. The edges influence copy, suggestions, and routing — not navigation.

### Edge Data Model

```typescript
{
  fromTopicId: string,    // UUID
  toTopicId: string,      // UUID
  type: 'prerequisite' | 'related' | 'builds-on' | 'applies-in',
  strength: number,       // 0.0-1.0, used for ranking when multiple edges exist
  source: 'curated' | 'inferred',  // curated = human-reviewed, inferred = data-driven
}
```

### Building the Graph

| Source | Method | Timeline |
|---|---|---|
| **Curated edges** | Domain experts annotate prerequisite/builds-on relationships for NCERT syllabus | At launch |
| **Inferred edges** | Students who study topic A then study topic B within 48h -> weak `related` edge | After 6+ months of data |
| **Institute-provided** | Institutes can declare prerequisite chains for their curriculum | On request |

**Start small.** Curate edges for 2-3 subjects (Physics, Mathematics) where prerequisite chains are well-known. Do not attempt full graph coverage at launch.

### What This Unlocks

- **Smart seeds in Phase 3:** "You just proved recall on Differentiation. Integration is the natural next step." — drives the craving loop's Seed beat with a concrete, relevant suggestion
- **Prerequisite guardrails:** P1 can gently redirect when a student attempts an advanced topic without foundations, without blocking them (always allow override)
- **Cascade risk detection:** Strategic Adjustment can flag that a single avoided topic (Vectors) creates downstream weakness in 4 dependent topics
- **Long-term: adaptive study paths** — but that's post-PMF, post-graph, and a separate design

---

## Impact on Existing Phases

### Phase 1 (The Open)

| What | Before (current) | After Curriculum Tree | After Graph Edges |
|---|---|---|---|
| Topic input component | `text-input` (free text) | `topic-picker` (search + browse + recent) | No change |
| Pending items list | Shows raw typed text | Shows normalized catalog names | Same |
| Seed text in greeting | Generic or mode-based | Can suggest same-unit topics | Graph-informed seeds |

### Phase 2 (The Session)

| What | Before (current) | After Curriculum Tree | After Graph Edges |
|---|---|---|---|
| Context bar | Shows raw topic string | Shows catalog topic name | Same + may show unit breadcrumb |
| ELI nudge | No change | No change | Could reference related topics |

### Phase 3 (The Close)

| What | Before (current) | After Curriculum Tree | After Graph Edges |
|---|---|---|---|
| Verification ask | Shows raw topic string | Shows catalog topic name | Same |
| Done screen seed | Generic seed text | Can suggest same-unit topics | Suggests prerequisite/builds-on topics |
| Loop closed card | No change | No change | No change |

---

## Archetype Impact

| Archetype | Key benefit | Part |
|---|---|---|
| **S1 Topper** | Browse to find advanced topics quickly; no time wasted typing | Part 1 |
| **S2 Revenge Planner** | Recent topics = instant restart after bad mock; 1 tap, done | Part 1 |
| **S3 Stalled Starter** | Browse removes "what should I study?" paralysis — structured options, not a blank text box | Part 1 |
| **S4 Flowing-but-Avoidant** | Graph edges surface avoided prerequisites they keep skipping | Part 2 |
| **S5 Burnout** | Recent topics = zero effort to pick topic on low-energy day | Part 1 |
| **S6 Grinder** | Browse tree = structured exploration of full syllabus, topic by topic | Part 1 |
| **S7 Ambitious Collector** | Stable IDs prevent duplicate loops from spelling variants ("thermo" vs "Thermodynamics") | Part 1 |

---

## Anti-Patterns

| Do NOT | Why |
|---|---|
| Show "No results found" when typing | Feels like rejection. If no catalog match, silently allow free text |
| Require catalog selection (block free text) | Violates "never block the student" principle. Catalog is a convenience, not a gate |
| Auto-correct student's topic input | "Did you mean Thermodynamics?" is patronizing. Just show suggestions; let them pick or ignore |
| Show the full tree on Phase 1 by default | Browse is opt-in via bottom sheet. Default is search + recent chips. Tree is for exploration, not daily use |
| Add topic selection to Phase 2 or Phase 3 | One input moment per session. Topic is set in Phase 1. Period |
| Use graph edges to block topic selection | "You haven't studied Vectors yet" is a suggestion, never a wall. Student always has final say |
| Share individual topic selections with institutes | Swiss Bank boundary. Institutes see subject-level aggregates, never "Riya picked Thermodynamics 3 times this week" |
| Restrict search to institute curriculum | Search is always universal. Only browse is scoped. A student preparing for JEE might also want to explore NEET topics |
| Show the master catalog to institute students when browsing | Browse must show the institute's curated tree. Showing 500+ topics across all boards is overwhelming and irrelevant |

---

## DDD Alignment

This system introduces a new **Supporting** subdomain: **CurriculumCatalog**.

| Field | Content |
|---|---|
| **Capability** | Maintain a structured curriculum taxonomy and provide fast lookup/search for topic selection |
| **Key concepts** | Board, Subject, Unit, Chapter, Topic; TopicId (stable UUID); CurriculumTree; alias; search index; InstituteCurriculumMapping; graph edge (Part 2) |
| **Boundaries (in)** | Taxonomy CRUD, search/autocomplete, alias normalization, institute curriculum import, graph edge management |
| **Boundaries (out)** | Loop tracking (Event Ledger), health assessment (LoopHealthAssessment), gate decisions (AdaptiveCoaching) — these consume `topicId`, they don't own the catalog |
| **Classification** | **Supporting** — necessary for structured tracking but not the core differentiator |

**Context map integration:**
- **EI Runtime -> CurriculumCatalog:** Conformist. Events reference `topicId` from the catalog. If the catalog evolves (renames, merges), events keep their original `topicId` — no retroactive changes.
- **CurriculumCatalog -> CohortAccess:** CohortAccess provides institute/cohort context to determine which curriculum tree a student sees when browsing. The catalog queries CohortAccess for "which institute is this student in?" and returns the scoped tree.
- **InstituteRadar -> CurriculumCatalog:** Radar consumes subject/unit groupings from the catalog to produce subject-level avoidance alerts.

---

## Summary

| Part | Ships | Schema change | New components | New endpoints |
|---|---|---|---|---|
| **Part 1: Curriculum Tree** | Structured tree + search + browse + recent topics + institute scoping + normalization queue | Events gain `topicId` UUID + `topicName`; catalog tables; institute curriculum mapping table | `topic-picker`, browse bottom sheet | `/api/curriculum/browse`, `/api/curriculum/search` |
| **Part 2: Graph Edges** | Relationship edges powering seeds, routing, radar | Edge table | None (backend only) | None student-facing |

---

Cross-references:
- Phase 1 topic input: [05-phase1-the-open.md](05-phase1-the-open.md) (Concrete Examples, topic selection moment)
- Phase 2 context bar: [06-phase2-the-session.md](06-phase2-the-session.md) (displays selected topic)
- Phase 3 done screen seeds: [07-phase3-the-close.md](07-phase3-the-close.md) (seed text references topic)
- Implementation map: [13-implementation-map.md](13-implementation-map.md) (SDUI components, data flow)
- Phase 1 design spec: [../phase1-design/04-phase1-variants.md](../phase1-design/04-phase1-variants.md) (variant interaction with topic input)
- EI Spec topic model: [../ei/spec/EI_Spec.md](../ei/spec/EI_Spec.md) Section 4.11 (Multi-Topic Execution Model)
- DDD subdomains: [../engineering-ddd-design/02-subdomains.md](../engineering-ddd-design/02-subdomains.md) (CurriculumCatalog placement)
