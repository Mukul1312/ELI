/**
 * SDUI Component Catalog — StudySessionOrchestration presentation layer.
 *
 * 16 component types that the client renderer maps to React components.
 * Unknown types are silently skipped (forward compatibility).
 *
 * @see docs/engineering-ddd-design/canvas-ei-runtime.md — Gateway context role
 * @see docs/ux-design-brief.md §5–7 — scale definitions, card specs, storyboard UX
 */

import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────────────────────

export const SduiMessageSchema = z.object({
  type: z.literal('message'),
  props: z.object({
    text: z.string(),
    variant: z.enum(['heading', 'subheading', 'body', 'muted', 'emphasis']),
    align: z.enum(['left', 'center']).optional(),
  }),
});
export type SduiMessage = z.infer<typeof SduiMessageSchema>;

export const SduiModeBadgeSchema = z.object({
  type: z.literal('mode-badge'),
  props: z.object({
    mode: z.enum(['Rescue', 'Neutral', 'Boost']),
    label: z.string(),
  }),
});
export type SduiModeBadge = z.infer<typeof SduiModeBadgeSchema>;

export const SduiSpacerSchema = z.object({
  type: z.literal('spacer'),
  props: z.object({
    size: z.enum(['sm', 'md', 'lg']),
  }),
});
export type SduiSpacer = z.infer<typeof SduiSpacerSchema>;

export const SduiDividerSchema = z.object({
  type: z.literal('divider'),
  props: z.object({}),
});
export type SduiDivider = z.infer<typeof SduiDividerSchema>;

export const SduiPendingChecksSchema = z.object({
  type: z.literal('pending-checks'),
  props: z.object({
    count: z.number().int(),
    label: z.string(),
    celebratory: z.boolean().optional(),
  }),
});
export type SduiPendingChecks = z.infer<typeof SduiPendingChecksSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Inputs
// ────────────────────────────────────────────────────────────────────────────

export const SduiScaleInputSchema = z.object({
  type: z.literal('scale-input'),
  props: z.object({
    inputId: z.string(),
    label: z.string(),
    chips: z.array(z.object({
      label: z.string(),
      value: z.union([z.string(), z.number()]),
    })),
    required: z.boolean(),
    /** Show numeric value below label. Server-controlled: true on Day 1–3, false after 7+ sessions. */
    showNumber: z.boolean().optional(),
    collapsible: z.object({
      toggleLabel: z.string(),
      defaultOpen: z.boolean(),
    }).optional(),
  }),
});
export type SduiScaleInput = z.infer<typeof SduiScaleInputSchema>;

export const SduiTextInputSchema = z.object({
  type: z.literal('text-input'),
  props: z.object({
    inputId: z.string(),
    label: z.string(),
    placeholder: z.string(),
    required: z.boolean(),
  }),
});
export type SduiTextInput = z.infer<typeof SduiTextInputSchema>;

export const SduiTopicInputSchema = z.object({
  type: z.literal('topic-input'),
  props: z.object({
    inputId: z.string(),
    label: z.string(),
    placeholder: z.string(),
    required: z.boolean(),
    recentTopics: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
    browseEnabled: z.boolean(),
    instituteId: z.string().nullable(),
  }),
});
export type SduiTopicInput = z.infer<typeof SduiTopicInputSchema>;

export const SduiNumericInputSchema = z.object({
  type: z.literal('numeric-input'),
  props: z.object({
    inputId: z.string(),
    label: z.string(),
    min: z.number().optional(),
    placeholder: z.string().optional(),
    required: z.boolean(),
  }),
});
export type SduiNumericInput = z.infer<typeof SduiNumericInputSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Cards
// ────────────────────────────────────────────────────────────────────────────

const BadgeSchema = z.object({
  mode: z.enum(['Rescue', 'Neutral', 'Boost']),
  label: z.string(),
});

export const SduiScopeCardSchema = z.object({
  type: z.literal('scope-card'),
  props: z.object({
    title: z.string(),
    topic: z.string(),
    scopeSummary: z.string(),
    verificationSummary: z.string(),
    badge: BadgeSchema.optional(),
  }),
});
export type SduiScopeCard = z.infer<typeof SduiScopeCardSchema>;

export const SduiDealCardSchema = z.object({
  type: z.literal('deal-card'),
  props: z.object({
    message: z.string(),
    pendingCount: z.number().int(),
    choices: z.tuple([
      z.object({ label: z.string(), actionId: z.string() }),
      z.object({ label: z.string(), actionId: z.string() }),
    ]),
  }),
});
export type SduiDealCard = z.infer<typeof SduiDealCardSchema>;

export const SduiTwoStepCardSchema = z.object({
  type: z.literal('two-step-card'),
  props: z.object({
    message: z.string(),
    step1: z.object({ label: z.string(), description: z.string() }),
    step2: z.object({ label: z.string(), description: z.string() }),
    actionId: z.string(),
  }),
});
export type SduiTwoStepCard = z.infer<typeof SduiTwoStepCardSchema>;

/** Phase 2 activation entry — first-action card for all P2 play variants. */
export const SduiActivationCardSchema = z.object({
  type: z.literal('activation-card'),
  props: z.object({
    /** Play variant drives layout, copy structure, and timer visibility. */
    variant: z.enum([
      'neutral',             // P2-N1: standard firstAction
      'rescue_micro',        // P2-R1: micro-start with rationale
      'rescue_two_min',      // P2-R2: 2-minute elapsed timer (client-side)
      'rescue_keep_going',   // P2-R2 after 2min: "Keep going?" with two CTAs
      'rescue_watch',        // P2-R3: watch-only with rationale
      'boost_isolation',     // P2-B1: isolation contract
      'boost_hard_first',    // P2-B2: hard-first
      'boost_continue_last', // P2-B3: continue last thread
      'retrieval',           // Pending check clearance — transitions directly to Phase 3
    ]),
    /** Main instruction text (22px greeting size, weight 400). ELI speaking, not a label. */
    firstAction: z.string(),
    /** Rationale line (14px, --color-text-tertiary). rescue_micro and rescue_watch only. */
    rationale: z.string().optional(),
    /** Primary CTA. */
    primaryCta: z.object({ label: z.string(), actionId: z.string() }),
    /** Secondary CTA — only for rescue_keep_going ("Done for today" fires SessionEnd). */
    secondaryCta: z.object({ label: z.string(), actionId: z.string() }).optional(),
    /** Focus reminder shown once at session entry (boost_isolation, boost_hard_first). */
    focusReminder: z.string().optional(),
  }),
});
export type SduiActivationCard = z.infer<typeof SduiActivationCardSchema>;

/** Phase 3 verification ask — proof interstitial between SessionEnd and close card. */
export const SduiVerificationCardSchema = z.object({
  type: z.literal('verification-card'),
  props: z.object({
    topic: z.string(),
    /** Mode drives opening line copy and CTA order (rescue flips primary/secondary). */
    mode: z.enum(['standard', 'short', 'long', 'rescue']),
    /** Server-computed opening line by mode. */
    openingLine: z.string(),
    /** "Do 1 question..." prompt (16px). */
    topicPrompt: z.string(),
    /** Whether to show "Remind me tomorrow" (false if deferred ≥ 2 times for this topic). */
    canDefer: z.boolean(),
    /** Action IDs wired to server events via the SduiResponse actions map. */
    gotItActionId: z.string(),
    shakyActionId: z.string(),
    needsReviewActionId: z.string(),
    deferActionId: z.string(),
    skipTimeActionId: z.string(),
    skipFatigueActionId: z.string(),
    skipConfusionActionId: z.string(),
  }),
});
export type SduiVerificationCard = z.infer<typeof SduiVerificationCardSchema>;

export const SduiGuardrailsCardSchema = z.object({
  type: z.literal('guardrails-card'),
  props: z.object({
    title: z.string(),
    rules: z.array(z.string()),
  }),
});
export type SduiGuardrailsCard = z.infer<typeof SduiGuardrailsCardSchema>;

export const SduiWelcomeBackCardSchema = z.object({
  type: z.literal('welcome-back-card'),
  props: z.object({
    greeting: z.string(),
    suggestion: z.string(),
    choices: z.array(z.object({ label: z.string(), actionId: z.string() })),
  }),
});
export type SduiWelcomeBackCard = z.infer<typeof SduiWelcomeBackCardSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Layout
// ────────────────────────────────────────────────────────────────────────────

export const SduiActionGroupSchema = z.object({
  type: z.literal('action-group'),
  props: z.object({
    layout: z.enum(['row', 'column']),
    buttons: z.array(z.object({
      label: z.string(),
      actionId: z.string(),
      variant: z.enum(['primary', 'secondary', 'danger']),
      disabled: z.boolean().optional(),
      disabledReason: z.string().optional(),
    })),
  }),
});
export type SduiActionGroup = z.infer<typeof SduiActionGroupSchema>;

/** Phase 2 active session screen — empty by design, "End session" text link at bottom. */
export const SduiSessionTimerSchema = z.object({
  type: z.literal('session-timer'),
  props: z.object({
    /** Action ID fired when student taps "End session". */
    endActionId: z.string(),
    endLabel: z.string().optional(),
    /** Session mode — drives nudge timing (Rescue: 20min, Neutral: 15min, Boost: no nudge). */
    mode: z.enum(['Rescue', 'Neutral', 'Boost']),
    /** Nudge card copy shown once after mode-specific delay. Absent = no nudge. */
    nudgeCopy: z.string().optional(),
  }),
});
export type SduiSessionTimer = z.infer<typeof SduiSessionTimerSchema>;

export const SduiDoneCardSchema = z.object({
  type: z.literal('done-card'),
  props: z.object({
    title: z.string(),
    topic: z.string(),
    badge: BadgeSchema.optional(),
    summary: z.array(z.string()),
    celebrationMessage: z.string().optional(),
  }),
});
export type SduiDoneCard = z.infer<typeof SduiDoneCardSchema>;

// ────────────────────────────────────────────────────────────────────────────
// New components: Phase 1 / Phase 3 / Footer / Identity (WS2–WS6)
// ────────────────────────────────────────────────────────────────────────────

const CtaSchema = z.object({ label: z.string(), actionId: z.string() });

/** Phase 1 contextual greeting card — mode-driven, replaces welcome-back-card. */
export const SduiResumeContextCardSchema = z.object({
  type: z.literal('resume-context-card'),
  props: z.object({
    variant: z.enum([
      'SILENCE_RE_ENTRY', 'LOW_ENERGY', 'HIGH_PRESSURE', 'CHALLENGE',
      'CLEAR_THEN_CHALLENGE', 'CLEAN_START', 'DEAL_CARD', 'PENDING_STANDARD',
      'ONBOARDING', 'IDENTITY_MOMENT',
    ]),
    greeting: z.string(),
    subGreeting: z.string().optional(),
    pendingItemsLabel: z.string().optional(),
    primaryCta: CtaSchema.optional(),
    secondaryCta: CtaSchema.optional(),
    tertiaryCta: CtaSchema.optional(),
    /** When true, client hides greeting until energy scale has a selection (V2 LOW_ENERGY). */
    showGreetingAfterEnergySelected: z.boolean().optional(),
    /** V3 HIGH_PRESSURE: alternate content shown when "Make it smaller" is tapped. */
    makeItSmallerContent: z.object({
      greeting: z.string(),
      subGreeting: z.string().optional(),
      primaryCta: CtaSchema,
    }).optional(),
  }),
});
export type SduiResumeContextCard = z.infer<typeof SduiResumeContextCardSchema>;

/** Phase 1 tappable list of pending topics — hidden in Rescue mode. */
export const SduiPendingItemsListSchema = z.object({
  type: z.literal('pending-items-list'),
  props: z.object({
    items: z.array(z.object({
      topicId: z.string(),
      topicName: z.string(),
      daysAgo: z.number(),
      actionId: z.string(),
    })),
    overflowLabel: z.string().optional(),
  }),
});
export type SduiPendingItemsList = z.infer<typeof SduiPendingItemsListSchema>;

/** Phase 3 scenario-specific closing card — counter animation + seed + optional clearMore. */
export const SduiLoopClosedCardSchema = z.object({
  type: z.literal('loop-closed-card'),
  props: z.object({
    scenario: z.enum([
      'verified', 'reminded', 'skip_time', 'skip_fatigue',
      'skip_confusion', 'milestone', 'first_ever',
    ]),
    /** Headline text (22px, --color-closed for loop-closed variants, --color-text-primary for others). */
    title: z.string(),
    /** Secondary line below headline (16px, --color-text-secondary). */
    subline: z.string().optional(),
    /** Quoted reflection (16px, --color-text-secondary, in quotes). Scenarios A and F only. */
    quote: z.string().optional(),
    /** Counter: pending before this session. Present for verified/milestone/first_ever. */
    countBefore: z.number().optional(),
    /** Counter: pending after this session. */
    countAfter: z.number().optional(),
    /** Seed copy (14px, --color-text-tertiary). */
    seed: z.string().optional(),
    /** Primary CTA ("Done" / "Done for today"). */
    primaryCta: CtaSchema,
    /** "Clear one more" — only when energy >= 4 and pendingChecks >= 1 after clearing. */
    clearMoreCta: CtaSchema.optional(),
    /** Drives counter animation variant: N→N-1 standard vs dissolve-to-label. */
    milestone: z.boolean().default(false),
    /** Drives counter label swap to "First loop closed". */
    firstEver: z.boolean().default(false),
  }),
});
export type SduiLoopClosedCard = z.infer<typeof SduiLoopClosedCardSchema>;

/** "Your Week" collapsible one-line footer — persists across phase transitions. */
export const SduiSessionSummaryFooterSchema = z.object({
  type: z.literal('session-summary-footer'),
  props: z.object({
    collapsedLabel: z.string(),
    sessions: z.number(),
    loopsClosed: z.number(),
    pending: z.number(),
    rate: z.number(),
    trend: z.enum(['improving', 'flat', 'worsening']),
    identityStatement: z.string().optional(),
    warmLabel: z.string().optional(),
    expandable: z.boolean().optional(),
  }),
});
export type SduiSessionSummaryFooter = z.infer<typeof SduiSessionSummaryFooterSchema>;

/** Weekly identity moment card — replaces resume-context-card when eligible. */
export const SduiIdentityMomentCardSchema = z.object({
  type: z.literal('identity-moment-card'),
  props: z.object({
    statement: z.string(),
    detail: z.string(),
    ctaLabel: z.string(),
    ctaActionId: z.string(),
  }),
});
export type SduiIdentityMomentCard = z.infer<typeof SduiIdentityMomentCardSchema>;

/** Phase 2 session context bar — fixed top bar: left=topic info, right=elapsed time. */
export const SduiSessionContextBarSchema = z.object({
  type: z.literal('session-context-bar'),
  props: z.object({
    topic: z.string(),
    taskType: z.string(),
    difficultyTier: z.string(),
    /** ISO timestamp of session start — client computes elapsed minutes, updates every 60s. */
    sessionStartedAt: z.string().optional(),
  }),
});
export type SduiSessionContextBar = z.infer<typeof SduiSessionContextBarSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Onboarding (first-session flow — Screen 1 and Screen 2)
// ────────────────────────────────────────────────────────────────────────────

/** Screen 1: Welcome — ELI intro, "Get started" CTA. */
export const SduiOnboardingWelcomeCardSchema = z.object({
  type: z.literal('onboarding-welcome-card'),
  props: z.object({
    title: z.string(),
    tagline: z.string(),
    bodyLines: z.array(z.string()),
    /** Fragment in primary color within body (e.g. "open, study, close the loop"). */
    momentsHighlight: z.string().optional(),
    ctaLabel: z.string(),
    ctaActionId: z.string(),
  }),
});
export type SduiOnboardingWelcomeCard = z.infer<typeof SduiOnboardingWelcomeCardSchema>;

/** Screen 2: Topic + task type — text input, optional subject chips, required task type chips. */
export const SduiOnboardingTopicTaskFormSchema = z.object({
  type: z.literal('onboarding-topic-task-form'),
  props: z.object({
    topicInputId: z.string(),
    topicLabel: z.string(),
    topicPlaceholder: z.string(),
    /** Optional P/C/M/B subject chips. */
    subjectChips: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
    taskTypeInputId: z.string(),
    taskTypeLabel: z.string(),
    taskTypeChips: z.array(z.object({ label: z.string(), value: z.string() })),
    submitCtaLabel: z.string(),
    submitActionId: z.string(),
  }),
});
export type SduiOnboardingTopicTaskForm = z.infer<typeof SduiOnboardingTopicTaskFormSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Union
// ────────────────────────────────────────────────────────────────────────────

export const SduiComponentSchema: z.ZodType<SduiComponent> = z.discriminatedUnion('type', [
  SduiMessageSchema,
  SduiModeBadgeSchema,
  SduiSpacerSchema,
  SduiDividerSchema,
  SduiPendingChecksSchema,
  SduiScaleInputSchema,
  SduiTextInputSchema,
  SduiTopicInputSchema,
  SduiNumericInputSchema,
  SduiScopeCardSchema,
  SduiDealCardSchema,
  SduiTwoStepCardSchema,
  SduiActivationCardSchema,
  SduiVerificationCardSchema,
  SduiGuardrailsCardSchema,
  SduiWelcomeBackCardSchema,
  SduiActionGroupSchema,
  SduiSessionTimerSchema,
  SduiDoneCardSchema,
  SduiResumeContextCardSchema,
  SduiPendingItemsListSchema,
  SduiLoopClosedCardSchema,
  SduiSessionSummaryFooterSchema,
  SduiIdentityMomentCardSchema,
  SduiSessionContextBarSchema,
  SduiOnboardingWelcomeCardSchema,
  SduiOnboardingTopicTaskFormSchema,
]) as z.ZodType<SduiComponent>;

export type SduiComponent =
  | SduiMessage
  | SduiModeBadge
  | SduiSpacer
  | SduiDivider
  | SduiPendingChecks
  | SduiScaleInput
  | SduiTextInput
  | SduiTopicInput
  | SduiNumericInput
  | SduiScopeCard
  | SduiDealCard
  | SduiTwoStepCard
  | SduiActivationCard
  | SduiVerificationCard
  | SduiGuardrailsCard
  | SduiWelcomeBackCard
  | SduiActionGroup
  | SduiSessionTimer
  | SduiDoneCard
  | SduiResumeContextCard
  | SduiPendingItemsList
  | SduiLoopClosedCard
  | SduiSessionSummaryFooter
  | SduiIdentityMomentCard
  | SduiSessionContextBar
  | SduiOnboardingWelcomeCard
  | SduiOnboardingTopicTaskForm;
