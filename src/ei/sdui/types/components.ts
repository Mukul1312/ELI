/**
 * SDUI Component Catalog — StudySessionOrchestration presentation layer.
 *
 * 16 component types that the client renderer maps to React components.
 * Unknown types are silently skipped (forward compatibility).
 *
 * @see docs/strategic-design/canvas-ei-runtime.md — Gateway context role
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

export const SduiActivationCardSchema = z.object({
  type: z.literal('activation-card'),
  props: z.object({
    title: z.string(),
    description: z.string(),
    timebox: z.string().optional(),
    focusNote: z.string().optional(),
    badge: BadgeSchema.optional(),
  }),
});
export type SduiActivationCard = z.infer<typeof SduiActivationCardSchema>;

export const SduiVerificationCardSchema = z.object({
  type: z.literal('verification-card'),
  props: z.object({
    title: z.string(),
    prompt: z.string(),
    badge: BadgeSchema.optional(),
    /** Primary section: flat list of content items the client renders */
    primarySection: z.array(z.object({
      text: z.string(),
      variant: z.enum(['body', 'muted', 'emphasis']).optional(),
    })),
    fallbackSection: z.object({
      label: z.string(),
      items: z.array(z.object({
        text: z.string(),
        variant: z.enum(['body', 'muted', 'emphasis']).optional(),
      })),
    }).optional(),
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

export const SduiSessionTimerSchema = z.object({
  type: z.literal('session-timer'),
  props: z.object({
    topic: z.string(),
    showTimer: z.literal(true),
    /** Action ID the timer's End button invokes (server-driven). */
    endActionId: z.string().optional(),
    endLabel: z.string().optional(),
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
      'SILENCE_RE_ENTRY', 'HIGH_PRESSURE', 'CHALLENGE', 'CLEAN_START',
      'DEAL_CARD', 'PENDING_STANDARD', 'ONBOARDING', 'IDENTITY_MOMENT',
    ]),
    greeting: z.string(),
    subGreeting: z.string().optional(),
    pendingItemsLabel: z.string().optional(),
    primaryCta: CtaSchema,
    secondaryCta: CtaSchema.optional(),
    tertiaryCta: CtaSchema.optional(),
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
    title: z.string(),
    topicName: z.string().optional(),
    message: z.string().optional(),
    countBefore: z.number().optional(),
    countAfter: z.number().optional(),
    seed: z.string().optional(),
    clearMoreCta: CtaSchema.optional(),
    milestone: z.boolean().default(false),
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

/** Phase 2 session context bar — small muted fixed top bar showing topic/taskType/difficulty. */
export const SduiSessionContextBarSchema = z.object({
  type: z.literal('session-context-bar'),
  props: z.object({
    topic: z.string(),
    taskType: z.string(),
    difficultyTier: z.string(),
  }),
});
export type SduiSessionContextBar = z.infer<typeof SduiSessionContextBarSchema>;

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
]) as z.ZodType<SduiComponent>;

export type SduiComponent =
  | SduiMessage
  | SduiModeBadge
  | SduiSpacer
  | SduiDivider
  | SduiPendingChecks
  | SduiScaleInput
  | SduiTextInput
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
  | SduiSessionContextBar;
