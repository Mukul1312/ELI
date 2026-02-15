/**
 * Zod schemas for Radar alerts (institute-facing, privacy-safe).
 *
 * Source: EI_Spec.md section 4.15
 */

import { z } from 'zod';

export const AlertTypeEnum = z.enum([
  'Silence',
  'IntegrityDebt',
  'VerificationDrop',
  'BurnoutRunway',
  'SubjectAvoidance',
]);
export type AlertType = z.infer<typeof AlertTypeEnum>;

export const SeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type Severity = z.infer<typeof SeverityEnum>;

export const RadarAlertSchema = z.object({
  id: z.string().optional(),
  studentId: z.string(),
  batchId: z.string(),
  alertType: AlertTypeEnum,
  severity: SeverityEnum,
  window: z.string().optional(),
  evidenceSummary: z.object({
    silenceDays: z.number().optional(),
    openLoops: z.number().optional(),
    verificationRate7d: z.number().optional(),
    scheduleMisses7d: z.number().optional(),
    stateTrend: z.string().optional(),
    avoidedTopics: z.array(z.string()).optional(),
  }),
  recommendedAction: z.string(),
  lastUpdatedAt: z.string().datetime(),
});
export type RadarAlert = z.infer<typeof RadarAlertSchema>;
