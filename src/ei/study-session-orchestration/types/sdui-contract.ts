/**
 * SDUI Response Contract — the API between EI Runtime and the client renderer.
 *
 * Each Mastra workflow step (composeP1View, composeP2View, composeP3View) returns
 * an SduiResponse. The client renders the `view` slots using its component registry,
 * and uses the `actions` map to POST user interactions back to /api/ei/command.
 *
 * P1WrappedResponseSchema: backward-compat shape so existing client gets domain fields
 * at top level (result.topic, result.mode, ...) plus view, schemaVersion, phase, actions.
 *
 * @see docs/engineering-ddd-design/02-subdomains.md §6 StudySessionOrchestration
 * @see docs/engineering-ddd-design/canvas-ei-runtime.md — Gateway context
 */

import { z } from 'zod';
import {
  SessionIntentIssuedSchema,
  ActivationPlanIssuedSchema,
  VerificationDecisionIssuedSchema,
} from '../../schemas/outputs';
import { SduiComponentSchema, type SduiComponent } from '../domain/types/components';

// ────────────────────────────────────────────────────────────────────────────
// Phase
// ────────────────────────────────────────────────────────────────────────────

export const SduiPhaseSchema = z.enum([
  'checkin',
  'intent',
  'activation',
  'session',
  'verification',
  'done',
]);
export type SduiPhase = z.infer<typeof SduiPhaseSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Action
// ────────────────────────────────────────────────────────────────────────────

export const SduiActionSchema = z.object({
  id: z.string(),
  endpoint: z.object({
    method: z.literal('POST'),
    path: z.string(),
  }),
  /** Payload template. Client fills {{inputId}} placeholders with collected values. */
  payload: z.record(z.unknown()),
});
export type SduiAction = z.infer<typeof SduiActionSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Slot Entry — bare component or grouped component for progressive disclosure
// ────────────────────────────────────────────────────────────────────────────

/** Grouped component — visibility controlled by client progressive disclosure. */
export const SduiGroupedComponentSchema = z.object({
  component: SduiComponentSchema,
  visibilityGroup: z.string(),
  initiallyVisible: z.boolean().default(true),
  hiddenWhenGroup: z.string().optional(),
});
export type SduiGroupedComponent = z.infer<typeof SduiGroupedComponentSchema>;

/** A slot entry is either a bare component (always visible) or a grouped component. */
export const SduiSlotEntrySchema = z.union([SduiComponentSchema, SduiGroupedComponentSchema]);
export type SduiSlotEntry = z.infer<typeof SduiSlotEntrySchema>;

/** Unwrap a slot entry to get the underlying SduiComponent. */
export function unwrapSlotEntry(entry: SduiSlotEntry): SduiComponent {
  return 'component' in entry && 'visibilityGroup' in entry
    ? entry.component
    : (entry as SduiComponent);
}

// ────────────────────────────────────────────────────────────────────────────
// View Tree (slot-based layout)
// ────────────────────────────────────────────────────────────────────────────

export const SduiViewTreeSchema = z.object({
  header: z.array(SduiSlotEntrySchema),
  body: z.array(SduiSlotEntrySchema),
  actions: z.array(SduiSlotEntrySchema),
  footer: z.array(SduiSlotEntrySchema),
});
export type SduiViewTree = z.infer<typeof SduiViewTreeSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Top-level response
// ────────────────────────────────────────────────────────────────────────────

export const SduiResponseSchema = z.object({
  schemaVersion: z.literal(1),
  phase: SduiPhaseSchema,
  view: SduiViewTreeSchema,
  /** Structured domain output — timer config, raw data for client-side state */
  domain: z.unknown(),
  /** Actions the client can submit. Keyed by action ID. */
  actions: z.record(SduiActionSchema),
});
export type SduiResponse = z.infer<typeof SduiResponseSchema>;

// ────────────────────────────────────────────────────────────────────────────
// P1 wrapped response (backward compat: domain fields at top level + view)
// ────────────────────────────────────────────────────────────────────────────

export const P1WrappedResponseSchema = SessionIntentIssuedSchema.merge(
  z.object({
    schemaVersion: z.literal(1),
    phase: SduiPhaseSchema,
    view: SduiViewTreeSchema,
    actions: z.record(SduiActionSchema),
  }),
);
export type P1WrappedResponse = z.infer<typeof P1WrappedResponseSchema>;

// ────────────────────────────────────────────────────────────────────────────
// P2 wrapped response (activation: domain fields at top level + view)
// ────────────────────────────────────────────────────────────────────────────

export const P2WrappedResponseSchema = ActivationPlanIssuedSchema.merge(
  z.object({
    schemaVersion: z.literal(1),
    phase: SduiPhaseSchema,
    view: SduiViewTreeSchema,
    actions: z.record(SduiActionSchema),
  }),
);
export type P2WrappedResponse = z.infer<typeof P2WrappedResponseSchema>;

// ────────────────────────────────────────────────────────────────────────────
// P3 wrapped response (verification: domain fields at top level + view)
// ────────────────────────────────────────────────────────────────────────────

export const P3WrappedResponseSchema = VerificationDecisionIssuedSchema.merge(
  z.object({
    schemaVersion: z.literal(1),
    phase: SduiPhaseSchema,
    view: SduiViewTreeSchema,
    actions: z.record(SduiActionSchema),
  }),
);
export type P3WrappedResponse = z.infer<typeof P3WrappedResponseSchema>;
