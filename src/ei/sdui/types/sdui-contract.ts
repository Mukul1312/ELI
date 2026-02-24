/**
 * SDUI Response Contract — the API between EI Runtime and the client renderer.
 *
 * Each Mastra workflow step (composeP1View, composeP2View, composeP3View) returns
 * an SduiResponse. The client renders the `view` slots using its component registry,
 * and uses the `actions` map to POST user interactions back to /api/ei/command.
 *
 * @see docs/strategic-design/02-subdomains.md §6 StudySessionOrchestration
 * @see docs/strategic-design/canvas-ei-runtime.md — Gateway context
 */

import { z } from 'zod';
import { SduiComponentSchema, type SduiComponent } from './components';

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
// View Tree (slot-based layout)
// ────────────────────────────────────────────────────────────────────────────

export const SduiViewTreeSchema = z.object({
  header: z.array(SduiComponentSchema),
  body: z.array(SduiComponentSchema),
  actions: z.array(SduiComponentSchema),
  footer: z.array(SduiComponentSchema),
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
