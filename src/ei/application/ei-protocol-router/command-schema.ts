/**
 * EiCommand schemas — Zod validation for command payloads.
 * Aligns with event catalog in docs/strategic-design/05-cross-cutting-concerns.md.
 */

import { z } from 'zod';

export const AppOpenPayloadSchema = z.object({
  topic: z.string(),
  energy: z.number().min(1).max(5),
  sleepBucket: z.enum(['<6', '6-7', '7-8', '>=8']).optional(),
  pressure: z.number().min(1).max(5).optional(),
  backlogPressure: z.number().min(1).max(5).optional(),
  openedAt: z.string().datetime().optional(),
});

export const IntentSetPayloadSchema = z.object({
  topic: z.string(),
  taskType: z.string().optional(),
  setAt: z.string().datetime(),
});

export const SessionEndPayloadSchema = z.object({
  topic: z.string(),
  endedAt: z.string().datetime(),
  effortSummary: z.record(z.unknown()).optional(),
});

export const EiCommandSchema = z.discriminatedUnion('commandType', [
  z.object({
    commandType: z.literal('AppOpen'),
    payload: AppOpenPayloadSchema,
  }),
  z.object({
    commandType: z.literal('IntentSet'),
    payload: IntentSetPayloadSchema,
  }),
  z.object({
    commandType: z.literal('SessionEnd'),
    payload: SessionEndPayloadSchema,
  }),
]);

export type AppOpenPayload = z.infer<typeof AppOpenPayloadSchema>;
export type IntentSetPayload = z.infer<typeof IntentSetPayloadSchema>;
export type SessionEndPayload = z.infer<typeof SessionEndPayloadSchema>;
export type EiCommand = z.infer<typeof EiCommandSchema>;
