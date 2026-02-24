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
  SduiScopeCardSchema,
  SduiDealCardSchema,
  SduiTwoStepCardSchema,
  SduiActivationCardSchema,
  // VerificationCard uses lazy refs — validated separately
  SduiGuardrailsCardSchema,
  SduiWelcomeBackCardSchema,
  SduiActionGroupSchema,
  SduiSessionTimerSchema,
  SduiDoneCardSchema,
]) as z.ZodType<SduiComponent>;

export type SduiComponent =
  | SduiMessage
  | SduiModeBadge
  | SduiSpacer
  | SduiDivider
  | SduiPendingChecks
  | SduiScaleInput
  | SduiTextInput
  | SduiScopeCard
  | SduiDealCard
  | SduiTwoStepCard
  | SduiActivationCard
  | SduiVerificationCard
  | SduiGuardrailsCard
  | SduiWelcomeBackCard
  | SduiActionGroup
  | SduiSessionTimer
  | SduiDoneCard;
