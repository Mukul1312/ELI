/**
 * Radar Pipeline: Recompute workflow (structured documentation)
 *
 * @see EI_Spec.md section 4.15
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import {
  SILENCE_DAYS_THRESHOLD, OPEN_LOOPS_THRESHOLD, VERIFICATION_RATE_LOW,
  SCHEDULE_MISSES_THRESHOLD, AVOIDANT_EXITS_THRESHOLD,
} from '../../ei/engine/tunables';

// ============================================================================
// Types & Schemas
// ============================================================================

interface StudentAggregates {
  studentId: string; silenceDays: number; openLoops: number;
  verificationRate7d: number; scheduleMisses7d: number;
  avoidantExits7d: number; stateTrend7d: string; pendingChecks: number;
}

interface AlertCandidate {
  studentId: string; alertType: string; severity: string;
  evidenceSummary: Record<string, unknown>; recommendedAction: string;
}

const RadarInput = z.object({ batchId: z.string(), activeWithinDays: z.number().int().default(30) });
const Listed = RadarInput.extend({ studentIds: z.array(z.string()) });

const AggSchema = z.object({
  studentId: z.string(), silenceDays: z.number(), openLoops: z.number(),
  verificationRate7d: z.number(), scheduleMisses7d: z.number(),
  avoidantExits7d: z.number(), stateTrend7d: z.string(), pendingChecks: z.number(),
});
const Aggregated = Listed.extend({ allAggregates: z.array(AggSchema) });

const AlertSchema = z.object({
  studentId: z.string(), alertType: z.string(), severity: z.string(),
  evidenceSummary: z.record(z.unknown()), recommendedAction: z.string(),
});
const Alerted = Aggregated.extend({ alertCandidates: z.array(AlertSchema) });

const FinalOutput = z.object({
  batchId: z.string(), alertsProcessed: z.number(),
  results: z.array(z.object({ alertId: z.string(), isNew: z.boolean() })),
});

// ============================================================================
// Steps
// ============================================================================

const loadStudentList = createStep({
  id: 'load-student-list', inputSchema: RadarInput, outputSchema: Listed,
  execute: async ({ inputData }): Promise<any> => ({ ...inputData, studentIds: [] }),
});

const computeAllAggregates = createStep({
  id: 'compute-all-aggregates', inputSchema: Listed, outputSchema: Aggregated,
  execute: async ({ inputData }): Promise<any> => ({ ...inputData, allAggregates: [] }),
});

const evaluateAlerts = createStep({
  id: 'evaluate-alerts', inputSchema: Aggregated, outputSchema: Alerted,
  execute: async ({ inputData }): Promise<any> => {
    const alertCandidates: AlertCandidate[] = [];
    for (const agg of inputData.allAggregates as StudentAggregates[]) {
      if (agg.silenceDays >= SILENCE_DAYS_THRESHOLD) {
        alertCandidates.push({
          studentId: agg.studentId, alertType: 'Silence',
          severity: agg.silenceDays >= 5 ? 'critical' : agg.silenceDays >= 3 ? 'high' : 'medium',
          evidenceSummary: { silenceDays: agg.silenceDays },
          recommendedAction: agg.silenceDays >= 5 ? 'Immediate counselor check-in recommended' : 'Gentle re-engagement nudge suggested',
        });
        continue;
      }
      if (agg.openLoops >= OPEN_LOOPS_THRESHOLD || agg.scheduleMisses7d >= SCHEDULE_MISSES_THRESHOLD) {
        alertCandidates.push({
          studentId: agg.studentId, alertType: 'IntegrityDebt', severity: agg.openLoops >= 5 ? 'high' : 'medium',
          evidenceSummary: { openLoops: agg.openLoops, scheduleMisses7d: agg.scheduleMisses7d },
          recommendedAction: 'Student has accumulating WIP debt; verify study plan feasibility',
        });
        continue;
      }
      if (agg.verificationRate7d < VERIFICATION_RATE_LOW) {
        alertCandidates.push({
          studentId: agg.studentId, alertType: 'VerificationDrop',
          severity: agg.verificationRate7d < 0.40 ? 'high' : 'medium',
          evidenceSummary: { verificationRate7d: agg.verificationRate7d },
          recommendedAction: 'Student is skipping retrieval practice; may need verification format adjustment',
        });
        continue;
      }
      if (agg.stateTrend7d === 'worsening' && agg.avoidantExits7d >= AVOIDANT_EXITS_THRESHOLD) {
        alertCandidates.push({
          studentId: agg.studentId, alertType: 'BurnoutRunway', severity: 'medium',
          evidenceSummary: { stateTrend: agg.stateTrend7d, avoidantExits7d: agg.avoidantExits7d },
          recommendedAction: 'Student shows signs of declining engagement; consider scope reduction',
        });
      }
    }
    return { ...inputData, alertCandidates };
  },
});

const upsertAlerts = createStep({
  id: 'upsert-alerts', inputSchema: Alerted, outputSchema: FinalOutput,
  execute: async ({ inputData }): Promise<any> => ({
    batchId: inputData.batchId,
    alertsProcessed: (inputData.alertCandidates as AlertCandidate[]).length,
    results: [],
  }),
});

// ============================================================================
// Workflow
// ============================================================================

export const radarRecomputeWorkflow = createWorkflow({
  id: 'ei-radar-recompute', inputSchema: RadarInput, outputSchema: FinalOutput,
})
  .then(loadStudentList).then(computeAllAggregates).then(evaluateAlerts).then(upsertAlerts).commit();
